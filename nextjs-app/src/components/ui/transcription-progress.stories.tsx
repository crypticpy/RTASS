import type { Meta, StoryObj } from '@storybook/react'
import { TranscriptionProgress } from './transcription-progress'

const meta = {
  title: 'Emergency/TranscriptionProgress',
  component: TranscriptionProgress,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['uploading', 'processing', 'analyzing', 'complete', 'error'],
    },
    uploadProgress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    processingProgress: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    fileSize: {
      control: { type: 'number', min: 0, max: 100000000, step: 1000000 },
    },
    maydayDetected: {
      control: 'boolean',
    },
    emergencyCount: {
      control: { type: 'number', min: 0, max: 10, step: 1 },
    },
  },
} satisfies Meta<typeof TranscriptionProgress>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Default state - upload in progress
 */
export const Uploading: Story = {
  args: {
    fileName: 'radio-traffic-2024-10-04.mp3',
    fileSize: 15728640, // 15 MB
    status: 'uploading',
    uploadProgress: 45,
  },
}

/**
 * Processing audio with AI transcription
 */
export const Processing: Story = {
  args: {
    fileName: 'structure-fire-incident-123.mp3',
    fileSize: 23068672, // 22 MB
    status: 'processing',
    processingProgress: 67,
    duration: 180, // 3 minutes
  },
}

/**
 * Analyzing for emergency keywords
 */
export const Analyzing: Story = {
  args: {
    fileName: 'mayday-call-recording.wav',
    fileSize: 8388608, // 8 MB
    status: 'analyzing',
    duration: 120,
  },
}

/**
 * Transcription complete - no emergencies
 */
export const Complete: Story = {
  args: {
    fileName: 'routine-traffic-check.mp3',
    fileSize: 5242880, // 5 MB
    status: 'complete',
    duration: 90,
    maydayDetected: false,
  },
}

/**
 * Transcription complete - emergency detected
 */
export const CompleteWithMayday: Story = {
  args: {
    fileName: 'critical-incident-mayday.mp3',
    fileSize: 31457280, // 30 MB
    status: 'complete',
    duration: 450,
    maydayDetected: true,
    emergencyCount: 2,
  },
}

/**
 * Error state with retry option
 */
export const Error: Story = {
  args: {
    fileName: 'corrupted-audio-file.mp3',
    fileSize: 12582912, // 12 MB
    status: 'error',
    error: 'Audio file format not supported. Please upload a valid MP3, WAV, or M4A file.',
    onRetry: () => alert('Retry clicked!'),
  },
}

/**
 * Error state without retry
 */
export const ErrorNoRetry: Story = {
  args: {
    fileName: 'network-error-upload.mp3',
    fileSize: 18874368, // 18 MB
    status: 'error',
    error: 'Network connection lost. Please check your internet connection.',
  },
}

/**
 * Small file upload
 */
export const SmallFile: Story = {
  args: {
    fileName: 'quick-update.wav',
    fileSize: 524288, // 512 KB
    status: 'processing',
    processingProgress: 85,
    duration: 15,
  },
}

/**
 * Large file with multiple emergencies
 */
export const LargeFileMultipleEmergencies: Story = {
  args: {
    fileName: 'full-shift-communications-alpha-shift.mp3',
    fileSize: 104857600, // 100 MB
    status: 'complete',
    duration: 3600, // 1 hour
    maydayDetected: true,
    emergencyCount: 5,
  },
}

/**
 * With cancel handler
 */
export const WithCancelOption: Story = {
  args: {
    fileName: 'in-progress-transcription.mp3',
    fileSize: 20971520, // 20 MB
    status: 'processing',
    processingProgress: 30,
    duration: 240,
    onCancel: () => alert('Cancel clicked!'),
  },
}

/**
 * Interactive demo
 */
export const Interactive: Story = {
  args: {
    fileName: 'interactive-demo.mp3',
    fileSize: 15728640,
    status: 'processing',
    processingProgress: 50,
    duration: 180,
    onCancel: () => console.log('Cancel clicked'),
    onRetry: () => console.log('Retry clicked'),
  },
}
