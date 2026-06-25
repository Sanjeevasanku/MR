export interface AppConfig {
  port: number;
  nodeEnv: string;
  gitlab: {
    baseUrl: string;
    token: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
}

export interface ChangedFile {
  fileName: string;
  diff: string;
}

export type FindingSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ReviewFinding {
  severity: FindingSeverity;
  file: string;
  issue: string;
  explanation: string;
  suggestedFix: string;
}

export interface ReviewResult {
  summary: string;
  findings: ReviewFinding[];
}

export interface MergeRequestContext {
  projectId: number;
  mergeRequestIid: number;
}

export interface GitLabMergeRequestChange {
  old_path: string;
  new_path: string;
  diff: string;
  deleted_file: boolean;
  new_file: boolean;
  renamed_file: boolean;
}

export interface GitLabMergeRequestChangesResponse {
  changes: GitLabMergeRequestChange[];
}

export interface GitLabWebhookPayload {
  object_kind: string;
  object_attributes?: {
    iid?: number;
    action?: string;
    state?: string;
  };
  project?: {
    id?: number;
  };
}

export interface IGitLabService {
  getMergeRequestChanges(projectId: number, mergeRequestIid: number): Promise<ChangedFile[]>;
  postMergeRequestNote(projectId: number, mergeRequestIid: number, body: string): Promise<void>;
}

export interface IPromptService {
  buildPrompt(changedFiles: ChangedFile[]): string;
}

export interface IOpenAIService {
  review(prompt: string): Promise<ReviewResult>;
}

export interface ICommentFormatter {
  format(review: ReviewResult): string;
  formatError(message: string): string;
}

export interface IReviewService {
  processMergeRequest(context: MergeRequestContext): Promise<void>;
}
