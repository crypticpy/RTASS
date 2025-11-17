/**
 * Logging infrastructure exports.
 *
 * Main entry point for the logging system. Import logger and utilities
 * from this module throughout the application.
 */

// Core logger
export { logger, createLogger, LogLevel } from './logger';

// Context management
export {
  runWithContext,
  runWithContextAsync,
  withRequestContext,
  getContext,
  getCorrelationId,
  getJobId,
  setJobId,
  updateContextMetadata,
  getRequestDuration,
  generateCorrelationId,
  generateJobId,
} from './context';

// Types
export type {
  LogEntry,
  LogMetadata,
  LogTransport,
  LoggerConfig,
  RequestContext,
  SerializedError,
} from './types';

export { LOG_LEVEL_PRIORITY } from './types';

// Formatters (for custom transports)
export { formatJson, formatHuman, formatDatabase } from './formatters';

// Transports (for custom configurations)
export { ConsoleTransport, DatabaseTransport, FileTransport } from './transports';

// Configuration
export { createDefaultConfig, CONFIG } from './config';

// Specialized loggers - OpenAI logger
export {
  estimateOpenAICost,
  logOpenAIRequest,
  logOpenAIResponse,
  logOpenAIError,
  logOpenAIRetry,
  logRateLimitWait,
  wrapOpenAICall,
  logWhisperRequest,
  logWhisperResponse,
  logSchemaValidation as logOpenAISchemaValidation,
  type OpenAITokenUsage,
  type OpenAICallMetadata,
} from './openai-logger';

// Specialized loggers - Template logger
export {
  logTemplateWorkflowStart,
  logTemplateWorkflowStep,
  logTemplateWorkflowComplete,
  logTemplateWorkflowError,
  logCategoryDiscovery,
  logCriteriaGeneration,
  logWeightNormalization,
  logSchemaValidation as logTemplateSchemaValidation,
  logFullContextPrompt,
  logAIResponseParsing,
  logTemplateValidation,
  logAutoFix,
  logSuggestionGeneration,
  type TemplateWorkflowStep,
  type TemplateWorkflowMetadata,
} from './template-logger';

// Specialized loggers - Compliance logger
export * from './compliance-logger';
