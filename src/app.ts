import express, { Application, Request, Response } from 'express';
import { createContainer } from './container';
import { createWebhookRoutes } from './routes/webhookRoutes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

export function createApp(): Application {
  const { webhookController } = createContainer();

  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(requestLogger);

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/webhook', createWebhookRoutes(webhookController));

  app.use(errorHandler);

  return app;
}
