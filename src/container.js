const { loadConfig } = require('./config');
const { createGitLabClient } = require('./clients/gitlabClient');
const { createOpenAIClient } = require('./clients/openaiClient');
const { GitLabService } = require('./services/gitlabService');
const { PromptService } = require('./services/promptService');
const { OpenAIService } = require('./services/openaiService');
const { CommentFormatter } = require('./services/commentFormatter');
const { ReviewService } = require('./services/reviewService');
const { WebhookController } = require('./controllers/webhookController');

function createContainer(options = {}) {
  const config = loadConfig();

  const gitlabClient = createGitLabClient(config);
  const openaiClient = createOpenAIClient(config);

  const gitlabService = new GitLabService(gitlabClient);
  const promptService = new PromptService();
  const openaiService = new OpenAIService(openaiClient, config);
  const commentFormatter = new CommentFormatter();
  const reviewService = new ReviewService(
    gitlabService,
    promptService,
    openaiService,
    commentFormatter,
    options.ingestScan ?? null,
    config
  );
  const webhookController = new WebhookController(reviewService, config);

  return {
    config,
    webhookController,
  };
}

module.exports = { createContainer };
