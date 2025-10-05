/**
 * OpenAI Client Configuration
 *
 * Provides a singleton OpenAI client instance configured with
 * environment variables and proper error handling.
 */

import OpenAI from 'openai';
import { OpenAIError } from './errors';

/**
 * Validates that required OpenAI environment variables are set
 * @throws {OpenAIError} If API key is missing
 */
function validateEnvironment(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new OpenAIError(
      'OPENAI_API_KEY environment variable is not set. ' +
        'Please configure your OpenAI API key in the environment.'
    );
  }
}

/**
 * Creates and configures an OpenAI client instance
 * @returns Configured OpenAI client
 */
function createClient(): OpenAI {
  validateEnvironment();

  const config: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey: process.env.OPENAI_API_KEY!,
  };

  // Add organization ID if provided
  if (process.env.OPENAI_ORG_ID) {
    config.organization = process.env.OPENAI_ORG_ID;
  }

  return new OpenAI(config);
}

/**
 * Singleton OpenAI client instance
 *
 * @example
 * ```typescript
 * import { openai } from '@/lib/openai/client';
 *
 * const completion = await openai.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */
export const openai = createClient();

/**
 * Re-export OpenAI types for convenience
 */
export type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
