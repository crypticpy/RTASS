# Implementation Plan: Modular Category-by-Category Compliance Scoring

**Date**: 2025-10-05
**Project**: Fire Department Radio Transcription & Compliance Audit System
**Feature**: Modular Compliance Scoring Service Refactor

---

## 1. Situation Assessment

### Current State

The compliance service currently uses a **monolithic scoring approach**:
- Single OpenAI API call evaluates ALL categories at once
- All-or-nothing processing (if one category fails, entire audit fails)
- No progress tracking during scoring
- Limited error recovery
- Difficult to debug failures in specific categories
- No ability to save partial results

**Existing Implementation** (`src/lib/services/complianceService.ts`):
- `auditTranscript()`: Main method that processes entire audit in one GPT-4o call
- Returns complete `AuditResult` or throws error
- Uses `buildScoringPrompt()` to create comprehensive prompt for all categories
- Calls `callGPT4o()` once with full template structure

**Existing Modular Functions** (`src/lib/openai/compliance-analysis.ts`):
- `analyzeCategory()`: Already implements single-category analysis
- `generateNarrative()`: Creates executive summary
- `calculateOverallScore()`: Computes weighted scores
- `extractCriticalFindings()`: Pulls high-priority findings

### Technical Stack

- **Database**: PostgreSQL via Prisma ORM
- **AI Model**: GPT-4o for compliance analysis
- **Type System**: TypeScript with comprehensive type definitions
- **API**: Next.js 15 App Router (API routes)
- **Error Handling**: Custom error classes with service-level error handlers

### Schema Structure

**Prisma Models**:
- `Audit`: Stores audit results
  - `findings`: JSON field containing categories and findings
  - `recommendations`: JSON field
  - `metadata`: JSON field with processing metrics
- `Transcript`: Contains transcription text and segments
- `Template`: Contains compliance categories and criteria

**Type Definitions** (`src/lib/types/index.ts`):
- `ComplianceCategory`: Category with criteria array
- `ComplianceCriterion`: Individual scoring criteria
- `AuditResult`: Complete audit results
- `Finding`: Compliance finding with evidence
- `Recommendation`: Improvement recommendation

---

## 2. Strategy

### High-Level Approach

**Refactor to Sequential Category Processing**:
1. Load transcript and template from database
2. Extract incident context
3. **Loop through each category sequentially**
4. Call modular `analyzeCategory()` function (already exists)
5. Save partial results after each category (optional)
6. Handle category-level errors gracefully
7. Generate final narrative and overall score
8. Save complete audit to database

### Key Benefits

1. **Better Error Handling**: Category failures don't abort entire audit
2. **Progress Tracking**: Real-time progress updates via callbacks
3. **Partial Results**: Save results incrementally for recovery
4. **Debugging**: Easier to identify which category caused issues
5. **Cost Optimization**: Token usage tracked per category
6. **Flexibility**: Can run specific categories or skip categories

### Backward Compatibility

- Keep existing `auditTranscript()` method (legacy support)
- Add new `executeModularAudit()` method
- API route supports both modes via query parameter
- Default to legacy mode to avoid breaking changes

### Error Recovery Strategy

**Category-Level Failures**:
- Log error details with category name
- Add placeholder score (0) with error message in rationale
- Continue processing remaining categories
- Track failed categories in metadata
- Return partial results marked as incomplete

**Database Failures**:
- Retry with exponential backoff for transient errors
- Store partial results in memory if DB unavailable
- Return in-memory results to caller with warning

---

## 3. Detailed Implementation Plan

### Phase 1: Update Service Layer (`complianceService.ts`)

#### 3.1 Add New Method: `executeModularAudit()`

**Location**: `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/services/complianceService.ts`

**Signature**:
```typescript
async executeModularAudit(
  transcriptId: string,
  templateId: string,
  options?: {
    onProgress?: (current: number, total: number, categoryName: string) => void;
    savePartialResults?: boolean;
  }
): Promise<AuditResult>
```

**Implementation Steps**:

1. **Load Data** (similar to existing `auditTranscript()`):
   - Fetch transcript from Prisma (include incident relation)
   - Fetch template from `templateService.getTemplateById()`
   - Validate both exist

2. **Extract Incident Context**:
   ```typescript
   const incidentContext = {
     type: transcript.incident?.type,
     date: transcript.incident?.startTime,
     units: transcript.incident?.units.map(u => u.number),
     notes: additionalNotes
   };
   ```

3. **Initialize Tracking Variables**:
   ```typescript
   const categoryResults: CategoryAnalysisResult[] = [];
   const failedCategories: string[] = [];
   const startTime = Date.now();
   let totalTokens = 0;
   ```

4. **Loop Through Categories**:
   ```typescript
   for (let i = 0; i < categories.length; i++) {
     const category = categories[i];

     try {
       // Call modular scoring function
       const result = await analyzeCategory(
         transcript.text,
         incidentContext,
         category,
         { model: 'gpt-4o', temperature: 0.3 }
       );

       categoryResults.push(result);

       // Invoke progress callback
       if (options?.onProgress) {
         options.onProgress(i + 1, categories.length, category.name);
       }

       // Save partial results (if enabled)
       if (options?.savePartialResults) {
         await this.savePartialCategoryScore(
           transcriptId,
           templateId,
           result
         );
       }

     } catch (error) {
       // Handle category failure gracefully
       console.error(`Category "${category.name}" failed:`, error);
       failedCategories.push(category.name);

       // Add placeholder result
       categoryResults.push({
         category: category.name,
         categoryScore: 0,
         criteriaScores: [],
         overallAnalysis: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
         keyFindings: [],
         recommendations: []
       });
     }
   }
   ```

5. **Generate Final Narrative**:
   ```typescript
   const auditResults: AuditResults = {
     overallScore: calculateOverallScore(categoryResults, categoryWeights),
     categories: categoryResults,
   };

   const narrative = await generateNarrative(auditResults);
   ```

6. **Calculate Overall Score and Status**:
   ```typescript
   const overallScore = auditResults.overallScore * 100; // Convert to 0-100
   const overallStatus = this.determineOverallStatus(overallScore);
   ```

7. **Transform Results to Database Format**:
   - Convert `CategoryAnalysisResult[]` to `ComplianceCategory[]`
   - Extract all findings
   - Generate recommendations

8. **Save Complete Audit**:
   ```typescript
   const audit = await this.saveAudit({
     incidentId: transcript.incidentId,
     transcriptId: transcript.id,
     templateId: template.id,
     overallScore,
     overallStatus,
     summary: narrative,
     categories: transformedCategories,
     findings: extractedFindings,
     recommendations: generatedRecommendations,
     metadata: {
       model: 'gpt-4o',
       processingTime: (Date.now() - startTime) / 1000,
       tokenUsage: totalTokens,
       failedCategories,
       mode: 'modular'
     }
   });
   ```

9. **Return Result**:
   ```typescript
   return {
     id: audit.id,
     incidentId: audit.incidentId,
     transcriptId: audit.transcriptId || undefined,
     templateId: audit.templateId,
     overallStatus: audit.overallStatus as AuditStatus,
     overallScore: audit.overallScore || 0,
     summary: audit.summary,
     categories: transformedCategories,
     findings: extractedFindings,
     recommendations: generatedRecommendations,
     metadata: audit.metadata as any as AuditMetadata,
     createdAt: audit.createdAt,
   };
   ```

#### 3.2 Add Supporting Methods

**3.2.1 `transformCategoryResults()`**
```typescript
/**
 * Transform modular category results to ComplianceCategory format
 *
 * @private
 * @param categoryResults - Results from analyzeCategory()
 * @param templateCategories - Original template categories
 * @returns Transformed categories for database storage
 */
private transformCategoryResults(
  categoryResults: CategoryAnalysisResult[],
  templateCategories: ComplianceCategory[]
): ComplianceCategory[]
```

**Implementation**:
- Map each `CategoryAnalysisResult` to `ComplianceCategory`
- Convert `criteriaScores` to `criteria` with findings
- Calculate category status based on score
- Preserve original template structure

**3.2.2 `extractAllFindingsFromResults()`**
```typescript
/**
 * Extract all findings from category results
 *
 * @private
 * @param categoryResults - Results from analyzeCategory()
 * @returns Flattened array of findings
 */
private extractAllFindingsFromResults(
  categoryResults: CategoryAnalysisResult[]
): Finding[]
```

**Implementation**:
- Loop through all category results
- Extract evidence from each criterion score
- Transform to `Finding` type
- Add category and criterion references

**3.2.3 `generateRecommendationsFromResults()`**
```typescript
/**
 * Generate recommendations from category results
 *
 * @private
 * @param categoryResults - Results from analyzeCategory()
 * @returns Prioritized recommendations
 */
private generateRecommendationsFromResults(
  categoryResults: CategoryAnalysisResult[]
): Recommendation[]
```

**Implementation**:
- Extract recommendations from each category
- Prioritize by impact level (CRITICAL > HIGH > MEDIUM > LOW)
- Group by category
- Format as `Recommendation` objects

**3.2.4 `savePartialCategoryScore()` (Optional)**
```typescript
/**
 * Save partial category score to database for recovery
 *
 * @private
 * @param transcriptId - Transcript being audited
 * @param templateId - Template being used
 * @param categoryResult - Category result to save
 */
private async savePartialCategoryScore(
  transcriptId: string,
  templateId: string,
  categoryResult: CategoryAnalysisResult
): Promise<void>
```

**Implementation**:
- Store in `SystemMetrics` table or separate `PartialAudit` table
- Use JSON field to store category result
- Include timestamp and identifiers
- Enable resumption of interrupted audits

**3.2.5 `loadPartialAudit()` (Optional)**
```typescript
/**
 * Load partial audit results from database
 *
 * @private
 * @param transcriptId - Transcript ID
 * @param templateId - Template ID
 * @returns Previously saved category results
 */
private async loadPartialAudit(
  transcriptId: string,
  templateId: string
): Promise<CategoryAnalysisResult[]>
```

**3.2.6 `validateAuditCompleteness()`**
```typescript
/**
 * Validate that all categories were successfully scored
 *
 * @private
 * @param categoryResults - Results from modular audit
 * @param templateCategories - Expected categories
 * @returns Completeness report
 */
private validateAuditCompleteness(
  categoryResults: CategoryAnalysisResult[],
  templateCategories: ComplianceCategory[]
): {
  isComplete: boolean;
  missingCategories: string[];
  failedCategories: string[];
}
```

### Phase 2: Update API Route (`route.ts`)

#### 2.1 Add Mode Selection

**Location**: `/Users/aiml/Projects/transcriber/nextjs-app/src/app/api/compliance/audit/route.ts`

**Changes**:

1. **Add Query Parameter Support**:
   ```typescript
   export async function POST(request: NextRequest) {
     const { searchParams } = new URL(request.url);
     const mode = searchParams.get('mode'); // 'legacy' or 'modular'
     const enableStreaming = searchParams.get('stream') === 'true';
   ```

2. **Branch Based on Mode**:
   ```typescript
   let audit: AuditResult;

   if (mode === 'modular' && !enableStreaming) {
     // Non-streaming modular audit
     audit = await complianceService.executeModularAudit(
       validated.transcriptId,
       validated.templateId,
       {
         savePartialResults: true
       }
     );
   } else if (mode === 'modular' && enableStreaming) {
     // Streaming modular audit
     return handleStreamingAudit(validated);
   } else {
     // Legacy mode (default)
     audit = await complianceService.auditTranscript(
       validated.transcriptId,
       validated.templateId,
       validated.additionalNotes
     );
   }
   ```

#### 2.2 Add Streaming Support (SSE)

**New Function**: `handleStreamingAudit()`

```typescript
/**
 * Handle streaming modular audit with Server-Sent Events
 */
async function handleStreamingAudit(
  validated: { transcriptId: string; templateId: string; additionalNotes?: string }
): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Progress callback
        const onProgress = (current: number, total: number, categoryName: string) => {
          const event = {
            type: 'progress',
            current,
            total,
            category: categoryName,
            timestamp: new Date().toISOString()
          };

          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        // Execute modular audit with progress callbacks
        const audit = await complianceService.executeModularAudit(
          validated.transcriptId,
          validated.templateId,
          {
            onProgress,
            savePartialResults: true
          }
        );

        // Send complete event
        const completeEvent = {
          type: 'complete',
          result: audit,
          timestamp: new Date().toISOString()
        };

        const data = `data: ${JSON.stringify(completeEvent)}\n\n`;
        controller.enqueue(encoder.encode(data));

        controller.close();

      } catch (error) {
        // Send error event
        const errorEvent = {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        };

        const data = `data: ${JSON.stringify(errorEvent)}\n\n`;
        controller.enqueue(encoder.encode(data));

        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### 2.3 Update Response Format

**Enhanced Metadata**:
```typescript
return NextResponse.json({
  success: true,
  data: {
    ...audit,
    metadata: {
      ...audit.metadata,
      mode: mode || 'legacy',
      streaming: enableStreaming,
      failedCategories: audit.metadata.failedCategories || [],
    }
  },
  timestamp: new Date().toISOString(),
});
```

### Phase 3: Type Definitions Updates

#### 3.1 Extend `AuditMetadata` Type

**Location**: `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/types/index.ts`

```typescript
export interface AuditMetadata {
  model: 'gpt-4o' | 'gpt-4o-mini';
  processingTime: number;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  additionalNotes?: string;

  // New fields for modular scoring
  mode?: 'legacy' | 'modular';
  failedCategories?: string[];
  categoryTokenUsage?: Record<string, number>; // Per-category token tracking
  partialResultsSaved?: boolean;
}
```

#### 3.2 Add Progress Callback Type

```typescript
/**
 * Progress callback for modular audit execution
 */
export type AuditProgressCallback = (
  current: number,
  total: number,
  categoryName: string
) => void;

/**
 * Options for modular audit execution
 */
export interface ModularAuditOptions {
  onProgress?: AuditProgressCallback;
  savePartialResults?: boolean;
  skipCategories?: string[]; // Optional: skip specific categories
  resumeFrom?: string; // Optional: resume from category name
}
```

---

## 4. Technical Specifications

### API Integration

**Endpoint**: `POST /api/compliance/audit`

**Query Parameters**:
- `mode` (optional): `'legacy'` | `'modular'` (default: `'legacy'`)
- `stream` (optional): `'true'` | `'false'` (default: `'false'`)

**Request Body** (unchanged):
```json
{
  "transcriptId": "cuid",
  "templateId": "cuid",
  "additionalNotes": "Optional context"
}
```

**Response (Non-Streaming)**:
```json
{
  "success": true,
  "data": {
    "id": "audit-id",
    "overallScore": 85,
    "overallStatus": "PASS",
    "categories": [...],
    "findings": [...],
    "recommendations": [...],
    "metadata": {
      "model": "gpt-4o",
      "processingTime": 45.2,
      "mode": "modular",
      "failedCategories": [],
      "categoryTokenUsage": {
        "Radio Discipline": 1200,
        "Mayday Procedures": 1350
      }
    }
  },
  "timestamp": "2025-10-05T..."
}
```

**Response (Streaming SSE)**:
```
data: {"type":"progress","current":1,"total":5,"category":"Radio Discipline","timestamp":"..."}

data: {"type":"progress","current":2,"total":5,"category":"Mayday Procedures","timestamp":"..."}

data: {"type":"progress","current":3,"total":5,"category":"Command Operations","timestamp":"..."}

data: {"type":"complete","result":{...},"timestamp":"..."}
```

### Data Models

**No Prisma schema changes required** - existing `Audit` model supports the new approach via JSON fields.

**Optional Enhancement**: Add `PartialAudit` model for resumable audits:
```prisma
model PartialAudit {
  id           String   @id @default(cuid())
  transcriptId String
  templateId   String
  categoryName String
  categoryData Json     // CategoryAnalysisResult
  createdAt    DateTime @default(now())

  @@unique([transcriptId, templateId, categoryName])
  @@index([transcriptId, templateId])
  @@map("partial_audits")
}
```

### Integration Points

1. **OpenAI Service** (`src/lib/openai/compliance-analysis.ts`):
   - Uses existing `analyzeCategory()` function
   - Uses existing `generateNarrative()` function
   - Uses existing `calculateOverallScore()` helper

2. **Template Service** (`src/lib/services/templateService.ts`):
   - Uses existing `getTemplateById()` method

3. **Prisma Client** (`src/lib/db.ts`):
   - Uses existing Prisma client
   - No schema migrations required

---

## 5. Risk Mitigation

### Potential Issues and Solutions

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Category failure aborts audit** | HIGH | Wrap each category in try-catch; continue with placeholder scores |
| **Long processing time** | MEDIUM | Implement streaming for progress feedback; consider timeout per category |
| **Database save failures** | MEDIUM | Retry with backoff; return in-memory results as fallback |
| **Partial results orphaned** | LOW | Implement cleanup job to remove old partial results |
| **Token usage explosion** | MEDIUM | Track per-category tokens; warn if approaching limits |
| **Backward compatibility** | HIGH | Keep legacy method; use query param to opt-in to new mode |

### Error Scenarios

**Scenario 1: Single category fails**
- **Handling**: Log error, add placeholder score, continue with remaining categories
- **User Impact**: Partial results returned with metadata indicating failed category
- **Recovery**: User can re-run audit for failed category specifically

**Scenario 2: Database unavailable during save**
- **Handling**: Retry 3 times with exponential backoff; if all fail, return results without persisting
- **User Impact**: Results displayed but not saved; user warned to retry
- **Recovery**: User re-runs audit when DB available

**Scenario 3: OpenAI rate limit hit**
- **Handling**: Existing retry logic in `analyzeCategory()` handles this
- **User Impact**: Slower processing due to retries
- **Recovery**: Automatic via retry logic

---

## 6. Testing Strategy

### Unit Tests

**File**: `__tests__/services/complianceService.modular.test.ts`

```typescript
describe('ComplianceService - Modular Audit', () => {
  describe('executeModularAudit', () => {
    it('should process all categories sequentially', async () => {
      // Test that each category is processed in order
    });

    it('should invoke progress callback for each category', async () => {
      // Test progress tracking
    });

    it('should handle category failures gracefully', async () => {
      // Test error recovery
    });

    it('should save partial results when enabled', async () => {
      // Test partial result persistence
    });

    it('should generate final narrative after all categories', async () => {
      // Test narrative generation
    });

    it('should calculate correct overall score', async () => {
      // Test weighted scoring
    });
  });

  describe('transformCategoryResults', () => {
    it('should transform CategoryAnalysisResult to ComplianceCategory', async () => {
      // Test data transformation
    });
  });

  describe('validateAuditCompleteness', () => {
    it('should detect missing categories', async () => {
      // Test completeness validation
    });
  });
});
```

### Integration Tests

**File**: `__tests__/api/compliance/audit.modular.test.ts`

```typescript
describe('POST /api/compliance/audit (modular mode)', () => {
  it('should execute modular audit when mode=modular', async () => {
    // Test API endpoint with modular mode
  });

  it('should stream progress events when stream=true', async () => {
    // Test SSE streaming
  });

  it('should fall back to legacy mode by default', async () => {
    // Test backward compatibility
  });

  it('should return partial results on category failure', async () => {
    // Test error handling
  });
});
```

---

## 7. Migration Notes

### For Developers

**No Breaking Changes**:
- Existing `auditTranscript()` method remains unchanged
- Default behavior (no query params) uses legacy mode
- Opt-in to modular mode via `?mode=modular`

**Recommended Usage**:
```typescript
// Legacy mode (existing code continues to work)
const audit = await complianceService.auditTranscript(
  transcriptId,
  templateId
);

// New modular mode with progress tracking
const audit = await complianceService.executeModularAudit(
  transcriptId,
  templateId,
  {
    onProgress: (current, total, category) => {
      console.log(`Processing ${category} (${current}/${total})`);
    },
    savePartialResults: true
  }
);
```

**Frontend Integration** (future):
```typescript
// Streaming mode for real-time progress
const eventSource = new EventSource(
  '/api/compliance/audit?mode=modular&stream=true'
);

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'progress') {
    updateProgressBar(data.current, data.total);
    updateStatusText(`Analyzing ${data.category}...`);
  } else if (data.type === 'complete') {
    displayResults(data.result);
    eventSource.close();
  } else if (data.type === 'error') {
    showError(data.error);
    eventSource.close();
  }
});
```

### Database Considerations

**No migrations required** - existing `Audit` model's JSON fields support the new structure.

**Optional**: Add `PartialAudit` table for advanced resumption features (not critical for initial release).

---

## 8. Success Criteria

- [ ] `executeModularAudit()` method implemented and tested
- [ ] Progress callback invoked for each category
- [ ] Category failures handled gracefully (audit continues)
- [ ] Partial results saved to database (optional feature works)
- [ ] API route supports `?mode=modular` query parameter
- [ ] Streaming mode works with SSE (`?stream=true`)
- [ ] Backward compatibility maintained (legacy mode is default)
- [ ] All unit tests pass (>80% coverage)
- [ ] Integration tests verify end-to-end flow
- [ ] Documentation updated (JSDoc comments)
- [ ] Error messages are clear and actionable
- [ ] Performance is acceptable (no significant slowdown vs. legacy)

---

## 9. Timeline Estimate

| Phase | Task | Estimated Time |
|-------|------|----------------|
| **Phase 1** | Implement `executeModularAudit()` | 3-4 hours |
| | Add supporting methods | 2-3 hours |
| | Add comprehensive JSDoc | 1 hour |
| **Phase 2** | Update API route (non-streaming) | 1-2 hours |
| | Add streaming support (SSE) | 2-3 hours |
| **Phase 3** | Update type definitions | 1 hour |
| **Testing** | Write unit tests | 2-3 hours |
| | Write integration tests | 2-3 hours |
| | Manual testing and debugging | 2-3 hours |
| **Total** | | **16-22 hours** |

---

## 10. Next Steps

1. **Review and approval** of this implementation plan
2. **Begin Phase 1**: Implement `executeModularAudit()` in `complianceService.ts`
3. **Test incrementally**: Unit test each supporting method as it's implemented
4. **Proceed to Phase 2**: Update API route once service layer is complete
5. **Integration testing**: Test end-to-end flow with real data
6. **Documentation**: Update CLAUDE.md with new usage patterns
7. **Optional enhancements**: Add frontend streaming UI (Phase 4)

---

## Appendix: Code Examples

### Example: Transform Category Results

```typescript
private transformCategoryResults(
  categoryResults: CategoryAnalysisResult[],
  templateCategories: ComplianceCategory[]
): ComplianceCategory[] {
  return categoryResults.map((result) => {
    // Find matching template category
    const templateCategory = templateCategories.find(
      (tc) => tc.name === result.category
    );

    if (!templateCategory) {
      throw new Error(`Template category not found: ${result.category}`);
    }

    // Transform criteria scores to criteria
    const criteria: ComplianceCriterion[] = result.criteriaScores.map((score) => {
      const templateCriterion = templateCategory.criteria.find(
        (c) => c.id === score.criterionId
      );

      if (!templateCriterion) {
        throw new Error(`Criterion not found: ${score.criterionId}`);
      }

      // Convert evidence to findings
      const findings: Finding[] = score.evidence.map((ev, idx) => ({
        timestamp: ev.timestamp,
        quote: ev.text,
        compliance: ev.type === 'VIOLATION' ? 'NEGATIVE' :
                    ev.type === 'COMPLIANCE' ? 'POSITIVE' : 'NEUTRAL',
        significance: score.impact || 'MEDIUM',
        explanation: score.reasoning,
        criterionId: score.criterionId,
      }));

      return {
        ...templateCriterion,
        status: score.score as CriterionStatus,
        score: this.convertScoreToNumeric(score.score),
        rationale: score.reasoning,
        findings,
        recommendations: score.recommendation ? [score.recommendation] : [],
      };
    });

    // Calculate category score (0-100)
    const categoryScore = Math.round(result.categoryScore * 100);

    return {
      ...templateCategory,
      criteria,
      score: categoryScore,
      status: this.determineOverallStatus(categoryScore),
      rationale: result.overallAnalysis,
    };
  });
}

private convertScoreToNumeric(score: 'PASS' | 'FAIL' | 'NOT_APPLICABLE'): number {
  switch (score) {
    case 'PASS': return 100;
    case 'FAIL': return 0;
    case 'NOT_APPLICABLE': return 0;
    default: return 0;
  }
}
```

### Example: Extract Findings

```typescript
private extractAllFindingsFromResults(
  categoryResults: CategoryAnalysisResult[]
): Finding[] {
  const findings: Finding[] = [];

  categoryResults.forEach((categoryResult) => {
    categoryResult.criteriaScores.forEach((score) => {
      score.evidence.forEach((ev) => {
        findings.push({
          timestamp: ev.timestamp,
          quote: ev.text,
          compliance: ev.type === 'VIOLATION' ? 'NEGATIVE' :
                      ev.type === 'COMPLIANCE' ? 'POSITIVE' : 'NEUTRAL',
          significance: score.impact || 'MEDIUM',
          explanation: score.reasoning,
          criterionId: score.criterionId,
        });
      });
    });
  });

  return findings;
}
```

---

**Plan Status**: READY FOR IMPLEMENTATION
**Author**: Claude Code (Backend Architect)
**Last Updated**: 2025-10-05
