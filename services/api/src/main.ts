import 'dotenv/config';
import { createApplication } from './application.js';
import { parseEnvironment } from './shared/config/environment.js';
import { createLogger } from './shared/logging/http-logger.js';

async function bootstrap() {
  const config = parseEnvironment(process.env);
  const logger = createLogger(config);
  const app = await createApplication(logger, config);
  try {
    await app.listen(config.PORT, config.HOST);
    logger.info({ port: config.PORT }, 'NextGuardian API started');
  } catch {
    await app.close();
    throw new Error('API startup failed');
  }
}
void bootstrap().catch(() => {
  process.stderr.write('NextGuardian API failed to start; check environment and port availability.\n');
  process.exitCode = 1;
});
