const OpenAI = require('openai');

function createOpenAIClient(config) {
  return new OpenAI({
    apiKey: config.groq.apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

module.exports = { createOpenAIClient };
