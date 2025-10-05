'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, X, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  UploadedFile,
  SUPPORTED_POLICY_FORMATS,
  MAX_FILE_SIZE,
  MAX_FILES,
} from '@/types/policy';

interface PolicyUploaderProps {
  onFilesChange: (files: UploadedFile[]) => void;
  files: UploadedFile[];
  disabled?: boolean;
}

export function PolicyUploader({
  onFilesChange,
  files,
  disabled = false,
}: PolicyUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }

    // Check file type
    if (!SUPPORTED_POLICY_FORMATS.includes(file.type as any)) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'doc', 'txt', 'md'].includes(extension || '')) {
        return `Unsupported file type. Please upload PDF, DOCX, TXT, or MD files.`;
      }
    }

    return null;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);

      // Check max files
      if (files.length + acceptedFiles.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed. Please remove some files first.`);
        return;
      }

      // Validate and add files
      const newFiles: UploadedFile[] = [];
      const errors: string[] = [];

      for (const file of acceptedFiles) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
          continue;
        }

        // Check for duplicates
        const isDuplicate = files.some(
          (f) => f.file.name === file.name && f.file.size === file.size
        );
        if (isDuplicate) {
          errors.push(`${file.name}: Already added`);
          continue;
        }

        newFiles.push({
          file,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          progress: 0,
          status: 'pending',
        });
      }

      if (errors.length > 0) {
        setError(errors.join('\n'));
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
      }
    },
    [files, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        '.docx',
      ],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: MAX_FILE_SIZE,
  });

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return <FileText className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'complete':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={`
          border-2 border-dashed p-8 text-center transition-colors cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload
            className={`h-10 w-10 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive
                ? 'Drop policy documents here'
                : 'Drop policy documents here or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, DOCX, TXT, MD • Max size: 50MB per file • Max
              files: {MAX_FILES}
            </p>
          </div>
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            Uploaded Documents ({files.length}/{MAX_FILES})
          </h3>
          <div className="space-y-2">
            {files.map((uploadedFile) => (
              <Card key={uploadedFile.id} className="p-4">
                <div className="flex items-start gap-3">
                  {getFileIcon(uploadedFile.file.name)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {uploadedFile.file.name}
                      </p>
                      {getStatusIcon(uploadedFile.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.file.size)}
                      {uploadedFile.documentId && ' • Uploaded'}
                    </p>

                    {/* Progress Bar */}
                    {uploadedFile.status === 'uploading' && (
                      <div className="mt-2">
                        <Progress value={uploadedFile.progress} className="h-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Uploading... {uploadedFile.progress}%
                        </p>
                      </div>
                    )}

                    {uploadedFile.status === 'processing' && (
                      <div className="mt-2">
                        <Progress value={uploadedFile.progress} className="h-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Processing document...
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {uploadedFile.error && (
                      <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile.id)}
                    disabled={
                      disabled ||
                      uploadedFile.status === 'uploading' ||
                      uploadedFile.status === 'processing'
                    }
                    className="h-8 w-8 p-0"
                    aria-label={`Remove ${uploadedFile.file.name}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
