/**
 * Policy & Template Management Types
 * Shared types for the Policy Upload and Template Management system
 */

export type TemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface PolicyDocument {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  pages: number;
  size: number; // bytes
  uploadedAt: Date;
}

export interface TemplateCriterion {
  id: string;
  description: string;
  scoringGuidance: string;
  sourcePageNumber?: number;
  sourceText?: string;
  examplePass?: string;
  exampleFail?: string;
  sortOrder: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  weight: number; // 0.0 to 1.0, sum must equal 1.0
  sortOrder: number;
  criteria: TemplateCriterion[];
  analysisPrompt: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;

  // AI generation metadata
  aiGenerated: boolean;
  aiConfidence?: number; // 0.0 to 1.0
  aiGeneratedAt?: Date;

  // Source documents
  policyDocuments: PolicyDocument[];

  // Template structure
  categories: TemplateCategory[];

  // Usage statistics
  usageCount: number;
  averageScore?: number;
  lastUsedAt?: Date;
}

export interface TemplateGenerationProgress {
  stage: 'parsing' | 'extracting' | 'rubrics' | 'prompts' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // seconds
  currentTask?: string;
  documentsProcessed?: number;
  totalDocuments?: number;
  sectionsIdentified?: number;
  criteriaExtracted?: number;
}

export type FocusArea =
  | 'communication'
  | 'mayday'
  | 'safety_officer'
  | 'personnel_accountability'
  | 'resource_management'
  | 'command_structure';

export interface TemplateConfig {
  name: string;
  description?: string;
  focusAreas: FocusArea[];
  extractCriteria: boolean;
  identifyWeights: boolean;
  generateExamples: boolean;
  createPrompts: boolean;
}

export interface UploadedFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  documentId?: string;
}

// Validation schemas
export const SUPPORTED_POLICY_FORMATS = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILES = 5;

export const FOCUS_AREA_LABELS: Record<FocusArea, string> = {
  communication: 'Communication Protocols',
  mayday: 'Mayday & Emergency Response',
  safety_officer: 'Safety Officer Procedures',
  personnel_accountability: 'Personnel Accountability',
  resource_management: 'Resource Management',
  command_structure: 'Command Structure',
};
