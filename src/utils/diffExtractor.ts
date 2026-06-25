import { ChangedFile, GitLabMergeRequestChange } from '../types';

export function extractChangedFiles(changes: GitLabMergeRequestChange[]): ChangedFile[] {
  return changes
    .filter((change) => !change.deleted_file)
    .filter((change) => change.diff && change.diff.trim().length > 0)
    .map((change) => ({
      fileName: change.new_path || change.old_path,
      diff: change.diff,
    }));
}
