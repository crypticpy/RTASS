# Policy Conversion Services - Implementation Plan

**Project**: Fire Department Radio Transcription System
**Phase**: 3 - Backend Services (Policy Conversion)
**Estimated Time**: 16 hours
**Created**: 2025-10-04

---

## 1. Situation Assessment

### 1.1 Current State Analysis

**Completed Infrastructure:**
- ✅ Prisma database schema with PolicyDocument and TemplateGeneration models (already in place)
- ✅ OpenAI client utilities with rate limiting and token tracking
- ✅ Centralized error handling system
- ✅ Type definitions for policy conversion (DocumentSection, ExtractedContent, etc.)
- ✅ Template service with validation and NFPA 1561 seeding
- ✅ Compliance service with GPT-4o integration pattern

**Existing Packages:**
- ✅ `mammoth@1.11.0` - Word document parsing (already installed)
- ✅ `pdf-parse@2.1.7` - PDF text extraction (already installed)
- ✅ `xlsx@0.18.5` - Excel spreadsheet parsing (already installed)
- ✅ `openai@6.1.0` - OpenAI API client
- ✅ `zod@4.1.11` - Input validation
- ✅ `@prisma/client@6.16.3` - Database ORM

**Code Patterns to Follow:**
- Singleton service pattern (TranscriptionService, ComplianceService, TemplateService)
- Centralized error handling with ServiceError class
- OpenAI rate limiting with `withRateLimit()` wrapper
- Token usage tracking with `trackTokenUsage()`
- Prisma JSON type casting with `PrismaJson` helper
- Comprehensive JSDoc documentation on all public methods
- Async/await throughout with proper error propagation

### 1.2 Requirements Analysis

**Core Requirements:**
1. Extract text from PDF, DOCX, XLSX, PPTX files
2. Preserve document structure (headings, sections, tables)
3. Analyze policy documents with GPT-4o to generate compliance templates
4. Map policy requirements to NFPA standards
5. Generate weighted criteria with scoring guidance
6. Provide API endpoints for upload, extraction, generation, and retrieval
7. Maintain full audit trail of conversions

**Technical Constraints:**
- Must handle large documents (chunking for GPT-4o token limits)
- Must preserve document structure for accurate template generation
- Must validate generated templates against existing template validation logic
- Must track source documents for each generated template
- Must provide confidence scores for AI-generated content

### 1.3 Integration Points

**Database:**
- PolicyDocument model (already exists in schema)
- TemplateGeneration model (already exists in schema)
- Template model (existing, will link to PolicyDocument)
- TemplateGeneration_PolicyDocument join table (already exists)

**Services:**
- TemplateService - for saving generated templates
- OpenAI utilities - for rate limiting and token tracking
- Error handlers - for consistent error responses
- Storage service - for file uploads (if needed)

**API Routes:**
- POST `/api/policy/extract` - Upload and extract document
- POST `/api/policy/generate-template` - Generate template from policy
- POST `/api/policy/save-template` - Save generated template
- GET `/api/policy/[id]` - Retrieve policy document

---

## 2. Technical Strategy

### 2.1 Document Extraction Architecture

**Multi-Format Support Strategy:**
- Create dedicated extraction methods for each format
- Use established npm packages (pdf-parse, mammoth, xlsx)
- Implement structure detection algorithms for each format
- Normalize all outputs to common `ExtractedContent` interface

**Structure Preservation:**
- PDF: Use font size and formatting to detect headings
- DOCX: Use Mammoth's paragraph styles to identify headings
- XLSX: Detect scorecard formats vs. regular data sheets
- PPTX: Extract slide titles and content as sections

**Error Handling:**
- Graceful degradation for corrupted files
- Fallback to plain text extraction if structure detection fails
- Detailed error messages for unsupported file variations

### 2.2 Template Generation Strategy

**GPT-4o Prompt Engineering:**
- Two-phase approach:
  1. Document analysis - identify categories and criteria
  2. Criteria enhancement - generate detailed scoring rubrics

**Token Management:**
- Chunk large documents (max 25,000 chars per request)
- Track token usage for cost monitoring
- Use temperature=0.1 for consistency

**Template Validation:**
- Reuse existing `TemplateService.validateTemplateStructure()`
- Ensure category/criterion weights sum to 1.0
- Verify all required fields are present

### 2.3 API Design Strategy

**RESTful Endpoints:**
- Follow existing API patterns from transcription/compliance services
- Use Next.js 15 route handlers (app/api directory)
- Implement proper multipart/form-data handling for file uploads
- Return structured responses with error handling

**Data Flow:**
1. Upload → Extract → Store PolicyDocument
2. PolicyDocument ID → Analyze → Generate Template JSON
3. Template JSON → Review/Edit → Save to Template table
4. Link Template to source PolicyDocuments via TemplateGeneration

---

## 3. Detailed Implementation Plan

### 3.1 Phase 1: Document Extraction Service (4 hours)

**File:** `/nextjs-app/src/lib/services/policyExtraction.ts`

**Implementation Steps:**

1. **Create Service Class Structure**
   - Singleton pattern with private constructor
   - Public methods for each document type
   - Common error handling wrapper

2. **PDF Extraction**
   - Use `pdf-parse` to extract raw text
   - Implement heading detection via font size heuristics
   - Build hierarchical section structure
   - Extract metadata (page count, creation date)

3. **DOCX Extraction**
   - Use `mammoth` with custom style mappings
   - Map paragraph styles (Heading 1-6) to section levels
   - Preserve tables and lists
   - Extract document properties

4. **XLSX Extraction**
   - Use `xlsx` to read workbook
   - Detect scorecard format (headers with "criteria", "score", "compliance")
   - Parse sheets as either scorecards or regular data
   - Handle multiple sheets with different structures

5. **PPTX Extraction**
   - Use `officegen` or similar library
   - Extract slide titles as section headings
   - Combine slide content into text
   - Preserve slide order and hierarchy

6. **Common Utilities**
   - `detectFileType()` - determine format from MIME type and extension
   - `extractMetadata()` - standardize metadata extraction
   - `buildSectionTree()` - construct hierarchical section structure
   - `sanitizeText()` - clean extracted text (remove extra whitespace, etc.)

**Success Criteria:**
- All formats extract text successfully
- Structure preserved with 90%+ accuracy
- Handles corrupted files gracefully
- Comprehensive error messages

### 3.2 Phase 2: Template Generation Service (5 hours)

**File:** `/nextjs-app/src/lib/services/templateGeneration.ts`

**Implementation Steps:**

1. **Document Analysis (GPT-4o Phase 1)**
   - Create comprehensive analysis prompt
   - Send document text + metadata to GPT-4o
   - Extract compliance categories (5-10 per document)
   - Identify criteria per category (5-10 per category)
   - Map to regulatory frameworks (NFPA, OSHA)
   - Calculate analysis confidence score

2. **Template Structure Generation**
   - Convert GPT-4o analysis to template format
   - Assign default weights (normalized to sum to 1.0)
   - Generate criterion IDs (format: `category-slug-criterion-index`)
   - Validate structure with `TemplateService.validateTemplateStructure()`

3. **Criteria Enhancement (GPT-4o Phase 2)**
   - For each criterion, generate:
     - Detailed scoring rubric (excellent/good/needs improvement/fail)
     - Specific evidence requirements
     - Compliance/non-compliance examples
     - Improvement recommendations
   - Use focused prompts for each criterion
   - Parallel processing for efficiency

4. **Template Validation & Refinement**
   - Ensure all weights sum to 1.0 (±0.01 tolerance)
   - Verify all criterion IDs are unique
   - Check all required fields are present
   - Generate AI suggestions for improvements

5. **Confidence Scoring**
   - Calculate based on:
     - Document completeness
     - Number of identified criteria
     - Clarity of regulatory references
     - GPT-4o logprobs (if available)
   - Range: 0.0 - 1.0

**Success Criteria:**
- Generates valid templates from policy documents
- Templates pass validation (weights, IDs, structure)
- Confidence scores are accurate
- Processing time < 5 minutes per document

### 3.3 Phase 3: API Routes (4 hours)

**Files:**
- `/nextjs-app/src/app/api/policy/extract/route.ts`
- `/nextjs-app/src/app/api/policy/generate-template/route.ts`
- `/nextjs-app/src/app/api/policy/save-template/route.ts`
- `/nextjs-app/src/app/api/policy/[id]/route.ts`

**Implementation Steps:**

1. **POST /api/policy/extract**
   ```typescript
   // Accept multipart/form-data file upload
   // Validate file type and size
   // Extract content using PolicyExtractionService
   // Save to PolicyDocument table
   // Return extraction ID and preview
   ```

2. **POST /api/policy/generate-template**
   ```typescript
   // Accept PolicyDocument ID + options
   // Fetch PolicyDocument from database
   // Generate template using TemplateGenerationService
   // Return template JSON (not saved yet, for review)
   ```

3. **POST /api/policy/save-template**
   ```typescript
   // Accept template JSON + source document IDs
   // Validate template structure
   // Save to Template table with isAIGenerated=true
   // Create TemplateGeneration record with metadata
   // Link to PolicyDocuments via join table
   // Return saved template ID
   ```

4. **GET /api/policy/[id]**
   ```typescript
   // Fetch PolicyDocument by ID
   // Include related templates if any
   // Return full document data
   ```

**Request/Response Schemas:**

```typescript
// POST /api/policy/extract
Request: FormData {
  file: File
  fileName?: string
}
Response: {
  id: string
  fileName: string
  fileType: DocumentFormat
  extractedText: string (preview, first 500 chars)
  metadata: DocumentMetadata
  sections: DocumentSection[] (top-level only)
}

// POST /api/policy/generate-template
Request: {
  policyDocumentId: string
  options?: TemplateGenerationOptions
}
Response: GeneratedTemplate

// POST /api/policy/save-template
Request: {
  template: {
    name: string
    description?: string
    categories: ComplianceCategory[]
  }
  sourcePolicyIds: string[]
}
Response: {
  templateId: string
  generationId: string
}

// GET /api/policy/[id]
Response: PolicyDocument with related templates
```

**Success Criteria:**
- All endpoints handle errors gracefully
- File uploads work with multipart/form-data
- Responses follow existing API patterns
- Proper status codes (200, 201, 400, 404, 500)

### 3.4 Phase 4: Testing (3 hours)

**Files:**
- `/nextjs-app/__tests__/services/policyExtraction.test.ts`
- `/nextjs-app/__tests__/services/templateGeneration.test.ts`
- `/nextjs-app/__tests__/api/policy.test.ts`

**Test Coverage:**

1. **Document Extraction Tests**
   - PDF extraction with headings
   - DOCX extraction with styles
   - XLSX scorecard detection
   - Error handling for corrupted files
   - Metadata extraction

2. **Template Generation Tests**
   - Document analysis parsing
   - Template structure validation
   - Weight normalization
   - Criteria enhancement
   - Confidence calculation

3. **API Integration Tests**
   - File upload flow
   - Template generation flow
   - Save and retrieve flow
   - Error responses

**Success Criteria:**
- 90%+ code coverage on services
- All edge cases covered
- Integration tests pass end-to-end

---

## 4. Database Schema (Already Implemented)

The Prisma schema already includes all necessary models:

```prisma
model PolicyDocument {
  id           String   @id @default(cuid())
  fileName     String
  originalName String
  fileType     String
  fileSize     Int
  fileUrl      String
  content      String   @db.Text
  metadata     Json
  uploadedBy   String?

  templates   Template[]
  generations TemplateGeneration_PolicyDocument[]

  uploadedAt DateTime @default(now())
}

model TemplateGeneration {
  id            String @id @default(cuid())
  templateId    String @unique
  generationLog Json
  confidence    Float
  suggestions   Json
  aiModel       String @default("gpt-4o")

  template  Template @relation(...)
  documents TemplateGeneration_PolicyDocument[]

  generatedAt DateTime @default(now())
}

model TemplateGeneration_PolicyDocument {
  generationId String
  documentId   String

  generation TemplateGeneration @relation(...)
  document   PolicyDocument @relation(...)

  assignedAt DateTime @default(now())

  @@id([generationId, documentId])
}
```

**No migration needed** - schema is already in place.

---

## 5. Type Definitions (Already Implemented)

All required types already exist in `/nextjs-app/src/lib/types/index.ts`:

- ✅ `DocumentFormat` - pdf, docx, xlsx, pptx, txt, md
- ✅ `DocumentSection` - hierarchical section structure
- ✅ `ExtractedContent` - extraction result
- ✅ `DocumentMetadata` - file metadata
- ✅ `DocumentAnalysis` - GPT-4o analysis result
- ✅ `GeneratedTemplate` - complete generation result
- ✅ `TemplateGenerationOptions` - generation options
- ✅ `TemplateSuggestion` - AI suggestions

**No new types needed** - all requirements met.

---

## 6. npm Package Requirements

All packages already installed in `package.json`:

- ✅ `pdf-parse@2.1.7` - PDF text extraction
- ✅ `mammoth@1.11.0` - DOCX to HTML/text
- ✅ `xlsx@0.18.5` - Excel spreadsheet parsing
- ✅ `@types/pdf-parse@1.1.5` - TypeScript types

**Additional Package Needed:**
- ❌ PowerPoint extraction library (investigate: `officegen`, `pptx`, or `node-pptx`)

**Installation Command:**
```bash
npm install --save officegen
npm install --save-dev @types/officegen
```

---

## 7. Implementation Sequence

### Day 1 (8 hours)
1. ✅ Install missing packages (15 min)
2. ✅ Implement PolicyExtractionService (4 hours)
   - PDF extraction (1 hour)
   - DOCX extraction (1 hour)
   - XLSX extraction (1 hour)
   - PPTX extraction (1 hour)
3. ✅ Write extraction tests (1.5 hours)
4. ✅ Implement TemplateGenerationService - Part 1 (2.5 hours)
   - Document analysis (1.5 hours)
   - Structure generation (1 hour)

### Day 2 (8 hours)
1. ✅ Implement TemplateGenerationService - Part 2 (2.5 hours)
   - Criteria enhancement (1.5 hours)
   - Validation & confidence (1 hour)
2. ✅ Write template generation tests (1.5 hours)
3. ✅ Implement API routes (3 hours)
   - Extract endpoint (45 min)
   - Generate endpoint (45 min)
   - Save endpoint (45 min)
   - Get endpoint (45 min)
4. ✅ Write API tests (1 hour)

---

## 8. Success Metrics

### Technical Metrics
- ✅ Document extraction accuracy: >95%
- ✅ Template generation confidence: >90%
- ✅ Processing time: <5 minutes per document
- ✅ Test coverage: >90%

### Functional Metrics
- ✅ All file formats supported (PDF, DOCX, XLSX, PPTX)
- ✅ Structure preserved (headings, sections, tables)
- ✅ Valid templates generated (pass validation)
- ✅ API endpoints functional (all CRUD operations)

### Quality Metrics
- ✅ Comprehensive error handling
- ✅ Full JSDoc documentation
- ✅ Type safety (no `any` types)
- ✅ Consistent code patterns with existing services

---

## 9. Known Limitations & Future Enhancements

### Current Limitations
1. **PowerPoint extraction** - Limited library support (may require evaluation)
2. **Large documents** - Token limits require chunking (may lose context)
3. **Complex tables** - Structure may not fully preserve in all formats
4. **Handwritten annotations** - Not extracted (OCR not in scope)

### Future Enhancements
1. **Multi-document merging** - Combine multiple policies into one template
2. **Template versioning** - Track edits and improvements over time
3. **Collaborative editing** - Multiple reviewers can edit generated templates
4. **Batch processing** - Upload and process multiple documents at once
5. **Template comparison** - Compare AI-generated vs. manual templates

---

## 10. Risk Mitigation

### Risk 1: PowerPoint Library Support
- **Mitigation:** Research and test multiple libraries before committing
- **Fallback:** Implement basic text extraction without full structure
- **Impact:** Medium - PPTX is less critical than PDF/DOCX

### Risk 2: GPT-4o Context Length
- **Mitigation:** Implement intelligent chunking with overlap
- **Fallback:** Process in multiple passes with summarization
- **Impact:** High - Large documents common in fire departments

### Risk 3: Template Validation Failures
- **Mitigation:** Implement auto-correction for common issues (weight normalization)
- **Fallback:** Return partially valid template with warnings
- **Impact:** Medium - User can manually fix

### Risk 4: File Upload Size Limits
- **Mitigation:** Set reasonable limits (50MB max), provide clear error messages
- **Fallback:** Compress or split large files
- **Impact:** Low - Most policy docs <10MB

---

## 11. Acceptance Criteria Checklist

### Document Extraction Service
- [ ] Extracts text from PDF files
- [ ] Extracts text from DOCX files
- [ ] Extracts text from XLSX files
- [ ] Extracts text from PPTX files
- [ ] Preserves document structure (headings, sections)
- [ ] Extracts metadata (pages, format, etc.)
- [ ] Handles corrupted files gracefully
- [ ] Returns structured `ExtractedContent`

### Template Generation Service
- [ ] Analyzes policy documents with GPT-4o
- [ ] Generates 5-10 compliance categories
- [ ] Creates 5-10 criteria per category
- [ ] Assigns appropriate weights (sum to 1.0)
- [ ] Maps to regulatory frameworks (NFPA, OSHA)
- [ ] Generates scoring rubrics
- [ ] Calculates confidence scores
- [ ] Validates template structure
- [ ] Provides AI suggestions for improvement

### API Routes
- [ ] POST /api/policy/extract handles file uploads
- [ ] POST /api/policy/generate-template generates templates
- [ ] POST /api/policy/save-template saves templates
- [ ] GET /api/policy/[id] retrieves policy documents
- [ ] All endpoints handle errors gracefully
- [ ] All responses follow API patterns
- [ ] Proper status codes returned

### Testing
- [ ] Unit tests for PDF extraction
- [ ] Unit tests for DOCX extraction
- [ ] Unit tests for XLSX extraction
- [ ] Unit tests for PPTX extraction
- [ ] Unit tests for template generation
- [ ] Integration tests for API routes
- [ ] Error handling tests
- [ ] 90%+ code coverage

### Documentation
- [ ] JSDoc comments on all public methods
- [ ] README with usage examples
- [ ] API documentation with request/response examples
- [ ] Integration notes for frontend developers

---

## 12. Next Steps After Implementation

1. **Frontend Integration** (Phase 4)
   - Build document upload UI
   - Create template review interface
   - Implement AI suggestions panel
   - Add template management views

2. **Optimization** (Phase 5)
   - Implement caching for extracted documents
   - Add background job processing for large files
   - Optimize GPT-4o prompts for better results
   - Add telemetry for performance monitoring

3. **Production Deployment** (Phase 6)
   - Set up file storage (Azure Blob or S3)
   - Configure environment variables
   - Set up monitoring and alerting
   - Create deployment documentation

---

**Plan Status:** READY FOR IMPLEMENTATION
**Estimated Completion:** 16 hours (2 days)
**Dependencies:** None - all infrastructure in place
**Blockers:** None identified
