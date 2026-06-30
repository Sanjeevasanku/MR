const { createGitLabClient } = require('../clients/gitlabClient');
const { encodeFilePath, isBlockedPath } = require('./gitlab');
const { createGroqClient, generateFixedFile } = require('./groq');

function validateFindings(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    throw new Error('No findings were provided for fix run');
  }
  const first = findings[0];
  for (const finding of findings) {
    if (finding.gitlabProjectId !== first.gitlabProjectId) {
      throw new Error('Selected findings belong to different projects');
    }
    if (finding.mergeRequestIid !== first.mergeRequestIid) {
      throw new Error('Selected findings belong to different merge requests');
    }
    if ((finding.sourceBranch || '') !== (first.sourceBranch || '')) {
      throw new Error('Selected findings belong to different source branches');
    }
  }
}

async function applyFindingToBranch(client, groq, config, finding, fixBranch) {
  if (!finding.file) {
    return { findingId: finding._id, applied: false, error: 'Finding has no file path' };
  }

  if (isBlockedPath(finding.file)) {
    return { findingId: finding._id, applied: false, error: `Fixing ${finding.file} is not allowed` };
  }

  const filePath = encodeFilePath(finding.file);
  let fileResponse;
  try {
    fileResponse = await client.get(
      `/projects/${finding.gitlabProjectId}/repository/files/${filePath}`,
      { params: { ref: fixBranch } }
    );
  } catch (error) {
    const status = error.response?.status;
    return {
      findingId: finding._id,
      applied: false,
      error:
        status === 404
          ? `File not found on branch ${fixBranch}: ${finding.file}`
          : `Failed to fetch file: ${error.message}`,
    };
  }

  const fileContent = Buffer.from(fileResponse.data.content, 'base64').toString('utf8');
  const fixedContent = await generateFixedFile(groq, config, finding, fileContent);
  if (!fixedContent || fixedContent.trim().length === 0) {
    return { findingId: finding._id, applied: false, error: 'Fix model returned empty content' };
  }

  try {
    await client.put(
      `/projects/${finding.gitlabProjectId}/repository/files/${filePath}`,
      {
        branch: fixBranch,
        content: fixedContent,
        commit_message: `fix(ai): ${finding.issue} (${finding.file})`,
      }
    );
  } catch (error) {
    const raw = error.response?.data?.message || error.message;
    return { findingId: finding._id, applied: false, error: `Commit failed: ${raw}` };
  }

  return { findingId: finding._id, applied: true, error: null };
}

async function executeFixBatch(config, findings) {
  validateFindings(findings);
  const client = createGitLabClient(config);
  const groq = createGroqClient(config);
  const base = findings[0];

  const branch = base.sourceBranch;
  if (!branch) {
    throw new Error('Source branch not available for selected findings');
  }

  const timestamp = Date.now();
  const fixBranch = `ai-fix/mr-${base.mergeRequestIid}-${timestamp}`;

  await client.post(`/projects/${base.gitlabProjectId}/repository/branches`, {
    branch: fixBranch,
    ref: branch,
  });

  const results = [];
  for (const finding of findings) {
    const result = await applyFindingToBranch(client, groq, config, finding, fixBranch);
    results.push(result);
  }

  const appliedCount = results.filter((r) => r.applied).length;
  if (appliedCount === 0) {
    const reasons = results.map((r) => `${r.findingId}: ${r.error}`).join(' | ');
    throw new Error(`No fixes were applied. ${reasons}`);
  }

  const targetBranch = base.targetBranch ?? 'main';
  const mrResponse = await client.post(`/projects/${base.gitlabProjectId}/merge_requests`, {
    source_branch: fixBranch,
    target_branch: targetBranch,
    title: `[AI Fix] ${appliedCount} issue(s) from MR !${base.mergeRequestIid}`,
    description: [
      '## AI-generated fix',
      '',
      `- **Original MR:** !${base.mergeRequestIid}`,
      `- **Requested issues:** ${findings.length}`,
      `- **Applied fixes:** ${appliedCount}`,
      '',
      '### Requested issues',
      ...findings.map((f) => `- \`${f.file}\` (${f.severity}) ${f.issue}`),
      '',
      '### Per-issue result',
      ...results.map((r) => `- ${r.applied ? 'APPLIED' : 'SKIPPED'} \`${r.findingId}\`${r.error ? `: ${r.error}` : ''}`),
    ].join('\n'),
  });

  const newMr = mrResponse.data;

  try {
    await client.post(
      `/projects/${base.gitlabProjectId}/merge_requests/${base.mergeRequestIid}/notes`,
      {
        body: `🤖 AI fix MR opened for ${appliedCount} issue(s): [!${newMr.iid} ${newMr.title}](${newMr.web_url})`,
      }
    );
  } catch {
    // Non-fatal for POC
  }

  return {
    applied: appliedCount > 0,
    appliedCount,
    requestedCount: findings.length,
    fixBranch,
    newMrIid: newMr.iid,
    newMrUrl: newMr.web_url,
    results,
  };
}

async function executeFix(config, finding) {
  return executeFixBatch(config, [finding]);
}

module.exports = { executeFix, executeFixBatch };
