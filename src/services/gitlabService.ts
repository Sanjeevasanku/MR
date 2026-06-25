import { AxiosInstance } from 'axios';
import {
  ChangedFile,
  GitLabMergeRequestChangesResponse,
  IGitLabService,
} from '../types';
import { extractChangedFiles } from '../utils/diffExtractor';
import { logger } from '../utils/logger';

export class GitLabService implements IGitLabService {
  constructor(private readonly client: AxiosInstance) {}

  async getMergeRequestChanges(
    projectId: number,
    mergeRequestIid: number
  ): Promise<ChangedFile[]> {
    logger.info('Fetching Merge Request changes', { projectId, mergeRequestIid });

    const response = await this.client.get<GitLabMergeRequestChangesResponse>(
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

  async postMergeRequestNote(
    projectId: number,
    mergeRequestIid: number,
    body: string
  ): Promise<void> {
    logger.info('Posting GitLab comment', { projectId, mergeRequestIid });

    await this.client.post(
      `/projects/${projectId}/merge_requests/${mergeRequestIid}/notes`,
      { body }
    );

    logger.info('GitLab comment posted', { projectId, mergeRequestIid });
  }
}
