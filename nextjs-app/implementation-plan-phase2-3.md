# Phase 2-3 Backend Services Implementation Plan
## Fire Department Radio Transcription System

**Date:** 2025-10-04
**Task:** Implement critical backend services for transcription and compliance
**Status:** Ready for execution

---

## Situation Assessment

### Current State (40% Complete)
**Completed:**
- ✅ Utility services (openai.ts, errorHandlers.ts, jobTracker.ts)
- ✅ Storage service with file upload/download
- ✅ Emergency detection service with >95% accuracy patterns
- ✅ Database schema (Prisma) fully defined
- ✅ Type definitions comprehensive
- ✅ Validation utilities complete

**Pending:**
- ❌ Transcription service (Whisper API integration)
- ❌ Transcription API routes
- ❌ Template service (CRUD operations)
- ❌ Compliance service (GPT-4o scoring)
- ❌ Compliance API routes

### Critical Issues from Code Review
1. ✅ DocumentFormat type - Already exists in types/index.ts
2. ✅ sanitizeFileName function - Already implemented in validators.ts
3. ⚠️ Rate limiter race condition - Needs fix in openai.ts lines 156-166

---

## Strategy

### Implementation Order (Priority-Based)
1. **Fix Critical Issues** (30 min) - Rate limiter fix
2. **Transcription Service** (4 hours) - Core functionality
3. **Transcription API Routes** (2 hours) - Public interface
4. **Template Service** (3 hours) - Compliance foundation
5. **Compliance Service** (7 hours) - GPT-4o scoring engine
6. **Compliance API Routes** (4 hours) - Public interface

**Total Time:** ~20 hours

### Key Technical Decisions
- Use Whisper API verbose_json format for timestamps
- Implement NFPA 1561 default template seeding
- GPT-4o with structured JSON responses for compliance
- Weighted scoring with NOT_APPLICABLE redistribution
- Job-based async operations for long-running tasks

---

## Detailed Implementation Tasks

### Task 1: Fix Rate Limiter Race Condition (30 min)

**File:** `src/lib/services/utils/openai.ts`
**Issue:** Lines 156-166 have potential race condition in canMakeRequest()

**Fix:**
```typescript
// Current implementation filters twice (lines 161-163 and 197-200)
// This creates a race condition where two requests can pass canMakeRequest()
// before recordRequest() is called

// Solution: Make canMakeRequest() atomic with recordRequest()
// Or use a lock/semaphore pattern
```

**Implementation:**
- Add mutex/lock to canMakeRequest() and recordRequest()
- Ensure atomic check-and-record operation
- Test with concurrent requests

---

### Task 2: Transcription Service (4 hours)

**File:** `src/lib/services/transcription.ts`

**Features:**
- OpenAI Whisper API integration (whisper-1 model)
- Audio file upload via storageService
- Segment extraction with timestamps
- Emergency detection integration
- Database persistence to Transcript table
- Token usage tracking

**Key Methods:**
```typescript
class TranscriptionService {
  async transcribeAudio(
    audioFile: File,
    incidentId: string,
    options?: { language?: string; detectMayday?: boolean }
  ): Promise<TranscriptionResult>

  private async callWhisperAPI(filePath: string): Promise<WhisperResponse>
  private processSegments(whisperSegments: any[]): TranscriptionSegment[]
  private async saveTranscript(data: TranscriptData): Promise<Transcript>
}
```

**Whisper Configuration:**
```typescript
{
  model: 'whisper-1',
  language: 'en',
  response_format: 'verbose_json',
  temperature: 0.0
}
```

**Integration Points:**
- Use `storageService.uploadAudio()` for file upload
- Use `getOpenAIClient()` and `withRateLimit()` for API calls
- Use `emergencyDetectionService.detectMayday()` and `detectEmergencyTerms()`
- Use `trackTokenUsage()` for cost monitoring
- Use `prisma.transcript.create()` for persistence

**Error Handling:**
- Invalid audio format → 400
- File too large → 400
- Whisper API errors → 502
- Database errors → 500

---

### Task 3: Transcription API Routes (2 hours)

**Files:**
- `src/app/api/transcription/upload/route.ts`
- `src/app/api/transcription/process/route.ts`
- `src/app/api/transcription/[id]/route.ts`

#### Route 1: POST /api/transcription/upload
**Purpose:** Upload audio file to storage

**Request:**
```typescript
FormData {
  file: File (audio file)
  incidentId?: string
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    fileName: string,
    url: string,
    size: number,
    uploadedAt: string
  }
}
```

**Implementation:**
- Parse multipart/form-data
- Validate audio file
- Call storageService.uploadAudio()
- Return upload result

#### Route 2: POST /api/transcription/process
**Purpose:** Start transcription job

**Request:**
```typescript
{
  fileName: string,
  incidentId: string,
  language?: string,
  detectMayday?: boolean
}
```

**Response:**
```typescript
{
  success: true,
  data: TranscriptionResult
}
```

**Implementation:**
- Validate request with Zod schema
- Get file from storage
- Call transcriptionService.transcribeAudio()
- Return transcript with detections

#### Route 3: GET /api/transcription/[id]
**Purpose:** Retrieve existing transcript

**Response:**
```typescript
{
  success: true,
  data: TranscriptionResult
}
```

**Implementation:**
- Validate CUID parameter
- Query database with Prisma
- Include incident, segments, detections
- Return formatted response

---

### Task 4: Template Service (3 hours)

**File:** `src/lib/services/templateService.ts`

**Features:**
- CRUD operations for compliance templates
- Template structure validation
- NFPA 1561 default template seeding
- Version management
- Active/inactive template filtering

**Key Methods:**
```typescript
class TemplateService {
  async createTemplate(data: TemplateCreateInput): Promise<Template>
  async getTemplates(filters?: TemplateFilters): Promise<Template[]>
  async getTemplateById(id: string): Promise<Template | null>
  async updateTemplate(id: string, data: TemplateUpdateInput): Promise<Template>
  async deleteTemplate(id: string): Promise<void> // Soft delete
  async validateTemplateStructure(template: any): ValidationResult
  async seedDefaultTemplates(): Promise<void>
}
```

**NFPA 1561 Default Template Structure:**
```typescript
{
  name: "NFPA 1561 Radio Communications Compliance",
  version: "1.0",
  source: "NFPA 1561",
  categories: [
    {
      name: "Initial Radio Report",
      weight: 0.25,
      regulatoryReferences: ["NFPA 1561 5.2.5"],
      criteria: [
        {
          id: "initial-report-location",
          description: "Incident location clearly stated",
          evidenceRequired: "Address or location identifiers mentioned",
          scoringMethod: "PASS_FAIL",
          weight: 0.25
        },
        // ... 4-6 more criteria
      ]
    },
    {
      name: "Incident Command Structure",
      weight: 0.20,
      // ... criteria
    },
    {
      name: "Personnel Accountability",
      weight: 0.20,
      // ... criteria
    },
    {
      name: "Progress Reports",
      weight: 0.15,
      // ... criteria
    },
    {
      name: "Emergency Communications",
      weight: 0.20,
      // ... criteria
    }
  ]
}
```

**Validation Rules:**
- Category weights must sum to 1.0 (±0.01 tolerance)
- Criterion weights within category must sum to 1.0
- Criterion IDs must be unique within template
- Each category must have ≥1 criterion
- Name, version, categories required

---

### Task 5: Compliance Service (7 hours)

**File:** `src/lib/services/complianceService.ts`

**Features:**
- GPT-4o integration for compliance scoring
- Dynamic prompt generation from template
- Finding extraction with transcript citations
- Recommendation generation
- Weighted score calculation
- NOT_APPLICABLE handling
- Database persistence

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

  private async callGPT4o(prompt: string): Promise<GPT4Response>

  private parseAuditResponse(response: string): {
    categories: ComplianceCategory[]
    findings: Finding[]
  }

  private calculateOverallScore(categories: ComplianceCategory[]): number

  private generateRecommendations(
    categories: ComplianceCategory[],
    findings: Finding[]
  ): Recommendation[]

  private async saveAudit(auditData: AuditData): Promise<Audit>
}
```

**GPT-4o Prompt Template:**
```typescript
const SCORING_PROMPT = `
You are an expert fire department compliance auditor evaluating radio communications against NFPA 1561 standards.

TRANSCRIPT:
{fullTranscript}

COMPLIANCE TEMPLATE:
{templateStructure}

TASK:
Evaluate the transcript against each criterion in the template. For each criterion:

1. Determine status: PASS, FAIL, PARTIAL, or NOT_APPLICABLE
2. Provide detailed rationale with specific quotes from transcript
3. Extract findings (positive or negative compliance examples)
4. Include exact timestamps when citing transcript

SCORING RULES:
- PASS: Criterion fully met with clear evidence
- PARTIAL: Criterion partially met or evidence unclear
- FAIL: Criterion not met or violated
- NOT_APPLICABLE: Criterion does not apply to this incident type

OUTPUT FORMAT (JSON):
{
  "categories": [
    {
      "name": "Category Name",
      "status": "PASS|FAIL|NEEDS_IMPROVEMENT",
      "criteria": [
        {
          "id": "criterion-id",
          "status": "PASS|FAIL|PARTIAL|NOT_APPLICABLE",
          "score": 0-100,
          "rationale": "Detailed explanation with quotes",
          "findings": [
            {
              "timestamp": "00:15",
              "quote": "Exact transcript quote",
              "compliance": "POSITIVE|NEGATIVE|NEUTRAL",
              "significance": "HIGH|MEDIUM|LOW",
              "explanation": "Why this is significant"
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
{
  model: 'gpt-4o',
  temperature: 0.1,
  max_tokens: 4000,
  response_format: { type: 'json_object' }
}
```

**Score Calculation Logic:**
```typescript
// 1. Calculate criterion score
function getCriterionScore(status: CriterionStatus): number {
  switch (status) {
    case 'PASS': return 100;
    case 'PARTIAL': return 50;
    case 'FAIL': return 0;
    case 'NOT_APPLICABLE': return NaN; // Excluded from calculation
  }
}

// 2. Calculate category score
function calculateCategoryScore(criteria: ComplianceCriterion[]): number {
  const applicable = criteria.filter(c => c.status !== 'NOT_APPLICABLE');
  if (applicable.length === 0) return 0;

  // Redistribute weights
  const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);

  const weightedSum = applicable.reduce((sum, c) => {
    const normalizedWeight = c.weight / totalWeight;
    return sum + (getCriterionScore(c.status!) * normalizedWeight);
  }, 0);

  return weightedSum;
}

// 3. Calculate overall score
function calculateOverallScore(categories: ComplianceCategory[]): number {
  const applicable = categories.filter(c =>
    c.criteria.some(cr => cr.status !== 'NOT_APPLICABLE')
  );

  const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);

  const weightedSum = applicable.reduce((sum, c) => {
    const normalizedWeight = c.weight / totalWeight;
    return sum + (c.score! * normalizedWeight);
  }, 0);

  return Math.round(weightedSum);
}
```

**Recommendation Generation:**
```typescript
// Extract HIGH priority recommendations from FAIL and PARTIAL criteria
// Group by category
// Include specific action items from findings
// Reference regulatory standards
```

---

### Task 6: Compliance API Routes (4 hours)

**Files:**
- `src/app/api/compliance/templates/route.ts`
- `src/app/api/compliance/audit/route.ts`
- `src/app/api/compliance/[auditId]/route.ts`

#### Route 1: GET/POST /api/compliance/templates

**GET Request:**
```typescript
Query: {
  active?: boolean,
  source?: string
}
```

**GET Response:**
```typescript
{
  success: true,
  data: Template[]
}
```

**POST Request:**
```typescript
{
  name: string,
  description?: string,
  categories: ComplianceCategory[],
  source?: string
}
```

**POST Response:**
```typescript
{
  success: true,
  data: Template
}
```

#### Route 2: POST /api/compliance/audit

**Request:**
```typescript
{
  transcriptId: string,
  templateId: string,
  additionalNotes?: string
}
```

**Response:**
```typescript
{
  success: true,
  data: AuditResult
}
```

**Implementation:**
- Validate request with Zod schema
- Verify transcript and template exist
- Call complianceService.auditTranscript()
- Return audit result with scores and recommendations

#### Route 3: GET /api/compliance/[auditId]

**Response:**
```typescript
{
  success: true,
  data: AuditResult
}
```

**Implementation:**
- Validate CUID parameter
- Query database with Prisma
- Include all relationships (template, transcript, incident)
- Return formatted audit result

---

## Testing Strategy

### Unit Tests
1. **Transcription Service**
   - Whisper API mocking
   - Segment processing accuracy
   - Emergency detection integration

2. **Template Service**
   - Template validation logic
   - Weight calculation accuracy
   - NFPA 1561 default template structure

3. **Compliance Service**
   - Score calculation with various status combinations
   - NOT_APPLICABLE weight redistribution
   - Recommendation generation logic

### Integration Tests
1. **End-to-End Transcription**
   - Upload → Process → Retrieve
   - Emergency detection in real transcript
   - Database persistence verification

2. **End-to-End Compliance**
   - Template → Audit → Results
   - GPT-4o response parsing
   - Score accuracy validation

### Manual Testing Checklist
- [ ] Upload various audio formats (mp3, wav, m4a)
- [ ] Transcribe 1-minute, 5-minute, 30-minute audio
- [ ] Verify mayday detection accuracy
- [ ] Create custom compliance template
- [ ] Run audit on transcript with known compliance issues
- [ ] Verify score calculations manually
- [ ] Test NOT_APPLICABLE weight redistribution

---

## Acceptance Criteria

### Transcription Service ✅
- [ ] Whisper API integration functional
- [ ] Timestamps accurate to ±1 second
- [ ] Mayday detection >95% accuracy
- [ ] Emergency terms correctly categorized
- [ ] Transcripts saved to database
- [ ] Token usage tracked

### Template Service ✅
- [ ] CRUD operations working
- [ ] Template validation enforcing rules
- [ ] NFPA 1561 default template seeded
- [ ] Weight calculations correct

### Compliance Service ✅
- [ ] GPT-4o generates valid JSON responses
- [ ] Findings include transcript citations
- [ ] Scores calculated with proper weighting
- [ ] NOT_APPLICABLE handled correctly
- [ ] Recommendations actionable and specific
- [ ] Audits persisted to database

### API Routes ✅
- [ ] All routes return proper status codes
- [ ] Error responses structured consistently
- [ ] Request validation with Zod
- [ ] Response types match TypeScript definitions

---

## Known Limitations

1. **Rate Limiting:** In-memory rate limiter (single instance only)
   - **Production:** Migrate to Redis-backed rate limiting

2. **Job Tracking:** In-memory job tracker
   - **Production:** Migrate to Redis or database queue

3. **File Storage:** Local file system
   - **Production:** Enable Azure Blob Storage (already configured)

4. **GPT-4o Costs:** No hard budget limits
   - **Recommendation:** Implement monthly budget tracking and alerts

5. **Concurrent Processing:** No parallel transcription jobs
   - **Future:** Implement job queue with worker pool

---

## Success Metrics

**Functional:**
- Transcription accuracy matches Whisper baseline
- Mayday detection >95% accuracy on test set
- Compliance scores align with manual expert review

**Technical:**
- API response times <500ms (excluding OpenAI calls)
- Database queries <200ms
- Error handling covers all edge cases
- Code coverage >80%

**Quality:**
- No `any` types in service layer
- All methods have JSDoc documentation
- All acceptance criteria met
- Zero critical security vulnerabilities

---

**Status:** Ready for Implementation
**Next Step:** Fix rate limiter race condition, then proceed with transcription service
