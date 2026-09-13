import { parseEnvironment, type Environment } from './shared/config/environment.js';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { requestLogging } from './shared/logging/http-logger.js';
import type { Logger } from 'pino';

export async function createApplication(logger: Logger, config: Environment = parseEnvironment(process.env)) {
  const app = await NestFactory.create(AppModule.register(config.DATABASE_URL), { logger: false, abortOnError: false });
  app.use(requestLogging(logger));
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.enableShutdownHooks();
  return app;
}
