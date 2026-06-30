const { Project, MergeRequest, Scan, Finding } = require('../models');
const { buildFindingFingerprint } = require('./fingerprint');

async function ingestScan(payload) {
  const {
    gitlabProjectId,
    projectName,
    projectPath,
    projectWebUrl,
    mergeRequestIid,
    mrTitle,
    sourceBranch,
    targetBranch,
    mrWebUrl,
    summary,
    model,
    findings = [],
  } = payload;

  let project = await Project.findOne({ gitlabProjectId });
  if (!project) {
    project = await Project.create({
      gitlabProjectId,
      name: projectName,
      pathWithNamespace: projectPath,
      webUrl: projectWebUrl,
    });
  } else {
    project.name = projectName ?? project.name;
    project.pathWithNamespace = projectPath ?? project.pathWithNamespace;
    project.webUrl = projectWebUrl ?? project.webUrl;
    await project.save();
  }

  let mergeRequest = await MergeRequest.findOne({ gitlabProjectId, iid: mergeRequestIid });
  if (!mergeRequest) {
    mergeRequest = await MergeRequest.create({
      projectId: project._id,
      gitlabProjectId,
      iid: mergeRequestIid,
      title: mrTitle,
      sourceBranch,
      targetBranch,
      webUrl: mrWebUrl,
    });
  } else {
    mergeRequest.title = mrTitle ?? mergeRequest.title;
    mergeRequest.sourceBranch = sourceBranch ?? mergeRequest.sourceBranch;
    mergeRequest.targetBranch = targetBranch ?? mergeRequest.targetBranch;
    mergeRequest.webUrl = mrWebUrl ?? mergeRequest.webUrl;
    await mergeRequest.save();
  }

  const scan = await Scan.create({
    projectId: project._id,
    mergeRequestId: mergeRequest._id,
    gitlabProjectId,
    mergeRequestIid,
    summary,
    model,
    findingCount: findings.length,
  });

  const findingDocs = [];
  const scanFingerprints = new Set();
  for (const f of findings) {
    const fingerprint = buildFindingFingerprint(f);
    scanFingerprints.add(fingerprint);
    const doc = await Finding.create({
      scanId: scan._id,
      projectId: project._id,
      mergeRequestId: mergeRequest._id,
      gitlabProjectId,
      mergeRequestIid,
      sourceBranch,
      targetBranch,
      severity: f.severity,
      file: f.file,
      issue: f.issue,
      explanation: f.explanation,
      suggestedFix: f.suggestedFix,
      fingerprint,
      status: 'open',
    });
    findingDocs.push(doc);
  }

  if (sourceBranch) {
    const pendingFindings = await Finding.find({
      projectId: project._id,
      status: 'open',
      'verification.state': 'pending',
      'verification.branch': sourceBranch,
    });

    for (const pendingFinding of pendingFindings) {
      if (!pendingFinding.fingerprint) {
        pendingFinding.fingerprint = buildFindingFingerprint(pendingFinding);
      }

      pendingFinding.verification = {
        ...(pendingFinding.verification || {}),
        state: scanFingerprints.has(pendingFinding.fingerprint) ? 'pending' : 'confirmed',
        lastCheckedAt: new Date(),
        confirmedAt: scanFingerprints.has(pendingFinding.fingerprint)
          ? pendingFinding.verification?.confirmedAt
          : new Date(),
      };

      if (!scanFingerprints.has(pendingFinding.fingerprint)) {
        pendingFinding.status = 'fixed';
      }

      await pendingFinding.save();
    }
  }

  return { scan, findings: findingDocs, project, mergeRequest };
}

module.exports = { ingestScan };
