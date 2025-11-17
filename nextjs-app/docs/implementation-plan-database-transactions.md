# Implementation Plan: Database Transaction Hardening
## Phase 2.1 - Multi-Step Operation Atomicity

**Date**: 2025-11-16
**Status**: In Progress
**Priority**: High
**Objective**: Implement database transactions for multi-step operations to ensure data consistency

---

## Situation Assessment

### Current State Analysis

The codebase already has basic transaction infrastructure:
- **Location**: `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/db.ts`
- **Existing Helper**: `executeTransaction()` function
- **Existing Type**: `PrismaTransaction` type export
- **Configuration**: Transaction settings (maxWait: default, timeout: default)

However, **transactions are not being used** in the following critical multi-step operations:

1. **Transcription Service** (`src/lib/services/transcription.ts`)
   - Lines 172-183: Saves transcript to database
   - Does not wrap in transaction
   - Potential issue: If transcript save succeeds but incident relationship fails, partial data remains

2. **Compliance Service** (`src/lib/services/complianceService.ts`)
   - Lines 1220-1231: Saves audit results to database
   - Does not wrap in transaction
   - Potential issue: Audit save failures leave no partial state tracking

3. **Template Generation Route** (`src/app/api/policy/generate-template/route.ts`)
   - Lines 79-93: Fetches multiple policy documents
   - Lines 118-121: Calls long-running AI service
   - **Analysis**: This does NOT need a transaction because:
     - The database query is read-only (fetch documents)
     - The AI generation is external and long-running (30+ seconds)
     - No multi-step database writes occur

### Key Constraints

**Transaction Best Practices**:
- ❌ DO NOT wrap long-running operations (>5 seconds) in transactions
- ❌ DO NOT include external API calls inside transactions
- ✅ DO wrap multi-step database writes that must be atomic
- ✅ DO keep transaction scope as small as possible
- ✅ DO configure appropriate timeouts (5s maxWait, 30s timeout max)

**OpenAI API Considerations**:
- Template generation: 30-60 seconds per turn (CANNOT be in transaction)
- Compliance analysis: 10-30 seconds per category (CANNOT be in transaction)
- Transcription: 5-15 seconds (borderline, but external API = NO transaction)

---

## Strategy

### Approach

**Create a centralized transaction utility** that:
1. Wraps Prisma's `$transaction` with production-ready defaults
2. Provides proper TypeScript typing with `PrismaTransaction`
3. Configures sensible timeouts (5s maxWait, 30s timeout)
4. Uses `ReadCommitted` isolation level (balance between consistency and concurrency)
5. Includes comprehensive documentation with examples

**Refactor existing services** to:
1. Use the transaction utility for multi-step database operations
2. Keep external API calls OUTSIDE transaction boundaries
3. Maintain backward compatibility with existing code

### Technical Decisions

**Transaction Configuration**:
```typescript
{
  maxWait: 5000,      // 5 seconds to acquire connection
  timeout: 30000,     // 30 seconds max transaction duration
  isolationLevel: 'ReadCommitted'  // Prevents dirty reads
}
```

**Rationale**:
- `maxWait: 5000ms`: Fire department audits are not time-critical; 5s is acceptable
- `timeout: 30000ms`: Allows for complex multi-category scoring writes
- `ReadCommitted`: Balances data consistency with concurrent access

---

## Detailed Plan

### Step 1: Create Transaction Utility

**File**: `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/utils/database.ts`

**Implementation**:
```typescript
import { prisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export async function withTransaction<T>(
  operation: (tx: PrismaTransaction) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(operation, {
    maxWait: 5000,
    timeout: 30000,
    isolationLevel: 'ReadCommitted',
  });
}
```

**Key Features**:
- Exported `PrismaTransaction` type for service layer use
- `withTransaction()` wrapper with production-ready configuration
- Comprehensive JSDoc documentation with examples
- Type-safe operation callback

### Step 2: Update Compliance Service

**File**: `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/services/complianceService.ts`

**Changes**:
1. Import `withTransaction` utility
2. Wrap `saveAudit()` call in transaction (lines 1220-1231)
3. Handle transaction errors gracefully

**Affected Methods**:
- `executeModularAudit()` - Lines 955-1295

**Why This Needs a Transaction**:
- Saves audit metadata, findings, recommendations, and category scores
- If any part fails, the entire audit should be rolled back
- Prevents partial audit data in database

**Implementation**:
```typescript
// Step 13: Save audit to database
const audit = await withTransaction(async (tx) => {
  return await tx.audit.create({
    data: {
      incidentId: transcript.incidentId,
      transcriptId: transcript.id,
      templateId: template.id,
      overallScore: overallScoreNormalized,
      overallStatus,
      summary: narrative,
      findings: { categories: transformedCategories, findings: allFindings } as any,
      recommendations: recommendations as any,
      metadata: metadata as any,
    },
  });
});
```

### Step 3: Update Transcription Service

**File**: `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/services/transcription.ts`

**Changes**:
1. Import `withTransaction` utility
2. Modify `saveTranscript()` method signature to accept optional transaction client
3. Update `transcribeAudio()` to use transaction when saving

**Affected Methods**:
- `transcribeAudio()` - Lines 105-205
- `saveTranscript()` - Lines 363-411

**Why This Is Borderline**:
- Current implementation: Single `create()` operation
- **Analysis**: This is a SINGLE atomic operation, not multi-step
- **Decision**: SKIP for now, but prepare for future expansion

**Rationale for Skipping**:
- Prisma `create()` is already atomic
- No multi-step database operations exist currently
- Adding transaction adds overhead without benefit
- If future requirements add incident status updates, revisit

### Step 4: Skip Template Generation Route

**File**: `/Users/aiml/Projects/transcriber/nextjs-app/src/app/api/policy/generate-template/route.ts`

**Analysis**:
- Lines 79-93: Read-only query (no transaction needed)
- Lines 118-121: Long-running AI service call (MUST NOT be in transaction)
- No multi-step database writes exist

**Decision**: No changes required

---

## Technical Specifications

### Transaction Configuration Matrix

| Setting | Value | Rationale |
|---------|-------|-----------|
| `maxWait` | 5000ms | Acceptable wait for non-real-time operations |
| `timeout` | 30000ms | Allows complex multi-step writes |
| `isolationLevel` | `ReadCommitted` | Prevents dirty reads, allows concurrency |

### Transaction Scope Guidelines

**DO use transactions for**:
- Multi-step database writes that must be atomic
- Operations where partial failure creates inconsistent state
- Concurrent writes that require isolation

**DO NOT use transactions for**:
- Single-step database operations (already atomic)
- Operations involving external API calls
- Long-running operations (>5 seconds)
- Read-only queries

### Error Handling

**Transaction Failures**:
```typescript
try {
  await withTransaction(async (tx) => {
    // ... database operations
  });
} catch (error) {
  // Automatic rollback has already occurred
  throw Errors.processingFailed('Operation name', error.message);
}
```

---

## Risk Mitigation

### Potential Issues

1. **Transaction Timeout**
   - **Risk**: Complex audits with many categories exceed 30s timeout
   - **Mitigation**: Only wrap final save operation, not AI processing
   - **Monitoring**: Log transaction durations in production

2. **Deadlock**
   - **Risk**: Concurrent audits on same incident cause deadlock
   - **Mitigation**: `ReadCommitted` isolation reduces lock contention
   - **Recovery**: Prisma automatically retries serialization failures

3. **Connection Pool Exhaustion**
   - **Risk**: Too many concurrent transactions hold connections
   - **Mitigation**: 5s `maxWait` prevents indefinite blocking
   - **Monitoring**: Track `maxWait` timeouts in logs

---

## Task Breakdown

### Phase 2.1 Tasks

- [x] **Task 1**: Create `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/utils/database.ts`
  - Export `PrismaTransaction` type
  - Implement `withTransaction()` wrapper
  - Add comprehensive documentation

- [ ] **Task 2**: Update Compliance Service
  - Import `withTransaction` from utils
  - Wrap audit save operation in transaction (lines 1220-1231)
  - Add error handling for transaction failures
  - Test with existing audit execution

- [ ] **Task 3**: Review Transcription Service
  - Document why transaction is NOT needed (single atomic operation)
  - Add TODO comment for future multi-step scenarios
  - No code changes required

- [ ] **Task 4**: Verification
  - Run existing tests to ensure no regressions
  - Verify audit save operations still work
  - Check transaction logs in development

---

## Verification Criteria

### Success Metrics

1. **Transaction Utility Created**
   - File exists at `src/lib/utils/database.ts`
   - Exports `withTransaction()` function
   - Exports `PrismaTransaction` type
   - Includes JSDoc documentation

2. **Compliance Service Updated**
   - Audit save wrapped in transaction
   - Error handling preserves existing behavior
   - Tests pass without modification

3. **No Regressions**
   - Existing audit execution works
   - Partial results still save correctly
   - No performance degradation

### Test Coverage

**Unit Tests** (future):
- Test transaction rollback on error
- Test transaction success with complex writes
- Test timeout handling

**Integration Tests** (future):
- Test concurrent audits don't cause deadlock
- Test partial results save during interruption
- Test recovery from transaction failures

---

## Notes

### Long-Running Operations

**Critical Principle**: Never wrap external API calls in database transactions.

**Why**:
- External APIs can take 30+ seconds
- Database connections are limited resources
- Transaction locks prevent concurrent access
- Timeout failures are hard to debug

**Correct Pattern**:
```typescript
// ✅ CORRECT: API call outside transaction
const aiResult = await callOpenAI(prompt);

// Then wrap only the database save
const saved = await withTransaction(async (tx) => {
  return await tx.audit.create({ data: aiResult });
});
```

**Incorrect Pattern**:
```typescript
// ❌ WRONG: API call inside transaction
const saved = await withTransaction(async (tx) => {
  const aiResult = await callOpenAI(prompt);  // BAD!
  return await tx.audit.create({ data: aiResult });
});
```

### Future Enhancements

1. **Partial Result Persistence**
   - Save category results as they complete (outside transaction)
   - Final audit save wraps in transaction
   - Enables resume on interruption

2. **Distributed Transactions**
   - If adding Redis or other data stores
   - Consider saga pattern for cross-system consistency
   - May require event sourcing architecture

3. **Transaction Monitoring**
   - Add structured logging for transaction durations
   - Track rollback frequency
   - Alert on deadlock occurrences

---

## References

- **Prisma Transactions**: https://www.prisma.io/docs/concepts/components/prisma-client/transactions
- **Isolation Levels**: https://www.postgresql.org/docs/current/transaction-iso.html
- **Best Practices**: Internal fire department compliance audit requirements

---

**End of Implementation Plan**
