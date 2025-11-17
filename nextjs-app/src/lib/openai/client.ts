/**
 * OpenAI Client Configuration
 *
 * Provides a singleton OpenAI client instance configured with
 * production-ready timeouts, retries, and error handling.
 *
 * ## Timeout Configuration
 *
 * The client uses different timeout values based on operation type:
 * - **Default**: 2 minutes (120,000ms) - General operations
 * - **Whisper**: 5 minutes (300,000ms) - Large audio file transcription
 * - **GPT-4.1**: 3 minutes (180,000ms) - Complex compliance analysis
 *
 * Per-request timeouts override the default and should be specified
 * in the options parameter of each API call.
 *
 * ## Retry Configuration
 *
 * - **maxRetries**: 3 (increased from OpenAI SDK default of 2)
 * - **Backoff**: Exponential backoff (automatic via SDK)
 * - **Retryable errors**: 429, 500, 502, 503, 504 (automatic via SDK)
 *
 * The SDK automatically retries these errors with exponential backoff,
 * preventing thundering herd problems during outages.
 *
 * @module lib/openai/client
 */

import OpenAI from 'openai';
import { File as NodeFile } from 'node:buffer';
import { OpenAIError } from './errors';
import { logger } from '@/lib/logging';

if (typeof globalThis.File === 'undefined') {
  (globalThis as any).File = NodeFile;
}

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
 * Creates and configures an OpenAI client instance with production settings
 *
 * @returns Configured OpenAI client with explicit timeouts and retry logic
 *
 * @example
 * ```typescript
 * const client = createClient();
 *
 * // Use default 2-minute timeout
 * const response = await client.responses.create({...});
 *
 * // Override with per-request timeout (5 minutes for Whisper)
 * const transcription = await client.audio.transcriptions.create(
 *   {...},
 *   { timeout: 5 * 60 * 1000 }
 * );
 * ```
 */
function createClient(): OpenAI {
  validateEnvironment();

  const config: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey: process.env.OPENAI_API_KEY!,
    maxRetries: 3, // Increased from SDK default of 2 for better resilience
    timeout: 2 * 60 * 1000, // 2 minutes default (down from SDK default of 10 minutes!)
  };

  // Add organization ID if provided
  if (process.env.OPENAI_ORG_ID) {
    config.organization = process.env.OPENAI_ORG_ID;
  }

  const client = new OpenAI(config);

  // Log client initialization with configuration details
  logger.info('OpenAI client initialized', {
    component: 'openai-client',
    maxRetries: config.maxRetries,
    defaultTimeout: config.timeout,
    hasOrganization: !!config.organization,
  });

  return client;
}

/**
 * Singleton OpenAI client instance
 *
 * @example
 * ```typescript
 * import { openai } from '@/lib/openai/client';
 *
 * const response = await openai.responses.create({
 *   model: 'gpt-4.1',
 *   input: [
 *     { role: 'user', content: 'Hello!' }
 *   ],
 * });
 * ```
 */
export const openai = createClient();

/**
 * Re-export OpenAI types for convenience
 */
export type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
