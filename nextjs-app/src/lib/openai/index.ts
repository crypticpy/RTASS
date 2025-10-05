/**
 * OpenAI Integration - Main Export File
 *
 * Provides a centralized export point for all OpenAI integration utilities.
 */

// Client
export { openai } from './client';
export type { ChatCompletionMessageParam } from './client';

// Errors
export {
  OpenAIError,
  RateLimitError,
  InvalidResponseError,
  TranscriptionError,
  AnalysisError,
} from './errors';

// Utilities
export {
  retryWithBackoff,
  estimateTokens,
  handleRateLimit,
  parseJSONResponse,
  validateResponseFields,
  extractErrorMessage,
  logAPICall,
} from './utils';

// Whisper Integration
export {
  transcribeAudio,
  chunkAndTranscribe,
  formatTimestamp,
  convertToSRT,
} from './whisper';
export type {
  WhisperResponse,
  TranscriptSegment,
  TranscribeOptions,
  ProgressCallback,
} from './whisper';

// Template Generation
export {
  generateTemplateFromPolicies,
  normalizeWeights,
} from './template-generation';
export type {
  GeneratedTemplate,
  TemplateCategory,
  TemplateCriterion,
  TemplateGenerationOptions,
} from './template-generation';

// Compliance Analysis
export {
  analyzeCategory,
  generateNarrative,
  calculateOverallScore,
  extractCriticalFindings,
} from './compliance-analysis';
export type {
  IncidentContext,
  CategoryAnalysisResult,
  CriterionScore,
  Evidence,
  AuditResults,
  AnalysisOptions,
} from './compliance-analysis';
