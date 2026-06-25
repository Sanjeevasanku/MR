import { ChangedFile, IPromptService } from '../types';

const SYSTEM_INSTRUCTION = `You are an experienced software engineer performing a code review.
Analyze the provided merge request diff and identify:
- Bugs
- Security issues
- Performance problems
- Code smells
- Missing tests

Respond ONLY with valid JSON matching this exact schema:
{
  "summary": "Brief overall assessment of the changes",
  "findings": [
    {
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "file": "path/to/file",
      "issue": "Short title of the issue",
      "explanation": "Detailed explanation of why this is a problem",
      "suggestedFix": "Concrete suggestion to fix the issue"
    }
  ]
}

If no issues are found, return an empty findings array with a positive summary.
Do not include markdown, code fences, or any text outside the JSON object.`;

export class PromptService implements IPromptService {
  buildPrompt(changedFiles: ChangedFile[]): string {
    const fileSections = changedFiles
      .map(
        (file) =>
          `### File: ${file.fileName}\n\`\`\`diff\n${file.diff}\n\`\`\``
      )
      .join('\n\n');

    return `${SYSTEM_INSTRUCTION}

## Merge Request Changes

${fileSections}`;
  }
}
