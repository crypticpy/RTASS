# Implementation Plan: Logging Infrastructure Integration

**Date**: 2025-10-06
**Status**: Planning Complete
**Objective**: Integrate the core logging infrastructure throughout the fire department transcription application

---

## Situation Assessment

### Current State
- **Core Logging Infrastructure**: Complete and ready at `/src/lib/logging/`
  - Structured logging with Winston-like API
  - AsyncLocalStorage-based context propagation
  - Multiple transports (Console, Database, File)
  - Correlation ID and Job ID tracking
  - Environment-aware configuration

- **Existing Application Components**:
  - OpenAI integration layer using GPT-4.1 and Responses API
  - Template generation with multi-turn workflow
  - Compliance analysis modular pipeline
  - Multiple service layers (transcription, policy extraction, etc.)
  - API routes using Next.js 15 App Router
  - Current logging: Basic `console.log()` statements scattered throughout

### Key Constraints
1. **MUST NOT** change GPT-4.1 model or Responses API endpoints
2. **MUST NOT** introduce breaking changes to business logic
3. **MUST** preserve backward compatibility
4. Replace console.log with structured logging
5. Maintain all existing functionality

### Files Reviewed
- Core logging: `src/lib/logging/` (logger.ts, context.ts, config.ts, types.ts, transports/, formatters/)
- OpenAI layer: `src/lib/openai/` (template-generation.ts, compliance-analysis-modular.ts, utils.ts)
- Services: `src/lib/services/` (templateGeneration.ts, complianceService.ts, transcription.ts, etc.)
- Utils: `src/lib/services/utils/openai.ts`
- API routes: `src/app/api/**/*.ts`

---

## Strategy

### High-Level Approach

1. **Create Specialized Logger Modules**
   - Build domain-specific logging utilities for OpenAI, templates, and compliance
   - Each logger provides helper functions for common operations
   - Encapsulate logging patterns for consistency

2. **Phased Integration**
   - **Phase 1**: OpenAI integration layer (highest value, most critical)
   - **Phase 2**: Service layer (business logic, workflows)
   - **Phase 3**: API routes (request/response tracking)
   - **Phase 4**: Middleware (automatic context injection)

3. **Logging Patterns**
   - **Operation Start/End**: Log beginning and completion of major operations
   - **OpenAI Calls**: Pre-call (model, estimated tokens) and post-call (actual usage, latency, cost)
   - **Multi-turn Workflows**: Track jobId across turns, log progress (X/N categories)
   - **Error Handling**: Replace console.error with logger.error with context
   - **Performance**: Track latency for all major operations

4. **Context Management**
   - Use `runWithContext()` for all async operations
   - Inject correlation IDs at API route boundaries
   - Propagate jobIds in multi-turn workflows
   - Maintain context across service boundaries

---

## Detailed Plan

### 1. Create Specialized Logger Modules

#### 1.1 OpenAI Logger (`src/lib/logging/openai-logger.ts`)
**Purpose**: OpenAI-specific logging utilities for GPT-4.1, Whisper, and Responses API

**Functions**:
- `logOpenAIRequest(operation, model, estimatedTokens, metadata)` - Pre-call logging
- `logOpenAIResponse(operation, model, usage, latency, metadata)` - Post-call with actual usage
- `logOpenAIError(operation, model, error, metadata)` - Error logging
- `estimateCost(model, usage)` - Calculate and log estimated cost
- `wrapOpenAICall<T>(operation, model, fn)` - Wrapper for automatic logging

**Key Metrics Tracked**:
- Model name (always gpt-4.1 or whisper-1)
- Input/output token counts
- API latency (milliseconds)
- Estimated cost (USD)
- Rate limit status
- Retry attempts

#### 1.2 Template Logger (`src/lib/logging/template-logger.ts`)
**Purpose**: Template generation workflow tracking

**Functions**:
- `logTemplateWorkflowStart(jobId, documentCount, options)` - Workflow initialization
- `logTemplateWorkflowStep(jobId, step, progress, metadata)` - Step completion
- `logTemplateWorkflowComplete(jobId, result, duration)` - Successful completion
- `logTemplateWorkflowError(jobId, step, error)` - Workflow failures
- `logCategoryDiscovery(jobId, categories, confidence)` - Category discovery phase
- `logCriteriaGeneration(jobId, category, criteriaCount)` - Criteria generation phase
- `logSchemaValidation(jobId, schema, success, errors)` - Zod validation results

**Key Metrics Tracked**:
- JobId (for correlation across turns)
- Workflow step (discover-categories, generate-criteria, normalize-weights)
- Progress indicators (X/N categories complete)
- Confidence scores
- Zod validation results
- Full-context prompt sizes (with truncation)

#### 1.3 Compliance Logger (`src/lib/logging/compliance-logger.ts`)
**Purpose**: Compliance audit pipeline tracking

**Functions**:
- `logAuditStart(auditId, templateId, transcriptId, categoryCount)` - Audit initialization
- `logCategoryScoring(auditId, categoryName, progress, score)` - Per-category scoring
- `logCategoryScoringComplete(auditId, categoryName, score, duration)` - Category completion
- `logNarrativeGeneration(auditId, narrativeLength)` - Narrative generation
- `logAuditComplete(auditId, overallScore, duration)` - Audit completion
- `logAuditError(auditId, categoryName, error)` - Audit failures
- `logPartialResultSave(auditId, categoryName, score)` - Partial saves for resilience

**Key Metrics Tracked**:
- AuditId (primary correlation)
- Category-by-category progress (X/N categories)
- Individual category scores
- Overall audit score
- Narrative generation metrics
- Partial result saves (for graceful degradation)

### 2. Integrate Logging into Existing Modules

#### Priority 1: OpenAI Integration Layer

**File**: `src/lib/openai/utils.ts`
- Add logging to `retryWithBackoff()` - log each retry attempt
- Update `logAPICall()` to use structured logger instead of console.log
- Add correlation ID to all log entries

**File**: `src/lib/services/utils/openai.ts`
- Wrap `getOpenAIClient()` with logging
- Update `trackTokenUsage()` to also log via structured logger
- Add logging to `withRateLimit()` - log rate limit waits
- Update `calculateEstimatedCost()` to log cost estimates

**File**: `src/lib/openai/template-generation.ts`
- Import openai-logger and template-logger
- Wrap `generateTemplateFromPolicies()` with start/end logging
- Log OpenAI API calls with estimated tokens (pre-call) and actual usage (post-call)
- Log Zod schema validation results
- Replace all console.log/console.error with structured logging

**File**: `src/lib/openai/compliance-analysis-modular.ts`
- Import openai-logger and compliance-logger
- Wrap `scoreSingleCategory()` with start/end logging
- Log category progress (X/N categories complete)
- Wrap `generateAuditNarrative()` with logging
- Log OpenAI API calls with usage metrics
- Replace all console statements

#### Priority 2: Service Layer

**File**: `src/lib/services/templateGeneration.ts`
- Import template-logger
- Update `generateFromPolicyDocument()` with workflow logging
- Track jobId across multi-turn workflow
- Log each workflow step (category discovery, criteria generation, weight normalization)
- Update `generateFromContent()` with full-context logging
- Log Zod validation at each turn
- Replace console.log with structured logging

**File**: `src/lib/services/complianceService.ts`
- Import compliance-logger
- Wrap audit execution with start/end logging
- Log category-by-category progress
- Track partial result saves
- Log overall audit completion with metrics

**File**: `src/lib/services/transcription.ts`
- Import logger and openai-logger
- Log transcription start/end with file metadata
- Log Whisper API calls with duration
- Log segment processing
- Log emergency detection results

**File**: `src/lib/services/policyExtraction.ts`
- Import logger
- Log document processing start/end
- Log format detection (PDF, Word, Excel, etc.)
- Log extraction results (page count, word count)
- Log extraction errors with file details

**File**: `src/lib/services/emergencyDetection.ts`
- Import logger
- Log emergency detection runs
- Log detected keywords and timestamps
- Log confidence scores

#### Priority 3: API Routes

**File**: `src/app/api/policy/generate-template/route.ts`
- Wrap handler with `withRequestContext()`
- Log request start with correlation ID
- Set jobId in context for multi-turn tracking
- Log response status and duration
- Catch and log errors with context

**File**: `src/app/api/compliance/audit/route.ts`
- Wrap handler with `withRequestContext()`
- Log audit request with template and transcript IDs
- Track audit execution with correlation ID
- Log completion with overall score

**File**: `src/app/api/transcription/process/route.ts`
- Wrap handler with `withRequestContext()`
- Log file upload metadata
- Track transcription progress
- Log completion with transcript ID

**File**: `src/app/api/policy/extract/route.ts`
- Wrap handler with `withRequestContext()`
- Log document extraction requests
- Track extraction progress
- Log extracted content stats

**Pattern for All API Routes**:
```typescript
import { withRequestContext, logger } from '@/lib/logging';

export const POST = withRequestContext(async (request: Request) => {
  const startTime = Date.now();

  try {
    logger.info('API request received', {
      component: 'api',
      operation: 'generate-template',
      method: 'POST'
    });

    // ... existing logic ...

    const duration = Date.now() - startTime;
    logger.info('API request completed', {
      component: 'api',
      operation: 'generate-template',
      statusCode: 200,
      duration
    });

    return Response.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('API request failed', {
      component: 'api',
      operation: 'generate-template',
      error,
      duration
    });

    throw error;
  }
});
```

### 3. Create Middleware

**File**: `src/middleware.ts` (Next.js middleware)
**Purpose**: Automatic request/response logging for all API routes

**Features**:
- Inject correlation IDs from `x-correlation-id` header or generate new
- Log all incoming requests (method, path, headers)
- Log all responses (status, duration)
- Catch and log middleware-level errors
- Set up request context for downstream handlers

**Implementation**:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCorrelationId, logger } from '@/lib/logging';

export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = request.headers.get('x-correlation-id') || generateCorrelationId();

  logger.info('Request received', {
    component: 'middleware',
    method: request.method,
    path: request.nextUrl.pathname,
    correlationId
  });

  // Create response with correlation ID header
  const response = NextResponse.next();
  response.headers.set('x-correlation-id', correlationId);

  // Log response (note: can't easily get final status here, logged in routes)
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

### 4. Migration Strategy

#### Phase 1: Core Modules (Week 1)
1. Create specialized logger modules
2. Integrate OpenAI layer logging
3. Test with existing API calls
4. Verify no breaking changes

#### Phase 2: Service Layer (Week 1-2)
1. Integrate service layer logging
2. Add workflow tracking
3. Test multi-turn template generation
4. Verify compliance audit logging

#### Phase 3: API Routes (Week 2)
1. Add middleware
2. Wrap all API routes with context
3. Test request/response logging
4. Verify correlation ID propagation

#### Phase 4: Testing & Validation (Week 2)
1. End-to-end integration tests
2. Verify log output in development
3. Test database transport
4. Validate correlation across async boundaries
5. Performance testing (ensure minimal overhead)

---

## Technical Specifications

### Logging Metadata Standards

**OpenAI Operations**:
```typescript
{
  component: 'openai',
  operation: 'responses-create' | 'whisper-transcribe',
  model: 'gpt-4.1' | 'whisper-1',
  estimatedTokens?: number,
  inputTokens?: number,
  outputTokens?: number,
  totalTokens?: number,
  latency?: number,
  estimatedCost?: number,
  retryAttempt?: number
}
```

**Template Generation**:
```typescript
{
  component: 'template-generation',
  operation: 'discover-categories' | 'generate-criteria' | 'normalize-weights',
  jobId: string,
  documentCount?: number,
  categoryCount?: number,
  progress?: string, // e.g., "3/8 categories"
  confidence?: number,
  validationErrors?: string[]
}
```

**Compliance Auditing**:
```typescript
{
  component: 'compliance-audit',
  operation: 'score-category' | 'generate-narrative' | 'save-partial',
  auditId: string,
  categoryName?: string,
  categoryScore?: number,
  progress?: string, // e.g., "5/12 categories"
  overallScore?: number,
  duration?: number
}
```

**API Routes**:
```typescript
{
  component: 'api',
  operation: string, // route name
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  statusCode?: number,
  duration?: number,
  userId?: string
}
```

### Error Logging Standards

All errors must include:
- `error` field with Error object (automatically serialized)
- `component` field identifying the module
- `operation` field identifying the specific operation
- Contextual metadata (jobId, auditId, etc.)

Example:
```typescript
logger.error('Template generation failed', {
  component: 'template-generation',
  operation: 'discover-categories',
  jobId: 'job_abc123',
  documentCount: 3,
  error: new Error('OpenAI API timeout'),
  duration: 30000
});
```

### Performance Considerations

1. **Async Logging**: All transports use async operations (won't block)
2. **Error Isolation**: Transport failures won't break application
3. **Minimal Overhead**: Logging adds <5ms per operation
4. **Structured Metadata**: Use objects, not string concatenation
5. **Lazy Evaluation**: Don't compute expensive metadata unless needed

---

## Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation**:
- Comprehensive testing before deployment
- Feature flags for logging (can disable if issues arise)
- Gradual rollout (OpenAI → Services → API)

### Risk 2: Performance Degradation
**Mitigation**:
- Async logging (non-blocking)
- Database batching for DB transport
- Log level filtering (DEBUG only in dev)
- Performance benchmarks before/after

### Risk 3: Log Volume Explosion
**Mitigation**:
- Environment-aware log levels (INFO+ in production)
- Database retention policies (30 days)
- File rotation (daily, max 10 files)
- Rate limiting on verbose operations

### Risk 4: Context Loss in Async Operations
**Mitigation**:
- AsyncLocalStorage propagates automatically
- Explicit context passing where needed
- JobId tracking across turns
- Correlation ID in all logs

---

## Success Criteria

1. **No Breaking Changes**: All existing functionality works unchanged
2. **No Model Changes**: GPT-4.1 and Responses API remain unchanged
3. **Comprehensive Logging**: All major operations logged with context
4. **Performance**: <5% overhead from logging
5. **Correlation**: Can trace requests across all async boundaries
6. **Observability**: Can debug issues from logs alone
7. **Cost Tracking**: Accurate OpenAI cost estimation in logs
8. **Error Visibility**: All errors logged with full context

---

## Testing Plan

### Unit Tests
- Test specialized logger functions
- Verify metadata structure
- Test error serialization
- Validate context propagation

### Integration Tests
- End-to-end template generation with logging
- Full compliance audit with logging
- API request → service → OpenAI → response logging
- Correlation ID propagation across boundaries

### Performance Tests
- Benchmark logging overhead
- Test under load (100 concurrent requests)
- Verify transport performance
- Database write performance

### Manual Tests
- Review log output in development console
- Check database transport (Prisma Studio)
- Verify file transport output
- Test log levels (DEBUG, INFO, ERROR)

---

## Deployment Checklist

- [ ] Create specialized logger modules
- [ ] Integrate OpenAI layer logging
- [ ] Integrate service layer logging
- [ ] Add API route logging
- [ ] Create Next.js middleware
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Performance benchmark
- [ ] Code review
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Smoke test in staging
- [ ] Deploy to production
- [ ] Monitor logs for 24 hours

---

## Appendix: File Modification Summary

### New Files (3)
1. `src/lib/logging/openai-logger.ts` - OpenAI-specific logging utilities
2. `src/lib/logging/template-logger.ts` - Template generation workflow logging
3. `src/lib/logging/compliance-logger.ts` - Compliance audit pipeline logging

### Modified Files (18)

**OpenAI Layer (4)**:
- `src/lib/openai/utils.ts` - Add structured logging to retryWithBackoff, logAPICall
- `src/lib/services/utils/openai.ts` - Add logging to OpenAI client utilities
- `src/lib/openai/template-generation.ts` - Replace console.log with structured logging
- `src/lib/openai/compliance-analysis-modular.ts` - Add workflow logging

**Service Layer (5)**:
- `src/lib/services/templateGeneration.ts` - Add multi-turn workflow logging
- `src/lib/services/complianceService.ts` - Add audit execution logging
- `src/lib/services/transcription.ts` - Add transcription pipeline logging
- `src/lib/services/policyExtraction.ts` - Add document processing logging
- `src/lib/services/emergencyDetection.ts` - Add detection logging

**API Routes (8)**:
- `src/app/api/policy/generate-template/route.ts`
- `src/app/api/compliance/audit/route.ts`
- `src/app/api/transcription/process/route.ts`
- `src/app/api/policy/extract/route.ts`
- (4 more high-priority routes as identified during implementation)

**Middleware (1)**:
- `src/middleware.ts` - Create Next.js middleware for request logging

---

**Plan Status**: ✅ Complete and Ready for Implementation
