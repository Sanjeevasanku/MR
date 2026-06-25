import { loadConfig } from './config';
import { createGitLabClient } from './clients/gitlabClient';
import { createOpenAIClient } from './clients/openaiClient';
import { GitLabService } from './services/gitlabService';
import { PromptService } from './services/promptService';
import { OpenAIService } from './services/openaiService';
import { CommentFormatter } from './services/commentFormatter';
import { ReviewService } from './services/reviewService';
import { WebhookController } from './controllers/webhookController';

export function createContainer() {
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
    commentFormatter
  );
  const webhookController = new WebhookController(reviewService);

  return {
    config,
    webhookController,
  };
}
