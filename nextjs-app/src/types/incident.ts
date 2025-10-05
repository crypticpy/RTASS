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
