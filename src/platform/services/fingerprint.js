function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildFindingFingerprint(finding) {
  const file = normalizeText(finding.file);
  const issue = normalizeText(finding.issue);
  const severity = normalizeText(finding.severity);
  return `${file}|${issue}|${severity}`;
}

module.exports = { buildFindingFingerprint };
