const { logger } = require('../utils/logger');

class ReviewService {
  constructor(gitlabService, promptService, openaiService, commentFormatter, ingestScan, config) {
    this.gitlabService = gitlabService;
    this.promptService = promptService;
    this.openaiService = openaiService;
    this.commentFormatter = commentFormatter;
    this.ingestScan = ingestScan;
    this.config = config;
  }

  async processMergeRequest(context) {
    const {
      projectId,
      mergeRequestIid,
      projectName,
      projectPath,
      projectWebUrl,
      mrTitle,
      sourceBranch,
      targetBranch,
      mrWebUrl,
    } = context;

    logger.info('Starting review pipeline', { projectId, mergeRequestIid });

    try {
      const changedFiles = await this.gitlabService.getMergeRequestChanges(
        projectId,
        mergeRequestIid
      );

      if (changedFiles.length === 0) {
        logger.info('No reviewable changes found', { projectId, mergeRequestIid });
        const emptyReview = {
          summary: 'No reviewable file changes detected (deleted or empty diffs were skipped).',
          findings: [],
        };
        await this.gitlabService.postMergeRequestNote(
          projectId,
          mergeRequestIid,
          this.commentFormatter.format(emptyReview)
        );
        await this.ingestToPlatform({
          projectId,
          mergeRequestIid,
          projectName,
          projectPath,
          projectWebUrl,
          mrTitle,
          sourceBranch,
          targetBranch,
          mrWebUrl,
          review: emptyReview,
        });
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

      await this.ingestToPlatform({
        projectId,
        mergeRequestIid,
        projectName,
        projectPath,
        projectWebUrl,
        mrTitle,
        sourceBranch,
        targetBranch,
        mrWebUrl,
        review,
      });

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

  async ingestToPlatform(meta) {
    if (!this.ingestScan) {
      return;
    }

    try {
      await this.ingestScan({
        gitlabProjectId: meta.projectId,
        projectName: meta.projectName,
        projectPath: meta.projectPath,
        projectWebUrl: meta.projectWebUrl,
        mergeRequestIid: meta.mergeRequestIid,
        mrTitle: meta.mrTitle,
        sourceBranch: meta.sourceBranch,
        targetBranch: meta.targetBranch,
        mrWebUrl: meta.mrWebUrl,
        summary: meta.review.summary,
        model: this.config.groq.model,
        findings: meta.review.findings,
      });
      logger.info('Findings saved to dashboard', {
        projectId: meta.projectId,
        mergeRequestIid: meta.mergeRequestIid,
        findingCount: meta.review.findings.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Dashboard ingest failed (GitLab review was still posted)', {
        error: message,
      });
    }
  }
}

module.exports = { ReviewService };
