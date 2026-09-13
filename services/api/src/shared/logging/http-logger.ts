import { randomUUID } from 'node:crypto';
import pino, { type DestinationStream } from 'pino';
import { pinoHttp } from 'pino-http';
import type { Environment } from '../config/environment.js';

export function createLogger(config: Environment, destination?: DestinationStream) {
  const options = { level: config.LOG_LEVEL, base: { service: 'nexguardian-api' },
    redact: ['password', 'token', 'authorization', 'cookie', 'secret'] };
  return destination ? pino(options, destination) : pino(options);
}
export function requestLogging(logger: pino.Logger) {
  return pinoHttp({
    logger,
    genReqId: (_req, res) => {
      const id = randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    // Allowlist avoids leaking URL query values, headers, cookies, or bodies.
    serializers: {
      req: req => ({ id: req.id, method: req.method }),
      res: res => ({ statusCode: res.statusCode }),
    },
    customProps: req => {
      const incoming = req.headers['x-correlation-id'];
      const correlationId = typeof incoming === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incoming)
        ? incoming : req.id;
      return { requestId: req.id, correlationId };
    },
  });
}
