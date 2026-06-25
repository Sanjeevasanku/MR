import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    gitlab: {
      baseUrl: (process.env.GITLAB_BASE_URL ?? 'https://gitlab.com').replace(/\/$/, ''),
      token: requireEnv('GITLAB_TOKEN'),
    },
    openai: {
      apiKey: requireEnv('OPENAI_API_KEY'),
      model: process.env.OPENAI_MODEL ?? 'gpt-4o',
    },
  };
}
