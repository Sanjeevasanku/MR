import {
  ICommentFormatter,
  IGitLabService,
  IOpenAIService,
  IPromptService,
  IReviewService,
  MergeRequestContext,
} from '../types';
import { logger } from '../utils/logger';

export class ReviewService implements IReviewService {
  constructor(
    private readonly gitlabService: IGitLabService,
    private readonly promptService: IPromptService,
    private readonly openaiService: IOpenAIService,
    private readonly commentFormatter: ICommentFormatter
  ) {}

  async processMergeRequest(context: MergeRequestContext): Promise<void> {
    const { projectId, mergeRequestIid } = context;

    logger.info('Starting review pipeline', { projectId, mergeRequestIid });

    try {
      const changedFiles = await this.gitlabService.getMergeRequestChanges(
        projectId,
        mergeRequestIid
      );

      if (changedFiles.length === 0) {
        logger.info('No reviewable changes found', { projectId, mergeRequestIid });
        await this.gitlabService.postMergeRequestNote(
          projectId,
          mergeRequestIid,
          this.commentFormatter.format({
            summary: 'No reviewable file changes detected (deleted or empty diffs were skipped).',
            findings: [],
          })
        );
        return;
      }

      logger.info('Building prompt', { fileCount: changedFiles.length });
      const prompt = this.promptService.buildPrompt(changedFiles);

      const review = await this.openaiService.review(prompt);

      logger.info('Formatting review comment', {
        findingCount: review.findings.length,
      });
      const markdown = this.commentFormatter.format(review);

      await this.gitlabService.postMergeRequestNote(
        projectId,
        mergeRequestIid,
        markdown
      );

      logger.info('Review completed', { projectId, mergeRequestIid });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred';

      logger.error('Review pipeline failed', {
        projectId,
        mergeRequestIid,
        error: message,
      });

      try {
        const errorComment = this.commentFormatter.formatError(
          'The AI review encountered an error. Please try again or review manually.'
        );
        await this.gitlabService.postMergeRequestNote(
          projectId,
          mergeRequestIid,
          errorComment
        );
      } catch (postError) {
        const postMessage =
          postError instanceof Error ? postError.message : 'Unknown error';
        logger.error('Failed to post error comment to GitLab', {
          projectId,
          mergeRequestIid,
          error: postMessage,
        });
      }
    }
  }
}
