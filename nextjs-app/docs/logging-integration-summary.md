# Logging Integration Summary

**Date**: 2025-10-06
**Status**: Phase 1 Complete, Patterns Documented for Phase 2-3

---

## Completed Work

### 1. Specialized Logger Modules Created

✅ **src/lib/logging/openai-logger.ts**
- OpenAI-specific logging utilities for GPT-4.1, Whisper, and Responses API
- Functions: `logOpenAIRequest()`, `logOpenAIResponse()`, `logOpenAIError()`, `logOpenAIRetry()`, `logRateLimitWait()`, `wrapOpenAICall()`, `logWhisperRequest()`, `logWhisperResponse()`, `logSchemaValidation()`
- Automatic cost estimation using current pricing (Jan 2025)
- Token usage tracking with input/output/total counts

✅ **src/lib/logging/template-logger.ts**
- Template generation workflow tracking
- Functions: `logTemplateWorkflowStart()`, `logTemplateWorkflowStep()`, `logTemplateWorkflowComplete()`, `logTemplateWorkflowError()`, `logCategoryDiscovery()`, `logCriteriaGeneration()`, `logWeightNormalization()`, `logSchemaValidation()`, `logFullContextPrompt()`, `logAIResponseParsing()`, `logTemplateValidation()`, `logAutoFix()`, `logSuggestionGeneration()`
- Multi-turn workflow support with jobId tracking
- Progress indicators (X/N categories complete)
- Zod schema validation logging

✅ **src/lib/logging/compliance-logger.ts**
- Compliance audit pipeline tracking
- Functions: `logAuditStart()`, `logCategoryScoring()`, `logCategoryScoringComplete()`, `logCategoryScoringError()`, `logNarrativeGeneration()`, `logNarrativeComplete()`, `logAuditComplete()`, `logAuditError()`, `logPartialResultSave()`, `logCriticalFinding()`, `logAuditProgress()`, `logEvidenceExtraction()`, `logWeightedScoreCalculation()`
- Category-by-category progress tracking
- Partial result logging for resilience
- Critical finding alerts

✅ **src/lib/logging/index.ts** - Updated to export all specialized loggers

### 2. Core Module Integrations

✅ **src/lib/openai/utils.ts**
- Replaced `console.warn()` in `retryWithBackoff()` with `logOpenAIRetry()`
- Updated `logAPICall()` to use structured `logger.info()` instead of `console.log()`
- Added correlation ID support

✅ **src/lib/services/utils/openai.ts**
- Enhanced `trackTokenUsage()` with cost estimation and structured logging
- Added rate limit wait logging in `RateLimiter.waitForSlot()`
- Replaced `console.error()` with `logger.error()` in error handling

---

## Integration Patterns for Remaining Work

### Pattern 1: Wrapping OpenAI API Calls

**Location**: `src/lib/openai/template-generation.ts`, `src/lib/openai/compliance-analysis-modular.ts`

```typescript
import { wrapOpenAICall, logSchemaValidation } from '@/lib/logging';

// Before calling OpenAI API:
const result = await wrapOpenAICall(
  'responses-create',  // operation
  'gpt-4.1',          // model (DO NOT CHANGE)
  estimatedTokens,    // estimated input tokens
  async () => {
    return await openai.chat.completions.create({
      model: 'gpt-4.1',  // ⚠️ CRITICAL: DO NOT CHANGE
      // ... rest of config
    });
  },
  { jobId, categoryName }  // additional metadata
);

// After Zod validation:
logSchemaValidation(
  'template-generation',
  'GeneratedTemplateSchema',
  validationSuccess,
  validationErrors,
  { jobId }
);
```

### Pattern 2: Template Generation Workflow

**Location**: `src/lib/services/templateGeneration.ts`

```typescript
import {
  logTemplateWorkflowStart,
  logTemplateWorkflowStep,
  logCategoryDiscovery,
  logCriteriaGeneration,
  logWeightNormalization,
  logTemplateWorkflowComplete,
  logTemplateWorkflowError,
  generateJobId,
  setJobId,
  runWithContext
} from '@/lib/logging';

// At workflow start:
const jobId = generateJobId();
logTemplateWorkflowStart(jobId, documentCount, options);

// Run workflow in context:
return await runWithContext(async () => {
  setJobId(jobId);

  try {
    // Step 1: Category Discovery
    logTemplateWorkflowStep(jobId, 'discover-categories', 'Starting category discovery');
    const categories = await discoverCategoriesFullContext(fullText, options);
    logCategoryDiscovery(jobId, categories.map(c => c.name), 0.9);

    // Step 2: Criteria Generation
    const criteriaMap: Record<string, ComplianceCriterion[]> = {};
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const progress = `${i + 1}/${categories.length}`;

      logTemplateWorkflowStep(jobId, 'generate-criteria', `Generating criteria for ${cat.name} (${progress})`);
      const criteria = await generateCriteriaForCategoryFullContext(fullText, cat.name, options);
      criteriaMap[cat.name] = criteria;

      logCriteriaGeneration(jobId, cat.name, criteria.length, progress);
    }

    // Step 3: Weight Normalization
    logTemplateWorkflowStep(jobId, 'normalize-weights', 'Normalizing weights');
    const weighted = this.applyWeights(categories, criteriaMap);
    logWeightNormalization(jobId, weighted.length, totalCriteria);

    // Completion
    const duration = Date.now() - startTime;
    logTemplateWorkflowComplete(jobId, {
      categoryCount: weighted.length,
      totalCriteria,
      confidence: 0.9
    }, duration);

    return result;
  } catch (error) {
    logTemplateWorkflowError(jobId, currentStep, error);
    throw error;
  }
}, { jobId });
```

### Pattern 3: Compliance Audit Pipeline

**Location**: `src/lib/services/complianceService.ts`

```typescript
import {
  logAuditStart,
  logCategoryScoring,
  logCategoryScoringComplete,
  logCategoryScoringError,
  logNarrativeGeneration,
  logNarrativeComplete,
  logAuditComplete,
  logAuditProgress,
  logPartialResultSave,
  runWithContext,
  generateCorrelationId
} from '@/lib/logging';

// At audit start:
const auditId = generateCorrelationId().replace('cor_', 'audit_');
logAuditStart(auditId, templateId, transcriptId, categories.length);

return await runWithContext(async () => {
  try {
    const categoryScores = [];

    // Score each category
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      const progress = `${i + 1}/${categories.length}`;

      logCategoryScoring(auditId, category.name, progress, category.criteria.length);

      try {
        const startTime = Date.now();
        const score = await scoreSingleCategory(transcript, segments, category, context);
        const duration = Date.now() - startTime;

        logCategoryScoringComplete(auditId, category.name, score.overallCategoryScore, score.categoryStatus, duration);

        // Save partial result
        await savePartialResult(auditId, score);
        logPartialResultSave(auditId, category.name, score.overallCategoryScore);

        categoryScores.push(score);

        // Log progress
        if ((i + 1) % 3 === 0) {
          logAuditProgress(auditId, i + 1, categories.length, calculateCurrentAverage(categoryScores));
        }
      } catch (error) {
        logCategoryScoringError(auditId, category.name, error);
        // Continue with other categories (graceful degradation)
      }
    }

    // Generate narrative
    logNarrativeGeneration(auditId, categoryScores.length, 0);
    const startTime = Date.now();
    const narrative = await generateAuditNarrative(transcript, categoryScores, context);
    logNarrativeComplete(auditId, narrative.executiveSummary.length, overallScore, Date.now() - startTime);

    // Completion
    const duration = Date.now() - auditStartTime;
    logAuditComplete(auditId, overallScore, categoryScores.length, categories.length, duration);

    return result;
  } catch (error) {
    logAuditError(auditId, error, categoryScores.length);
    throw error;
  }
}, { correlationId: auditId });
```

### Pattern 4: Service Layer Logging

**Location**: `src/lib/services/transcription.ts`, `src/lib/services/policyExtraction.ts`, `src/lib/services/emergencyDetection.ts`

```typescript
import { logger, logWhisperRequest, logWhisperResponse } from '@/lib/logging';

// Service operation start
logger.info('Transcription started', {
  component: 'transcription',
  operation: 'process-audio',
  fileName: audio.name,
  fileSize: audio.size,
  incidentId
});

try {
  // Log Whisper API call
  logWhisperRequest(audio.name, audio.size, estimatedDuration, { incidentId });

  const startTime = Date.now();
  const result = await whisperAPI.transcribe(audio);
  const latency = Date.now() - startTime;

  logWhisperResponse(audio.name, result.text.length, audioDuration, latency, {
    incidentId,
    segmentCount: result.segments?.length || 0
  });

  logger.info('Transcription completed', {
    component: 'transcription',
    operation: 'process-audio',
    duration: latency,
    transcriptLength: result.text.length,
    incidentId
  });

  return result;
} catch (error) {
  logger.error('Transcription failed', {
    component: 'transcription',
    operation: 'process-audio',
    error,
    fileName: audio.name,
    incidentId
  });
  throw error;
}
```

### Pattern 5: API Route Logging

**Location**: All `src/app/api/**/*.ts` routes

```typescript
import { withRequestContext, logger, getRequestDuration, setJobId } from '@/lib/logging';

export const POST = withRequestContext(async (request: Request) => {
  const startTime = Date.now();

  try {
    logger.info('API request received', {
      component: 'api',
      operation: 'generate-template',
      method: 'POST'
    });

    // Parse request
    const body = await request.json();

    // Set jobId if available
    if (body.jobId) {
      setJobId(body.jobId);
    }

    // Process request (existing logic)
    const result = await templateGenerationService.generateFromPolicyDocument(
      body.policyDocumentId,
      body.options
    );

    const duration = getRequestDuration() || (Date.now() - startTime);
    logger.info('API request completed', {
      component: 'api',
      operation: 'generate-template',
      statusCode: 200,
      duration
    });

    return Response.json(result);
  } catch (error) {
    const duration = getRequestDuration() || (Date.now() - startTime);
    logger.error('API request failed', {
      component: 'api',
      operation: 'generate-template',
      error,
      duration
    });

    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
```

### Pattern 6: Next.js Middleware

**Location**: `src/middleware.ts` (create new file)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCorrelationId, logger } from '@/lib/logging';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = request.headers.get('x-correlation-id') || generateCorrelationId();

  logger.info('Request received', {
    component: 'middleware',
    operation: 'request-received',
    method: request.method,
    path: request.nextUrl.pathname,
    correlationId
  });

  // Create response with correlation ID header
  const response = NextResponse.next();
  response.headers.set('x-correlation-id', correlationId);
  response.headers.set('x-request-id', correlationId);

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## Remaining Integration Checklist

### High Priority (Critical Path)
- [ ] `src/lib/openai/template-generation.ts` - Use `wrapOpenAICall()` for GPT-4.1 calls
- [ ] `src/lib/openai/compliance-analysis-modular.ts` - Use `wrapOpenAICall()` for GPT-4.1 calls
- [ ] `src/lib/services/templateGeneration.ts` - Add workflow logging
- [ ] `src/lib/services/complianceService.ts` - Add audit pipeline logging

### Medium Priority (Important)
- [ ] `src/lib/services/transcription.ts` - Add Whisper logging
- [ ] `src/lib/services/policyExtraction.ts` - Add document processing logging
- [ ] `src/lib/services/emergencyDetection.ts` - Add detection logging

### Low Priority (Nice to Have)
- [ ] `src/app/api/policy/generate-template/route.ts` - Wrap with `withRequestContext()`
- [ ] `src/app/api/compliance/audit/route.ts` - Wrap with `withRequestContext()`
- [ ] `src/app/api/transcription/process/route.ts` - Wrap with `withRequestContext()`
- [ ] `src/app/api/policy/extract/route.ts` - Wrap with `withRequestContext()`
- [ ] `src/middleware.ts` - Create middleware for automatic correlation IDs

---

## Critical Reminders

### 🚨 DO NOT CHANGE:
1. **Model Names**: All `gpt-4.1` references must remain unchanged
2. **API Endpoints**: All `client.responses.create()` calls must remain unchanged
3. **Business Logic**: No changes to core functionality
4. **Backward Compatibility**: All existing code must continue working

### ✅ DO:
1. **Replace console.log**: Use `logger.info()`, `logger.debug()`, etc.
2. **Replace console.error**: Use `logger.error()` with error object
3. **Add Context**: Include component, operation, and relevant metadata
4. **Track JobIds**: Use `setJobId()` for multi-turn workflows
5. **Wrap Operations**: Use `runWithContext()` for async operations
6. **Log Performance**: Include duration/latency for major operations

---

## Testing Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:policy
npm run test -- --testPathPattern=openai

# Build to verify no type errors
npm run build

# Start dev server to verify logging output
npm run dev
```

---

## Expected Log Output Examples

### Template Generation
```
[INFO] Template generation workflow started | component=template-generation operation=workflow-start jobId=job_abc123 documentCount=3
[INFO] OpenAI API request initiated | component=openai operation=responses-create model=gpt-4.1 estimatedTokens=6250
[INFO] OpenAI API request completed | component=openai operation=responses-create model=gpt-4.1 inputTokens=6250 outputTokens=1200 totalTokens=7450 latency=3500 estimatedCost=0.0275
[INFO] Category discovery completed | component=template-generation operation=discover-categories jobId=job_abc123 categoryCount=8 confidence=0.92
[INFO] Criteria generation completed for category | component=template-generation operation=generate-criteria jobId=job_abc123 categoryName=Communications criteriaCount=7 progress=1/8
...
[INFO] Template generation workflow completed | component=template-generation operation=workflow-complete jobId=job_abc123 categoryCount=8 totalCriteria=52 confidence=0.89 duration=45000
```

### Compliance Audit
```
[INFO] Compliance audit started | component=compliance-audit operation=audit-start auditId=audit_xyz789 templateId=template_456 transcriptId=transcript_123 categoryCount=12
[INFO] Category scoring started | component=compliance-audit operation=score-category auditId=audit_xyz789 categoryName=Communications progress=1/12 criteriaCount=8
[INFO] OpenAI API request initiated | component=openai operation=responses-create model=gpt-4.1 estimatedTokens=4500
[INFO] OpenAI API request completed | component=openai operation=responses-create model=gpt-4.1 inputTokens=4500 outputTokens=900 totalTokens=5400 latency=2800 estimatedCost=0.0203
[INFO] Category scoring completed | component=compliance-audit operation=category-complete auditId=audit_xyz789 categoryName=Communications categoryScore=87 categoryStatus=PASS duration=4500
[DEBUG] Partial audit result saved | component=compliance-audit operation=save-partial auditId=audit_xyz789 categoryName=Communications categoryScore=87
...
[INFO] Compliance audit completed | component=compliance-audit operation=audit-complete auditId=audit_xyz789 overallScore=84 categoriesScored=12 totalCategories=12 completionRate=100 duration=54000
```

---

## Files Modified Summary

### ✅ Completed
1. `src/lib/logging/openai-logger.ts` - **NEW** - OpenAI logging utilities
2. `src/lib/logging/template-logger.ts` - **NEW** - Template workflow logging
3. `src/lib/logging/compliance-logger.ts` - **NEW** - Compliance audit logging
4. `src/lib/logging/index.ts` - **MODIFIED** - Export specialized loggers
5. `src/lib/openai/utils.ts` - **MODIFIED** - Structured logging in retry and logAPICall
6. `src/lib/services/utils/openai.ts` - **MODIFIED** - Enhanced trackTokenUsage, rate limit logging

### 🔄 Pending (Use Patterns Above)
7. `src/lib/openai/template-generation.ts`
8. `src/lib/openai/compliance-analysis-modular.ts`
9. `src/lib/services/templateGeneration.ts`
10. `src/lib/services/complianceService.ts`
11. `src/lib/services/transcription.ts`
12. `src/lib/services/policyExtraction.ts`
13. `src/lib/services/emergencyDetection.ts`
14. `src/middleware.ts` (new file)
15. `src/app/api/policy/generate-template/route.ts`
16. `src/app/api/compliance/audit/route.ts`
17. `src/app/api/transcription/process/route.ts`
18. `src/app/api/policy/extract/route.ts`

---

## Next Steps

1. **Apply patterns to high-priority files** (template-generation.ts, compliance-analysis-modular.ts)
2. **Test OpenAI integrations** to ensure GPT-4.1 and Responses API unchanged
3. **Add service layer logging** following the patterns above
4. **Create middleware** for automatic correlation ID injection
5. **Wrap API routes** with `withRequestContext()`
6. **Run comprehensive tests** to verify no breaking changes
7. **Monitor logs in development** to ensure proper output
8. **Deploy to staging** for integration testing
9. **Production deployment** with monitoring

---

**Status**: Foundation complete, patterns documented, ready for team implementation
