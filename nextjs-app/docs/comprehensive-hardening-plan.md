# Comprehensive Compliance Audit System Hardening Plan

## Overview
Fix all 50 identified issues across the compliance audit workflow to ensure production reliability, data integrity, and optimal performance.

**Total Issues:** 50
- **Critical:** 15 (will cause workflow failures)
- **Major:** 15 (could cause failures in edge cases)
- **Minor:** 11 (degraded UX but functional)
- **Missing Functionality:** 9 gaps

## Implementation Strategy
Execute fixes in 5 phases organized by dependency and priority:
- **Phase 1:** Critical Validation & Schema Fixes (Issues #1-15)
- **Phase 2:** Transaction Boundaries & Data Integrity (Issues #16-30)
- **Phase 3:** Error Recovery & Resilience (Issues #31-40)
- **Phase 4:** API Reliability & Performance (Issues #41-50)
- **Phase 5:** Testing & Verification

---

## Phase 1: Critical Validation & Schema Fixes (Day 1-2)

### 1.1 Schema Corrections
**Files:** `prisma/schema.prisma`
**Issues:** #3, #27, #30

**Changes:**
- Fix `aiModel` default from `"gpt-4o"` to `"gpt-4.1"` (TemplateGeneration model)
- Add unique constraint `@@unique([incidentId, templateId])` to Audit model
- Add cascading delete policies:
  - `Audit.incident`: `onDelete: Cascade` (already exists)
  - `Audit.transcript`: `onDelete: Cascade` (already exists)
  - `Audit.template`: `onDelete: Restrict` (prevent deleting templates with audits)
  - `TemplateGeneration.template`: `onDelete: Cascade` (already exists)

**Migration:**
```bash
npx prisma migrate dev --name fix-critical-schema-issues
npx prisma generate
```

### 1.2 Empty Content Validation
**Files:**
- `src/lib/services/templateGeneration.ts` (Issue #1)
- `src/lib/services/transcription.ts` (Issue #4)
- `src/lib/services/complianceService.ts` (Issue #8, #10)
- `src/lib/utils/validators.ts` (new utility)

**Changes:**
1. Create `src/lib/utils/validators.ts`:
   ```typescript
   export function validateContentNotEmpty(
     content: string | null | undefined,
     fieldName: string
   ): string {
     if (!content || content.trim().length === 0) {
       throw Errors.invalidInput(fieldName, 'Content cannot be empty');
     }
     return content.trim();
   }

   export function validateMinLength(
     content: string,
     minLength: number,
     fieldName: string
   ): string {
     if (content.length < minLength) {
       throw Errors.invalidInput(
         fieldName,
         `Must be at least ${minLength} characters (got ${content.length})`
       );
     }
     return content;
   }
   ```

2. Add validation in `templateGeneration.ts:generateFromContent()`:
   - Line 236: Validate `content.text` before processing
   - Line 256: Validate before GPT-4.1 call

3. Add validation in `transcription.ts:transcribeAudio()`:
   - Line 164: Validate `whisperResponse.text` after API call
   - Reject if text length < 10 characters (likely silence/error)

4. Add validation in `complianceService.ts:auditTranscript()`:
   - Line 154: Validate template AND transcript exist before processing
   - Line 964: Validate transcript exists before modular audit loop

### 1.3 Foreign Key & Existence Validation
**Files:**
- `src/lib/services/transcription.ts` (Issue #5, #6)
- `src/lib/services/complianceService.ts` (Issue #8)
- `src/app/api/transcription/process/route.ts` (Issue #12, #13)

**Changes:**
1. In `transcription.ts:transcribeAudio()`:
   - Line 113: After `getFilePath()`, verify file exists using `fs.existsSync()`
   - Wrap transcript save in try-catch for P2003 (foreign key) errors:
     ```typescript
     try {
       const transcript = await this.saveTranscript(...);
     } catch (error) {
       if (error.code === 'P2003') {
         throw Errors.notFound('Incident', incidentId);
       }
       throw error;
     }
     ```

2. In `complianceService.ts:auditTranscript()`:
   - Line 154: Validate template is active before GPT-4.1 call:
     ```typescript
     const template = await templateService.getTemplateById(templateId);
     if (!template.isActive) {
       throw Errors.invalidInput('templateId', 'Template is not active');
     }
     ```

3. In `transcription/process/route.ts:triggerComplianceAudits()`:
   - Line 224: Validate template exists before fetch:
     ```typescript
     for (const templateId of templateIds) {
       const template = await prisma.template.findUnique({
         where: { id: templateId, isActive: true },
         select: { id: true }
       });
       if (!template) {
         logger.warn('Template not found, skipping audit', { templateId });
         continue;
       }
       // ... proceed with fetch
     }
     ```

### 1.4 Math & Logic Fixes
**Files:**
- `src/lib/services/complianceService.ts` (Issue #9)

**Changes:**
- Line 620-627 in `calculateOverallScore()`:
  ```typescript
  const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);

  if (totalWeight === 0) {
    logger.warn('All category weights are zero, defaulting to 0.0 score', {
      component: 'compliance-service',
      operation: 'calculate-overall-score',
      categoryCount: applicable.length
    });
    return 0.0;
  }

  const weightedSum = applicable.reduce((sum, c) => {
    const normalizedWeight = c.weight / totalWeight;
    return sum + (c.score || 0) * normalizedWeight;
  }, 0);
  ```

### 1.5 Timeout & Race Condition Fixes
**Files:**
- `src/app/api/transcription/process/route.ts` (Issue #11)
- `src/app/api/incidents/[id]/status/route.ts` (Issue #14, #15)

**Changes:**
1. Add timeout to `triggerComplianceAudits()`:
   - Line 160-168: Wrap in timeout:
     ```typescript
     const AUDIT_TRIGGER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

     Promise.race([
       triggerComplianceAudits(result.id, incident.selectedTemplateIds),
       new Promise((_, reject) =>
         setTimeout(() => reject(new Error('Audit trigger timeout')), AUDIT_TRIGGER_TIMEOUT)
       )
     ]).catch((error) => {
       logger.error('Failed to trigger compliance audits', { ... });
     });
     ```

2. In `status/route.ts:getTranscriptionStatus()`:
   - Line 190: Add robust null checks:
     ```typescript
     if (!incident.transcripts || !Array.isArray(incident.transcripts) || incident.transcripts.length === 0) {
       return { status: 'pending' };
     }

     const transcript = incident.transcripts.find(t => t.text && t.segments);
     if (!transcript) {
       return { status: 'processing', transcriptId: incident.transcripts[0]?.id };
     }
     ```

3. In `status/route.ts:getAuditsStatus()`:
   - Line 224: Check transcription complete before audit status:
     ```typescript
     const hasCompleteTranscript = incident.transcripts?.some(t => t.text && t.segments);
     if (!hasCompleteTranscript) {
       // Don't check audit status if transcription not complete
       return selectedTemplateIds.map(templateId => ({
         templateId,
         templateName: templateMap.get(templateId) || 'Unknown',
         status: 'pending' as const
       }));
     }
     ```

---

## Phase 2: Transaction Boundaries & Data Integrity (Day 3-4)

### 2.1 Implement Database Transactions
**Files:**
- `src/app/api/policy/generate-template/route.ts` (Issue #28)
- `src/app/api/transcription/process/route.ts` (Issue #29)
- `src/lib/services/complianceService.ts` (Issue #22)
- `src/lib/utils/database.ts` (new utility)

**Changes:**
1. Create `src/lib/utils/database.ts`:
   ```typescript
   export async function withTransaction<T>(
     operation: (tx: PrismaTransaction) => Promise<T>
   ): Promise<T> {
     return await prisma.$transaction(operation, {
       maxWait: 5000, // 5s
       timeout: 30000, // 30s
       isolationLevel: 'ReadCommitted'
     });
   }
   ```

2. Wrap policy generation in transaction:
   ```typescript
   const template = await withTransaction(async (tx) => {
     const policyDocuments = await tx.policyDocument.findMany({...});
     const generatedTemplate = await templateService.generateFromContent(...);
     return await tx.template.create({...});
   });
   ```

3. Wrap transcription + incident update in transaction:
   ```typescript
   const result = await withTransaction(async (tx) => {
     const transcript = await tx.transcript.create({...});
     await tx.incident.update({
       where: { id: incidentId },
       data: { status: 'ACTIVE' }
     });
     return transcript;
   });
   ```

4. Add partial result saving to legacy audit:
   - Save partial audit after each category completes
   - Update overall score incrementally

### 2.2 Content Size Validation
**Files:**
- `src/app/api/policy/generate-template/route.ts` (Issue #16)
- `src/lib/services/policyExtraction.ts` (Issue #18)
- `src/lib/openai/utils.ts`

**Changes:**
1. Add token counting before GPT-4.1 calls:
   ```typescript
   import { countTokens } from '@/lib/openai/utils';

   const tokenCount = await countTokens(combinedText, 'gpt-4.1');
   if (tokenCount > 120000) { // Leave 8k buffer from 128k limit
     throw Errors.invalidInput('policyDocuments', `Combined content exceeds GPT-4.1 context limit (${tokenCount} tokens)`);
   }
   ```

2. Implement streaming for large files in `policyExtraction.ts`:
   - Use `fs.createReadStream()` for files >10MB
   - Process in chunks to avoid OOM

### 2.3 Request Deduplication
**Files:**
- `src/app/api/compliance/audit/route.ts` (Issue #25)
- `src/lib/utils/requestCache.ts` (new)

**Changes:**
1. Create Redis-based deduplication cache (or in-memory Map if Redis not available):
   ```typescript
   const auditKey = `audit:${transcriptId}:${templateId}`;
   const existing = await requestCache.get(auditKey);
   if (existing) {
     return NextResponse.json({ success: true, data: { id: existing.auditId } });
   }

   await requestCache.set(auditKey, { auditId: 'pending' }, 10); // 10s TTL
   ```

2. Clear cache after audit completes/fails

### 2.4 Graceful Degradation for Partial Failures
**Files:**
- `src/lib/services/complianceService.ts` (Issue #7, #21, #23)

**Changes:**
1. JSON parse fallback:
   ```typescript
   let parsed: unknown;
   try {
     parsed = JSON.parse(rawContent || '{}');
   } catch (error) {
     logger.warn('GPT-4.1 returned invalid JSON, using partial results', { rawContent });
     // Return partial results if available from previous categories
     if (categoryResults.length > 0) {
       return { partialResults: categoryResults, parseError: true };
     }
     throw Errors.processingFailed(...);
   }
   ```

2. Continue on category failure:
   - Log warning instead of error
   - Include failure reason in audit metadata

3. Gracefully skip missing criteria:
   ```typescript
   if (!templateCriterion) {
     logger.warn('Criterion not found in template, using default score', {
       criterionId: score.criterionId
     });
     return { ...score, score: 0, status: 'NOT_FOUND' };
   }
   ```

---

## Phase 3: Error Recovery & Resilience (Day 5)

### 3.1 Enhanced Error Handling
**Files:**
- `src/lib/services/utils/errorHandlers.ts` (Issue #31, #32, #33)

**Changes:**
1. Fix stack trace capture:
   ```typescript
   if (typeof Error.captureStackTrace === 'function') {
     Error.captureStackTrace(this, this.constructor);
   } else {
     this.stack = new Error().stack;
   }
   ```

2. Enhance Zod error messages:
   ```typescript
   const issues = error.issues.map(issue => ({
     path: issue.path.join('.'),
     message: issue.message,
     received: JSON.stringify(issue.received), // Add value
     expected: issue.expected
   }));
   ```

3. Parse OpenAI error details:
   ```typescript
   if (error.code === 'insufficient_quota') {
     return Errors.quotaExceeded('OpenAI API quota exceeded');
   }
   if (error.code === 'context_length_exceeded') {
     return Errors.invalidInput('content', 'Content exceeds model context limit');
   }
   ```

### 3.2 Correlation IDs & Logging
**Files:**
- `src/lib/services/complianceService.ts` (Issue #34, #35)
- `src/app/api/incidents/[id]/status/route.ts` (Issue #36)
- `src/lib/utils/correlation.ts` (new)

**Changes:**
1. Create correlation ID generator:
   ```typescript
   export function generateCorrelationId(): string {
     return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
   }
   ```

2. Add to all audit operations:
   ```typescript
   const correlationId = generateCorrelationId();
   logger.info('Starting audit', { correlationId, ... });
   ```

3. Log status polling frequency:
   ```typescript
   const pollKey = `poll:${incidentId}`;
   const pollCount = await incrementPollCount(pollKey);
   if (pollCount > 600) { // 10 req/min * 60min = 600
     logger.warn('Excessive status polling detected', { incidentId, pollCount });
   }
   ```

### 3.3 Streaming Cleanup
**Files:**
- `src/app/api/compliance/audit/route.ts` (Issue #26)

**Changes:**
```typescript
const abortController = new AbortController();

const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    try {
      for await (const progress of executeModularAudit(..., abortController.signal)) {
        if (abortController.signal.aborted) {
          logger.info('Audit cancelled by client');
          break;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
      }
    } finally {
      controller.close();
    }
  },
  cancel(reason) {
    logger.info('Stream cancelled', { reason });
    abortController.abort();
  }
});
```

### 3.4 Emergency Detection Validation
**Files:**
- `src/lib/services/transcription.ts` (Issue #19)

**Changes:**
```typescript
if (detectMayday && segments && segments.length > 0) {
  const maydayDetections = emergencyDetectionService.detectMayday(...);
} else if (detectMayday) {
  logger.warn('Skipping emergency detection: no segments available');
}
```

---

## Phase 4: API Reliability & Performance (Day 6-7)

### 4.1 Circuit Breaker Pattern
**Files:**
- `src/lib/openai/client.ts` (Issue #24)
- `src/lib/utils/circuitBreaker.ts` (new)

**Changes:**
1. Implement circuit breaker:
   ```typescript
   class CircuitBreaker {
     private state: 'closed' | 'open' | 'half-open' = 'closed';
     private failures = 0;
     private readonly threshold = 5;
     private readonly timeout = 30000; // 30s

     async execute<T>(fn: () => Promise<T>): Promise<T> {
       if (this.state === 'open') {
         if (Date.now() - this.lastFailure > this.timeout) {
           this.state = 'half-open';
         } else {
           throw new Error('Circuit breaker open');
         }
       }

       try {
         const result = await fn();
         if (this.state === 'half-open') {
           this.reset();
         }
         return result;
       } catch (error) {
         this.failures++;
         if (this.failures >= this.threshold) {
           this.state = 'open';
         }
         throw error;
       }
     }
   }
   ```

### 4.2 Exponential Backoff & Retry
**Files:**
- `src/lib/openai/client.ts`
- `src/lib/utils/retry.ts` (new)

**Changes:**
```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  options = { maxRetries: 5, baseDelay: 1000 }
): Promise<T> {
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === options.maxRetries || !isRetryable(error)) {
        throw error;
      }
      const delay = options.baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
}

function isRetryable(error: any): boolean {
  return error.status === 429 || error.status >= 500 || error.code === 'ETIMEDOUT';
}
```

### 4.3 Request Queueing & Rate Limiting
**Files:**
- `src/lib/openai/client.ts`
- `src/lib/utils/requestQueue.ts` (new)

**Changes:**
```typescript
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private readonly maxConcurrent = 5;
  private readonly rateLimit = 50; // per minute

  async enqueue<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, priority, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      this.running++;
      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      } finally {
        this.running--;
        this.processQueue();
      }
    }
  }
}
```

### 4.4 Performance Optimizations
**Files:**
- `src/lib/services/templateService.ts` (Issue #37)
- `src/app/api/incidents/[id]/status/route.ts` (Issue #38)
- `src/lib/services/complianceService.ts` (Issue #39)

**Changes:**
1. Remove duplicate validation:
   - Line 222-262: Remove second validation call

2. Use include in incident fetch:
   ```typescript
   const incident = await prisma.incident.findUnique({
     where: { id },
     include: {
       transcripts: true,
       audits: true,
       templates: true // Add this
     }
   });
   ```

3. Track actual token usage:
   ```typescript
   const response = await client.responses.create({...});
   const actualTokens = response.usage?.total_tokens || 0;
   logger.info('GPT-4.1 call completed', { actualTokens, estimatedTokens });
   ```

### 4.5 Input Validation & Sanitization
**Files:**
- `src/lib/services/templateService.ts` (Issue #41)
- `src/lib/services/policyExtraction.ts` (Issue #40)
- All API routes

**Changes:**
1. Add length validation:
   ```typescript
   const CreateTemplateSchema = z.object({
     name: z.string().min(1).max(255),
     ...
   });
   ```

2. Sanitize content:
   ```typescript
   function sanitizeContent(content: string): string {
     return content
       .replace(/<script[^>]*>.*?<\/script>/gi, '')
       .replace(/[^\w\s.,!?;:()\-'"]/g, '')
       .trim();
   }
   ```

---

## Phase 5: Missing Functionality & Edge Cases (Day 8-9)

### 5.1 Timeout Implementations
**Files:**
- `src/lib/openai/template-generation.ts`
- `src/lib/openai/compliance-analysis-modular.ts`
- `src/lib/openai/whisper.ts`

**Changes:**
Add AbortController timeout to all OpenAI calls:
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 180000); // 3min

try {
  const response = await client.responses.create({...}, {
    signal: controller.signal
  });
} finally {
  clearTimeout(timeout);
}
```

### 5.2 File Size & Format Validation
**Files:**
- `src/lib/services/transcription.ts`
- `src/app/api/transcription/upload/route.ts`

**Changes:**
1. Reject large files:
   ```typescript
   if (file.size > 25 * 1024 * 1024) {
     throw Errors.invalidInput('file', 'Audio file must be less than 25MB');
   }
   ```

2. Validate MIME type:
   ```typescript
   import { fileTypeFromBuffer } from 'file-type';

   const fileType = await fileTypeFromBuffer(buffer);
   if (!['audio/mpeg', 'audio/wav', ...].includes(fileType?.mime)) {
     throw Errors.invalidInput('file', `Unsupported audio format: ${fileType?.mime}`);
   }
   ```

3. Check disk space:
   ```typescript
   import { statfs } from 'fs/promises';

   const stats = await statfs('/path/to/storage');
   const availableSpace = stats.bsize * stats.bavail;
   if (availableSpace < file.size * 2) { // 2x buffer
     throw Errors.storageError('Insufficient disk space');
   }
   ```

### 5.3 Business Logic Validation
**Files:**
- `src/lib/services/complianceService.ts`
- `src/app/api/compliance/audit/route.ts`

**Changes:**
1. Check for existing audits:
   ```typescript
   const existing = await prisma.audit.findFirst({
     where: { incidentId, templateId }
   });
   if (existing) {
     logger.info('Audit already exists, returning existing', { auditId: existing.id });
     return existing;
   }
   ```

2. Validate incident state:
   ```typescript
   const incident = await prisma.incident.findUnique({ where: { id: incidentId } });
   if (incident.status === 'RESOLVED') {
     logger.warn('Skipping audit for resolved incident');
     throw Errors.invalidInput('incidentId', 'Cannot audit resolved incidents');
   }
   ```

### 5.4 Data Integrity Checks
**Files:**
- `src/lib/services/templateGeneration.ts`
- `prisma/schema.prisma`

**Changes:**
1. Validate weights:
   ```typescript
   const weightSum = categories.reduce((sum, c) => sum + c.weight, 0);
   if (Math.abs(weightSum - 1.0) > 0.01) {
     throw Errors.invalidInput('categories', `Weights must sum to 1.0 (got ${weightSum})`);
   }
   ```

2. Ensure unique criterion IDs:
   ```typescript
   const criterionIds = categories.flatMap(c => c.criteria.map(cr => cr.id));
   const duplicates = criterionIds.filter((id, i) => criterionIds.indexOf(id) !== i);
   if (duplicates.length > 0) {
     throw Errors.invalidInput('criteria', `Duplicate criterion IDs: ${duplicates.join(', ')}`);
   }
   ```

### 5.5 Additional Safeguards
**Files:**
- `src/lib/openai/client.ts`
- `src/lib/services/complianceService.ts`

**Changes:**
1. Handle content moderation:
   ```typescript
   if (error.code === 'content_policy_violation') {
     logger.warn('Content moderation refusal', { transcriptId });
     return {
       status: 'FAILED',
       reason: 'Content violates OpenAI policy',
       score: 0
     };
   }
   ```

2. Validate evidence timestamps:
   ```typescript
   function normalizeTimestamp(timestamp: string): string {
     if (timestamp === 'invalid' || !timestamp) {
       return '00:00';
     }
     const match = timestamp.match(/^(\d+):(\d+)$/);
     return match ? timestamp : '00:00';
   }
   ```

---

## Testing Strategy (Day 10)

### Unit Tests
Create test files in `__tests__/hardening/`:
- `validation.test.ts` - Test all new validation functions
- `circuitBreaker.test.ts` - Test circuit breaker state transitions
- `retry.test.ts` - Test retry logic with mock failures
- `transactions.test.ts` - Test transaction rollbacks

### Integration Tests
- `workflow.integration.test.ts` - End-to-end workflow with all fixes
- `concurrent-audits.test.ts` - Test deduplication
- `streaming.test.ts` - Test cancellation
- `timeout.test.ts` - Test timeout scenarios

### Error Scenario Tests
- Empty transcript text
- Malformed GPT-4.1 responses
- Database connection failures
- OpenAI API unavailable
- Duplicate audit requests
- File deletion during processing
- Division by zero scenarios
- Missing foreign keys

---

## Rollout Plan

### Pre-Deployment
1. Create database backup
2. Run all tests in CI/CD
3. Deploy to staging environment
4. Monitor staging for 24 hours
5. Run load tests

### Deployment
1. Run Prisma migration in production
2. Deploy application updates
3. Monitor error logs for 1 hour
4. Verify no duplicate audits created
5. Check OpenAI API usage metrics

### Post-Deployment
1. Monitor circuit breaker state
2. Track retry attempts
3. Verify transaction success rate
4. Check for orphaned records
5. Review performance metrics

---

## Success Criteria
✅ All 50 issues resolved
✅ Zero TypeScript compilation errors
✅ All tests passing (unit + integration)
✅ Circuit breaker functional in staging
✅ No duplicate audits created
✅ Graceful handling of all error scenarios
✅ Performance metrics within targets (<2s API response)
✅ No increase in OpenAI API costs (better efficiency)
✅ Zero data integrity violations
✅ 99.9% audit completion rate

---

## Estimated Effort
- **Phase 1:** 12 hours (critical fixes)
- **Phase 2:** 10 hours (transactions & validation)
- **Phase 3:** 8 hours (error handling)
- **Phase 4:** 12 hours (API reliability)
- **Phase 5:** 10 hours (missing functionality)
- **Testing:** 8 hours

**Total:** ~60 hours (7.5 days)

---

## Risk Mitigation
- Execute phases sequentially to avoid conflicts
- Run tests after each phase
- Create database backup before schema migration
- Deploy fixes to staging environment first
- Monitor OpenAI API usage during rollout
- Have rollback plan ready for each phase
- Maintain backward compatibility during transitions