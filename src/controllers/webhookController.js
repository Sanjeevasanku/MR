const { logger } = require('../utils/logger');

const REVIEWABLE_ACTIONS = new Set(['open', 'reopen', 'update']);

class WebhookController {
  constructor(reviewService, config) {
    this.reviewService = reviewService;
    this.config = config;

    this.handleGitLabWebhook = (req, res) => {
      const payload = req.body ?? {};
      logger.info('Webhook received', {
        objectKind: payload.object_kind,
      });

      const ignoreReason = this.getIgnoreReason(payload);
      if (ignoreReason) {
        const labels = this.extractLabels(payload);
        logger.info('Webhook ignored: not a reviewable merge request event', {
          objectKind: payload.object_kind,
          action: payload.object_attributes?.action,
          labels,
          reason: ignoreReason,
        });
        res.status(200).json({ status: 'accepted', processed: false, reason: ignoreReason });
        return;
      }

      const projectId = payload.project?.id;
      const mergeRequestIid = payload.object_attributes?.iid;

      if (!projectId || !mergeRequestIid) {
        logger.warn('Webhook payload missing project ID or merge request IID');
        res.status(200).json({
          status: 'accepted',
          processed: false,
          reason: 'missing_project_or_mr_id',
        });
        return;
      }

      res.status(200).json({ status: 'accepted', processed: true });

      void this.reviewService
        .processMergeRequest({
          projectId,
          mergeRequestIid,
          projectName: payload.project?.name,
          projectPath: payload.project?.path_with_namespace,
          projectWebUrl: payload.project?.web_url,
          mrTitle: payload.object_attributes?.title,
          sourceBranch: payload.object_attributes?.source_branch,
          targetBranch: payload.object_attributes?.target_branch,
          mrWebUrl: payload.object_attributes?.url,
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          logger.error('Unhandled error in review pipeline', { error: message });
        });
    };
  }

  getIgnoreReason(payload) {
    if (payload.object_kind !== 'merge_request') {
      return 'not_merge_request_event';
    }

    const action = payload.object_attributes?.action;
    if (!action || !REVIEWABLE_ACTIONS.has(action)) {
      return 'action_not_reviewable';
    }

    if (this.config?.reviewTrigger?.requireAnalysisLabel) {
      const labels = this.extractLabels(payload);
      const requiredLabel = this.config.reviewTrigger.analysisLabel;
      if (!labels.includes(requiredLabel)) {
        return 'missing_analysis_label';
      }
    }

    return null;
  }

  extractLabels(payload) {
    const normalize = (value) => String(value || '').trim().toLowerCase();
    const collect = (arr) =>
      (Array.isArray(arr) ? arr : [])
        .map((item) => {
          if (typeof item === 'string') return normalize(item);
          if (item && typeof item === 'object') {
            return normalize(item.title || item.name);
          }
          return '';
        })
        .filter(Boolean);

    const labels = [
      ...collect(payload.object_attributes?.labels),
      ...collect(payload.labels),
    ];
    return [...new Set(labels)];
  }
}

module.exports = { WebhookController };
