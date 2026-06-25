import { FindingSeverity, ICommentFormatter, ReviewResult } from '../types';

const SEVERITY_ORDER: FindingSeverity[] = ['HIGH', 'MEDIUM', 'LOW'];

export class CommentFormatter implements ICommentFormatter {
  format(review: ReviewResult): string {
    const lines: string[] = [
      '# AI Review Summary',
      '',
      review.summary,
      '',
    ];

    if (review.findings.length === 0) {
      lines.push('No issues found. Great work!');
      return lines.join('\n');
    }

    lines.push('## Findings', '');

    for (const severity of SEVERITY_ORDER) {
      const findings = review.findings.filter((f) => f.severity === severity);
      if (findings.length === 0) continue;

      lines.push(`### ${severity}`, '');

      for (const finding of findings) {
        lines.push(
          `**${finding.issue}** (\`${finding.file}\`)`,
          '',
          finding.explanation,
          '',
          `**Suggested Fix:** ${finding.suggestedFix}`,
          ''
        );
      }
    }

    return lines.join('\n').trim();
  }

  formatError(message: string): string {
    return [
      '# AI Review Summary',
      '',
      '⚠️ The automated review could not be completed.',
      '',
      message,
    ].join('\n');
  }
}
