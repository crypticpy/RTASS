# Backend Infrastructure Implementation Plan
## Fire Department Radio Transcription System - Phase 2-3

**Document Version:** 1.0
**Created:** 2025-10-04
**Status:** Planning Complete, Ready for Execution
**Branch:** phase-2/backend-infrastructure

---

## 1. Situation Assessment

### 1.1 Current State
**Phase 1 Complete:**
- ✅ Design system and component library built
- ✅ Emergency-specific UI components (IncidentCard, MaydayAlert)
- ✅ Storybook configured and running
- ✅ Next.js 15 app structure initialized
- ✅ Tailwind CSS and Radix UI integrated

**Current Gaps:**
- ❌ No database layer (Prisma not installed)
- ❌ No API routes implemented
- ❌ No OpenAI integration
- ❌ No audio processing services
- ❌ No file storage configuration
- ❌ No authentication/authorization

### 1.2 Technology Stack Analysis
**Current Dependencies:**
- Next.js 15.5.4
- React 19.1.0
- TypeScript 5
- Tailwind CSS 4
- Radix UI components

**Required Additions:**
- @prisma/client + prisma
- openai SDK
- @azure/storage-blob (or local file storage)
- pdf-lib, mammoth, xlsx (document processing)
- zod (validation)
- bcryptjs (encryption)

### 1.3 File Structure Assessment
```
Current:
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── emergency/
│   └── layouts/
└── lib/
    ├── utils.ts
    └── design-tokens.ts

Needed:
src/
├── app/
│   └── api/              [NEW]
├── lib/
│   ├── db.ts             [NEW]
│   ├── services/         [NEW]
│   └── types/            [NEW]
└── prisma/               [NEW - root level]
```

---

## 2. Strategy

### 2.1 High-Level Approach
**Incremental Service Development:**
1. Foundation First: Database + Prisma setup
2. Core Services: Transcription, Compliance, Policy Conversion
3. API Routes: Expose services via Next.js API routes
4. Testing: Service-level tests for each component
5. Integration: Connect frontend components to backend

**Key Architectural Decisions:**
- **Database:** PostgreSQL with Prisma ORM (development: local, production: Azure)
- **File Storage:** Local file system for development, Azure Blob Storage configuration ready
- **OpenAI Integration:** Direct SDK usage with error handling and rate limiting
- **Type Safety:** End-to-end TypeScript with Zod validation
- **Error Handling:** Comprehensive try-catch with structured logging

### 2.2 Risk Mitigation Strategy
**Technical Risks:**
- OpenAI API costs → Implement cost tracking and limits
- Large file processing → Chunking and streaming
- Database performance → Indexing strategy from day 1
- Type safety → Zod validation at API boundaries

**Operational Risks:**
- Environment variables → .env.example with clear documentation
- Secret management → Never commit secrets, use .gitignore
- Data integrity → Migration versioning and rollback scripts

### 2.3 Performance Considerations
- **Database Queries:** Use Prisma's query optimization features
- **File Processing:** Stream large files, avoid loading into memory
- **API Responses:** Implement caching where appropriate
- **OpenAI Calls:** Rate limiting and request batching

---

## 3. Detailed Implementation Plan

### 3.1 Task Breakdown - Database Infrastructure (Task 3.1)

#### 3.1.1 Install Dependencies
**Estimated Time:** 30 minutes
**Priority:** Critical

**Actions:**
```bash
npm install @prisma/client
npm install -D prisma
npm install zod
npm install bcryptjs
npm install -D @types/bcryptjs
```

**Deliverables:**
- package.json updated with dependencies
- node_modules installed

---

#### 3.1.2 Initialize Prisma
**Estimated Time:** 1 hour
**Priority:** Critical

**Actions:**
```bash
npx prisma init
```

**File Changes:**
- Create `prisma/schema.prisma`
- Create `.env` with DATABASE_URL
- Update `.gitignore` to exclude `.env`

**Database Schema:**
```prisma
// Implement complete schema from MIGRATION_PLAN.md Section 3.1.2
// Models: Incident, Transcript, Template, Audit, Unit, PolicyDocument, TemplateGeneration, SystemMetrics
```

**Deliverables:**
- Prisma schema file complete with all models
- Environment configuration for PostgreSQL
- Database connection tested

---

#### 3.1.3 Create Database Utilities
**Estimated Time:** 1 hour
**Priority:** Critical

**Files to Create:**
- `src/lib/db.ts` - Prisma client singleton
- `src/lib/validation.ts` - Zod schemas for data validation

**Implementation:**
```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Deliverables:**
- Database client configured
- Connection pooling enabled
- Logging configured for development

---

#### 3.1.4 Database Migrations
**Estimated Time:** 1.5 hours
**Priority:** Critical

**Actions:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Files Created:**
- `prisma/migrations/` directory with migration files
- Generated Prisma client types

**Seed Data:**
Create `prisma/seed.ts` with sample data for development:
- Sample templates (NFPA 1561 basic template)
- Sample units (Engine 1, Ladder 1, Battalion 1)

**Deliverables:**
- Database schema applied
- Prisma client generated
- Seed data script created

---

### 3.2 Task Breakdown - Audio Transcription Service (Task 3.3)

#### 3.2.1 Install OpenAI SDK
**Estimated Time:** 15 minutes
**Priority:** Critical

**Actions:**
```bash
npm install openai
```

**Environment Variables:**
```
OPENAI_API_KEY=sk-...
```

---

#### 3.2.2 Build Audio Storage Service
**Estimated Time:** 2 hours
**Priority:** Critical

**File:** `src/lib/services/storage.ts`

**Features:**
- Local file storage for development
- Azure Blob Storage configuration (commented, ready for production)
- File validation (format, size)
- Secure filename generation

**Implementation:**
```typescript
export class StorageService {
  async uploadAudio(file: File): Promise<string> {
    // Validate file type and size
    // Generate secure filename
    // Save to local storage or Azure Blob
    // Return URL
  }

  async getAudioUrl(filename: string): Promise<string> {
    // Return accessible URL
  }

  async deleteAudio(filename: string): Promise<void> {
    // Clean up storage
  }
}
```

**Deliverables:**
- Storage service with local and Azure configurations
- File validation logic
- Error handling for storage failures

---

#### 3.2.3 Build Transcription Service
**Estimated Time:** 4 hours
**Priority:** Critical

**File:** `src/lib/services/transcription.ts`

**Features:**
- OpenAI Whisper integration
- Audio preprocessing/optimization
- Segment extraction with timestamps
- Mayday detection algorithm
- Emergency term identification
- Speaker diarization (basic)

**Implementation:**
```typescript
export class TranscriptionService {
  private openai: OpenAI;

  async transcribeAudio(audioFile: File): Promise<TranscriptionResult> {
    // 1. Upload audio to storage
    // 2. Call OpenAI Whisper API
    // 3. Extract segments with timestamps
    // 4. Detect emergency communications
    // 5. Save to database
    // 6. Return structured result
  }

  detectMayday(text: string): MaydayDetection[] {
    // Pattern matching for mayday calls
    // Context extraction
    // Timestamp correlation
  }

  detectEmergencyTerms(text: string): EmergencyTerm[] {
    // Fire department emergency terminology
    // NFPA standard terminology
  }
}
```

**Mayday Detection Patterns:**
```typescript
const MAYDAY_PATTERNS = [
  /\b(mayday|may day|may-day)\b/gi,
  /\b(emergency|emergency emergency)\b/gi,
  /\b(firefighter down|ff down|down firefighter)\b/gi,
  /\b(trapped|stuck|can't get out)\b/gi,
  /\b(collapse|structural collapse)\b/gi,
  /\b(lost|disoriented|need help)\b/gi
];
```

**Deliverables:**
- Transcription service with OpenAI integration
- Mayday detection with >95% accuracy target
- Emergency term identification
- Database persistence

---

#### 3.2.4 Create Transcription API Routes
**Estimated Time:** 3 hours
**Priority:** Critical

**Files to Create:**
- `src/app/api/transcription/upload/route.ts`
- `src/app/api/transcription/process/route.ts`
- `src/app/api/transcription/status/[id]/route.ts`

**API Endpoints:**
```typescript
// POST /api/transcription/upload
export async function POST(request: Request) {
  // Handle file upload
  // Validate file
  // Save to storage
  // Return job ID
}

// POST /api/transcription/process
export async function POST(request: Request) {
  // Process audio file
  // Call transcription service
  // Save results to database
  // Return transcript
}

// GET /api/transcription/status/[id]
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Check transcription job status
  // Return progress and results
}
```

**Deliverables:**
- RESTful API routes for transcription
- Request/response validation
- Error handling
- TypeScript types for API contracts

---

### 3.3 Task Breakdown - Compliance Scoring Engine (Task 3.4)

#### 3.3.1 Build Template Management Service
**Estimated Time:** 3 hours
**Priority:** Critical

**File:** `src/lib/services/templateManagement.ts`

**Features:**
- CRUD operations for templates
- Template versioning
- Template validation
- Category and criteria management
- Default templates (NFPA standards)

**Implementation:**
```typescript
export class TemplateManagementService {
  async createTemplate(data: CreateTemplateInput): Promise<Template> {
    // Validate template structure
    // Save to database
    // Return created template
  }

  async getTemplates(filters?: TemplateFilters): Promise<Template[]> {
    // Query database with filters
    // Return templates
  }

  async updateTemplate(id: string, data: UpdateTemplateInput): Promise<Template> {
    // Version control
    // Update template
    // Maintain audit trail
  }

  async deleteTemplate(id: string): Promise<void> {
    // Soft delete (mark inactive)
  }
}
```

**Deliverables:**
- Template CRUD service
- Validation logic
- Default NFPA templates seeded

---

#### 3.3.2 Build Compliance Scoring Service
**Estimated Time:** 5 hours
**Priority:** Critical

**File:** `src/lib/services/compliance.ts`

**Features:**
- OpenAI GPT-4o integration
- Template-based scoring
- Finding generation with citations
- Recommendation engine
- Score calculation and aggregation

**Implementation:**
```typescript
export class ComplianceService {
  private openai: OpenAI;

  async auditTranscript(
    transcriptId: string,
    templateId: string,
    additionalNotes?: string
  ): Promise<AuditResult> {
    // 1. Fetch transcript and template
    // 2. Build scoring prompt
    // 3. Call GPT-4o
    // 4. Parse response
    // 5. Calculate overall score
    // 6. Save audit to database
    // 7. Return results
  }

  private buildScoringPrompt(
    transcript: Transcript,
    template: Template
  ): string {
    // Structured prompt for compliance evaluation
  }

  private calculateOverallScore(categoryScores: CategoryScore[]): number {
    // Weighted average calculation
  }

  generateRecommendations(findings: Finding[]): Recommendation[] {
    // Actionable improvement suggestions
  }
}
```

**GPT-4o Configuration:**
```typescript
const COMPLIANCE_CONFIG = {
  model: 'gpt-4o',
  temperature: 0.1,
  max_tokens: 4000,
  response_format: { type: 'json_object' }
};
```

**Deliverables:**
- Compliance scoring service
- OpenAI integration with error handling
- Structured finding and recommendation generation
- Database persistence

---

#### 3.3.3 Create Compliance API Routes
**Estimated Time:** 2 hours
**Priority:** Critical

**Files to Create:**
- `src/app/api/compliance/templates/route.ts`
- `src/app/api/compliance/audit/route.ts`
- `src/app/api/compliance/[auditId]/route.ts`

**API Endpoints:**
```typescript
// GET/POST /api/compliance/templates
// POST /api/compliance/audit
// GET /api/compliance/[auditId]
```

**Deliverables:**
- RESTful API routes for compliance
- Request/response validation
- Error handling

---

### 3.4 Task Breakdown - Policy Document Conversion (Task 3.7)

#### 3.4.1 Install Document Processing Libraries
**Estimated Time:** 30 minutes
**Priority:** Critical

**Actions:**
```bash
npm install pdf-parse
npm install mammoth
npm install xlsx
npm install pptx-parser
```

---

#### 3.4.2 Build Document Extraction Service
**Estimated Time:** 4 hours
**Priority:** Critical

**File:** `src/lib/services/documentExtraction.ts`

**Features:**
- PDF text extraction
- Word document parsing
- Excel spreadsheet parsing (scorecard detection)
- PowerPoint slide extraction
- Plain text handling

**Implementation:**
```typescript
export class DocumentExtractionService {
  async extractContent(file: File): Promise<ExtractedContent> {
    const fileType = this.detectFileType(file);

    switch (fileType) {
      case 'pdf':
        return this.extractFromPDF(file);
      case 'docx':
        return this.extractFromWord(file);
      case 'xlsx':
        return this.extractFromExcel(file);
      case 'pptx':
        return this.extractFromPowerPoint(file);
      default:
        return this.extractFromText(file);
    }
  }

  private detectSections(text: string): DocumentSection[] {
    // Heading detection
    // Structure analysis
  }

  private isScorecardFormat(data: any[][]): boolean {
    // Detect existing scorecard/checklist structures
  }
}
```

**Deliverables:**
- Multi-format document extraction
- Section detection and structure analysis
- Scorecard format recognition

---

#### 3.4.3 Build Template Generation Service
**Estimated Time:** 5 hours
**Priority:** Critical

**File:** `src/lib/services/templateGeneration.ts`

**Features:**
- Document analysis with GPT-4o
- Template structure generation
- Criteria extraction
- Regulatory reference identification
- Confidence scoring

**Implementation:**
```typescript
export class TemplateGenerationService {
  async generateTemplate(
    files: File[],
    options: TemplateGenerationOptions
  ): Promise<GeneratedTemplate> {
    // 1. Extract content from all documents
    // 2. Analyze with GPT-4o
    // 3. Build template structure
    // 4. Populate detailed criteria
    // 5. Validate template
    // 6. Generate suggestions
  }

  private analyzeDocuments(contents: ExtractedContent[]): Promise<DocumentAnalysis> {
    // GPT-4o analysis for categories, criteria, references
  }

  private enhanceCriterion(criterion: any): Promise<CriterionEnhancement> {
    // Detailed scoring rubrics and examples
  }
}
```

**Deliverables:**
- AI-powered template generation
- Multi-document processing
- Structured output with confidence scores

---

#### 3.4.4 Create Policy Conversion API Routes
**Estimated Time:** 2 hours
**Priority:** Critical

**Files to Create:**
- `src/app/api/policy/upload/route.ts`
- `src/app/api/policy/convert/route.ts`
- `src/app/api/policy/templates/[id]/route.ts`

**Deliverables:**
- API routes for document upload and conversion
- Progress tracking
- Template retrieval

---

### 3.5 Type Definitions and Utilities

#### 3.5.1 Create Type Definitions
**Estimated Time:** 2 hours
**Priority:** High

**File:** `src/lib/types/index.ts`

**Types to Define:**
```typescript
// Transcription types
export interface TranscriptionResult { ... }
export interface MaydayDetection { ... }
export interface EmergencyTerm { ... }

// Compliance types
export interface AuditResult { ... }
export interface CategoryScore { ... }
export interface Finding { ... }
export interface Recommendation { ... }

// Policy conversion types
export interface ExtractedContent { ... }
export interface DocumentSection { ... }
export interface GeneratedTemplate { ... }
```

**Deliverables:**
- Comprehensive TypeScript type definitions
- Zod validation schemas
- API contract types

---

#### 3.5.2 Create Utility Functions
**Estimated Time:** 1.5 hours
**Priority:** Medium

**File:** `src/lib/utils/` directory

**Utilities:**
- `formatters.ts` - Date, time, duration formatting
- `validation.ts` - File validation, data validation
- `errorHandling.ts` - Error classes, error formatting
- `constants.ts` - File size limits, supported formats

---

### 3.6 Environment Configuration

#### 3.6.1 Environment Variables
**File:** `.env.example`

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fire_dept_transcriber?schema=public"

# OpenAI
OPENAI_API_KEY="sk-..."

# Azure Storage (optional for local dev)
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# File Storage
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE_MB=50
```

**Deliverables:**
- .env.example documented
- .env added to .gitignore
- README updated with setup instructions

---

## 4. Testing Strategy

### 4.1 Service-Level Tests
**Test Files:**
- `__tests__/services/transcription.test.ts`
- `__tests__/services/compliance.test.ts`
- `__tests__/services/documentExtraction.test.ts`
- `__tests__/services/templateGeneration.test.ts`

**Test Coverage:**
- Unit tests for core service logic
- Mock OpenAI API responses
- Database integration tests
- Error handling tests

### 4.2 API Route Tests
**Test Files:**
- `__tests__/api/transcription.test.ts`
- `__tests__/api/compliance.test.ts`
- `__tests__/api/policy.test.ts`

**Test Coverage:**
- Request validation
- Response formatting
- Error responses
- Authentication/authorization (future)

---

## 5. Documentation Requirements

### 5.1 Code Documentation
- JSDoc comments for all services
- Type definitions with descriptions
- API route documentation with examples

### 5.2 Service Documentation
**File:** `docs/BACKEND_SERVICES.md`

**Contents:**
- Service architecture overview
- API endpoint reference
- Database schema documentation
- Environment configuration guide
- Deployment instructions

---

## 6. Acceptance Criteria

### 6.1 Database Infrastructure
- ✅ PostgreSQL database connected and accessible
- ✅ Prisma schema includes all models from MIGRATION_PLAN.md
- ✅ Migrations run successfully
- ✅ Seed data populates development database
- ✅ Database client configured with connection pooling

### 6.2 Audio Transcription Service
- ✅ Audio files upload successfully to storage
- ✅ OpenAI Whisper integration working
- ✅ Transcription results include timestamps
- ✅ Mayday detection identifies emergency communications
- ✅ Transcripts saved to database with relationships
- ✅ API routes return proper responses

### 6.3 Compliance Scoring Service
- ✅ Templates can be created, read, updated, deleted
- ✅ GPT-4o integration generates compliance scores
- ✅ Findings include timestamped citations
- ✅ Recommendations are actionable
- ✅ Audit results saved to database
- ✅ API routes handle errors gracefully

### 6.4 Policy Document Conversion
- ✅ PDF, Word, Excel, PowerPoint extraction working
- ✅ Document analysis identifies structure
- ✅ Template generation creates valid templates
- ✅ AI confidence scores calculated
- ✅ Conversion tracking persisted
- ✅ API routes support multi-file upload

---

## 7. Execution Timeline

### Week 1 (Database + Transcription)
**Days 1-2:** Database infrastructure (Task 3.1)
- Install Prisma, create schema, run migrations
- Database utilities and seeding

**Days 3-5:** Audio transcription service (Task 3.3)
- OpenAI Whisper integration
- Mayday detection
- API routes

### Week 2 (Compliance + Policy Conversion)
**Days 1-3:** Compliance scoring engine (Task 3.4)
- Template management
- GPT-4o scoring integration
- API routes

**Days 4-5:** Policy document conversion (Task 3.7)
- Document extraction
- Template generation
- API routes

---

## 8. Success Metrics

### Technical Metrics
- ✅ All services have >80% test coverage
- ✅ API response times <500ms (excluding OpenAI calls)
- ✅ Database queries optimized with proper indexing
- ✅ Zero security vulnerabilities in dependencies

### Functional Metrics
- ✅ Transcription accuracy validated with test audio
- ✅ Mayday detection >95% accuracy on test cases
- ✅ Compliance scoring completes in <2 minutes
- ✅ Document conversion handles all supported formats

---

## 9. Risk Mitigation

### OpenAI API Costs
- Implement request logging
- Set monthly budget limits
- Monitor token usage
- Use smaller models for testing

### File Processing Performance
- Stream large files
- Implement chunking for document processing
- Set file size limits
- Background job processing for long operations

### Data Security
- Validate all inputs
- Sanitize file uploads
- Implement rate limiting
- Secure environment variable management

---

## 10. Next Steps After Completion

### Frontend Integration
- Connect UI components to API routes
- Real-time updates via WebSocket
- Error handling in UI
- Loading states and progress indicators

### Advanced Features
- User authentication
- Role-based access control
- Real-time collaboration
- Advanced analytics

---

**Implementation Status:** Ready to Execute
**Estimated Total Time:** 52 hours (2 weeks, 2 developers)
**Dependencies:** Phase 1 Complete ✅
**Blocking Issues:** None

---

This implementation plan provides a comprehensive roadmap for building the backend infrastructure for the Fire Department Radio Transcription System. All services are designed with production-quality standards, comprehensive error handling, and full TypeScript type safety.
