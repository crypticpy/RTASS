/**
 * Custom error types for OpenAI integration
 *
 * These errors provide specific handling for different failure modes
 * in OpenAI API interactions.
 */

/**
 * Base error class for all OpenAI-related errors
 */
export class OpenAIError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'OpenAIError';
    Object.setPrototypeOf(this, OpenAIError.prototype);
  }
}

/**
 * Error thrown when OpenAI API rate limits are exceeded
 */
export class RateLimitError extends OpenAIError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Error thrown when OpenAI API returns invalid or unparseable response
 */
export class InvalidResponseError extends OpenAIError {
  constructor(
    message: string,
    public readonly response?: unknown,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = 'InvalidResponseError';
    Object.setPrototypeOf(this, InvalidResponseError.prototype);
  }
}

/**
 * Error thrown during audio transcription operations
 */
export class TranscriptionError extends OpenAIError {
  constructor(
    message: string,
    public readonly audioPath?: string,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = 'TranscriptionError';
    Object.setPrototypeOf(this, TranscriptionError.prototype);
  }
}

/**
 * Error thrown during policy or compliance analysis operations
 */
export class AnalysisError extends OpenAIError {
  constructor(
    message: string,
    public readonly context?: string,
    cause?: unknown
  ) {
    super(message, cause);
    this.name = 'AnalysisError';
    Object.setPrototypeOf(this, AnalysisError.prototype);
  }
}
