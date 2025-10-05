# Fire Department Radio Transcription & Training Analysis System
## Product Specification Document

**Version**: 2.0
**Last Updated**: January 2025
**Status**: Implementation Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [User Personas & Use Cases](#user-personas--use-cases)
4. [Functional Requirements](#functional-requirements)
5. [Technical Architecture](#technical-architecture)
6. [Data Models](#data-models)
7. [API Specifications](#api-specifications)
8. [UI/UX Specifications](#uiux-specifications)
9. [Component Library](#component-library)
10. [Workflows & User Journeys](#workflows--user-journeys)
11. [Acceptance Criteria](#acceptance-criteria)
12. [Security & Compliance](#security--compliance)
13. [Performance Requirements](#performance-requirements)
14. [Appendix](#appendix)

---

## Executive Summary

### Product Vision
A **post-incident analysis and training platform** that enables fire departments to upload radio traffic recordings, automatically transcribe and analyze them against department policies, and generate comprehensive performance reports with visualizations for training and continuous improvement.

### Core Value Proposition
Fire departments can:
1. Upload their policies and procedures → AI generates custom audit templates
2. Upload radio traffic audio → AI transcribes and scores performance
3. Review detailed reports with timeline visualization and actionable insights
4. Use reports as training materials for continuous improvement

### Key Paradigm
This is **NOT** a live incident monitoring tool. It is a **retrospective analysis platform** designed for training officers, fire chiefs, and crews to review and learn from past incidents.

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  (Next.js 15 App Router, React 18, Tailwind CSS)        │
├─────────────────────────────────────────────────────────┤
│                    API LAYER                             │
│  (Next.js API Routes, Type-safe with TypeScript)        │
├─────────────────────────────────────────────────────────┤
│                 BUSINESS LOGIC                           │
│  (Services Layer: Transcription, Compliance, Policy)     │
├─────────────────────────────────────────────────────────┤
│              EXTERNAL SERVICES                           │
│  OpenAI Whisper API  │  OpenAI GPT-4  │  Storage         │
├─────────────────────────────────────────────────────────┤
│                  DATA LAYER                              │
│  PostgreSQL (Prisma ORM)  │  Redis Cache                 │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**:
- Next.js 15 (App Router)
- React 18 with TypeScript
- Tailwind CSS + shadcn/ui components
- Storybook for component development

**Backend**:
- Next.js API Routes
- Prisma ORM
- PostgreSQL 16
- Redis 7

**AI/ML**:
- OpenAI Whisper API (audio transcription)
- OpenAI GPT-4 (policy analysis, compliance scoring, narrative generation)

**Infrastructure**:
- Docker Compose (development)
- File storage: Local/Azure Blob/AWS S3 (configurable)

---

## User Personas & Use Cases

### Persona 1: Training Officer (Primary User)

**Profile**:
- Name: Captain Sarah Martinez
- Role: Department Training Officer
- Experience: 15 years, responsible for continuous improvement
- Technical skill: Moderate (comfortable with web applications)

**Goals**:
- Upload radio traffic from incidents for analysis
- Generate performance reports for crew training sessions
- Track improvement trends over time
- Identify recurring compliance issues

**Pain Points**:
- Manual review of radio traffic is time-consuming
- Difficult to objectively score performance
- Hard to identify specific moments in long recordings
- No standardized way to track improvement

**Use Cases**:
- UC-1: Upload department SOPs and generate audit templates
- UC-2: Upload incident radio traffic and analyze performance
- UC-3: Review incident reports with timeline visualization
- UC-4: Export reports for training sessions
- UC-5: Track department-wide compliance trends

### Persona 2: Fire Chief (Administrative User)

**Profile**:
- Name: Chief Robert Johnson
- Role: Fire Chief
- Experience: 25 years, responsible for department operations
- Technical skill: Basic

**Goals**:
- Monitor department-wide performance metrics
- Identify training needs across all crews
- Ensure NFPA compliance
- Make data-driven decisions for resource allocation

**Pain Points**:
- Lack of objective performance data
- No visibility into trends across multiple incidents
- Difficult to justify training budgets without metrics

**Use Cases**:
- UC-6: View department performance dashboard
- UC-7: Review compliance trends over time
- UC-8: Export reports for board presentations
- UC-9: Identify crews needing additional training

### Persona 3: Company Officer (End User)

**Profile**:
- Name: Lieutenant Mike Chen
- Role: Engine Company Officer
- Experience: 10 years
- Technical skill: Basic to moderate

**Goals**:
- Review own crew's performance
- Use reports for crew training
- Identify areas for improvement
- Learn from other crews' incidents

**Pain Points**:
- Limited feedback on incident performance
- Difficult to remember specific radio traffic details
- Want to improve but lack specific guidance

**Use Cases**:
- UC-10: Review own crew's incident reports
- UC-11: Compare performance to department standards
- UC-12: Share reports with crew members

---

## Functional Requirements

### FR-1: Policy & Template Management

#### FR-1.1: Policy Document Upload

**Description**: Users can upload department policy documents (SOPs, NFPA standards, training materials) to the system for AI analysis.

**Requirements**:
- **FR-1.1.1**: System shall accept PDF, DOCX, TXT, and Markdown file formats
- **FR-1.1.2**: System shall support files up to 50MB each
- **FR-1.1.3**: System shall allow multiple files to be uploaded simultaneously
- **FR-1.1.4**: System shall extract text content from uploaded documents
- **FR-1.1.5**: System shall store original files in cloud storage
- **FR-1.1.6**: System shall validate file integrity and format
- **FR-1.1.7**: System shall display upload progress with percentage complete
- **FR-1.1.8**: System shall handle upload failures gracefully with retry option

**Acceptance Criteria**:
- ✅ User can drag-and-drop or browse to select files
- ✅ System shows upload progress bar
- ✅ System validates file type and size before upload
- ✅ System displays error message if file is invalid
- ✅ System stores files with unique identifiers
- ✅ System extracts text content successfully from all supported formats

#### FR-1.2: AI Template Generation

**Description**: System uses AI to analyze policy documents and automatically generate compliance audit templates with criteria, weights, and scoring rubrics.

**Requirements**:
- **FR-1.2.1**: System shall use GPT-4 to analyze uploaded policy documents
- **FR-1.2.2**: System shall extract compliance categories from policy structure
- **FR-1.2.3**: System shall identify individual compliance criteria within each category
- **FR-1.2.4**: System shall assign weights to categories based on policy emphasis
- **FR-1.2.5**: System shall generate scoring rubrics (PASS/FAIL/NOT_APPLICABLE) for each criterion
- **FR-1.2.6**: System shall create AI prompts for automated analysis of each criterion
- **FR-1.2.7**: System shall provide confidence scores for AI-generated content
- **FR-1.2.8**: System shall reference source document page numbers for each criterion
- **FR-1.2.9**: System shall complete template generation within 5 minutes for documents up to 100 pages
- **FR-1.2.10**: System shall display real-time progress during AI analysis

**AI Prompt Structure** (for template generation):
```
You are a fire service compliance expert analyzing department policies.

INPUT: [Policy document text]

TASK: Extract compliance criteria that can be objectively scored from radio
communications transcripts.

OUTPUT FORMAT:
{
  "categories": [
    {
      "name": "Category name (e.g., Communication Protocols)",
      "weight": 0.25,  // Percentage (sum must equal 1.0)
      "criteria": [
        {
          "id": "unique-id",
          "description": "What will be scored",
          "source_page": 12,
          "source_text": "Exact quote from policy",
          "scoring_guidance": "How to determine PASS/FAIL",
          "examples": {
            "pass": "Example of compliant behavior",
            "fail": "Example of violation"
          }
        }
      ],
      "analysis_prompt": "Prompt for AI to analyze transcript for this category"
    }
  ],
  "confidence": 0.94,
  "notes": ["Any ambiguities or clarifications needed"]
}

CONSTRAINTS:
- Only extract criteria that can be scored from radio communications
- Avoid subjective criteria
- Include specific policy references
- Provide clear PASS/FAIL definitions
```

**Acceptance Criteria**:
- ✅ System analyzes 80-page document in < 5 minutes
- ✅ Generated template includes 4-10 categories
- ✅ Each category has 3-12 criteria
- ✅ All weights sum to 1.0
- ✅ Each criterion includes source page reference
- ✅ AI confidence score is displayed (0.0-1.0)
- ✅ User can regenerate template if confidence is low
- ✅ System handles documents with unclear structure gracefully

#### FR-1.3: Template Editing

**Description**: Users can review, edit, and customize AI-generated templates before using them for incident analysis.

**Requirements**:
- **FR-1.3.1**: System shall display AI-generated template in editable format
- **FR-1.3.2**: System shall allow users to add/remove categories
- **FR-1.3.3**: System shall allow users to add/remove criteria within categories
- **FR-1.3.4**: System shall allow users to edit criterion descriptions
- **FR-1.3.5**: System shall allow users to adjust category weights (with validation that sum = 1.0)
- **FR-1.3.6**: System shall allow users to edit AI analysis prompts
- **FR-1.3.7**: System shall validate template structure before saving
- **FR-1.3.8**: System shall maintain version history of template edits
- **FR-1.3.9**: System shall allow users to mark templates as "Draft" or "Active"
- **FR-1.3.10**: System shall prevent deletion of templates that have been used in analyses
- **FR-1.3.11**: System shall allow users to duplicate templates
- **FR-1.3.12**: System shall display source document references while editing

**Template Data Structure**:
```typescript
interface Template {
  id: string
  name: string
  description?: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  version: number
  createdAt: Date
  updatedAt: Date
  createdBy: string

  // Source documents
  policyDocuments: {
    id: string
    filename: string
    url: string
    pages: number
  }[]

  // AI generation metadata
  aiGenerated: boolean
  aiConfidence?: number
  aiGeneratedAt?: Date

  // Template structure
  categories: {
    id: string
    name: string
    description?: string
    weight: number  // 0.0 to 1.0
    sortOrder: number

    criteria: {
      id: string
      description: string
      scoringGuidance: string
      sourcePageNumber?: number
      sourceText?: string
      examplePass?: string
      exampleFail?: string
      sortOrder: number
    }[]

    analysisPrompt: string
  }[]

  // Usage statistics
  usageCount: number
  averageScore?: number
  lastUsedAt?: Date
}
```

**Acceptance Criteria**:
- ✅ User can expand/collapse categories
- ✅ User can reorder categories via drag-and-drop
- ✅ User can add new criteria with inline form
- ✅ User can edit criteria descriptions inline
- ✅ Weight validation shows error if sum ≠ 1.0
- ✅ User can save template as draft
- ✅ User can activate template for use
- ✅ System shows "used in X analyses" count
- ✅ System prevents deletion of used templates (shows archive option)
- ✅ User can view template version history

#### FR-1.4: Template Library

**Description**: Users can view, search, filter, and manage all templates in a centralized library.

**Requirements**:
- **FR-1.4.1**: System shall display all templates in grid or list view
- **FR-1.4.2**: System shall show template status (Draft, Active, Archived)
- **FR-1.4.3**: System shall display template metadata (created date, usage count, avg score)
- **FR-1.4.4**: System shall allow search by template name or description
- **FR-1.4.5**: System shall allow filtering by status, creation date, or usage count
- **FR-1.4.6**: System shall allow sorting by name, date, or usage
- **FR-1.4.7**: System shall display "AI-generated" badge for AI templates
- **FR-1.4.8**: System shall show NFPA standard templates separately
- **FR-1.4.9**: System shall allow bulk actions (archive, delete drafts)
- **FR-1.4.10**: System shall show usage statistics per template

**Acceptance Criteria**:
- ✅ Library shows all templates with status badges
- ✅ Search returns relevant results in < 1 second
- ✅ Filters work correctly in combination
- ✅ Templates display usage statistics
- ✅ User can switch between grid and list views
- ✅ User can quick-view template details without opening editor
- ✅ User can duplicate template from library
- ✅ User can archive multiple templates at once

---

### FR-2: Incident Audio Upload & Transcription

#### FR-2.1: Audio File Upload

**Description**: Users can upload radio traffic audio files for transcription and analysis.

**Requirements**:
- **FR-2.1.1**: System shall accept audio formats: MP3, WAV, M4A, MP4, WEBM, AAC, FLAC
- **FR-2.1.2**: System shall support video files (extract audio track): MP4, MOV, AVI
- **FR-2.1.3**: System shall accept files up to 500MB in size
- **FR-2.1.4**: System shall support audio files up to 4 hours in duration
- **FR-2.1.5**: System shall validate file format and duration before upload
- **FR-2.1.6**: System shall extract audio metadata (duration, bitrate, channels)
- **FR-2.1.7**: System shall display upload progress with bytes uploaded/total
- **FR-2.1.8**: System shall support resumable uploads for files > 100MB
- **FR-2.1.9**: System shall store audio files in cloud storage (configurable: local/Azure/S3)
- **FR-2.1.10**: System shall generate unique identifiers for each upload

**Acceptance Criteria**:
- ✅ User can drag-and-drop audio files
- ✅ System validates format before upload starts
- ✅ System shows detailed upload progress
- ✅ System displays audio metadata after upload
- ✅ Upload can be cancelled mid-process
- ✅ Large files can resume if connection drops
- ✅ System shows audio waveform preview (optional)

#### FR-2.2: Incident Metadata Capture

**Description**: Users can provide optional incident details to enhance analysis context.

**Requirements**:
- **FR-2.2.1**: System shall provide form for incident details (all fields optional)
- **FR-2.2.2**: System shall capture incident name/description
- **FR-2.2.3**: System shall capture incident date and time
- **FR-2.2.4**: System shall capture incident type (dropdown: Structure Fire, Vehicle Fire, etc.)
- **FR-2.2.5**: System shall capture units involved (free-text, comma-separated)
- **FR-2.2.6**: System shall capture incident location
- **FR-2.2.7**: System shall capture free-form notes/context
- **FR-2.2.8**: System shall auto-populate date/time from file metadata if available
- **FR-2.2.9**: System shall save metadata to database with incident record
- **FR-2.2.10**: System shall pass metadata to AI for context-aware analysis

**Incident Data Structure**:
```typescript
interface Incident {
  id: string
  name: string  // User-provided or auto-generated
  description?: string

  // Timing
  incidentDate?: Date  // When incident occurred
  incidentTime?: string  // HH:MM format
  uploadedAt: Date
  uploadedBy: string

  // Classification
  type?: 'STRUCTURE_FIRE' | 'VEHICLE_FIRE' | 'WILDFIRE' | 'MEDICAL' |
         'RESCUE' | 'HAZMAT' | 'MVA' | 'OTHER'
  location?: string

  // Units/Personnel
  unitsInvolved?: string[]  // ["Engine 1", "Ladder 2", "Battalion 1"]

  // Context
  notes?: string  // Free-form context from user

  // Audio file
  audioFile: {
    id: string
    filename: string
    originalFilename: string
    url: string
    storageProvider: 'LOCAL' | 'AZURE' | 'S3'
    size: number  // bytes
    duration: number  // seconds
    format: string  // 'audio/mpeg', 'audio/wav', etc.
    metadata: {
      bitrate?: number
      channels?: number
      sampleRate?: number
    }
  }

  // Status
  status: 'UPLOADED' | 'TRANSCRIBING' | 'ANALYZING' | 'COMPLETE' | 'ERROR'
  processingStartedAt?: Date
  processingCompletedAt?: Date

  // Relationships
  transcriptId?: string
  auditIds: string[]
}
```

**Acceptance Criteria**:
- ✅ All fields are optional (user can skip)
- ✅ Date/time auto-populates from file metadata
- ✅ Incident type dropdown includes common categories
- ✅ Units field accepts comma-separated values
- ✅ Notes field supports multi-line text
- ✅ Form validates date is not in future
- ✅ Metadata saves successfully with incident

#### FR-2.3: Audio Transcription

**Description**: System uses OpenAI Whisper API to transcribe uploaded audio files with precise timestamps.

**Requirements**:
- **FR-2.3.1**: System shall use OpenAI Whisper API for transcription
- **FR-2.3.2**: System shall use `whisper-1` model with `verbose_json` response format
- **FR-2.3.3**: System shall include timestamp information for each segment
- **FR-2.3.4**: System shall chunk audio files > 25MB into segments (Whisper limit)
- **FR-2.3.5**: System shall handle audio conversion (if needed) using FFmpeg
- **FR-2.3.6**: System shall detect language automatically or use provided language code
- **FR-2.3.7**: System shall extract segment-level transcription with start/end timestamps
- **FR-2.3.8**: System shall identify speakers when possible (speaker diarization)
- **FR-2.3.9**: System shall display real-time transcription progress
- **FR-2.3.10**: System shall retry failed API calls up to 3 times with exponential backoff
- **FR-2.3.11**: System shall store raw transcript text and structured segments
- **FR-2.3.12**: System shall calculate total transcription time and token usage
- **FR-2.3.13**: System shall handle network interruptions gracefully

**Transcription Process**:
```
1. Validate audio file format
2. Convert to supported format if needed (FFmpeg)
3. Check file size:
   - If < 25MB: Send directly to Whisper API
   - If > 25MB: Chunk into segments at silence points
4. Send to Whisper API with parameters:
   - model: 'whisper-1'
   - response_format: 'verbose_json'
   - timestamp_granularities: ['segment']
5. Parse response and extract:
   - Full transcript text
   - Segments with timestamps
   - Language detected
6. Store in database
7. Update incident status to 'ANALYZING'
```

**Transcript Data Structure**:
```typescript
interface Transcript {
  id: string
  incidentId: string

  // Full transcript
  text: string  // Complete transcript as plain text
  language: string  // 'en', 'es', etc.
  duration: number  // seconds

  // Segments (timestamped)
  segments: {
    id: string
    startTime: number  // seconds from start
    endTime: number
    text: string
    confidence?: number
    speaker?: string  // If diarization is available
  }[]

  // Processing metadata
  modelUsed: string  // 'whisper-1'
  tokenCount: number
  processingTime: number  // seconds
  createdAt: Date

  // Emergency detection (populated later)
  emergencyKeywords: {
    keyword: string  // 'mayday', 'evacuate', etc.
    count: number
    timestamps: number[]  // All occurrences
  }[]
}
```

**Acceptance Criteria**:
- ✅ 10-minute audio transcribes in < 2 minutes
- ✅ Transcription accuracy is > 90% for clear audio
- ✅ All segments include accurate timestamps (±1 second)
- ✅ System handles poor audio quality gracefully
- ✅ System detects emergency keywords (mayday, evacuate, etc.)
- ✅ Progress bar updates in real-time
- ✅ User can view transcript preview during processing
- ✅ Failed transcriptions show clear error message

#### FR-2.4: Emergency Keyword Detection

**Description**: System automatically detects emergency-related keywords in transcripts for highlighting and timeline generation.

**Requirements**:
- **FR-2.4.1**: System shall scan transcript for predefined emergency keywords
- **FR-2.4.2**: System shall detect case-insensitive matches
- **FR-2.4.3**: System shall record all occurrences with timestamps
- **FR-2.4.4**: System shall count occurrences per keyword
- **FR-2.4.5**: System shall classify severity (critical, high, medium, low)
- **FR-2.4.6**: System shall support custom keyword lists per department

**Emergency Keywords**:
```typescript
const EMERGENCY_KEYWORDS = {
  critical: [
    'mayday',
    'firefighter down',
    'collapse',
    'trapped',
    'missing firefighter',
    'withdraw',
    'abandon',
  ],
  high: [
    'evacuate',
    'evacuation',
    'emergency traffic',
    'all clear',
    'par', // Personnel Accountability Report
    'rit', // Rapid Intervention Team
    'pass alarm',
  ],
  medium: [
    'safety officer',
    'incident command',
    'command transfer',
    'staging',
    'rehab',
  ],
  low: [
    'en route',
    'on scene',
    'clear',
    'available',
  ]
}
```

**Acceptance Criteria**:
- ✅ System detects all keyword variations (e.g., "mayday" and "may day")
- ✅ System records accurate timestamps for each occurrence
- ✅ System classifies severity correctly
- ✅ System handles multiple keywords in same segment
- ✅ Results populate within 10 seconds of transcription complete

---

### FR-3: Compliance Analysis & Scoring

#### FR-3.1: Template Selection

**Description**: Users select which audit templates to apply to the transcript for compliance analysis.

**Requirements**:
- **FR-3.1.1**: System shall display all active templates as options
- **FR-3.1.2**: System shall allow selection of multiple templates
- **FR-3.1.3**: System shall show template summary (categories, criteria count)
- **FR-3.1.4**: System shall estimate analysis time based on selections
- **FR-3.1.5**: System shall validate at least one template is selected
- **FR-3.1.6**: System shall recommend templates based on incident type

**Acceptance Criteria**:
- ✅ All active templates are shown
- ✅ User can select 1-5 templates
- ✅ Template details are displayed on hover
- ✅ Estimated time is accurate (±30 seconds)
- ✅ System shows warning if no templates selected

#### FR-3.2: AI-Powered Compliance Scoring

**Description**: System uses GPT-4 to analyze transcript against template criteria and generate compliance scores with specific citations.

**Requirements**:
- **FR-3.2.1**: System shall use GPT-4 (latest version) for analysis
- **FR-3.2.2**: System shall analyze transcript category-by-category (not all at once)
- **FR-3.2.3**: System shall score each criterion as PASS, FAIL, or NOT_APPLICABLE
- **FR-3.2.4**: System shall provide specific timestamp citations for each score
- **FR-3.2.5**: System shall extract relevant transcript excerpts as evidence
- **FR-3.2.6**: System shall explain reasoning for each score
- **FR-3.2.7**: System shall calculate category scores (weighted average)
- **FR-3.2.8**: System shall calculate overall audit score
- **FR-3.2.9**: System shall redistribute weights when criteria are NOT_APPLICABLE
- **FR-3.2.10**: System shall track token usage and API costs
- **FR-3.2.11**: System shall handle API rate limits and retry failed requests
- **FR-3.2.12**: System shall run analyses in parallel when possible

**AI Analysis Prompt Template**:
```
You are a fire service compliance auditor analyzing radio communications.

TRANSCRIPT:
[Full transcript with timestamps]

INCIDENT CONTEXT:
- Type: [Structure Fire]
- Date: [2024-12-15]
- Units: [Engine 1, Engine 2, Ladder 2]
- Notes: [User-provided context]

CATEGORY TO ANALYZE: [Communication Protocols]
WEIGHT: [25%]

CRITERIA TO SCORE:
1. [Criterion ID: comm-001]
   Description: Clear radio discipline maintained
   Scoring Guidance: PASS if units wait for clear channel, FAIL if overlapping
   transmissions occur, NOT_APPLICABLE if no multi-unit communications

2. [Criterion ID: comm-002]
   Description: Proper unit identification used
   ...

TASK:
For each criterion above, provide:
1. Score: PASS, FAIL, or NOT_APPLICABLE
2. Evidence: Specific transcript excerpts with timestamps
3. Reasoning: Brief explanation of score (2-3 sentences)

OUTPUT FORMAT (JSON):
{
  "category": "Communication Protocols",
  "categoryScore": 0.75,  // 0.0 to 1.0
  "criteriaScores": [
    {
      "criterionId": "comm-001",
      "score": "FAIL",
      "confidence": 0.95,
      "evidence": [
        {
          "timestamp": "00:14:35",
          "text": "[Excerpt from transcript showing violation]",
          "type": "VIOLATION"
        }
      ],
      "reasoning": "Multiple units transmitted simultaneously at 14:35,
                   causing radio interference during emergency traffic. This
                   violates protocol requiring units to wait for clear channel.",
      "impact": "HIGH",
      "recommendation": "Radio discipline refresher training needed"
    },
    {
      "criterionId": "comm-002",
      "score": "PASS",
      ...
    }
  ],
  "overallAnalysis": "Communication protocols were inconsistent...",
  "keyFindings": ["Finding 1", "Finding 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

IMPORTANT:
- Use EXACT transcript text for evidence
- Include precise timestamps (MM:SS format)
- Be objective and specific
- Identify both violations AND examples of compliance
- Provide actionable recommendations
```

**Scoring Calculation Logic**:
```typescript
// Calculate category score
function calculateCategoryScore(criteria: CriterionScore[]): number {
  const applicable = criteria.filter(c => c.score !== 'NOT_APPLICABLE')
  if (applicable.length === 0) return 0 // All NOT_APPLICABLE

  const passCount = applicable.filter(c => c.score === 'PASS').length
  return passCount / applicable.length
}

// Calculate overall audit score
function calculateOverallScore(categories: CategoryScore[]): number {
  let totalWeight = 0
  let weightedSum = 0

  for (const category of categories) {
    const applicable = category.criteria.filter(
      c => c.score !== 'NOT_APPLICABLE'
    )

    if (applicable.length > 0) {
      const categoryScore = calculateCategoryScore(category.criteria)
      weightedSum += categoryScore * category.weight
      totalWeight += category.weight
    }
    // If all criteria are NOT_APPLICABLE, skip category (weight redistributes)
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0
}
```

**Audit Data Structure**:
```typescript
interface Audit {
  id: string
  incidentId: string
  transcriptId: string
  templateId: string

  // Overall results
  overallScore: number  // 0.0 to 1.0 (percentage/100)
  overallStatus: 'PASS' | 'NEEDS_IMPROVEMENT' | 'FAIL'

  // Scoring thresholds (configurable)
  passThreshold: number  // default: 0.85
  improvementThreshold: number  // default: 0.70

  // Category scores
  categories: {
    id: string
    name: string
    weight: number
    score: number  // 0.0 to 1.0
    status: 'PASS' | 'NEEDS_IMPROVEMENT' | 'FAIL'

    criteria: {
      id: string
      description: string
      score: 'PASS' | 'FAIL' | 'NOT_APPLICABLE'
      confidence: number  // AI confidence 0.0-1.0

      evidence: {
        timestamp: string  // 'MM:SS' or 'HH:MM:SS'
        text: string
        type: 'VIOLATION' | 'COMPLIANCE' | 'CONTEXT'
      }[]

      reasoning: string
      impact?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
      recommendation?: string
    }[]

    overallAnalysis: string
    keyFindings: string[]
    recommendations: string[]
  }[]

  // Processing metadata
  modelUsed: string  // 'gpt-4-1106-preview' or similar
  tokensUsed: number
  processingTime: number  // seconds
  createdAt: Date
}
```

**Acceptance Criteria**:
- ✅ Analysis completes in < 5 minutes for 45-minute audio
- ✅ All criteria are scored (PASS/FAIL/NOT_APPLICABLE)
- ✅ Each score includes specific timestamp evidence
- ✅ Category scores are correctly weighted
- ✅ Overall score calculation is accurate
- ✅ NOT_APPLICABLE criteria don't affect scores
- ✅ AI provides clear reasoning for each score
- ✅ Progress updates in real-time during analysis

#### FR-3.3: Multi-Template Analysis

**Description**: System can apply multiple templates to same incident for comprehensive analysis.

**Requirements**:
- **FR-3.3.1**: System shall run multiple template analyses in parallel
- **FR-3.3.2**: System shall create separate audit record for each template
- **FR-3.3.3**: System shall calculate combined overall score (average of all audits)
- **FR-3.3.4**: System shall display results for each template separately
- **FR-3.3.5**: System shall identify overlapping criteria across templates
- **FR-3.3.6**: System shall allow comparison of results between templates

**Acceptance Criteria**:
- ✅ User can select 2-5 templates
- ✅ Each template generates separate audit report
- ✅ Combined score is calculated correctly
- ✅ User can view results per template or combined
- ✅ Overlapping criteria are flagged
- ✅ Analysis time scales linearly with template count

#### FR-3.4: Narrative Report Generation

**Description**: System uses AI to generate executive summary narratives for each audit.

**Requirements**:
- **FR-3.4.1**: System shall use GPT-4 to generate narrative summary
- **FR-3.4.2**: System shall include overall performance assessment
- **FR-3.4.3**: System shall highlight critical findings
- **FR-3.4.4**: System shall identify strengths and commendations
- **FR-3.4.5**: System shall provide specific recommendations
- **FR-3.4.6**: System shall write in professional, objective tone
- **FR-3.4.7**: System shall keep narrative to 300-500 words
- **FR-3.4.8**: System shall allow user to regenerate or edit narrative

**AI Narrative Prompt**:
```
You are a fire service training officer writing an incident performance review.

INCIDENT DETAILS:
- Name: [Structure Fire - 123 Main St]
- Date: [2024-12-15]
- Overall Score: [80%]
- Status: [NEEDS IMPROVEMENT]

CRITICAL FINDINGS:
- [Mayday protocol violation at 14:32:45]
- [Communication breakdown at 14:35:12]

STRENGTHS:
- [Rapid PAR completion in 2:15]
- [Proper safety officer assignment]

CATEGORY SCORES:
- Communication Protocols: 75%
- Mayday Procedures: 65%
- Safety Officer: 95%
- [etc.]

TASK:
Write a professional, objective incident performance review (300-500 words) that:
1. Opens with overall assessment
2. Details critical findings with impact
3. Acknowledges strengths
4. Provides specific, actionable recommendations
5. Ends with forward-looking improvement focus

TONE: Professional, objective, constructive (focus on learning, not blame)
AUDIENCE: Fire service personnel (training officers, crews, command staff)
```

**Acceptance Criteria**:
- ✅ Narrative is 300-500 words
- ✅ Narrative is factually accurate based on audit results
- ✅ Tone is professional and constructive
- ✅ All critical findings are mentioned
- ✅ Recommendations are specific and actionable
- ✅ User can edit narrative before saving
- ✅ User can regenerate narrative with different emphasis

---

### FR-4: Report Viewing & Exploration

#### FR-4.1: Report Overview

**Description**: Users can view comprehensive incident reports with scores, findings, and recommendations.

**Requirements**:
- **FR-4.1.1**: System shall display overall combined score prominently
- **FR-4.1.2**: System shall show scores for each template applied
- **FR-4.1.3**: System shall display overall status (PASS/NEEDS_IMPROVEMENT/FAIL)
- **FR-4.1.4**: System shall show counts: critical issues, warnings, strengths
- **FR-4.1.5**: System shall list critical findings with details
- **FR-4.1.6**: System shall list strengths and commendations
- **FR-4.1.7**: System shall display category breakdown with scores
- **FR-4.1.8**: System shall show AI-generated narrative summary
- **FR-4.1.9**: System shall use existing ComplianceScore component
- **FR-4.1.10**: System shall provide tabbed interface (Overview, Timeline, Transcript)

**UI Components** (Reuse from Phase 1):
- **ComplianceScore** component for displaying scores
- **Badge** components for status indicators
- **Card** components for finding cards
- **Tabs** component for navigation

**Acceptance Criteria**:
- ✅ Report loads in < 2 seconds
- ✅ Overall score is visually prominent
- ✅ Critical findings are highlighted in red
- ✅ Category scores use existing ComplianceScore component
- ✅ Narrative is readable and well-formatted
- ✅ User can expand/collapse finding details
- ✅ User can filter findings by severity

#### FR-4.2: Interactive Timeline Explorer

**Description**: Users can explore incident timeline with emergency events, compliance issues, and audio playback.

**Requirements**:
- **FR-4.2.1**: System shall display chronological timeline of incident
- **FR-4.2.2**: System shall use existing EmergencyTimeline component
- **FR-4.2.3**: System shall show emergency keyword detections on timeline
- **FR-4.2.4**: System shall show compliance issues on timeline
- **FR-4.2.5**: System shall show positive findings on timeline
- **FR-4.2.6**: System shall allow filtering by event type
- **FR-4.2.7**: System shall allow jumping to specific timestamp
- **FR-4.2.8**: System shall integrate audio playback (optional feature)
- **FR-4.2.9**: System shall show transcript excerpt for each event
- **FR-4.2.10**: System shall highlight selected event

**Timeline Event Structure**:
```typescript
interface TimelineEvent {
  id: string
  timestamp: number  // seconds from start
  type: 'mayday' | 'emergency' | 'evacuation' | 'all_clear' |
        'violation' | 'compliance' | 'info'
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number

  // Display
  text: string  // Main event description
  context?: string  // Additional context

  // Source
  source: 'KEYWORD_DETECTION' | 'COMPLIANCE_AUDIT' | 'USER_ANNOTATION'

  // Related data
  transcriptSegmentId?: string
  criterionId?: string
  auditId?: string
}
```

**Acceptance Criteria**:
- ✅ Timeline shows all events in chronological order
- ✅ Emergency events are visually distinct (red background)
- ✅ Compliance issues show criterion details
- ✅ User can filter by event type
- ✅ User can click event to see full details
- ✅ Timeline scrolls smoothly
- ✅ Timestamps are accurate (±1 second)
- ✅ Timeline reuses EmergencyTimeline component

#### FR-4.3: Full Transcript Viewer

**Description**: Users can view complete transcript with timestamps and compliance annotations.

**Requirements**:
- **FR-4.3.1**: System shall display full transcript with timestamps
- **FR-4.3.2**: System shall show speaker identification (if available)
- **FR-4.3.3**: System shall annotate compliance issues inline
- **FR-4.3.4**: System shall annotate positive findings inline
- **FR-4.3.5**: System shall highlight emergency keywords
- **FR-4.3.6**: System shall allow search within transcript
- **FR-4.3.7**: System shall allow jump to timestamp
- **FR-4.3.8**: System shall show transcript statistics
- **FR-4.3.9**: System shall support audio playback sync (optional)
- **FR-4.3.10**: System shall allow user to add manual annotations

**Acceptance Criteria**:
- ✅ Transcript displays with accurate timestamps
- ✅ Compliance annotations are clearly visible
- ✅ Search highlights matching text
- ✅ Emergency keywords are highlighted in red
- ✅ User can click timestamp to jump
- ✅ Statistics are accurate (word count, duration, etc.)
- ✅ Annotations show criterion details on hover

#### FR-4.4: Export & Sharing

**Description**: Users can export reports in various formats for sharing and training use.

**Requirements**:
- **FR-4.4.1**: System shall export reports as PDF
- **FR-4.4.2**: System shall include all report sections in PDF (overview, timeline, transcript)
- **FR-4.4.3**: System shall generate PDF in < 10 seconds
- **FR-4.4.4**: System shall include department branding (configurable logo)
- **FR-4.4.5**: System shall allow export of transcript as TXT
- **FR-4.4.6**: System shall allow export of transcript as SRT (subtitles)
- **FR-4.4.7**: System shall allow email sharing (send PDF)
- **FR-4.4.8**: System shall generate shareable link (view-only, auth required)
- **FR-4.4.9**: System shall track export/share activity

**PDF Report Structure**:
```
Cover Page
- Incident name
- Date/time
- Overall score
- Department logo

Executive Summary
- Overall status
- Key findings
- Recommendations

Detailed Scores
- Category breakdowns
- Criterion details with evidence

Timeline
- Key events with timestamps
- Emergency detections

Full Transcript
- Complete transcript with annotations

Appendix
- Template details
- Methodology
- Glossary
```

**Acceptance Criteria**:
- ✅ PDF includes all report sections
- ✅ PDF formatting is professional
- ✅ PDF generation completes in < 10 seconds for 50-page report
- ✅ Department logo appears on cover page
- ✅ TXT export is plain text with timestamps
- ✅ SRT export has proper subtitle formatting
- ✅ Email sending works reliably
- ✅ Shared links require authentication

---

### FR-5: Dashboard & Analytics

#### FR-5.1: Incident Dashboard

**Description**: Landing page showing recent incidents, quick actions, and performance trends.

**Requirements**:
- **FR-5.1.1**: System shall display recent incidents (last 30 days) as list
- **FR-5.1.2**: System shall show incident metadata (date, score, status, mayday)
- **FR-5.1.3**: System shall provide quick action buttons (upload policy, upload audio)
- **FR-5.1.4**: System shall display statistics cards (total incidents, avg score, templates)
- **FR-5.1.5**: System shall show performance trend chart (30-day)
- **FR-5.1.6**: System shall allow filtering incidents by date range
- **FR-5.1.7**: System shall allow searching incidents by name
- **FR-5.1.8**: System shall show processing status for in-progress incidents
- **FR-5.1.9**: System shall auto-refresh when incidents complete processing

**Acceptance Criteria**:
- ✅ Dashboard loads in < 2 seconds
- ✅ Recent incidents list shows last 20 incidents
- ✅ Statistics are accurate and update in real-time
- ✅ Trend chart shows clear visualization
- ✅ Quick actions navigate to correct pages
- ✅ Filtering and search work correctly
- ✅ Processing status updates without refresh

#### FR-5.2: Performance Trends

**Description**: System tracks and visualizes performance trends over time.

**Requirements**:
- **FR-5.2.1**: System shall calculate average scores by time period (weekly, monthly)
- **FR-5.2.2**: System shall identify trending issues (increasing failure rate)
- **FR-5.2.3**: System shall identify trending improvements
- **FR-5.2.4**: System shall show top failure categories
- **FR-5.2.5**: System shall show most common violations
- **FR-5.2.6**: System shall allow filtering by incident type
- **FR-5.2.7**: System shall allow date range selection
- **FR-5.2.8**: System shall export trend data as CSV

**Acceptance Criteria**:
- ✅ Trends calculate correctly from historical data
- ✅ Charts are clear and readable
- ✅ Filtering updates visualizations immediately
- ✅ Trending issues are accurately identified
- ✅ CSV export includes all data points

#### FR-5.3: Department Statistics

**Description**: Aggregate statistics for department-wide performance tracking.

**Requirements**:
- **FR-5.3.1**: System shall calculate department average score
- **FR-5.3.2**: System shall count total incidents analyzed
- **FR-5.3.3**: System shall identify most/least compliant categories
- **FR-5.3.4**: System shall track template usage statistics
- **FR-5.3.5**: System shall calculate improvement rate over time
- **FR-5.3.6**: System shall show crew-level statistics (if tracked)
- **FR-5.3.7**: System shall allow comparison between crews/shifts
- **FR-5.3.8**: System shall generate executive summary reports

**Acceptance Criteria**:
- ✅ All statistics are accurate
- ✅ Data refreshes daily
- ✅ Comparisons are meaningful and accurate
- ✅ Executive reports are professional
- ✅ Statistics load in < 3 seconds

---

### FR-6: Settings

#### FR-6.1: User Authentication (Future - Stubbed)

**Description**: Authentication will be implemented in a future phase using Azure SSO (Single Sign-On).

**Current Implementation**:
- **FR-6.1.1**: System shall operate without authentication in MVP
- **FR-6.1.2**: All features are accessible without login
- **FR-6.1.3**: No user accounts or sessions required

**Future Implementation** (Azure SSO):
- Azure Active Directory integration
- Single Sign-On (SSO) authentication
- Role-based access from Azure AD groups
- User roles: Admin, Training Officer, User

**Acceptance Criteria (MVP)**:
- ✅ Application loads without login screen
- ✅ All features accessible immediately
- ✅ No authentication required for any operation

**Note**: Authentication stub should be designed to easily integrate Azure SSO later without major refactoring.

#### FR-6.2: Department Settings

**Description**: Configurable settings for department-specific customization.

**Requirements**:
- **FR-6.2.1**: System shall store department name and logo
- **FR-6.2.2**: System shall allow configuration of scoring thresholds
- **FR-6.2.3**: System shall support custom emergency keyword lists
- **FR-6.2.4**: System shall allow storage provider selection (local/Azure/S3)
- **FR-6.2.5**: System shall configure retention policies
- **FR-6.2.6**: System shall allow email notification settings

**Acceptance Criteria**:
- ✅ Admin can upload department logo
- ✅ Logo appears on reports and exports
- ✅ Scoring thresholds are configurable
- ✅ Custom keywords are used in detection
- ✅ Storage provider can be changed
- ✅ Settings save successfully

---

## Technical Architecture

### System Components

#### Frontend Application
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 18
- **Styling**: Tailwind CSS 3
- **Component Library**: shadcn/ui (built on Radix UI)
- **State Management**: React Server Components + URL state
- **Forms**: React Hook Form + Zod validation

#### Backend Services
- **API**: Next.js API Routes
- **ORM**: Prisma 5
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **File Storage**: Configurable (Local/Azure Blob/AWS S3)

#### External Services
- **Transcription**: OpenAI Whisper API
- **AI Analysis**: OpenAI GPT-4 API
- **Email**: SendGrid (optional)

### Database Schema (Prisma)

```prisma
// Existing schema (from previous implementation)
model Incident {
  id                    String    @id @default(cuid())
  name                  String
  description           String?
  type                  IncidentType?
  location              String?
  incidentDate          DateTime?
  incidentTime          String?
  unitsInvolved         String[]
  notes                 String?
  status                IncidentStatus @default(UPLOADED)

  // Audio file
  audioFileId           String?
  audioFilename         String?
  audioUrl              String?
  audioSize             Int?
  audioDuration         Float?
  audioFormat           String?
  storageProvider       StorageProvider?

  // Processing
  processingStartedAt   DateTime?
  processingCompletedAt DateTime?

  // Timestamps
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  createdBy             String?   // Future: Azure SSO user ID

  // Relations
  transcript            Transcript?
  audits                Audit[]

  @@index([status])
  @@index([createdAt])
  @@index([incidentDate])
}

model Transcript {
  id              String    @id @default(cuid())
  incidentId      String    @unique
  incident        Incident  @relation(fields: [incidentId], references: [id], onDelete: Cascade)

  text            String    @db.Text
  language        String    @default("en")
  duration        Float

  segments        Json      // TranscriptSegment[]
  emergencyKeywords Json?   // EmergencyKeyword[]

  modelUsed       String
  tokenCount      Int
  processingTime  Float

  createdAt       DateTime  @default(now())

  @@index([incidentId])
}

model Template {
  id              String    @id @default(cuid())
  name            String
  description     String?
  status          TemplateStatus @default(DRAFT)
  version         Int       @default(1)

  // AI generation
  aiGenerated     Boolean   @default(false)
  aiConfidence    Float?
  aiGeneratedAt   DateTime?

  // Structure
  categories      Json      // TemplateCategory[]

  // Source documents
  policyDocuments Json?     // PolicyDocument[]

  // Usage stats
  usageCount      Int       @default(0)
  averageScore    Float?
  lastUsedAt      DateTime?

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  createdBy       String?   // Future: Azure SSO user ID

  // Relations
  audits          Audit[]

  @@index([status])
  @@index([createdAt])
}

model Audit {
  id              String    @id @default(cuid())
  incidentId      String
  incident        Incident  @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  transcriptId    String
  templateId      String
  template        Template  @relation(fields: [templateId], references: [id])

  // Results
  overallScore    Float
  overallStatus   AuditStatus

  // Thresholds
  passThreshold   Float     @default(0.85)
  improvementThreshold Float @default(0.70)

  // Detailed results
  categories      Json      // CategoryScore[]
  narrative       String?   @db.Text

  // Processing
  modelUsed       String
  tokensUsed      Int
  processingTime  Float

  createdAt       DateTime  @default(now())

  @@index([incidentId])
  @@index([templateId])
  @@index([createdAt])
}

enum IncidentType {
  STRUCTURE_FIRE
  VEHICLE_FIRE
  WILDFIRE
  MEDICAL
  RESCUE
  HAZMAT
  MVA
  OTHER
}

enum IncidentStatus {
  UPLOADED
  TRANSCRIBING
  ANALYZING
  COMPLETE
  ERROR
}

enum StorageProvider {
  LOCAL
  AZURE
  S3
}

enum TemplateStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum AuditStatus {
  PASS
  NEEDS_IMPROVEMENT
  FAIL
}
```

### API Routes

#### Policy & Templates
```
POST   /api/policy/upload          - Upload policy documents
POST   /api/policy/generate-template - Generate template from policies
GET    /api/policy/templates       - List all templates
GET    /api/policy/templates/:id   - Get template details
PUT    /api/policy/templates/:id   - Update template
DELETE /api/policy/templates/:id   - Delete/archive template
POST   /api/policy/templates/:id/duplicate - Duplicate template
```

#### Incidents & Transcription
```
POST   /api/transcription/upload   - Upload audio file
POST   /api/transcription/process  - Start transcription
GET    /api/transcription/:id      - Get transcription status/results
DELETE /api/transcription/:id      - Delete incident
```

#### Compliance & Audits
```
POST   /api/compliance/audit       - Run compliance audit
GET    /api/compliance/:auditId    - Get audit results
GET    /api/compliance/templates   - List available templates for audit
```

#### Dashboard & Analytics
```
GET    /api/dashboard/stats        - Get dashboard statistics
GET    /api/dashboard/incidents    - List recent incidents
GET    /api/analytics/trends       - Get performance trends
```

---

## Workflows & User Journeys

### Workflow 1: First-Time Setup (Policy → Template)

```
┌─────────────────────────────────────────────────────────┐
│ ACTOR: Training Officer (first-time user)               │
└─────────────────────────────────────────────────────────┘

GOAL: Create department-specific audit template from policies

STEPS:
1. User logs in for first time
2. Dashboard shows "Get Started" prompts
3. User clicks "Upload Policy & Generate Template"
4. User sees policy upload interface
5. User drags/drops 3 PDF files:
   - Engine Operations Manual.pdf (45 pages)
   - Mayday Protocol.docx (12 pages)
   - Safety SOP v2.1.pdf (23 pages)
6. System validates files and shows upload progress
7. User fills in template configuration:
   - Template Name: "Incident Safety Protocol"
   - Description: "Safety procedures for engine operations..."
   - Focus Areas: [x] Communication, [x] Mayday, [x] Safety Officer
8. User clicks "Generate Template (AI)"
9. System shows AI processing progress:
   ✅ Document parsing complete (3 files, 80 pages)
   ✅ Policy sections identified (12 sections)
   ✅ Compliance criteria extracted (38 criteria)
   🔄 Generating scoring rubrics... 75%
10. Template generation completes (3 minutes)
11. User sees template review interface:
    - 6 categories, 38 criteria
    - AI confidence: 94%
    - Source references for each criterion
12. User reviews AI-generated criteria:
    - Expands "Mayday Procedures" category
    - Sees criterion: "Mayday transmitted using proper format"
    - Sees source: "Mayday Protocol.docx p.3"
    - Sees AI confidence: 96%
13. User edits one criterion (low confidence):
    - Criterion: "LUNAR information provided" (83% confidence)
    - User clarifies description: "LUNAR (Location, Unit, Name,
      Assignment, Resources) must be stated after mayday call"
14. User adjusts category weight:
    - Changes "Mayday Procedures" from 20% to 25%
    - Changes "Resource Management" from 10% to 5%
    - System validates weights sum to 100%
15. User clicks "Save Template"
16. System saves template and marks as "Active"
17. User sees confirmation: "Template created successfully!
    You can now use this template to analyze incidents."
18. User returns to dashboard
19. Dashboard shows: "1 Active Template" in statistics

ACCEPTANCE:
✅ User successfully created custom template
✅ Template is marked as Active and ready to use
✅ All 38 criteria include source references
✅ Weights sum to 100%
✅ Template appears in template library

EDGE CASES:
- PDF has poor OCR quality → AI shows low confidence, prompts manual review
- User uploads wrong file type → System rejects before upload starts
- AI cannot extract criteria → System suggests manual template creation
- Network interruption during generation → System saves progress, allows resume
```

### Workflow 2: Incident Analysis (Audio → Report)

```
┌─────────────────────────────────────────────────────────┐
│ ACTOR: Training Officer                                  │
└─────────────────────────────────────────────────────────┘

GOAL: Analyze radio traffic from structure fire for training review

STEPS:
1. User clicks "Upload Radio Traffic & Analyze" from dashboard
2. User sees audio upload interface
3. User drags audio file:
   - structure-fire-radio-traffic-2024-12-15.mp3 (23 MB, 45:32)
4. System validates file:
   ✅ Format: MP3 (supported)
   ✅ Size: 23 MB (under 500 MB limit)
   ✅ Duration: 45:32 (under 4 hour limit)
5. System extracts metadata:
   - Duration: 45:32
   - Bitrate: 128 kbps
   - Channels: Stereo
   - Quality: Good
6. User fills in incident details (optional):
   - Incident Name: "Structure Fire - 123 Main Street"
   - Date: 2024-12-15
   - Time: 14:32
   - Type: Structure Fire
   - Units: Engine 1, Engine 2, Ladder 2, Battalion 1
   - Notes: "Multi-company response. Mayday called due to floor
     collapse. 2 firefighters injured."
7. User selects audit templates:
   [x] NFPA 1561: Incident Command System
   [x] Incident Safety Protocol (AI-Generated)
   [ ] Multi-Agency Operations
8. System shows estimated time: "Analysis will take approximately
   7-10 minutes"
9. User clicks "Start Analysis"
10. System begins processing:
    ✅ Audio uploaded (23 MB)
    🔄 Transcribing audio... 45%
11. Transcription progress updates:
    - "Processing segment 3 of 5..."
    - Live preview shows transcript:
      [14:32:15] Battalion 1: "Command to Engine 1..."
      [14:32:45] Engine 2: "MAYDAY MAYDAY MAYDAY!"
12. Transcription completes (2 minutes):
    ✅ Audio transcribed (8,234 words, 127 transmissions)
    ✅ Emergency keywords detected (4 maydays, 2 evacuations)
    ✅ Timeline generated (47 key events)
13. Compliance analysis begins:
    🔄 NFPA 1561 audit in progress (35%)
    ⏳ Incident Safety Protocol audit queued
14. First audit completes:
    ✅ NFPA 1561 audit complete (Score: 82%)
    🔄 Incident Safety Protocol audit in progress (55%)
15. Second audit completes:
    ✅ Incident Safety Protocol audit complete (Score: 78%)
    🔄 Generating narrative report...
16. Narrative generation completes
17. All processing complete (7 minutes total)
18. System navigates user to report view
19. User sees Report Overview tab:
    - Combined Score: 80%
    - Status: NEEDS IMPROVEMENT
    - NFPA 1561: 82%
    - Incident Safety Protocol: 78%
20. User reviews Critical Findings:
    🔴 1. Mayday Protocol Violation (14:32:45)
       - Issue: Mayday not transmitted in proper LUNAR format
       - Evidence: "MAYDAY MAYDAY MAYDAY! Engine 2, second
         floor collapse, need help now!" [14:32:45]
       - Expected: LUNAR (Location, Unit, Name, Assignment, Resources)
       - Impact: Incomplete information delayed rescue ~90 seconds
       - Recommendation: Refresher training on mayday protocol

    🔴 2. Communication Breakdown (14:35:12)
       - Issue: Multiple units transmitting simultaneously
       - Evidence: 3 overlapping transmissions detected
       - Duration: 16 seconds of interference
       - Impact: Delayed tactical decisions during mayday response
       - Recommendation: Radio discipline refresher
21. User switches to Timeline tab
22. User sees interactive timeline (using EmergencyTimeline component):
    - 00:00 ━ Incident Dispatch
    - 06:15 ━ First Unit On Scene
    - 14:32 🔴 MAYDAY CALLED (critical event highlighted)
    - 14:35 ⚠️ Communication Breakdown
    - 16:47 ✅ PAR Complete (strength highlighted)
23. User clicks on mayday event
24. System shows event details:
    - Full transcript excerpt
    - Compliance issue details
    - Evidence and impact
25. User switches to Transcript tab
26. User sees full transcript with annotations:
    - [14:32:45] Engine 2 🔴 MAYDAY - Violation
      "MAYDAY MAYDAY MAYDAY! Engine 2, second floor
      collapse, need help now!"

      📋 Compliance Issue:
      ❌ Incomplete LUNAR format
      Expected: Location, Unit, Name, Assignment, Resources
      Provided: Location (partial), Unit only
27. User clicks "Export PDF"
28. System generates PDF report (5 seconds)
29. User downloads PDF: "Structure-Fire-123-Main-St-Report.pdf"
30. User shares PDF with crew for training session

ACCEPTANCE:
✅ Audio transcribed accurately with timestamps
✅ Two templates analyzed successfully
✅ Critical findings identified with evidence
✅ Timeline shows 47 events chronologically
✅ Transcript has inline compliance annotations
✅ PDF exports successfully
✅ Total time < 10 minutes

EDGE CASES:
- Poor audio quality → Transcription shows confidence warnings
- Whisper API rate limit → System queues and retries automatically
- User closes browser during processing → Processing continues,
  user can resume when returning
- No templates selected → System prevents starting analysis
- Audio file corrupted → System shows clear error message
```

### Workflow 3: Training Review Session

```
┌─────────────────────────────────────────────────────────┐
│ ACTOR: Company Officer (reviewing own crew's incident)   │
└─────────────────────────────────────────────────────────┘

GOAL: Use incident report for crew training session

STEPS:
1. Officer receives email: "New incident report available:
   Structure Fire - 123 Main Street"
2. Officer clicks link in email
3. System authenticates user (already logged in)
4. System navigates to incident report
5. Officer reviews overview:
   - Overall Score: 80% (NEEDS IMPROVEMENT)
   - Critical Issue: Mayday protocol violation (Engine 2 - his crew)
6. Officer notes this is a learning opportunity
7. Officer explores timeline to understand incident flow:
   - Reviews events leading up to mayday
   - Identifies moment floor collapsed (14:30)
   - Reviews mayday call at 14:32:45
   - Reviews command response
   - Reviews crew rescue at 14:45
8. Officer listens to audio at mayday timestamp (if audio playback available)
9. Officer reviews compliance issue details:
   - Reads what was said vs. what should have been said
   - Understands impact: 90-second delay in rescue
   - Reads recommendation: LUNAR format refresher
10. Officer clicks "Export PDF"
11. Officer prints PDF for training session
12. Officer schedules crew training meeting
13. During meeting, officer:
    - Shares PDF report
    - Reviews timeline together
    - Discusses what happened
    - Reviews proper LUNAR format
    - Role-plays correct mayday protocol
    - Crew commits to improvement
14. Officer adds note to incident (future feature):
    "Training completed with crew on 2024-12-18. All members
    reviewed LUNAR format. Follow-up drill scheduled."

ACCEPTANCE:
✅ Officer can access report easily
✅ Critical findings are clear and actionable
✅ Timeline helps crew "replay" incident
✅ PDF is professional and suitable for training
✅ Crew understands what to improve

BENEFITS:
- Objective, data-driven feedback
- Specific timestamps for discussion
- Clear recommendations
- Constructive tone (learning focus, not blame)
```

---

## Acceptance Criteria

### MVP (Minimum Viable Product) Acceptance

The system is considered MVP-complete when:

#### Template Management
- ✅ User can upload 1-5 policy documents (PDF, DOCX)
- ✅ AI generates template with 4-10 categories, 20-50 criteria
- ✅ Template generation completes in < 5 minutes for 100 pages
- ✅ User can review and edit AI-generated template
- ✅ User can save template as Active
- ✅ Template appears in library for selection

#### Incident Analysis
- ✅ User can upload audio file (MP3, WAV, M4A)
- ✅ Audio transcribes with timestamps in < 5 minutes for 45 min audio
- ✅ User can select 1-2 templates for analysis
- ✅ Compliance analysis completes in < 5 minutes per template
- ✅ Analysis identifies 5-15 compliance issues with evidence
- ✅ System generates narrative summary (300-500 words)

#### Report Viewing
- ✅ User can view overall score and status
- ✅ User can view critical findings with evidence
- ✅ User can view category breakdowns
- ✅ User can view timeline with 20+ events
- ✅ User can view full transcript with annotations
- ✅ User can export report as PDF

#### Dashboard
- ✅ User can see list of recent incidents
- ✅ User can see statistics (total incidents, avg score)
- ✅ User can access quick actions (upload policy, upload audio)

### Full Product Acceptance

The system is considered production-ready when:

#### Performance
- ✅ Dashboard loads in < 2 seconds
- ✅ Template generation: < 5 minutes for 100 pages
- ✅ Audio transcription: < 5 minutes for 45 minutes audio
- ✅ Compliance analysis: < 5 minutes per template
- ✅ Report viewing: < 2 seconds to load
- ✅ PDF export: < 10 seconds for 50-page report
- ✅ Search: < 1 second for any query

#### Accuracy
- ✅ Transcription accuracy: > 90% for clear audio
- ✅ AI template extraction: > 85% of criteria are usable without edits
- ✅ Compliance scoring: > 90% agreement with expert human review
- ✅ Timestamp accuracy: ± 1 second
- ✅ Emergency keyword detection: > 95% recall, > 90% precision

#### Reliability
- ✅ System uptime: > 99% during business hours
- ✅ API failures: < 1% failure rate (with automatic retry)
- ✅ Data loss: Zero incidents
- ✅ Error handling: All errors show clear user-facing messages
- ✅ Recovery: Processing can resume after interruption

#### Usability
- ✅ New user completes first workflow without help in < 15 minutes
- ✅ All forms have clear validation errors
- ✅ All actions provide immediate feedback
- ✅ Mobile responsiveness: Works on tablets (1024px+)
- ✅ Accessibility: Keyboard navigation works for all features
- ✅ User satisfaction: > 4.0/5.0 in testing

#### Security (MVP - No Authentication)
- ✅ SQL injection protection (Prisma ORM)
- ✅ XSS protection (React escaping)
- ✅ CSRF protection (Next.js built-in)
- ✅ File upload validation (type, size)
- ✅ Basic activity logging (action, timestamp, resource)
- ⏳ Authentication/authorization (Future: Azure SSO)

---

## Security & Compliance

### Data Security

#### Authentication & Authorization (Future)
- **MVP**: No authentication required - open access
- **Future**: Azure SSO (Single Sign-On) integration
  - Azure Active Directory authentication
  - Role-based access from Azure AD groups
  - Session management with secure tokens
- **Note**: Database schema includes `createdBy` fields (nullable) to support future user tracking

#### Data Protection
- TLS 1.3 for all connections (HTTPS required in production)
- Secure file storage (S3/Azure with access controls)
- Regular backups

#### Input Validation
- All user inputs validated on client and server
- File upload validation: type, size, malware scan (ClamAV optional)
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (React automatic escaping)
- CSRF protection (Next.js built-in)

#### Audit Logging (Future)
- **MVP**: Basic activity logging (action type, timestamp, resource ID)
- **Future** (with Azure SSO): Enhanced logging with user identification
  - User ID from Azure AD
  - Action type
  - Timestamp
  - IP address
  - Resource ID
  - Changes made (diff)

### Compliance Considerations

#### Fire Department Standards
- NFPA 1561 (Incident Management System)
- NFPA 1500 (Fire Department Occupational Safety)
- Department-specific SOPs (loaded as templates)

**Note**: Radio traffic audio is pre-sanitized and does not contain protected health information (PHI) or criminal justice information (CJI). Standard application security practices are sufficient.

### Data Retention

**Default Policies**:
- Incidents: Retain indefinitely (unless manually deleted)
- Transcripts: Retain with incident
- Audits: Retain with incident
- Audio files: Retain for 90 days, then archive or delete (configurable)
- Templates: Retain indefinitely (unless archived)
- User activity logs: Retain for 1 year

**Configurable Options**:
- Admin can set retention period for audio files (30/60/90/365 days or forever)
- Admin can set auto-archive policies
- Admin can enable manual deletion with approval workflow

---

## Performance Requirements

### Response Time Targets

| Operation | Target | Maximum |
|-----------|--------|---------|
| Page load (dashboard, reports) | < 2s | < 5s |
| Audio upload (100MB) | < 30s | < 60s |
| Audio transcription (45 min) | < 3 min | < 5 min |
| Template generation (100 pages) | < 3 min | < 5 min |
| Compliance audit (1 template) | < 3 min | < 5 min |
| PDF export (50 pages) | < 5s | < 10s |
| Search query | < 500ms | < 1s |
| API response (simple) | < 200ms | < 500ms |

### Scalability Targets

**Concurrent Users**: Support 20 concurrent users (small department)
**Data Storage**: Support 10,000 incidents (~ 5TB audio storage)
**Database**: PostgreSQL handles 10M+ records without performance degradation
**API Rate Limits**: Handle OpenAI rate limits (tier-based):
- Whisper: 50 requests/minute
- GPT-4: 500 requests/minute (tier 1)

### Resource Limits

**File Sizes**:
- Audio uploads: 500 MB max
- Policy documents: 50 MB max per file
- Total storage: Depends on storage provider (unlimited with S3/Azure)

**Processing Limits**:
- Audio duration: 4 hours max
- Template generation: 200 pages max per policy doc
- Concurrent analyses: 5 max per user

---

## Appendix

### A. Technology Decisions

#### Why Next.js 15?
- Server-side rendering for fast page loads
- API routes for backend logic (no separate server)
- App Router for modern routing patterns
- Built-in TypeScript support
- Edge runtime support (future optimization)

#### Why PostgreSQL?
- Relational data model fits audit/incident relationships
- JSON column support for flexible schema (categories, criteria)
- Mature, reliable, well-supported
- Prisma ORM provides type-safe queries

#### Why OpenAI APIs?
- Whisper: Industry-leading transcription accuracy
- GPT-4: Best-in-class reasoning for compliance analysis
- Structured outputs: JSON mode ensures parseable responses
- Rate limits are reasonable for department use

#### Why Redis?
- Fast caching for expensive operations
- Session storage
- Job queue for async processing (future)
- Pub/sub for real-time updates (future)

### B. Component Library (Reuse Strategy)

**Existing Components** (from Phase 1):

1. **TranscriptionProgress** ✅
   - **Use**: Audio upload and transcription progress
   - **Props**: fileName, fileSize, status, processingProgress, duration
   - **Location**: Upload incident page during processing

2. **ComplianceScore** ✅
   - **Use**: Display overall and category scores
   - **Props**: overallScore, overallStatus, categories[], variant, showCategories
   - **Location**: Report overview tab

3. **EmergencyTimeline** ✅
   - **Use**: Interactive incident timeline
   - **Props**: events[], maxHeight, showConfidence, variant
   - **Location**: Report timeline tab
   - **Enhancement**: Add audio playback integration (optional)

4. **UnitStatus** ✅
   - **Use**: Adapted for crew performance tracking (future phase)
   - **Props**: units[], layout, variant, onUnitClick
   - **Location**: Analytics dashboard (future)

**New Components Needed**:

1. **PolicyUploader**
   - Drag-and-drop file upload with multi-file support
   - Document parsing status display
   - File validation and preview

2. **TemplateEditor**
   - Category/criterion CRUD interface
   - Weight adjustment with validation
   - Expandable sections for category details
   - AI prompt editing

3. **TemplateLibrary**
   - Grid/list view of templates
   - Search and filter controls
   - Template cards with metadata
   - Quick actions (view, edit, duplicate, archive)

4. **IncidentUploader**
   - Audio file upload with metadata extraction
   - Incident details form
   - Template selection checkboxes
   - Analysis configuration

5. **ReportViewer**
   - Tabbed interface (Overview, Timeline, Transcript)
   - Finding cards with expand/collapse
   - Export controls
   - Navigation between sections

6. **TranscriptViewer**
   - Timestamped transcript display
   - Inline compliance annotations
   - Search and filter
   - Audio playback sync (optional)

### C. AI Prompt Templates

See FR-3.2 for compliance analysis prompts.

### D. Glossary

**Terms**:
- **Audit**: Analysis of incident against template criteria
- **Category**: Group of related compliance criteria
- **Criterion**: Single scoreable requirement from policy
- **LUNAR**: Location, Unit, Name, Assignment, Resources (mayday format)
- **Mayday**: Emergency distress call
- **NFPA**: National Fire Protection Association
- **PAR**: Personnel Accountability Report
- **Template**: Set of categories and criteria for compliance scoring
- **Transcript**: Text version of audio with timestamps

**Abbreviations**:
- **AI**: Artificial Intelligence
- **API**: Application Programming Interface
- **CRUD**: Create, Read, Update, Delete
- **PDF**: Portable Document Format
- **RIT**: Rapid Intervention Team
- **SOP**: Standard Operating Procedure

---

**End of Specification**

This document defines the complete product requirements for the Fire Department Radio Transcription & Training Analysis System. All features, workflows, and acceptance criteria are designed to be implementation-ready without timeline constraints.

For technical implementation details, refer to the codebase documentation and API specifications above.
