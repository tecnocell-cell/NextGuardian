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

describe('policy + risk (real PostgreSQL)', () => {
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

  async function enrolledAccount() {
    const email = `${randomUUID()}@example.invalid`;
    const reg = await http.post('/auth/register').send({ name: 'Policy Family', email, password: 'sufficiently-long-pass' }).expect(201);
    const accountToken = reg.body.session.accessToken as string;
    const deviceId = randomUUID();
    const validate = await http.post('/activation/validate').set('Idempotency-Key', randomUUID())
      .send({ code: reg.body.activationCode.value, deviceId }).expect(200);
    const pair = await http.post('/devices/pair').set('Authorization', `Bearer ${validate.body.activationTicket}`)
      .set('Idempotency-Key', randomUUID()).send({ deviceId, deviceInfo }).expect(201);
    const confirm = await http.post('/devices/pair/confirm').set('Authorization', `Bearer ${pair.body.pairingTicket}`)
      .set('Idempotency-Key', randomUUID()).send({ pairingId: pair.body.pairingId, deviceId, confirmedOnDevice: true }).expect(200);
    const deviceToken = confirm.body.session.accessToken as string;
    await http.post('/devices/heartbeat').set('Authorization', `Bearer ${deviceToken}`).send({
      deviceId, appVersion: '0.1.0', androidVersion: '15', manufacturer: 'Google', model: 'Pixel 8',
      batteryLevel: 80, networkType: 'WIFI', timestamp: new Date().toISOString(),
    }).expect(200);
    return { accountToken, deviceId };
  }

  it('exposes a default policy and lets it be updated', async () => {
    const { accountToken } = await enrolledAccount();
    const def = await http.get('/policy').set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(def.body.policy).toMatchObject({ minAppVersion: '0.0.0', maxOfflineHours: 24 });
    const upd = await http.put('/policy').set('Authorization', `Bearer ${accountToken}`).send({ maxOfflineHours: 6 }).expect(200);
    expect(upd.body.policy.maxOfflineHours).toBe(6);
  });

  it('reports a compliant, low-risk device after a recent heartbeat', async () => {
    const { accountToken, deviceId } = await enrolledAccount();
    const risk = await http.get(`/devices/${deviceId}/risk`).set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(risk.body.compliance).toBe('COMPLIANT');
    expect(risk.body.level).toBe('low');
    expect(risk.body.score).toBe(0);
  });

  it('flags an outdated agent with explainable reasons when the policy tightens', async () => {
    const { accountToken, deviceId } = await enrolledAccount();
    await http.put('/policy').set('Authorization', `Bearer ${accountToken}`).send({ minAppVersion: '0.2.0' }).expect(200);
    const risk = await http.get(`/devices/${deviceId}/risk`).set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(risk.body.compliance).toBe('NON_COMPLIANT');
    expect(risk.body.reasons.map((r: { code: string }) => r.code)).toContain('AGENT_OUTDATED');
    const summary = await http.get('/risk').set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(summary.body.nonCompliant).toBe(1);
  });

  it('applies configurable per-tenant risk weights', async () => {
    const { accountToken, deviceId } = await enrolledAccount();
    await http.put('/policy').set('Authorization', `Bearer ${accountToken}`).send({ minAppVersion: '0.2.0' }).expect(200);
    const before = await http.get(`/devices/${deviceId}/risk`).set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(before.body.reasons.find((r: { code: string }) => r.code === 'AGENT_OUTDATED').weight).toBe(15);
    const upd = await http.put('/policy').set('Authorization', `Bearer ${accountToken}`).send({ weights: { agentOutdated: 70 } }).expect(200);
    expect(upd.body.policy.weights.agentOutdated).toBe(70);
    const after = await http.get(`/devices/${deviceId}/risk`).set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(after.body.reasons.find((r: { code: string }) => r.code === 'AGENT_OUTDATED').weight).toBe(70);
    expect(after.body.score).toBe(70);
  });

  it('does not expose risk for a device in another workspace', async () => {
    const a = await enrolledAccount();
    const email = `${randomUUID()}@example.invalid`;
    const b = await http.post('/auth/register').send({ name: 'B', email, password: 'sufficiently-long-pass' }).expect(201);
    await http.get(`/devices/${a.deviceId}/risk`).set('Authorization', `Bearer ${b.body.session.accessToken}`).expect(404);
  });
});
