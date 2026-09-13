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

interface AuthBody {
  account: { id: string };
  user: { email: string };
  session: { accessToken: string; refreshToken: string };
  activationCode: { value: string };
}
interface ConfirmBody {
  device: { pairingState: string };
  session: { accessToken: string; refreshToken: string };
  subscription: { state: string; trialStartedAt: string };
}

describe('enrollment flow (real PostgreSQL)', () => {
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

  async function register(name = 'Family') {
    const email = `${randomUUID()}@example.invalid`;
    const res = await http.post('/auth/register').send({ name, email, password: 'sufficiently-long-pass' }).expect(201);
    return { email, body: res.body as AuthBody };
  }

  // Full happy path: register -> validate -> pair -> confirm, returns device session tokens.
  async function enroll(accountBody: AuthBody, deviceId = randomUUID()) {
    const validate = await http.post('/activation/validate')
      .set('Idempotency-Key', randomUUID())
      .send({ code: accountBody.activationCode.value, deviceId }).expect(200);
    const pair = await http.post('/devices/pair')
      .set('Authorization', `Bearer ${validate.body.activationTicket}`)
      .set('Idempotency-Key', randomUUID())
      .send({ deviceId, deviceInfo }).expect(201);
    const confirm = await http.post('/devices/pair/confirm')
      .set('Authorization', `Bearer ${pair.body.pairingTicket}`)
      .set('Idempotency-Key', randomUUID())
      .send({ pairingId: pair.body.pairingId, deviceId, confirmedOnDevice: true }).expect(200);
    return { deviceId, confirm: confirm.body as ConfirmBody };
  }

  it('registers an account and issues a session + activation code, never echoing the password', async () => {
    const { body } = await register();
    expect(body.account.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.session.accessToken.length).toBeGreaterThanOrEqual(32);
    expect(body.activationCode.value).toMatch(/^NG-/);
    expect(JSON.stringify(body)).not.toContain('sufficiently-long-pass');
  });

  it('rejects duplicate email registration with 409', async () => {
    const { email } = await register();
    await http.post('/auth/register').send({ name: 'Dup', email, password: 'another-long-pass' }).expect(409);
  });

  it('logs in with valid credentials and rejects wrong password', async () => {
    const name = 'Login Family';
    const email = `${randomUUID()}@example.invalid`;
    await http.post('/auth/register').send({ name, email, password: 'the-right-password' }).expect(201);
    await http.post('/auth/login').send({ email, password: 'the-right-password' }).expect(200);
    await http.post('/auth/login').send({ email, password: 'the-wrong-password' }).expect(401);
  });

  it('completes enrollment and starts a trial once per workspace', async () => {
    const { body } = await register();
    const { confirm } = await enroll(body);
    expect(confirm.device.pairingState).toBe('PAIRED');
    expect(confirm.subscription.state).toBe('TRIAL');
    expect(confirm.session.accessToken.length).toBeGreaterThanOrEqual(32);
    const firstTrialStart = confirm.subscription.trialStartedAt;

    // A second device on the SAME account (fresh code via login) must not restart the trial.
    const relog = await http.post('/auth/login')
      .send({ email: body.user.email, password: 'sufficiently-long-pass' }).expect(200);
    const second = await enroll(relog.body);
    expect(second.confirm.subscription.trialStartedAt).toBe(firstTrialStart);
  });

  it('rejects pairing without a valid activation ticket', async () => {
    const deviceId = randomUUID();
    await http.post('/devices/pair').set('Authorization', 'Bearer not-a-real-ticket')
      .send({ deviceId, deviceInfo }).expect(401);
  });

  it('accepts heartbeat with the device session and reports subscription + online', async () => {
    const { body } = await register();
    const { deviceId, confirm } = await enroll(body);
    const token = confirm.session.accessToken;
    const hb = await http.post('/devices/heartbeat').set('Authorization', `Bearer ${token}`).send({
      deviceId, appVersion: '0.1.0', androidVersion: '15', manufacturer: 'Google', model: 'Pixel 8',
      batteryLevel: 87, networkType: 'WIFI', timestamp: new Date().toISOString(),
    }).expect(200);
    expect(hb.body.connectionState).toBe('ONLINE');
    expect(hb.body.subscription.state).toBe('TRIAL');

    const me = await http.get('/devices/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.device.pairingState).toBe('PAIRED');
    expect(me.body.connectionState).toBe('ONLINE');

    const sub = await http.get('/subscription/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(sub.body.subscription.state).toBe('TRIAL');
  });

  it('rotates the device session and detects refresh replay', async () => {
    const { body } = await register();
    const { deviceId, confirm } = await enroll(body);
    const firstRefresh = confirm.session.refreshToken;
    const rotated = await http.post('/devices/session/refresh').send({ deviceId, refreshToken: firstRefresh }).expect(200);
    expect(rotated.body.accessToken).not.toBe(confirm.session.accessToken);
    // Reusing the old refresh token is rejected (replay).
    await http.post('/devices/session/refresh').send({ deviceId, refreshToken: firstRefresh }).expect(401);
  });

  it('rejects unauthenticated device endpoints', async () => {
    await http.get('/devices/me').expect(401);
    await http.post('/devices/heartbeat').send({ deviceId: randomUUID() }).expect(401);
  });

  it('isolates workspaces: one account cannot revoke another account device', async () => {
    const a = await register('A');
    const enrolledA = await enroll(a.body);
    const b = await register('B');
    // B acts with its own account session but targets A's device.
    await http.post('/devices/revoke')
      .set('Authorization', `Bearer ${b.body.session.accessToken}`)
      .send({ deviceId: enrolledA.deviceId }).expect(404);
    // A's device is still usable.
    await http.get('/devices/me').set('Authorization', `Bearer ${enrolledA.confirm.session.accessToken}`).expect(200);
  });

  it('revokes a device and invalidates its session', async () => {
    const { body } = await register();
    const { deviceId, confirm } = await enroll(body);
    const token = confirm.session.accessToken;
    await http.post('/devices/revoke').set('Authorization', `Bearer ${token}`).send({ deviceId }).expect(200);
    // Session no longer works after revocation.
    await http.get('/devices/me').set('Authorization', `Bearer ${token}`).expect(401);
  });
});
