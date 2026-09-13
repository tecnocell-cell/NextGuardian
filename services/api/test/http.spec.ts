import { Writable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApplication } from '../src/application.js';
import { parseEnvironment } from '../src/shared/config/environment.js';
import { createLogger } from '../src/shared/logging/http-logger.js';

describe('HTTP bootstrap', () => {
  let app: INestApplication;
  let records: string[];
  beforeAll(async () => {
    records = [];
    const stream = new Writable({ write(chunk, _encoding, done) { records.push(chunk.toString()); done(); } });
    app = await createApplication(createLogger(parseEnvironment({ NODE_ENV: 'test' }), stream));
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  it('GET /health returns 200, no-store and a request ID', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
  it('logs request/correlation IDs without sensitive HTTP inputs', async () => {
    const correlation = randomUUID();
    const response = await request(app.getHttpServer()).get('/health?token=private-query')
      .set('Authorization', 'Bearer private-token').set('Cookie', 'session=private-cookie')
      .set('X-Request-Id', 'untrusted-id').set('X-Correlation-Id', correlation).expect(200);
    const log = records.map(line => JSON.parse(line)).find(item => item.requestId === response.headers['x-request-id']);
    expect(log.correlationId).toBe(correlation);
    expect(log.res.statusCode).toBe(200);
    expect(JSON.stringify(log)).not.toMatch(/private-query|private-token|private-cookie|untrusted-id/);
  });
  it('validates business routes without leaking request bodies to logs', async () => {
    // /auth/register exists now; an invalid body is rejected (400) and never logged.
    await request(app.getHttpServer()).post('/auth/register').send({ password: 'private-body' }).expect(400);
    expect(records.join('')).not.toContain('private-body');
  });
});
