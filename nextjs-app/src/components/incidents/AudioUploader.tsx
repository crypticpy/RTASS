'use client';

import React, { useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileAudio, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  AudioMetadata,
  SUPPORTED_AUDIO_FORMATS,
  MAX_AUDIO_FILE_SIZE,
  MAX_AUDIO_DURATION,
} from '@/types/incident';

export interface AudioUploaderProps {
  onFileSelect: (file: File, metadata: AudioMetadata) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * AudioUploader Component
 *
 * Drag-and-drop audio file uploader with metadata extraction and validation.
 * Supports MP3, WAV, M4A, MP4, WEBM, AAC, FLAC formats.
 * Validates file size (500MB max) and duration (4 hours max).
 */
export function AudioUploader({
  onFileSelect,
  disabled = false,
  className,
}: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate file type
  const validateFileType = (file: File): boolean => {
    const supportedFormats = [
      'audio/mpeg',
      'audio/wav',
      'audio/x-m4a',
      'audio/mp4',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'audio/webm',
      'audio/aac',
      'audio/flac',
    ];
    return supportedFormats.includes(file.type) ||
           file.name.match(/\.(mp3|wav|m4a|mp4|mov|avi|webm|aac|flac)$/i) !== null;
  };

  // Validate file size
  const validateFileSize = (file: File): boolean => {
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    return file.size <= MAX_SIZE;
  };

  // Extract audio metadata using HTML5 audio element
  const extractAudioMetadata = useCallback(
    async (file: File): Promise<AudioMetadata> => {
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        const url = URL.createObjectURL(file);

        audio.addEventListener('loadedmetadata', () => {
          const duration = audio.duration;
          const MAX_DURATION = 4 * 60 * 60; // 4 hours

          if (duration > MAX_DURATION) {
            URL.revokeObjectURL(url);
            reject(
              new Error(
                `Audio duration (${Math.round(duration / 60)} minutes) exceeds maximum of 4 hours`
              )
            );
            return;
          }

          resolve({
            duration: Math.round(duration),
            format: file.type,
            size: file.size,
          });
          URL.revokeObjectURL(url);
        });

        audio.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load audio metadata. File may be corrupted.'));
        });

        audio.src = url;
      });
    },
    []
  );

  // Handle file selection
  const handleFileSelection = useCallback(
    async (file: File) => {
      setError(null);
      setSelectedFile(null);
      setMetadata(null);

      // Validate file type
      if (!validateFileType(file)) {
        setError(
          'Unsupported file format. Please upload MP3, WAV, M4A, MP4, WEBM, AAC, or FLAC files.'
        );
        return;
      }

      // Validate file size
      if (!validateFileSize(file)) {
        setError(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum of 500MB.`
        );
        return;
      }

      setSelectedFile(file);
      setIsExtracting(true);

      try {
        const extractedMetadata = await extractAudioMetadata(file);
        setMetadata(extractedMetadata);
        onFileSelect(file, extractedMetadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to extract audio metadata');
        setSelectedFile(null);
      } finally {
        setIsExtracting(false);
      }
    },
    [extractAudioMetadata, onFileSelect]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    },
    [disabled, handleFileSelection]
  );

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
    },
    [handleFileSelection]
  );

  // Remove selected file
  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setMetadata(null);
    setError(null);
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Area */}
      {!selectedFile && (
        <Card
          className={cn(
            'border-2 border-dashed transition-colors',
            isDragging && 'border-primary bg-primary/5',
            error && 'border-red-500 bg-red-50 dark:bg-red-950',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <FileAudio
              className={cn(
                'h-16 w-16 mb-4',
                error ? 'text-red-500' : 'text-muted-foreground'
              )}
              aria-hidden="true"
            />
            <p className="text-lg font-medium mb-2">
              {isDragging ? 'Drop audio file here' : 'Drop radio recording here'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse</p>

            <label htmlFor="audio-upload">
              <Button variant="outline" disabled={disabled} asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Browse Files
                </span>
              </Button>
              <input
                id="audio-upload"
                type="file"
                accept=".mp3,.wav,.m4a,.mp4,.mov,.avi,.webm,.aac,.flac,audio/*,video/*"
                onChange={handleInputChange}
                disabled={disabled}
                className="sr-only"
              />
            </label>

            <div className="mt-4 text-xs text-muted-foreground text-center space-y-1">
              <p>Supported: MP3, WAV, M4A, MP4, WEBM, AAC, FLAC</p>
              <p>Max size: 500MB • Max duration: 4 hours</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div
          className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Selected File Display */}
      {selectedFile && !isExtracting && metadata && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <FileAudio className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </h3>
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{formatFileSize(metadata.size)}</Badge>
                    <Badge variant="secondary">Duration {formatDuration(metadata.duration)}</Badge>
                    {metadata.bitrate && (
                      <Badge variant="secondary">{Math.round(metadata.bitrate / 1000)} kbps</Badge>
                    )}
                    {metadata.channels && (
                      <Badge variant="secondary">
                        {metadata.channels === 1 ? 'Mono' : 'Stereo'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
                className="shrink-0"
                aria-label={`Remove ${selectedFile.name}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracting Metadata */}
      {isExtracting && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin">
                <FileAudio className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm">Extracting audio metadata...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
