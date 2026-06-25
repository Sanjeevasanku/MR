import { createApp } from './app';
import { loadConfig } from './config';
import { logger } from './utils/logger';

function start(): void {
  const config = loadConfig();
  const app = createApp();

  app.listen(config.port, () => {
    logger.info('AI Merge Reviewer server started', {
      port: config.port,
      env: config.nodeEnv,
    });
  });
}

start();
