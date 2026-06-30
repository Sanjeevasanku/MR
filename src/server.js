const { createApp } = require('./app');
const { loadConfig } = require('./config');
const { connectDb } = require('./platform/db');
const { ingestScan } = require('./platform/services/ingestService');
const { logger } = require('./utils/logger');

async function start() {
  const config = loadConfig();
  let platformEnabled = false;

  if (config.mongodb.uri) {
    try {
      await connectDb(config.mongodb.uri);
      platformEnabled = true;
      logger.info('MongoDB connected — dashboard and fix flow enabled');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('MongoDB unavailable — running detect-only mode', { error: message });
    }
  }

  const app = createApp({
    platformEnabled,
    ingestScan: platformEnabled ? ingestScan : null,
  });

  app.listen(config.port, () => {
    logger.info('AI Merge Reviewer server started', {
      port: config.port,
      env: config.nodeEnv,
      dashboard: platformEnabled,
    });
    if (platformEnabled) {
      logger.info('Dashboard available', { url: `http://localhost:${config.port}` });
    }
  });
}

start().catch((error) => {
  logger.error('Server failed to start', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});
