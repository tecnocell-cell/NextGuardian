import 'reflect-metadata';
import { Writable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApplication } from '../src/application.js';
import { parseEnvironment } from '../src/shared/config/environment.js';
import { createLogger } from '../src/shared/logging/http-logger.js';

const url = process.env.WP102_DATABASE_URL;
if (!url || process.env.WP102_EPHEMERAL !== '1') throw new Error('Run npm run test:integration; no external database is accepted');

const deviceInfo = { name: 'Pixel', manufacturer: 'Google', model: 'Pixel 8', androidVersion: '15', appVersion: '0.1.0' };

describe('account console API (real PostgreSQL)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const sink = new Writable({ write(_c, _e, done) { done(); } });

  beforeAll(async () => {
    const config = parseEnvironment({ NODE_ENV: 'test', DATABASE_URL: url });
    app = await createApplication(createLogger(config, sink), config);
    await app.init();
    http = request(app.getHttpServer());
  });
  afterAll(async () => { await app.close(); });

  async function register() {
    const email = `${randomUUID()}@example.invalid`;
    const res = await http.post('/auth/register').send({ name: 'Console Family', email, password: 'sufficiently-long-pass' }).expect(201);
    return { email, token: res.body.session.accessToken as string, activationCode: res.body.activationCode.value as string };
  }

  async function enroll(token: string, activationCode: string) {
    const deviceId = randomUUID();
    const validate = await http.post('/activation/validate').set('Idempotency-Key', randomUUID())
      .send({ code: activationCode, deviceId }).expect(200);
    const pair = await http.post('/devices/pair').set('Authorization', `Bearer ${validate.body.activationTicket}`)
      .set('Idempotency-Key', randomUUID()).send({ deviceId, deviceInfo }).expect(201);
    await http.post('/devices/pair/confirm').set('Authorization', `Bearer ${pair.body.pairingTicket}`)
      .set('Idempotency-Key', randomUUID()).send({ pairingId: pair.body.pairingId, deviceId, confirmedOnDevice: true }).expect(200);
    return deviceId;
  }

  it('returns the account profile and device count', async () => {
    const { token } = await register();
    const me = await http.get('/account/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.account.profile).toBe('FAMILY');
    expect(me.body.user.email).toContain('@example.invalid');
    expect(me.body.deviceCount).toBe(0);
  });

  it('requires an account session', async () => {
    await http.get('/account/me').expect(401);
    await http.get('/devices').expect(401);
  });

  it('lists devices scoped to the workspace and issues fresh activation codes', async () => {
    const { token, activationCode } = await register();
    expect((await http.get('/devices').set('Authorization', `Bearer ${token}`).expect(200)).body.devices).toHaveLength(0);

    const deviceId = await enroll(token, activationCode);
    const list = await http.get('/devices').set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.devices).toHaveLength(1);
    expect(list.body.devices[0]).toMatchObject({ id: deviceId, pairingState: 'PAIRED' });

    // Issue a fresh code for a second device.
    const issued = await http.post('/activation/codes').set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID()).expect(201);
    expect(issued.body.value).toMatch(/^NG-/);
    await enroll(token, issued.body.value);
    expect((await http.get('/devices').set('Authorization', `Bearer ${token}`).expect(200)).body.devices).toHaveLength(2);
    expect((await http.get('/account/me').set('Authorization', `Bearer ${token}`).expect(200)).body.deviceCount).toBe(2);
  });

  it('does not leak devices across workspaces', async () => {
    const a = await register();
    await enroll(a.token, a.activationCode);
    const b = await register();
    expect((await http.get('/devices').set('Authorization', `Bearer ${b.token}`).expect(200)).body.devices).toHaveLength(0);
  });
});
