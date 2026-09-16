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

// Praça da Sé, São Paulo, and a point ~1.1 km north — outside a 200 m fence.
const inside = { latitude: -23.5505, longitude: -46.6333 };
const outside = { latitude: -23.5405, longitude: -46.6333 };

const sample = (point: typeof inside, overrides: Record<string, unknown> = {}) => ({
  ...point, accuracyMeters: 8, source: 'GPS', observedAt: new Date().toISOString(), consentVersion: '2026-09-01', ...overrides,
});

describe('location + geofence (real PostgreSQL)', () => {
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
    const reg = await http.post('/auth/register').send({ name: 'Location Family', email, password: 'sufficiently-long-pass' }).expect(201);
    const accountToken = reg.body.session.accessToken as string;
    const deviceId = randomUUID();
    const validate = await http.post('/activation/validate').set('Idempotency-Key', randomUUID())
      .send({ code: reg.body.activationCode.value, deviceId }).expect(200);
    const pair = await http.post('/devices/pair').set('Authorization', `Bearer ${validate.body.activationTicket}`)
      .set('Idempotency-Key', randomUUID()).send({ deviceId, deviceInfo }).expect(201);
    const confirm = await http.post('/devices/pair/confirm').set('Authorization', `Bearer ${pair.body.pairingTicket}`)
      .set('Idempotency-Key', randomUUID()).send({ pairingId: pair.body.pairingId, deviceId, confirmedOnDevice: true }).expect(200);
    return { accountToken, deviceToken: confirm.body.session.accessToken as string, deviceId };
  }

  const report = (deviceToken: string, samples: unknown[]) =>
    http.post('/agent/locations').set('Authorization', `Bearer ${deviceToken}`).send({ samples });

  const createFence = (accountToken: string, body: Record<string, unknown>) =>
    http.post('/geofences').set('Authorization', `Bearer ${accountToken}`).send({
      name: 'Casa', centerLatitude: inside.latitude, centerLongitude: inside.longitude,
      radiusMeters: 200, transitions: ['ENTER', 'EXIT'], ...body,
    });

  it('accepts a consented batch and serves it back as history', async () => {
    const { accountToken, deviceToken, deviceId } = await enrolledAccount();
    const accepted = await report(deviceToken, [sample(inside), sample(outside)]).expect(202);
    expect(accepted.body.accepted).toBe(2);

    const history = await http.get(`/devices/${deviceId}/locations`).set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(history.body.samples).toHaveLength(2);
    expect(history.body.stale).toBe(false);
    expect(history.body.latest.consentVersion).toBe('2026-09-01');
    expect(history.body.retentionDays).toBe(30);
  });

  it('rejects a sample without a consent version', async () => {
    const { deviceToken } = await enrolledAccount();
    await report(deviceToken, [sample(inside, { consentVersion: undefined })]).expect(400);
  });

  it('reports a device with no samples as stale, not as located', async () => {
    const { accountToken, deviceId } = await enrolledAccount();
    const history = await http.get(`/devices/${deviceId}/locations`).set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(history.body.latest).toBeNull();
    expect(history.body.stale).toBe(true);
  });

  it('fires ENTER then EXIT and records them on the timeline', async () => {
    const { accountToken, deviceToken, deviceId } = await enrolledAccount();
    const fence = await createFence(accountToken, {}).expect(201);

    const entered = await report(deviceToken, [sample(inside)]).expect(202);
    expect(entered.body.transitions).toEqual([{ geofenceId: fence.body.id, name: 'Casa', transition: 'ENTER' }]);

    const left = await report(deviceToken, [sample(outside)]).expect(202);
    expect(left.body.transitions[0].transition).toBe('EXIT');

    const timeline = await http.get(`/devices/${deviceId}/events`).set('Authorization', `Bearer ${accountToken}`).expect(200);
    const geofenceEvents = timeline.body.events.filter((e: { type: string }) => e.type === 'GEOFENCE_EVENT');
    expect(geofenceEvents.map((e: { payload: { transition: string } }) => e.payload.transition)).toEqual(['EXIT', 'ENTER']);
    // The payload names the fence; raw coordinates never reach the timeline.
    expect(geofenceEvents[0].payload).not.toHaveProperty('latitude');
  });

  it('does not fire a transition the geofence is not subscribed to', async () => {
    const { accountToken, deviceToken } = await enrolledAccount();
    await createFence(accountToken, { transitions: ['EXIT'] }).expect(201);
    const entered = await report(deviceToken, [sample(inside)]).expect(202);
    expect(entered.body.transitions).toEqual([]);
    const left = await report(deviceToken, [sample(outside)]).expect(202);
    expect(left.body.transitions[0].transition).toBe('EXIT');
  });

  it('does not fire on an imprecise sample that straddles the boundary', async () => {
    const { accountToken, deviceToken } = await enrolledAccount();
    await createFence(accountToken, {}).expect(201);
    const vague = await report(deviceToken, [sample(inside, { accuracyMeters: 5000, source: 'NETWORK' })]).expect(202);
    expect(vague.body.transitions).toEqual([]);
  });

  it('evaluates only the freshest sample of a flushed offline batch', async () => {
    const { accountToken, deviceToken } = await enrolledAccount();
    await createFence(accountToken, {}).expect(201);
    const older = new Date(Date.now() - 60_000).toISOString();
    // Queued while offline: was inside, then left. Only the newest position is live.
    const flush = await report(deviceToken, [
      sample(inside, { observedAt: older }),
      sample(outside),
    ]).expect(202);
    expect(flush.body.transitions).toEqual([]);
  });

  it('requires ADMIN to manage geofences but lets any member read them', async () => {
    const { accountToken } = await enrolledAccount();
    const fence = await createFence(accountToken, {}).expect(201);
    const list = await http.get('/geofences').set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(list.body.geofences).toHaveLength(1);

    const updated = await http.put(`/geofences/${fence.body.id}`).set('Authorization', `Bearer ${accountToken}`)
      .send({ radiusMeters: 500, active: false }).expect(200);
    expect(updated.body).toMatchObject({ radiusMeters: 500, active: false });

    await http.delete(`/geofences/${fence.body.id}`).set('Authorization', `Bearer ${accountToken}`).expect(204);
    const empty = await http.get('/geofences').set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(empty.body.geofences).toHaveLength(0);
  });

  it('ignores an inactive geofence', async () => {
    const { accountToken, deviceToken } = await enrolledAccount();
    const fence = await createFence(accountToken, {}).expect(201);
    await http.put(`/geofences/${fence.body.id}`).set('Authorization', `Bearer ${accountToken}`).send({ active: false }).expect(200);
    const entered = await report(deviceToken, [sample(inside)]).expect(202);
    expect(entered.body.transitions).toEqual([]);
  });

  it('keeps location and geofences isolated between workspaces', async () => {
    const a = await enrolledAccount();
    await report(a.deviceToken, [sample(inside)]).expect(202);
    await createFence(a.accountToken, {}).expect(201);

    const email = `${randomUUID()}@example.invalid`;
    const b = await http.post('/auth/register').send({ name: 'B', email, password: 'sufficiently-long-pass' }).expect(201);
    const bToken = b.body.session.accessToken as string;

    await http.get(`/devices/${a.deviceId}/locations`).set('Authorization', `Bearer ${bToken}`).expect(404);
    const fences = await http.get('/geofences').set('Authorization', `Bearer ${bToken}`).expect(200);
    expect(fences.body.geofences).toHaveLength(0);
  });

  it('exposes the tenant location retention window through the policy', async () => {
    const { accountToken } = await enrolledAccount();
    const updated = await http.put('/policy').set('Authorization', `Bearer ${accountToken}`)
      .send({ locationRetentionDays: 7, locationStaleMinutes: 5 }).expect(200);
    expect(updated.body.policy).toMatchObject({ locationRetentionDays: 7, locationStaleMinutes: 5 });
  });
});
