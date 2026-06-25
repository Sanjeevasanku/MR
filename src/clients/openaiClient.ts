import OpenAI from 'openai';
import { AppConfig } from '../types';

export function createOpenAIClient(config: AppConfig): OpenAI {
  return new OpenAI({
    apiKey: config.openai.apiKey,
  });
}
