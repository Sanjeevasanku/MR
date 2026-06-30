const OpenAI = require('openai');

function createGroqClient(config) {
  return new OpenAI({
    apiKey: config.groq.apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

const FIX_PROMPT = `You are a code repair agent. Apply ONLY the fix described below.
Return the complete fixed file content. No markdown, no code fences, no explanation — only raw file content.

Issue: {{issue}}
Explanation: {{explanation}}
Suggested fix: {{suggestedFix}}

Current file ({{filePath}}):
{{fileContent}}`;

async function generateFixedFile(client, config, finding, fileContent) {
  const prompt = FIX_PROMPT.replace('{{issue}}', finding.issue)
    .replace('{{explanation}}', finding.explanation)
    .replace('{{suggestedFix}}', finding.suggestedFix)
    .replace('{{filePath}}', finding.file)
    .replace('{{fileContent}}', fileContent);

  const response = await client.chat.completions.create({
    model: config.groq.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
  });

  let content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Groq returned an empty fix');
  }

  content = content.replace(/^```[\w]*\n?/i, '').replace(/\n?```$/i, '').trim();
  return content;
}

module.exports = { createGroqClient, generateFixedFile };
