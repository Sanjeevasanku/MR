import { ReviewResult, FindingSeverity } from '../types';

const VALID_SEVERITIES: FindingSeverity[] = ['HIGH', 'MEDIUM', 'LOW'];

export function parseReviewJson(raw: string): ReviewResult {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse AI review response as JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI review response is not a valid object');
  }

  const obj = parsed as Record<string, unknown>;

  const summary = typeof obj.summary === 'string' ? obj.summary : 'No summary provided.';
  const findings = Array.isArray(obj.findings)
    ? obj.findings.map(normalizeFinding)
    : [];

  return { summary, findings };
}

function normalizeFinding(item: unknown): ReviewResult['findings'][number] {
  if (!item || typeof item !== 'object') {
    return {
      severity: 'LOW',
      file: 'unknown',
      issue: 'Invalid finding format',
      explanation: 'The AI returned a malformed finding entry.',
      suggestedFix: 'Review the diff manually.',
    };
  }

  const f = item as Record<string, unknown>;
  const severity = VALID_SEVERITIES.includes(f.severity as FindingSeverity)
    ? (f.severity as FindingSeverity)
    : 'LOW';

  return {
    severity,
    file: typeof f.file === 'string' ? f.file : 'unknown',
    issue: typeof f.issue === 'string' ? f.issue : 'Unspecified issue',
    explanation: typeof f.explanation === 'string' ? f.explanation : '',
    suggestedFix: typeof f.suggestedFix === 'string' ? f.suggestedFix : '',
  };
}
