const { extractChangedFiles } = require('../utils/diffExtractor');
const { logger } = require('../utils/logger');

class GitLabService {
  constructor(client) {
    this.client = client;
  }

  async getMergeRequestChanges(projectId, mergeRequestIid) {
    logger.info('Fetching Merge Request changes', { projectId, mergeRequestIid });

    const response = await this.client.get(
      `/projects/${projectId}/merge_requests/${mergeRequestIid}/changes`
    );

    const changedFiles = extractChangedFiles(response.data.changes);

    logger.info('Diff retrieved', {
      projectId,
      mergeRequestIid,
      fileCount: changedFiles.length,
    });

    return changedFiles;
  }

  async postMergeRequestNote(projectId, mergeRequestIid, body) {
    logger.info('Posting GitLab comment', { projectId, mergeRequestIid });

    await this.client.post(
      `/projects/${projectId}/merge_requests/${mergeRequestIid}/notes`,
      { body }
    );

    logger.info('GitLab comment posted', { projectId, mergeRequestIid });
  }
}

module.exports = { GitLabService };
