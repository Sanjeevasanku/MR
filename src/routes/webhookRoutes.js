const { Router } = require('express');

function createWebhookRoutes(controller) {
  const router = Router();

  router.post('/gitlab', controller.handleGitLabWebhook);

  return router;
}

module.exports = { createWebhookRoutes };
