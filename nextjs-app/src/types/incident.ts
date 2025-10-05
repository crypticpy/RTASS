/**
 * Incident Analysis Types
 * Type definitions for audio upload, transcription, and compliance analysis workflows
 */

export type IncidentStatus =
  | 'UPLOADED'
  | 'TRANSCRIBING'
  | 'ANALYZING'
  | 'COMPLETE'
  | 'ERROR';

export type IncidentType =
  | 'STRUCTURE_FIRE'
  | 'VEHICLE_FIRE'
  | 'WILDFIRE'
  | 'MEDICAL'
  | 'RESCUE'
  | 'HAZMAT'
  | 'MVA'
  | 'OTHER';

export interface AudioMetadata {
  duration: number; // seconds
  format: string;
  size: number; // bytes
  bitrate?: number;
  channels?: number;
}

export interface IncidentMetadata {
  name: string;
  description?: string;
  incidentDate?: Date;
  incidentTime?: string; // HH:MM format
  type?: IncidentType;
  location?: string;
  unitsInvolved?: string[];
  notes?: string;
}

export interface Incident {
  id: string;
  name: string;
  description?: string;
  type?: IncidentType;
  location?: string;
  incidentDate?: Date;
  incidentTime?: string;
  unitsInvolved?: string[];
  notes?: string;
  status: IncidentStatus;

  audioFile: {
    filename: string;
    url: string;
    size: number;
    duration: number;
    format: string;
  };

  processingStartedAt?: Date;
  processingCompletedAt?: Date;

  transcriptId?: string;
  auditIds: string[];

  overallScore?: number;
  maydayDetected: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export type ProcessingStage =
  | 'uploading'
  | 'transcribing'
  | 'detecting'
  | 'analyzing'
  | 'generating'
  | 'complete'
  | 'error';

export interface ProcessingProgress {
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // seconds
  currentTemplate?: string;
  totalTemplates?: number;
}

// Labels for incident types
export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  STRUCTURE_FIRE: 'Structure Fire',
  VEHICLE_FIRE: 'Vehicle Fire',
  WILDFIRE: 'Wildfire',
  MEDICAL: 'Medical Emergency',
  RESCUE: 'Rescue',
  HAZMAT: 'Hazmat',
  MVA: 'Motor Vehicle Accident',
  OTHER: 'Other',
};

// Status labels
export const STATUS_LABELS: Record<IncidentStatus, string> = {
  UPLOADED: 'Uploaded',
  TRANSCRIBING: 'Transcribing',
  ANALYZING: 'Analyzing',
  COMPLETE: 'Complete',
  ERROR: 'Error',
};

// Supported audio formats
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg', // MP3
  'audio/wav', // WAV
  'audio/x-m4a', // M4A
  'audio/mp4', // MP4 audio
  'video/mp4', // MP4 video (extract audio)
  'video/quicktime', // MOV
  'video/x-msvideo', // AVI
  'audio/webm', // WEBM
  'audio/aac', // AAC
  'audio/flac', // FLAC
] as const;

export const MAX_AUDIO_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const MAX_AUDIO_DURATION = 4 * 60 * 60; // 4 hours in seconds

/**
 * Report Viewing Types (Phase 4)
 * Types for incident report viewing with compliance results, timeline, and transcript
 */

export type ComplianceStatus = 'PASS' | 'NEEDS_IMPROVEMENT' | 'FAIL';

export interface ComplianceCategory {
  id: string;
  name: string;
  score: number; // 0-100
  status: ComplianceStatus;
  weight: number; // 0-1 (percentage)
  criteriaCount: number;
  passCount: number;
}

export interface ComplianceResults {
  overallScore: number;
  overallStatus: ComplianceStatus;
  totalCitations: number;
  categories: ComplianceCategory[];
}

export interface ReportStats {
  criticalIssues: number;
  warnings: number;
  strengths: number;
  totalCriteria: number;
}

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Finding {
  id: string;
  severity?: FindingSeverity;
  category: string;
  criterion: string;
  timestamp: number; // seconds
  evidence: string;
  reasoning?: string;
  impact?: string;
  recommendation?: string;
  note?: string; // For strengths
}

export type TimelineEventType =
  | 'mayday'
  | 'emergency'
  | 'evacuation'
  | 'all_clear'
  | 'violation'
  | 'compliance'
  | 'info';

export type TimelineEventSeverity = 'critical' | 'high' | 'medium' | 'low';

export type TimelineEventSource = 'KEYWORD_DETECTION' | 'COMPLIANCE_AUDIT';

export interface TimelineEvent {
  id: string;
  timestamp: number; // seconds from start
  type: TimelineEventType;
  severity: TimelineEventSeverity;
  confidence: number; // 0-1
  text: string;
  context?: string;
  source: TimelineEventSource;
  transcriptSegmentId?: string;
  criterionId?: string;
  auditId?: string;
}

export interface TranscriptSegment {
  id: string;
  startTime: number; // seconds
  endTime: number; // seconds
  text: string;
  speaker?: string;
  confidence?: number; // 0-1
}

export interface EmergencyKeywordData {
  count: number;
  timestamps: number[];
}

export interface TranscriptData {
  segments: TranscriptSegment[];
  emergencyKeywords: Record<string, EmergencyKeywordData>;
  duration: number; // seconds
  wordCount: number;
  language?: string;
}

export interface IncidentReport {
  incident: Incident;
  overallScore: number;
  overallStatus: ComplianceStatus;
  stats: ReportStats;
  narrative?: string;
  compliance: ComplianceResults;
  criticalFindings: Finding[];
  strengths: Finding[];
  timeline: TimelineEvent[];
  transcript: TranscriptData;
}

/**
 * Emergency Event (for EmergencyTimeline component)
 * Subset of TimelineEvent focused on emergency keywords
 */
export type EmergencyEventType = 'mayday' | 'emergency' | 'evacuation' | 'all_clear' | 'info';

export interface EmergencyEvent {
  id: string;
  timestamp: number; // seconds from start
  type: EmergencyEventType;
  confidence: number; // 0-1
  severity: TimelineEventSeverity;
  text: string; // Segment text
  context?: string; // Surrounding context
}
