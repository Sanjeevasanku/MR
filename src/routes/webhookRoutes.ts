import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';

export function createWebhookRoutes(controller: WebhookController): Router {
  const router = Router();

  router.post('/gitlab', controller.handleGitLabWebhook);

  return router;
}
