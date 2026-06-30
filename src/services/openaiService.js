const { parseReviewJson } = require('../utils/reviewParser');
const { logger } = require('../utils/logger');

class OpenAIService {
  constructor(client, config) {
    this.client = client;
    this.config = config;
  }

  async review(prompt) {
    logger.info('Calling Groq', { model: this.config.groq.model });

    const response = await this.client.chat.completions.create({
      model: this.config.groq.model,
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
      throw new Error('Groq returned an empty response');
    }

    logger.info('Received review from Groq');

    return parseReviewJson(content);
  }
}

module.exports = { OpenAIService };
