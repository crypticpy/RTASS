/**
 * OpenAI-specific logging utilities
 * Fire Department Radio Transcription System
 *
 * Provides specialized logging functions for OpenAI API operations including
 * GPT-4.1 Responses API, Whisper transcription, token tracking, and cost estimation.
 *
 * @module lib/logging/openai-logger
 */

import { logger } from './logger';
import type { LogMetadata } from './types';

/**
 * OpenAI model pricing (January 2025)
 * Used for cost estimation in logs
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4.1': { input: 0.0025 / 1000, output: 0.010 / 1000 },
  'gpt-4o': { input: 0.0025 / 1000, output: 0.010 / 1000 },
  'gpt-4o-mini': { input: 0.00015 / 1000, output: 0.0006 / 1000 },
  'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 },
  'whisper-1': { input: 0.006 / 60, output: 0 }, // $0.006 per minute
};

/**
 * Token usage information from OpenAI API
 */
export interface OpenAITokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * OpenAI API call metadata
 */
export interface OpenAICallMetadata extends LogMetadata {
  model: string;
  operation: string;
  estimatedTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latency?: number;
  estimatedCost?: number;
  retryAttempt?: number;
  rateLimitWait?: number;
}

/**
 * Calculate estimated cost for OpenAI API usage
 *
 * @param model - OpenAI model name
 * @param usage - Token usage information
 * @returns Estimated cost in USD
 *
 * @example
 * ```typescript
 * const cost = estimateOpenAICost('gpt-4.1', {
 *   inputTokens: 500,
 *   outputTokens: 1000,
 *   totalTokens: 1500
 * });
 * // Returns: 0.0115 (USD)
 * ```
 */
export function estimateOpenAICost(
  model: string,
  usage: OpenAITokenUsage
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4.1'];
  const inputCost = usage.inputTokens * pricing.input;
  const outputCost = usage.outputTokens * pricing.output;
  return inputCost + outputCost;
}

/**
 * Log OpenAI API request (pre-call)
 *
 * Logs information about an upcoming OpenAI API call including model,
 * estimated tokens, and operation details.
 *
 * @param operation - Operation name (e.g., 'responses-create', 'whisper-transcribe')
 * @param model - OpenAI model being used
 * @param estimatedTokens - Estimated input tokens (optional)
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logOpenAIRequest('responses-create', 'gpt-4.1', 1500, {
 *   jobId: 'job_abc123',
 *   prompt: 'Analyze policy document...'
 * });
 * ```
 */
export function logOpenAIRequest(
  operation: string,
  model: string,
  estimatedTokens?: number,
  metadata: LogMetadata = {}
): void {
  logger.info('OpenAI API request initiated', {
    component: 'openai',
    operation,
    model,
    estimatedTokens,
    ...metadata,
  });
}

/**
 * Log OpenAI API response (post-call)
 *
 * Logs successful OpenAI API response with actual token usage,
 * latency, and estimated cost.
 *
 * @param operation - Operation name
 * @param model - OpenAI model used
 * @param usage - Actual token usage from API response
 * @param latency - API call duration in milliseconds
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logOpenAIResponse('responses-create', 'gpt-4.1', {
 *   inputTokens: 1500,
 *   outputTokens: 800,
 *   totalTokens: 2300
 * }, 3500, { jobId: 'job_abc123' });
 * ```
 */
export function logOpenAIResponse(
  operation: string,
  model: string,
  usage: OpenAITokenUsage,
  latency: number,
  metadata: LogMetadata = {}
): void {
  const estimatedCost = estimateOpenAICost(model, usage);

  logger.info('OpenAI API request completed', {
    component: 'openai',
    operation,
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    latency,
    estimatedCost,
    ...metadata,
  });
}

/**
 * Log OpenAI API error
 *
 * Logs failed OpenAI API calls with error details and context.
 *
 * @param operation - Operation name
 * @param model - OpenAI model being used
 * @param error - Error object or message
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logOpenAIError('responses-create', 'gpt-4.1', new Error('Rate limit exceeded'), {
 *   jobId: 'job_abc123',
 *   retryAttempt: 2
 * });
 * ```
 */
export function logOpenAIError(
  operation: string,
  model: string,
  error: Error | string,
  metadata: LogMetadata = {}
): void {
  logger.error('OpenAI API request failed', {
    component: 'openai',
    operation,
    model,
    error: error instanceof Error ? error : new Error(error),
    ...metadata,
  });
}

/**
 * Log OpenAI retry attempt
 *
 * Logs when an OpenAI API call is being retried due to rate limits or errors.
 *
 * @param operation - Operation name
 * @param model - OpenAI model
 * @param attempt - Current retry attempt number
 * @param maxRetries - Maximum retry attempts
 * @param delay - Delay before retry in milliseconds
 * @param reason - Reason for retry
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logOpenAIRetry('responses-create', 'gpt-4.1', 2, 3, 4000, 'Rate limit exceeded', {
 *   jobId: 'job_abc123'
 * });
 * ```
 */
export function logOpenAIRetry(
  operation: string,
  model: string,
  attempt: number,
  maxRetries: number,
  delay: number,
  reason: string,
  metadata: LogMetadata = {}
): void {
  logger.warn('OpenAI API retry scheduled', {
    component: 'openai',
    operation,
    model,
    retryAttempt: attempt,
    maxRetries,
    retryDelay: delay,
    retryReason: reason,
    ...metadata,
  });
}

/**
 * Log rate limit wait
 *
 * Logs when execution is paused due to rate limiting.
 *
 * @param operation - Operation name
 * @param waitTime - Time to wait in milliseconds
 * @param currentRequests - Current request count in window
 * @param maxRequests - Maximum requests allowed in window
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logRateLimitWait('responses-create', 5000, 60, 60, {
 *   jobId: 'job_abc123'
 * });
 * ```
 */
export function logRateLimitWait(
  operation: string,
  waitTime: number,
  currentRequests: number,
  maxRequests: number,
  metadata: LogMetadata = {}
): void {
  logger.warn('Rate limit wait initiated', {
    component: 'openai',
    operation,
    rateLimitWait: waitTime,
    currentRequests,
    maxRequests,
    ...metadata,
  });
}

/**
 * Wrap an OpenAI API call with automatic logging
 *
 * Automatically logs pre-call, post-call, and errors for any OpenAI operation.
 * Tracks latency and calculates costs.
 *
 * @template T - Return type of the API call
 * @param operation - Operation name
 * @param model - OpenAI model
 * @param estimatedTokens - Estimated input tokens (optional)
 * @param apiCall - Async function that makes the API call
 * @param metadata - Additional metadata
 * @returns Result of the API call
 *
 * @example
 * ```typescript
 * const result = await wrapOpenAICall(
 *   'responses-create',
 *   'gpt-4.1',
 *   1500,
 *   async () => {
 *     return await client.responses.create({
 *       model: 'gpt-4.1',
 *       input: [{ role: 'user', content: 'Analyze this...' }]
 *     });
 *   },
 *   { jobId: 'job_abc123' }
 * );
 * ```
 */
export async function wrapOpenAICall<T>(
  operation: string,
  model: string,
  estimatedTokens: number | undefined,
  apiCall: () => Promise<T>,
  metadata: LogMetadata = {}
): Promise<T> {
  const startTime = Date.now();

  // Log request initiation
  logOpenAIRequest(operation, model, estimatedTokens, metadata);

  try {
    const result = await apiCall();
    const latency = Date.now() - startTime;

    // Extract token usage from response if available
    const response = result as any;
    if (response?.usage) {
      const usage: OpenAITokenUsage = {
        inputTokens: response.usage.input_tokens || response.usage.prompt_tokens || 0,
        outputTokens: response.usage.output_tokens || response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
      };

      logOpenAIResponse(operation, model, usage, latency, metadata);
    } else {
      // Log without usage if not available
      logger.info('OpenAI API request completed (no usage data)', {
        component: 'openai',
        operation,
        model,
        latency,
        ...metadata,
      });
    }

    return result;
  } catch (error) {
    const latency = Date.now() - startTime;
    logOpenAIError(operation, model, error as Error, {
      ...metadata,
      latency,
    });
    throw error;
  }
}

/**
 * Log Whisper transcription request
 *
 * Specialized logging for Whisper audio transcription operations.
 *
 * @param audioFileName - Name of audio file being transcribed
 * @param audioSize - Size of audio file in bytes
 * @param audioDuration - Duration of audio in seconds (if known)
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logWhisperRequest('incident_audio.mp3', 5242880, 180, {
 *   incidentId: 'inc_123',
 *   format: 'mp3'
 * });
 * ```
 */
export function logWhisperRequest(
  audioFileName: string,
  audioSize: number,
  audioDuration?: number,
  metadata: LogMetadata = {}
): void {
  logger.info('Whisper transcription initiated', {
    component: 'openai',
    operation: 'whisper-transcribe',
    model: 'whisper-1',
    audioFileName,
    audioSize,
    audioDuration,
    ...metadata,
  });
}

/**
 * Log Whisper transcription completion
 *
 * @param audioFileName - Name of audio file transcribed
 * @param transcriptLength - Length of resulting transcript in characters
 * @param audioDuration - Audio duration in seconds
 * @param latency - Transcription latency in milliseconds
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logWhisperResponse('incident_audio.mp3', 5420, 180, 8500, {
 *   incidentId: 'inc_123',
 *   segmentCount: 42
 * });
 * ```
 */
export function logWhisperResponse(
  audioFileName: string,
  transcriptLength: number,
  audioDuration: number,
  latency: number,
  metadata: LogMetadata = {}
): void {
  // Calculate estimated cost (Whisper is charged per minute)
  const minutes = Math.ceil(audioDuration / 60);
  const estimatedCost = minutes * MODEL_PRICING['whisper-1'].input;

  logger.info('Whisper transcription completed', {
    component: 'openai',
    operation: 'whisper-transcribe',
    model: 'whisper-1',
    audioFileName,
    transcriptLength,
    audioDuration,
    latency,
    estimatedCost,
    ...metadata,
  });
}

/**
 * Log structured output schema validation
 *
 * Logs when OpenAI structured outputs are validated against Zod schemas.
 *
 * @param operation - Operation name
 * @param schemaName - Name of Zod schema used
 * @param success - Whether validation succeeded
 * @param errors - Validation errors (if any)
 * @param metadata - Additional metadata
 *
 * @example
 * ```typescript
 * logSchemaValidation('template-generation', 'GeneratedTemplateSchema', true, [], {
 *   jobId: 'job_abc123'
 * });
 * ```
 */
export function logSchemaValidation(
  operation: string,
  schemaName: string,
  success: boolean,
  errors: string[] = [],
  metadata: LogMetadata = {}
): void {
  if (success) {
    logger.debug('Schema validation passed', {
      component: 'openai',
      operation,
      schemaName,
      validationSuccess: true,
      ...metadata,
    });
  } else {
    logger.error('Schema validation failed', {
      component: 'openai',
      operation,
      schemaName,
      validationSuccess: false,
      validationErrors: errors,
      ...metadata,
    });
  }
}
