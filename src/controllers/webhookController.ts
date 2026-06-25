import { Request, Response } from 'express';
import { GitLabWebhookPayload, IReviewService } from '../types';
import { logger } from '../utils/logger';

const REVIEWABLE_ACTIONS = new Set(['open', 'reopen', 'update']);

export class WebhookController {
  constructor(private readonly reviewService: IReviewService) {}

  handleGitLabWebhook = (req: Request, res: Response): void => {
    logger.info('Webhook received', {
      objectKind: req.body?.object_kind,
    });

    res.status(200).json({ status: 'accepted' });

    const payload = req.body as GitLabWebhookPayload;

    if (!this.isReviewableMergeRequest(payload)) {
      logger.info('Webhook ignored: not a reviewable merge request event', {
        objectKind: payload.object_kind,
        action: payload.object_attributes?.action,
      });
      return;
    }

    const projectId = payload.project?.id;
    const mergeRequestIid = payload.object_attributes?.iid;

    if (!projectId || !mergeRequestIid) {
      logger.warn('Webhook payload missing project ID or merge request IID');
      return;
    }

    void this.reviewService
      .processMergeRequest({ projectId, mergeRequestIid })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        logger.error('Unhandled error in review pipeline', { error: message });
      });
  };

  private isReviewableMergeRequest(payload: GitLabWebhookPayload): boolean {
    if (payload.object_kind !== 'merge_request') {
      return false;
    }

    const action = payload.object_attributes?.action;
    if (!action || !REVIEWABLE_ACTIONS.has(action)) {
      return false;
    }

    return true;
  }
}
