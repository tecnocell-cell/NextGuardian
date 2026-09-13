import { HealthService } from '../src/modules/health/health.service.js';
import { parseEnvironment } from '../src/shared/config/environment.js';

describe('health and configuration', () => {
  it('reports process health only', () => expect(new HealthService().status()).toEqual({ status: 'ok' }));
  it('defaults to loopback', () => expect(parseEnvironment({}).HOST).toBe('127.0.0.1'));
  it.each(['0', '65536', 'abc', '', '1.5'])('rejects invalid port %s', PORT => {
    expect(() => parseEnvironment({ PORT })).toThrow('Invalid environment: PORT');
  });
  it('validates environment and logging level without exposing values', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'secret-value', LOG_LEVEL: 'bad' })).toThrow('Invalid environment: NODE_ENV, LOG_LEVEL');
  });
});
