const { mongoose } = require('../db');

const projectSchema = new mongoose.Schema(
  {
    gitlabProjectId: { type: Number, required: true, unique: true },
    name: String,
    pathWithNamespace: String,
    webUrl: String,
  },
  { timestamps: true }
);

const mergeRequestSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    gitlabProjectId: { type: Number, required: true },
    iid: { type: Number, required: true },
    title: String,
    sourceBranch: String,
    targetBranch: String,
    webUrl: String,
  },
  { timestamps: true }
);

mergeRequestSchema.index({ gitlabProjectId: 1, iid: 1 }, { unique: true });

const scanSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    mergeRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'MergeRequest', required: true },
    gitlabProjectId: { type: Number, required: true },
    mergeRequestIid: { type: Number, required: true },
    summary: String,
    model: String,
    findingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const findingSchema = new mongoose.Schema(
  {
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scan', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    mergeRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'MergeRequest', required: true },
    gitlabProjectId: { type: Number, required: true },
    mergeRequestIid: { type: Number, required: true },
    sourceBranch: String,
    targetBranch: String,
    severity: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], required: true },
    file: String,
    issue: String,
    explanation: String,
    suggestedFix: String,
    fingerprint: { type: String, index: true },
    status: {
      type: String,
      enum: ['open', 'fix_pending', 'fixed', 'false_positive', 'wont_fix'],
      default: 'open',
    },
    verification: {
      state: {
        type: String,
        enum: ['none', 'pending', 'confirmed'],
        default: 'none',
      },
      branch: String,
      startedAt: Date,
      confirmedAt: Date,
      lastCheckedAt: Date,
    },
  },
  { timestamps: true }
);

const fixRunSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    gitlabProjectId: { type: Number, required: true },
    sourceMrIid: { type: Number, required: true },
    findingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Finding' }],
    fixBranch: String,
    newMrIid: Number,
    newMrUrl: String,
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    results: [
      {
        findingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Finding' },
        applied: Boolean,
        error: String,
      },
    ],
    errorMessage: String,
  },
  { timestamps: true }
);

const Project = mongoose.model('Project', projectSchema);
const MergeRequest = mongoose.model('MergeRequest', mergeRequestSchema);
const Scan = mongoose.model('Scan', scanSchema);
const Finding = mongoose.model('Finding', findingSchema);
const FixRun = mongoose.model('FixRun', fixRunSchema);

module.exports = { Project, MergeRequest, Scan, Finding, FixRun };
