import 'reflect-metadata';
import { Writable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { createApplication } from '../src/application.js';
import { parseEnvironment } from '../src/shared/config/environment.js';
import { createLogger } from '../src/shared/logging/http-logger.js';

const url = process.env.WP102_DATABASE_URL;
if (!url || process.env.WP102_EPHEMERAL !== '1') throw new Error('Run npm run test:integration; no external database is accepted');

describe('RBAC enforcement (real PostgreSQL)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let db: PrismaClient;
  const sink = new Writable({ write(_c, _e, done) { done(); } });

  beforeAll(async () => {
    const config = parseEnvironment({ NODE_ENV: 'test', DATABASE_URL: url });
    app = await createApplication(createLogger(config, sink), config);
    await app.init();
    http = request(app.getHttpServer());
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }), log: [] });
  });
  afterAll(async () => { await app.close(); await db.$disconnect(); });

  async function registerOwner() {
    const email = `${randomUUID()}@example.invalid`;
    const res = await http.post('/auth/register').send({ name: 'RBAC Family', email, password: 'sufficiently-long-pass' }).expect(201);
    return { token: res.body.session.accessToken as string, workspaceId: res.body.account.id as string, userId: res.body.user.id as string };
  }
  const setRole = (workspaceId: string, userId: string, role: 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER') =>
    db.membership.update({ where: { workspaceId_userId: { workspaceId, userId } }, data: { role } });

  it('owner can read and write; viewer can only read', async () => {
    const { token, workspaceId, userId } = await registerOwner();
    // Owner: writes allowed.
    await http.put('/policy').set('Authorization', `Bearer ${token}`).send({ maxOfflineHours: 12 }).expect(200);
    await http.post('/activation/codes').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID()).expect(201);

    await setRole(workspaceId, userId, 'VIEWER');
    await http.get('/policy').set('Authorization', `Bearer ${token}`).expect(200); // read allowed
    await http.put('/policy').set('Authorization', `Bearer ${token}`).send({ maxOfflineHours: 8 }).expect(403);
    await http.post('/activation/codes').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID()).expect(403);
    await http.post(`/devices/${randomUUID()}/commands`).set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID()).send({ type: 'RING_DEVICE' }).expect(403);
  });

  it('operator can command but not change policy; admin can change policy', async () => {
    const { token, workspaceId, userId } = await registerOwner();

    await setRole(workspaceId, userId, 'OPERATOR');
    // Role check passes (not 403); the device simply does not exist -> 404.
    await http.post(`/devices/${randomUUID()}/commands`).set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID()).send({ type: 'RING_DEVICE' }).expect(404);
    await http.put('/policy').set('Authorization', `Bearer ${token}`).send({ maxOfflineHours: 10 }).expect(403);

    await setRole(workspaceId, userId, 'ADMIN');
    await http.put('/policy').set('Authorization', `Bearer ${token}`).send({ maxOfflineHours: 10 }).expect(200);
  });

  it('a revoked membership loses all access', async () => {
    const { token, workspaceId, userId } = await registerOwner();
    await db.membership.update({ where: { workspaceId_userId: { workspaceId, userId } }, data: { status: 'REVOKED' } });
    await http.get('/policy').set('Authorization', `Bearer ${token}`).expect(401);
  });
});
