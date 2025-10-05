# Backend Services Implementation Plan
## Fire Department Radio Transcription System - Phase 2

**Document Version:** 1.0
**Created:** 2025-10-04
**Status:** Planning Complete, Ready for Execution
**Branch:** phase-2/backend-infrastructure
**Tasks:** 3.3 (Audio Transcription), 3.4 (Compliance Scoring), 3.7 (Policy Conversion)

---

## 1. Situation Assessment

### 1.1 Current State Analysis

**✅ Completed Infrastructure:**
- Prisma schema fully defined with all models (Incident, Transcript, Audit, Template, PolicyDocument, etc.)
- Database client (`src/lib/db.ts`) configured with connection pooling
- Comprehensive TypeScript types (`src/lib/types/index.ts`) - 494 lines
- Validation utilities (`src/lib/utils/validators.ts`) - 319 lines
- All dependencies installed: OpenAI SDK, Prisma, Zod, bcryptjs, mammoth, pdf-parse, xlsx
- Environment configuration (.env) with DATABASE_URL and OPENAI_API_KEY placeholders
- Next.js 15 app structure with App Router

**❌ Missing Components:**
- No service layer implementations
- No API routes in `src/app/api/`
- No storage service for file management
- No OpenAI integration code
- No emergency detection algorithms
- No document extraction services

### 1.2 Dependencies Confirmed

**Installed Packages:**
```json
{
  "@prisma/client": "^6.16.3",
  "openai": "^6.1.0",
  "mammoth": "^1.11.0",
  "pdf-parse": "^2.1.7",
  "xlsx": "^0.18.5",
  "zod": "^4.1.11",
  "bcryptjs": "^3.0.2"
}
```

**Environment Variables Required:**
- `DATABASE_URL`: Configured (Prisma Postgres local)
- `OPENAI_API_KEY`: Placeholder present, needs real key
- `UPLOAD_DIR`: "./uploads"
- `MAX_FILE_SIZE_MB`: 50
- `SUPPORTED_AUDIO_FORMATS`: "mp3,mp4,m4a,wav,webm"

### 1.3 Integration Points

**Database Layer:**
- Prisma ORM with PostgreSQL backend
- All models defined with proper relationships
- Indexes configured for performance

**Frontend Layer:**
- Design system complete (Phase 1)
- UI components ready for API integration
- Type definitions aligned with backend types

---

## 2. Strategy

### 2.1 High-Level Architecture

**Service Layer Pattern:**
```
API Routes (Next.js)
    ↓
Service Layer (Business Logic)
    ↓
Data Access Layer (Prisma)
    ↓
Database (PostgreSQL)
```

**Key Architectural Decisions:**

1. **Separation of Concerns**: Services contain business logic, API routes handle HTTP concerns
2. **Type Safety**: End-to-end TypeScript with Zod validation at boundaries
3. **Error Handling**: Centralized error handling with structured logging
4. **OpenAI Integration**: Direct SDK usage with rate limiting and cost tracking
5. **File Storage**: Local file system for development, abstracted for production (Azure Blob)
6. **Async Operations**: Job-based pattern for long-running tasks (transcription, document conversion)

### 2.2 Service Decomposition

**Task 3.3: Audio Transcription Service**
- `StorageService`: File upload/download/cleanup
- `TranscriptionService`: OpenAI Whisper integration
- `EmergencyDetectionService`: Mayday and emergency term detection
- API Routes: `/api/transcription/*`

**Task 3.4: Compliance Scoring Engine**
- `TemplateService`: Template CRUD and management
- `ComplianceService`: GPT-4o-powered scoring
- API Routes: `/api/compliance/*`

**Task 3.7: Policy Document Conversion**
- `DocumentExtractionService`: Multi-format document parsing
- `TemplateGenerationService`: AI-powered template creation
- API Routes: `/api/policy/*`

### 2.3 Risk Mitigation

**OpenAI API Costs:**
- Track token usage in SystemMetrics table
- Implement request logging
- Use gpt-4o-mini for testing
- Set monthly budget limits in environment

**File Processing Performance:**
- Stream large files to avoid memory issues
- Implement chunking for document processing
- Set file size limits (50MB default)
- Background job processing for long operations

**Data Security:**
- Validate all inputs with Zod schemas
- Sanitize file uploads (use validators.ts)
- Never log sensitive information
- Secure filename generation to prevent path traversal

**Database Performance:**
- Indexes already defined in Prisma schema
- Use Prisma query optimization
- Implement pagination for large result sets
- Monitor query performance with logging

---

## 3. Detailed Implementation Plan

### 3.1 File Structure

**Services Directory:**
```
src/lib/services/
├── storage.ts              # File upload/download service
├── transcription.ts        # OpenAI Whisper integration
├── emergencyDetection.ts   # Mayday and emergency term detection
├── templateService.ts      # Template CRUD operations
├── complianceService.ts    # GPT-4o compliance scoring
├── documentExtraction.ts   # Multi-format document parsing
├── templateGeneration.ts   # AI-powered template creation
└── utils/
    ├── openai.ts           # OpenAI client configuration
    ├── errorHandlers.ts    # Centralized error handling
    └── jobTracker.ts       # Async job tracking (in-memory for now)
```

**API Routes Directory:**
```
src/app/api/
├── transcription/
│   ├── upload/route.ts         # POST - Upload audio file
│   ├── process/route.ts        # POST - Start transcription
│   └── [id]/route.ts           # GET - Get transcript by ID
├── compliance/
│   ├── templates/route.ts      # GET/POST - Template management
│   ├── audit/route.ts          # POST - Run compliance audit
│   └── [auditId]/route.ts      # GET - Get audit results
└── policy/
    ├── upload/route.ts         # POST - Upload policy documents
    ├── convert/route.ts        # POST - Convert to template
    └── [jobId]/route.ts        # GET - Check conversion status
```

---

## 4. Task Breakdown

### Task 3.3: Audio Transcription Service (12 hours)

#### Step 1: Storage Service (2 hours)
**File:** `src/lib/services/storage.ts`

**Features:**
- Local file system storage for development
- Azure Blob Storage configuration (commented, ready for production)
- File validation using existing validators
- Secure filename generation (UUID-based)
- File cleanup and deletion

**Key Methods:**
```typescript
class StorageService {
  async uploadAudio(file: File, incidentId?: string): Promise<FileUploadResult>
  async getAudioUrl(fileName: string): Promise<string>
  async deleteAudio(fileName: string): Promise<void>
  async ensureUploadDirectory(): Promise<void>
}
```

**Implementation Notes:**
- Create `uploads/` directory if not exists
- Generate unique filenames: `${timestamp}-${uuid}.${ext}`
- Store metadata: originalName, size, mimeType
- Return full URL for audio access

---

#### Step 2: OpenAI Client Utility (1 hour)
**File:** `src/lib/services/utils/openai.ts`

**Features:**
- OpenAI client singleton
- Error handling wrapper
- Rate limiting (simple counter-based)
- Cost tracking integration

**Key Methods:**
```typescript
function getOpenAIClient(): OpenAI
async function trackTokenUsage(model: string, tokens: TokenUsage): Promise<void>
```

---

#### Step 3: Emergency Detection Service (3 hours)
**File:** `src/lib/services/emergencyDetection.ts`

**Features:**
- Mayday detection with >95% accuracy target
- Emergency term identification
- Context extraction (±50 words around detection)
- Confidence scoring

**Mayday Patterns:**
```typescript
const MAYDAY_PATTERNS = [
  { pattern: /\bmayday\b/gi, confidence: 1.0 },
  { pattern: /\bmay day\b/gi, confidence: 0.95 },
  { pattern: /\bemergency emergency\b/gi, confidence: 0.9 },
  { pattern: /\bfirefighter down\b/gi, confidence: 1.0 },
  { pattern: /\bff down\b/gi, confidence: 0.85 },
  { pattern: /\btrapped\b/gi, confidence: 0.7 },
  { pattern: /\bcollapse\b/gi, confidence: 0.75 },
];
```

**Emergency Terms:**
```typescript
const EMERGENCY_TERMS = {
  MAYDAY: ['mayday', 'may day'],
  EMERGENCY: ['emergency', 'urgent'],
  DISTRESS: ['trapped', 'stuck', 'lost', 'disoriented'],
  SAFETY: ['evacuate', 'get out', 'withdraw'],
  EVACUATION: ['all out', 'abandon', 'emergency evacuation'],
};
```

**Key Methods:**
```typescript
class EmergencyDetectionService {
  detectMayday(text: string, segments: TranscriptionSegment[]): MaydayDetection[]
  detectEmergencyTerms(text: string, segments: TranscriptionSegment[]): EmergencyTerm[]
  extractContext(text: string, position: number, windowSize: number): string
  calculateConfidence(pattern: RegExp, context: string): number
}
```

---

#### Step 4: Transcription Service (4 hours)
**File:** `src/lib/services/transcription.ts`

**Features:**
- OpenAI Whisper API integration
- Audio file upload to OpenAI
- Segment extraction with timestamps
- Integration with emergency detection
- Database persistence

**Key Methods:**
```typescript
class TranscriptionService {
  async transcribeAudio(
    audioFile: File,
    incidentId: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult>

  private async callWhisperAPI(audioPath: string): Promise<WhisperResponse>
  private processSegments(segments: any[]): TranscriptionSegment[]
  private async saveTranscript(data: TranscriptData): Promise<Transcript>
}
```

**Whisper API Configuration:**
```typescript
const WHISPER_CONFIG = {
  model: 'whisper-1',
  language: 'en',
  response_format: 'verbose_json', // Includes timestamps
  temperature: 0.0, // More deterministic
};
```

**Implementation Flow:**
1. Validate audio file
2. Upload to storage
3. Call OpenAI Whisper API
4. Extract segments with timestamps
5. Run emergency detection
6. Save to database
7. Return structured result

---

#### Step 5: Transcription API Routes (2 hours)

**File:** `src/app/api/transcription/upload/route.ts`
```typescript
POST /api/transcription/upload
Body: FormData with audio file
Returns: { jobId, uploadUrl, fileName }
```

**File:** `src/app/api/transcription/process/route.ts`
```typescript
POST /api/transcription/process
Body: { fileName, incidentId, language?, detectMayday? }
Returns: TranscriptionResult
```

**File:** `src/app/api/transcription/[id]/route.ts`
```typescript
GET /api/transcription/[id]
Returns: TranscriptionResult from database
```

**Error Handling:**
- 400: Invalid file format/size
- 404: Transcript not found
- 500: OpenAI API errors, database errors
- Structured error responses using APIError type

---

### Task 3.4: Compliance Scoring Engine (14 hours)

#### Step 1: Template Service (3 hours)
**File:** `src/lib/services/templateService.ts`

**Features:**
- CRUD operations for templates
- Template validation (structure, categories, criteria)
- Version management
- Default template seeding (NFPA 1561)

**Key Methods:**
```typescript
class TemplateService {
  async createTemplate(data: TemplateCreateInput): Promise<Template>
  async getTemplates(filters?: TemplateFilters): Promise<Template[]>
  async getTemplateById(id: string): Promise<Template | null>
  async updateTemplate(id: string, data: TemplateUpdateInput): Promise<Template>
  async deleteTemplate(id: string): Promise<void> // Soft delete
  async validateTemplateStructure(template: any): ValidationResult
}
```

**Template Validation:**
- Each category must have at least 1 criterion
- Weights must sum to 1.0
- Criterion IDs must be unique
- Required fields: name, description, categories

---

#### Step 2: Compliance Service (7 hours)
**File:** `src/lib/services/complianceService.ts`

**Features:**
- GPT-4o integration for scoring
- Template-based audit generation
- Finding extraction with citations
- Recommendation engine
- Score calculation and aggregation

**Key Methods:**
```typescript
class ComplianceService {
  async auditTranscript(
    transcriptId: string,
    templateId: string,
    additionalNotes?: string
  ): Promise<AuditResult>

  private buildScoringPrompt(
    transcript: Transcript,
    template: Template
  ): string

  private async callGPT4o(prompt: string): Promise<GPTResponse>

  private parseAuditResponse(response: string): {
    categories: ComplianceCategory[];
    findings: Finding[];
  }

  private calculateOverallScore(categories: ComplianceCategory[]): number

  private generateRecommendations(
    categories: ComplianceCategory[],
    findings: Finding[]
  ): Recommendation[]

  private async saveAudit(auditData: AuditData): Promise<Audit>
}
```

**GPT-4o Prompt Structure:**
```typescript
const SCORING_PROMPT_TEMPLATE = `
You are an expert fire department compliance auditor evaluating radio communications.

TRANSCRIPT:
{transcript}

COMPLIANCE TEMPLATE:
{template}

TASK:
Evaluate the transcript against each criterion in the template. For each criterion:
1. Determine if it is PASS, FAIL, PARTIAL, or NOT_APPLICABLE
2. Provide a rationale with specific quotes from the transcript
3. Extract findings (positive or negative compliance examples)
4. Cite exact timestamps when possible

OUTPUT FORMAT (JSON):
{
  "categories": [
    {
      "name": "...",
      "criteria": [
        {
          "id": "...",
          "status": "PASS|FAIL|PARTIAL|NOT_APPLICABLE",
          "score": 0-100,
          "rationale": "...",
          "findings": [
            {
              "timestamp": "00:15",
              "quote": "...",
              "compliance": "POSITIVE|NEGATIVE|NEUTRAL",
              "explanation": "..."
            }
          ]
        }
      ]
    }
  ]
}
`;
```

**GPT-4o Configuration:**
```typescript
const COMPLIANCE_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.1, // Low for consistency
  max_tokens: 4000,
  response_format: { type: 'json_object' },
};
```

**Score Calculation:**
1. Calculate criterion score based on status (PASS=100, PARTIAL=50, FAIL=0)
2. Weight criteria within category
3. Weight categories for overall score
4. Handle NOT_APPLICABLE by redistributing weight

---

#### Step 3: Compliance API Routes (4 hours)

**File:** `src/app/api/compliance/templates/route.ts`
```typescript
GET /api/compliance/templates
Query: { active?, source? }
Returns: Template[]

POST /api/compliance/templates
Body: TemplateCreateInput
Returns: Template
```

**File:** `src/app/api/compliance/audit/route.ts`
```typescript
POST /api/compliance/audit
Body: { transcriptId, templateId, additionalNotes? }
Returns: AuditResult
```

**File:** `src/app/api/compliance/[auditId]/route.ts`
```typescript
GET /api/compliance/[auditId]
Returns: AuditResult
```

---

### Task 3.7: Policy Document Conversion (16 hours)

#### Step 1: Document Extraction Service (6 hours)
**File:** `src/lib/services/documentExtraction.ts`

**Features:**
- PDF extraction using pdf-parse
- Word extraction using mammoth
- Excel extraction using xlsx
- PowerPoint extraction (text-based)
- Section detection and structure analysis
- Scorecard format recognition

**Key Methods:**
```typescript
class DocumentExtractionService {
  async extractContent(file: File): Promise<ExtractedContent>

  private async extractFromPDF(file: File): Promise<ExtractedContent>
  private async extractFromWord(file: File): Promise<ExtractedContent>
  private async extractFromExcel(file: File): Promise<ExtractedContent>
  private async extractFromPowerPoint(file: File): Promise<ExtractedContent>
  private async extractFromText(file: File): Promise<ExtractedContent>

  private detectSections(text: string): DocumentSection[]
  private isScorecardFormat(data: any[][]): boolean
  private buildSectionHierarchy(sections: DocumentSection[]): DocumentSection[]
}
```

**PDF Extraction:**
```typescript
import pdfParse from 'pdf-parse';

async extractFromPDF(file: File): Promise<ExtractedContent> {
  const buffer = await file.arrayBuffer();
  const data = await pdfParse(Buffer.from(buffer));

  return {
    text: data.text,
    sections: this.detectSections(data.text),
    metadata: {
      pages: data.numpages,
      format: 'pdf',
      characterCount: data.text.length,
      ...
    }
  };
}
```

**Word Extraction:**
```typescript
import mammoth from 'mammoth';

async extractFromWord(file: File): Promise<ExtractedContent> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });

  return {
    text: result.value,
    sections: this.detectSections(result.value),
    ...
  };
}
```

**Excel Extraction:**
```typescript
import * as XLSX from 'xlsx';

async extractFromExcel(file: File): Promise<ExtractedContent> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);

  // Check if it's a scorecard format
  const isScorecard = this.isScorecardFormat(workbook);

  // Extract text from all sheets
  let text = '';
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    text += XLSX.utils.sheet_to_txt(sheet) + '\n\n';
  });

  return { text, sections: [], metadata: { isScorecard, ... } };
}
```

**Section Detection Algorithm:**
```typescript
private detectSections(text: string): DocumentSection[] {
  const lines = text.split('\n');
  const sections: DocumentSection[] = [];

  // Regex patterns for headings
  const headingPatterns = [
    { level: 1, pattern: /^(?:\d+\.?\s+)?([A-Z][A-Z\s]{3,})$/i }, // ALL CAPS
    { level: 2, pattern: /^(?:\d+\.\d+\.?\s+)?([A-Z][a-z\s]+)$/i }, // Title Case
    { level: 3, pattern: /^(?:\d+\.\d+\.\d+\.?\s+)?(.+)$/i }, // Numbered
  ];

  // Process lines and detect headings
  // Build hierarchy based on levels

  return sections;
}
```

---

#### Step 2: Template Generation Service (7 hours)
**File:** `src/lib/services/templateGeneration.ts`

**Features:**
- Multi-document analysis with GPT-4o
- Template structure generation
- Criteria extraction and enhancement
- Regulatory reference identification
- Confidence scoring

**Key Methods:**
```typescript
class TemplateGenerationService {
  async generateTemplate(
    files: File[],
    options: TemplateGenerationOptions
  ): Promise<GeneratedTemplate>

  private async analyzeDocuments(
    contents: ExtractedContent[]
  ): Promise<DocumentAnalysis>

  private async extractCriteria(
    analysis: DocumentAnalysis,
    content: string
  ): Promise<ComplianceCriterion[]>

  private async enhanceCriterion(
    criterion: ComplianceCriterion,
    context: string
  ): Promise<ComplianceCriterion>

  private calculateConfidence(
    analysis: DocumentAnalysis,
    template: any
  ): number

  private async saveGeneratedTemplate(
    templateData: any,
    sourceDocuments: string[]
  ): Promise<Template>
}
```

**GPT-4o Analysis Prompt:**
```typescript
const TEMPLATE_GENERATION_PROMPT = `
You are an expert at analyzing fire department policy documents and creating compliance templates.

DOCUMENTS PROVIDED:
{documentSummaries}

TASK:
Analyze these documents and create a structured compliance template with:
1. Identify 5-8 main categories (e.g., "Radio Discipline", "Emergency Procedures", "Safety Protocols")
2. For each category, extract 3-8 specific criteria that can be evaluated
3. For each criterion, provide:
   - Clear description
   - Evidence required for compliance
   - Scoring method (PASS_FAIL, NUMERIC, CRITICAL_PASS_FAIL)
   - Weight (relative importance)
4. Extract regulatory references (NFPA standards, OSHA regulations)

OUTPUT FORMAT (JSON):
{
  "templateName": "...",
  "categories": [
    {
      "name": "...",
      "description": "...",
      "weight": 0.0-1.0,
      "regulatoryReferences": ["NFPA 1561", ...],
      "criteria": [
        {
          "id": "unique-id",
          "description": "...",
          "evidenceRequired": "...",
          "scoringMethod": "PASS_FAIL",
          "weight": 0.0-1.0
        }
      ]
    }
  ],
  "emergencyProcedures": [...],
  "regulatoryFramework": [...],
  "completeness": 0.0-1.0,
  "confidence": 0.0-1.0
}
`;
```

**Confidence Calculation:**
- Document completeness: Are all sections well-defined?
- Regulatory coverage: Are standards referenced?
- Criteria clarity: Are criteria specific and measurable?
- Template structure: Is hierarchy logical?

---

#### Step 3: Policy Conversion API Routes (3 hours)

**File:** `src/app/api/policy/upload/route.ts`
```typescript
POST /api/policy/upload
Body: FormData with multiple document files
Returns: { jobId, documentIds: string[] }
```

**File:** `src/app/api/policy/convert/route.ts`
```typescript
POST /api/policy/convert
Body: {
  documentIds: string[],
  options: TemplateGenerationOptions
}
Returns: { jobId, status: 'PENDING' }
```

**File:** `src/app/api/policy/[jobId]/route.ts`
```typescript
GET /api/policy/[jobId]
Returns: AsyncJobResult<GeneratedTemplate>
```

---

## 5. Utility Services

### Job Tracking Utility
**File:** `src/lib/services/utils/jobTracker.ts`

**Features:**
- In-memory job tracking for async operations
- Status updates (PENDING, PROCESSING, COMPLETED, FAILED)
- Progress tracking (0-100%)
- Result storage

**Implementation:**
```typescript
// Simple in-memory store for development
// Production: Use Redis or database-backed queue

class JobTracker {
  private jobs: Map<string, AsyncJobResult<any>> = new Map();

  createJob<T>(jobId: string): AsyncJobResult<T>
  updateJobProgress(jobId: string, progress: number): void
  completeJob<T>(jobId: string, result: T): void
  failJob(jobId: string, error: string): void
  getJob<T>(jobId: string): AsyncJobResult<T> | null
}

export const jobTracker = new JobTracker();
```

### Error Handler Utility
**File:** `src/lib/services/utils/errorHandlers.ts`

**Features:**
- Centralized error handling
- Structured error logging
- Error type classification

**Implementation:**
```typescript
export class ServiceError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

export function handleServiceError(error: unknown): APIError {
  if (error instanceof ServiceError) {
    return {
      error: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
    };
  }

  // OpenAI API errors
  if (error instanceof Error && error.name === 'OpenAIError') {
    return {
      error: 'OPENAI_ERROR',
      message: error.message,
      statusCode: 502,
    };
  }

  // Default error
  return {
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
  };
}
```

---

## 6. Testing Strategy

### Unit Tests
- Service methods with mocked dependencies
- Emergency detection algorithm accuracy
- Score calculation logic
- Document section detection

### Integration Tests
- Database operations with Prisma
- OpenAI API integration (use test mode or mocks)
- File upload and storage
- End-to-end audit workflow

### Test Files Structure
```
__tests__/
├── services/
│   ├── transcription.test.ts
│   ├── emergencyDetection.test.ts
│   ├── compliance.test.ts
│   ├── templateService.test.ts
│   ├── documentExtraction.test.ts
│   └── templateGeneration.test.ts
└── api/
    ├── transcription.test.ts
    ├── compliance.test.ts
    └── policy.test.ts
```

---

## 7. Acceptance Criteria

### Task 3.3: Audio Transcription ✅
- [ ] Audio files upload to local storage
- [ ] OpenAI Whisper integration functional
- [ ] Transcriptions include accurate timestamps
- [ ] Mayday detection achieves >95% accuracy on test cases
- [ ] Emergency terms correctly identified
- [ ] Transcripts persisted to database with all relationships
- [ ] API routes return proper success/error responses

### Task 3.4: Compliance Scoring ✅
- [ ] Templates created with full validation
- [ ] GPT-4o generates compliance scores
- [ ] Findings include transcript citations with timestamps
- [ ] Recommendations are actionable and specific
- [ ] Overall score calculated with proper weighting
- [ ] Audits persisted to database
- [ ] API routes handle all error cases

### Task 3.7: Policy Conversion ✅
- [ ] PDF extraction working
- [ ] Word extraction working
- [ ] Excel extraction working (including scorecard detection)
- [ ] PowerPoint extraction working
- [ ] Section detection identifies document structure
- [ ] Template generation creates valid compliance templates
- [ ] Confidence scores calculated accurately
- [ ] Conversion tracking persisted to database
- [ ] API routes support multi-file upload

---

## 8. Performance Targets

### Transcription Service
- Audio upload: <2 seconds for 50MB file
- Whisper API call: Variable (OpenAI-dependent)
- Emergency detection: <500ms for 1 hour transcript
- Total transcription: <2 minutes for 1 hour audio

### Compliance Service
- Template retrieval: <100ms
- GPT-4o scoring: <30 seconds per transcript
- Database save: <200ms
- Total audit: <2 minutes per transcript

### Policy Conversion
- Document extraction: <5 seconds per document
- Template generation: <60 seconds for 3 documents
- Database save: <300ms
- Total conversion: <2 minutes for typical policy set

---

## 9. Security Considerations

### Input Validation
- All file uploads validated (type, size, content)
- All API inputs validated with Zod schemas
- Filenames sanitized to prevent path traversal
- Database inputs use Prisma parameterized queries

### Data Protection
- Audio files stored with unique, unpredictable names
- No sensitive data in logs (redact API keys, personal info)
- Environment variables never committed
- CORS configured appropriately

### Rate Limiting
- OpenAI API: Track requests per minute
- File uploads: Limit concurrent uploads
- API routes: Implement rate limiting (future: use middleware)

---

## 10. Documentation Deliverables

### Code Documentation
- JSDoc comments on all service methods
- Type definitions with descriptions
- API route documentation with examples

### Service Documentation
**File:** `docs/BACKEND_SERVICES_API.md`
- Endpoint reference with request/response examples
- Service architecture diagrams
- Error codes and handling
- Environment configuration guide

---

## 11. Execution Order

### Phase 1: Foundation (4 hours)
1. Create service utilities (openai.ts, errorHandlers.ts, jobTracker.ts)
2. Create storage service
3. Test file upload/download

### Phase 2: Transcription (8 hours)
1. Emergency detection service
2. Transcription service
3. Transcription API routes
4. Integration testing

### Phase 3: Compliance (10 hours)
1. Template service
2. Compliance service
3. Compliance API routes
4. Integration testing

### Phase 4: Policy Conversion (14 hours)
1. Document extraction service
2. Template generation service
3. Policy conversion API routes
4. Integration testing

### Phase 5: Integration & Testing (6 hours)
1. End-to-end workflow testing
2. Error handling verification
3. Performance validation
4. Documentation completion

**Total Estimated Time: 42 hours**

---

## 12. Success Metrics

### Functional Metrics
- Transcription accuracy: Match Whisper API baseline
- Mayday detection: >95% accuracy on test dataset
- Compliance scoring: Generates actionable recommendations
- Document conversion: Handles all supported formats

### Technical Metrics
- API response times: <500ms (excluding OpenAI calls)
- Database query performance: All queries <200ms
- Error handling: All error paths tested
- Code coverage: >80% for services

### Quality Metrics
- Type safety: No `any` types in service layer
- Documentation: All methods documented
- Testing: All acceptance criteria verified
- Security: No vulnerabilities in dependency scan

---

**Status:** Ready for Implementation
**Next Steps:** Begin Phase 1 - Foundation services
