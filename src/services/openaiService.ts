import OpenAI from 'openai';
import { AppConfig, IOpenAIService, ReviewResult } from '../types';
import { parseReviewJson } from '../utils/reviewParser';
import { logger } from '../utils/logger';

export class OpenAIService implements IOpenAIService {
  constructor(
    private readonly client: OpenAI,
    private readonly config: AppConfig
  ) {}

  async review(prompt: string): Promise<ReviewResult> {
    logger.info('Calling GPT', { model: this.config.openai.model });

    const response = await this.client.chat.completions.create({
      model: this.config.openai.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response');
    }

    logger.info('Received review from GPT');

    return parseReviewJson(content);
  }
}
