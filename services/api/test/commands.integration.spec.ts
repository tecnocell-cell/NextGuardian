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

describe('events + commands (real PostgreSQL)', () => {
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

  async function registerAndEnroll() {
    const email = `${randomUUID()}@example.invalid`;
    const reg = await http.post('/auth/register').send({ name: 'Cmd Family', email, password: 'sufficiently-long-pass' }).expect(201);
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

  it('records enrollment events on the device timeline', async () => {
    const { accountToken, deviceId } = await registerAndEnroll();
    const timeline = await http.get(`/devices/${deviceId}/events`).set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(timeline.body.events.map((e: { type: string }) => e.type)).toContain('DEVICE_PAIRED');
  });

  it('runs the full command lifecycle: enqueue -> fetch -> ack', async () => {
    const { accountToken, deviceToken, deviceId } = await registerAndEnroll();

    const created = await http.post(`/devices/${deviceId}/commands`).set('Authorization', `Bearer ${accountToken}`)
      .set('Idempotency-Key', randomUUID()).send({ type: 'SHOW_MESSAGE', payload: { text: 'Olá' } }).expect(201);
    expect(created.body).toMatchObject({ type: 'SHOW_MESSAGE', status: 'QUEUED' });

    // Agent fetches pending commands -> becomes DELIVERED.
    const fetched = await http.get('/agent/commands').set('Authorization', `Bearer ${deviceToken}`).expect(200);
    expect(fetched.body.commands).toHaveLength(1);
    expect(fetched.body.commands[0]).toMatchObject({ id: created.body.id, status: 'DELIVERED' });

    // A second fetch returns nothing (already delivered).
    expect((await http.get('/agent/commands').set('Authorization', `Bearer ${deviceToken}`).expect(200)).body.commands).toHaveLength(0);

    // Agent acknowledges execution.
    await http.post(`/agent/commands/${created.body.id}/ack`).set('Authorization', `Bearer ${deviceToken}`)
      .send({ status: 'EXECUTED', result: 'ok' }).expect(200);

    // Console sees it EXECUTED and the timeline has the command events.
    const list = await http.get(`/devices/${deviceId}/commands`).set('Authorization', `Bearer ${accountToken}`).expect(200);
    expect(list.body.commands[0]).toMatchObject({ id: created.body.id, status: 'EXECUTED', result: 'ok' });
    const types = (await http.get(`/devices/${deviceId}/events`).set('Authorization', `Bearer ${accountToken}`).expect(200))
      .body.events.map((e: { type: string }) => e.type);
    expect(types).toEqual(expect.arrayContaining(['COMMAND_CREATED', 'COMMAND_EXECUTED']));
  });

  it('validates the command catalog and payload', async () => {
    const { accountToken, deviceId } = await registerAndEnroll();
    await http.post(`/devices/${deviceId}/commands`).set('Authorization', `Bearer ${accountToken}`)
      .set('Idempotency-Key', randomUUID()).send({ type: 'SHOW_MESSAGE' }).expect(400);
    await http.post(`/devices/${deviceId}/commands`).set('Authorization', `Bearer ${accountToken}`)
      .set('Idempotency-Key', randomUUID()).send({ type: 'DELETE_EVERYTHING' }).expect(400);
    await http.post(`/devices/${deviceId}/commands`).set('Authorization', `Bearer ${accountToken}`)
      .set('Idempotency-Key', randomUUID()).send({ type: 'RING_DEVICE' }).expect(201);
  });

  it('does not let one workspace command another workspace device', async () => {
    const a = await registerAndEnroll();
    const b = await registerAndEnroll();
    await http.post(`/devices/${a.deviceId}/commands`).set('Authorization', `Bearer ${b.accountToken}`)
      .set('Idempotency-Key', randomUUID()).send({ type: 'RING_DEVICE' }).expect(404);
    // And B's agent session cannot see A's commands.
    expect((await http.get('/agent/commands').set('Authorization', `Bearer ${b.deviceToken}`).expect(200)).body.commands).toHaveLength(0);
  });
});
