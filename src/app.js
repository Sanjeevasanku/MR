const express = require('express');
const path = require('path');
const { createContainer } = require('./container');
const { createWebhookRoutes } = require('./routes/webhookRoutes');
const { createPlatformRouter } = require('./platform/routes/api');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

function createApp(options = {}) {
  const { platformEnabled = false } = options;
  const { webhookController, config } = createContainer({
    ingestScan: options.ingestScan ?? null,
  });

  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      dashboard: platformEnabled,
    });
  });

  app.use('/api/webhook', createWebhookRoutes(webhookController));

  if (platformEnabled) {
    app.use('/api', createPlatformRouter(config));

    const publicDir = path.join(__dirname, '../public');
    app.use(express.static(publicDir));
    app.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
