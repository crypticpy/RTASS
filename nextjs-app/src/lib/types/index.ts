/**
 * TypeScript Type Definitions
 * Fire Department Radio Transcription System
 *
 * Comprehensive type definitions for all backend services and data structures.
 * These types provide end-to-end type safety from database to API to frontend.
 */

import { z } from 'zod';

// ============================================================================
// INCIDENT MANAGEMENT TYPES
// ============================================================================

/**
 * Incident severity levels
 */
export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Incident status
 */
export type IncidentStatus = 'ACTIVE' | 'RESOLVED' | 'MONITORING';

/**
 * Incident type categories
 */
export type IncidentType =
  | 'Structure Fire'
  | 'Vehicle Fire'
  | 'Medical Emergency'
  | 'Hazmat'
  | 'Rescue'
  | 'Service Call'
  | 'False Alarm'
  | 'Other';

/**
 * Fire apparatus unit types
 */
export type UnitType = 'ENGINE' | 'LADDER' | 'BATTALION' | 'EMS' | 'RESCUE' | 'CHIEF';

// ============================================================================
// TRANSCRIPTION TYPES
// ============================================================================

/**
 * Supported audio file formats
 */
export type AudioFormat = 'mp3' | 'mp4' | 'm4a' | 'wav' | 'webm';

/**
 * Transcription segment with precise timing
 */
export interface TranscriptionSegment {
  id: number;
  start: number; // Start time in seconds
  end: number; // End time in seconds
  text: string;
  confidence?: number; // Whisper confidence score
  speaker?: string; // Speaker identification (future)
}

/**
 * Mayday detection result
 */
export interface MaydayDetection {
  type: 'MAYDAY';
  severity: 'CRITICAL';
  keyword: string; // The actual keyword matched
  timestamp: number | null; // Time in audio (seconds)
  context: string; // Surrounding text for context
  confidence: number; // Detection confidence (0-1)
  segment?: TranscriptionSegment;
}

/**
 * Emergency term detection
 */
export interface EmergencyTerm {
  term: string;
  category: 'MAYDAY' | 'EMERGENCY' | 'DISTRESS' | 'SAFETY' | 'EVACUATION';
  timestamp: number | null;
  context: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

/**
 * Complete transcription result
 */
export interface TranscriptionResult {
  id: string;
  incidentId: string;
  audioUrl: string;
  originalName: string;
  duration: number;
  fileSize: number;
  format: AudioFormat;
  text: string;
  segments: TranscriptionSegment[];
  metadata: TranscriptionMetadata;
  detections?: {
    mayday: MaydayDetection[];
    emergency: EmergencyTerm[];
  };
  createdAt: Date;
}

/**
 * Transcription processing metadata
 */
export interface TranscriptionMetadata {
  model: 'whisper-1'; // OpenAI model used
  language: string;
  processingTime: number; // Time to process in seconds
  averageConfidence?: number;
  qualityMetrics?: {
    signalToNoise?: number;
    clarity?: number;
  };
}

// ============================================================================
// COMPLIANCE SCORING TYPES
// ============================================================================

/**
 * Audit status
 */
export type AuditStatus = 'PASS' | 'FAIL' | 'NEEDS_IMPROVEMENT';

/**
 * Criterion status
 */
export type CriterionStatus = 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_APPLICABLE';

/**
 * Scoring method types
 */
export type ScoringMethod = 'PASS_FAIL' | 'NUMERIC' | 'CRITICAL_PASS_FAIL';

/**
 * Finding in compliance audit
 */
export interface Finding {
  timestamp: string | null;
  quote: string; // Exact transcript quote
  compliance: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
  explanation: string;
  criterionId?: string;
}

/**
 * Improvement recommendation
 */
export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  actionItems: string[];
  resources?: string[]; // References to training materials, SOPs, etc.
}

/**
 * Compliance criterion
 */
export interface ComplianceCriterion {
  id: string;
  description: string;
  evidenceRequired: string;
  scoringMethod: ScoringMethod;
  weight: number; // 0-1, relative weight within category
  status?: CriterionStatus;
  score?: number;
  rationale?: string;
  findings?: Finding[];
  recommendations?: string[];
}

/**
 * Compliance category
 */
export interface ComplianceCategory {
  id?: string; // Template category ID (optional for backwards compatibility)
  sortOrder?: number; // Category display order (optional)
  name: string;
  description: string;
  weight: number; // 0-1, relative weight in overall score
  regulatoryReferences?: string[]; // NFPA standards, OSHA regulations, etc.
  criteria: ComplianceCriterion[];
  status?: AuditStatus;
  score?: number;
  rationale?: string;
}

/**
 * Complete audit result
 */
export interface AuditResult {
  id: string;
  incidentId: string;
  transcriptId?: string;
  templateId: string;
  overallStatus: AuditStatus;
  overallScore: number | null;
  summary: string;
  categories: ComplianceCategory[];
  findings: Finding[];
  recommendations: Recommendation[];
  metadata: AuditMetadata;
  createdAt: Date;
}

/**
 * Audit processing metadata
 */
export interface AuditMetadata {
  model: 'gpt-4.1' | 'gpt-4o-mini';
  processingTime: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  additionalNotes?: string;

  // Modular audit metadata (added in modular compliance refactor)
  mode?: 'legacy' | 'modular';
  failedCategories?: string[];
  categoryTokenUsage?: Record<string, number>; // Per-category token tracking
  partialResultsSaved?: boolean;
}

// ============================================================================
// POLICY DOCUMENT CONVERSION TYPES
// ============================================================================

/**
 * Supported policy document formats
 */
export type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'md';

/**
 * Document section structure
 */
export interface DocumentSection {
  id: string;
  title: string;
  level: number; // Heading level (1-6)
  content: string;
  pageNumber?: number;
  children?: DocumentSection[];
}

/**
 * Extracted document content
 */
export interface ExtractedContent {
  text: string;
  sections: DocumentSection[];
  metadata: DocumentMetadata;
}

/**
 * Document extraction metadata
 */
export interface DocumentMetadata {
  pages?: number;
  format: DocumentFormat;
  extractedAt: string;
  characterCount: number;
  sectionCount: number;
  isScorecard?: boolean; // For Excel files
}

/**
 * Document analysis result from GPT-4o
 */
export interface DocumentAnalysis {
  categories: ComplianceCategory[];
  emergencyProcedures: string[];
  regulatoryFramework: string[];
  completeness: number; // 0-1, how complete the document appears
  confidence: number; // 0-1, AI confidence in the analysis
}

/**
 * AI-generated template
 */
export interface GeneratedTemplate {
  template: {
    name: string;
    description: string;
    version: string;
    categories: ComplianceCategory[];
    metadata: TemplateGenerationMetadata;
  };
  confidence: number;
  sourceDocuments: string[];
  processingLog: string[];
  suggestions: TemplateSuggestion[];
}

/**
 * Template generation metadata
 */
export interface TemplateGenerationMetadata {
  generatedAt: string;
  aiModel: string;
  confidence: number;
  sourceAnalysis: DocumentAnalysis;
  customInstructions?: string;
}

/**
 * AI improvement suggestion for templates
 */
export interface TemplateSuggestion {
  type: 'ENHANCEMENT' | 'ISSUE' | 'REFERENCE';
  category?: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
}

/**
 * Template generation options
 */
export interface TemplateGenerationOptions {
  templateName?: string;
  documentType?: string;
  autoDetectSections?: boolean;
  extractCriteria?: boolean;
  generateRubrics?: boolean;
  includeReferences?: boolean;
  additionalInstructions?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * API error response
 */
export interface APIError {
  error: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

/**
 * API success response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// SERVICE LAYER TYPES
// ============================================================================

/**
 * File upload result
 */
export interface FileUploadResult {
  fileName: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Job status for async operations
 */
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Async job result
 */
export interface AsyncJobResult<T> {
  jobId: string;
  status: JobStatus;
  progress?: number; // 0-100
  result?: T;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// ============================================================================
// VALIDATION SCHEMAS (Zod)
// ============================================================================

/**
 * Zod schema for audio file upload
 */
export const AudioUploadSchema = z.object({
  file: z.instanceof(File),
  incidentId: z.string().cuid().optional(),
  incidentNumber: z.string().optional(),
});

/**
 * Zod schema for transcription request
 */
export const TranscriptionRequestSchema = z.object({
  audioUrl: z.string().url(),
  incidentId: z.string().cuid(),
  language: z.string().default('en'),
  detectMayday: z.boolean().default(true),
});

/**
 * Zod schema for compliance audit request
 */
export const AuditRequestSchema = z.object({
  transcriptId: z.string().cuid(),
  templateId: z.string().cuid(),
  additionalNotes: z.string().optional(),
});

/**
 * Zod schema for template creation
 */
export const TemplateCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  categories: z.array(z.unknown()), // Complex structure, validated at service level
  source: z.string().optional(),
});

/**
 * Zod schema for incident creation
 */
export const IncidentCreateSchema = z.object({
  number: z.string().min(1),
  type: z.string(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  address: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  status: z.enum(['ACTIVE', 'RESOLVED', 'MONITORING']),
  summary: z.string().optional(),
});

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for checking if an error is an API error
 */
export function isAPIError(error: unknown): error is APIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    'message' in error &&
    'statusCode' in error
  );
}

/**
 * Type guard for checking if a response is successful
 */
export function isAPISuccess<T>(
  response: APIResponse<T>
): response is APIResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}
