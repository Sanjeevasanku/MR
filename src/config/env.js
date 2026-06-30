const dotenv = require('dotenv');

dotenv.config();

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function loadConfig() {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    gitlab: {
      baseUrl: (process.env.GITLAB_BASE_URL ?? 'https://gitlab.com').replace(/\/$/, ''),
      token: requireEnv('GITLAB_TOKEN'),
    },
    groq: {
      apiKey: requireEnv('GROQ_API_KEY'),
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    },
    mongodb: {
      uri: process.env.MONGODB_URI || null,
    },
    reviewTrigger: {
      requireAnalysisLabel: (process.env.REQUIRE_ANALYSIS_LABEL ?? 'true').toLowerCase() !== 'false',
      analysisLabel: (process.env.ANALYSIS_LABEL ?? 'analysis').trim().toLowerCase(),
    },
  };
}

module.exports = { loadConfig };
