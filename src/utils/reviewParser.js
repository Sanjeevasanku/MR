const VALID_SEVERITIES = ['HIGH', 'MEDIUM', 'LOW'];

function parseReviewJson(raw) {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI review response as JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI review response is not a valid object');
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary : 'No summary provided.';
  const findings = Array.isArray(parsed.findings)
    ? parsed.findings.map(normalizeFinding)
    : [];

  return { summary, findings };
}

function normalizeFinding(item) {
  if (!item || typeof item !== 'object') {
    return {
      severity: 'LOW',
      file: 'unknown',
      issue: 'Invalid finding format',
      explanation: 'The AI returned a malformed finding entry.',
      suggestedFix: 'Review the diff manually.',
    };
  }

  const severity = VALID_SEVERITIES.includes(item.severity)
    ? item.severity
    : 'LOW';

  return {
    severity,
    file: typeof item.file === 'string' ? item.file : 'unknown',
    issue: typeof item.issue === 'string' ? item.issue : 'Unspecified issue',
    explanation: typeof item.explanation === 'string' ? item.explanation : '',
    suggestedFix: typeof item.suggestedFix === 'string' ? item.suggestedFix : '',
  };
}

module.exports = { parseReviewJson };
