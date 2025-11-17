# Correlation ID Implementation - Examples

This document demonstrates the correlation ID system for tracking operations across the compliance audit workflow.

## Overview

The correlation ID system provides request tracking across:
- API routes (compliance audit endpoint)
- Service layer (complianceService)
- Status polling (incident status endpoint)
- All log entries

## Key Components

### 1. Correlation Utility (`src/lib/utils/correlation.ts`)

```typescript
import { getOrCreateCorrelationId } from '@/lib/utils/correlation';

// Extract from request or generate new
const correlationId = getOrCreateCorrelationId(request);
```

### 2. Audit API Route

**File**: `src/app/api/compliance/audit/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // Extract or generate correlation ID at API entry point
  const correlationId = getOrCreateCorrelationId(request);

  logger.info('Starting new audit', {
    component: 'compliance-api',
    operation: 'audit',
    transcriptId,
    templateId,
    mode,
    correlationId, // 👈 Included in all logs
  });

  // Pass to service layer
  const audit = await complianceService.executeModularAudit(
    transcriptId,
    templateId,
    {
      additionalNotes,
      correlationId, // 👈 Propagated to service
    }
  );
}
```

### 3. Compliance Service

**File**: `src/lib/services/complianceService.ts`

```typescript
async executeModularAudit(
  transcriptId: string,
  templateId: string,
  options?: ModularAuditOptions
): Promise<AuditResult> {
  // Accept correlationId from caller
  const correlationId = options?.correlationId || generateCorrelationId();

  // Use in all log calls
  logAuditStart(auditId, templateId, transcriptId, categories.length, {
    incidentId: transcript.incidentId,
    correlationId, // 👈 Tracked through entire audit
  });

  // Pass to category-level operations
  logCategoryScoring(auditId, category.name, progress, criteriaCount, {
    categoryWeight: category.weight,
    correlationId, // 👈 Maintained across categories
  });
}
```

### 4. Poll Frequency Tracking

**File**: `src/app/api/incidents/[id]/status/route.ts`

Tracks status polling per incident and logs warnings when excessive:

```typescript
// Track every status poll
trackStatusPoll(incidentId);

// After 600 polls (threshold), logs:
logger.warn('Excessive status polling detected', {
  component: 'incident-status-api',
  operation: 'poll-frequency-check',
  incidentId,
  pollCount: 600,
  durationMinutes: 45,
  avgPollsPerMinute: 13.3,
  threshold: 600,
});
```

**Behavior**:
- Threshold: 600 requests (10 req/min for 60 minutes)
- Logs warning at threshold
- Logs every 100 polls after threshold
- Auto-cleanup after 1 hour of inactivity
- Memory-efficient with periodic cleanup (every 5 minutes)

## Example Log Output

### Audit Start
```json
{
  "timestamp": "2025-01-16T14:30:00.000Z",
  "level": "INFO",
  "message": "Audit started",
  "metadata": {
    "component": "compliance-api",
    "operation": "audit",
    "transcriptId": "cm1abc123",
    "templateId": "cm2def456",
    "mode": "modular",
    "correlationId": "cor_a3f5d8c9e2b1f4a7"
  }
}
```

### Category Scoring
```json
{
  "timestamp": "2025-01-16T14:30:15.000Z",
  "level": "INFO",
  "message": "Category scoring started",
  "metadata": {
    "component": "compliance-audit",
    "operation": "category-scoring",
    "auditId": "audit_a3f5d8c9e2b1f4a7",
    "category": "Radio Discipline",
    "progress": "1/5",
    "criteriaCount": 8,
    "correlationId": "cor_a3f5d8c9e2b1f4a7"
  }
}
```

### Audit Complete
```json
{
  "timestamp": "2025-01-16T14:32:45.000Z",
  "level": "INFO",
  "message": "Audit completed successfully",
  "metadata": {
    "component": "compliance-api",
    "operation": "audit",
    "auditId": "audit_a3f5d8c9e2b1f4a7",
    "overallScore": 87,
    "duration": 165000,
    "correlationId": "cor_a3f5d8c9e2b1f4a7"
  }
}
```

### Excessive Polling Warning
```json
{
  "timestamp": "2025-01-16T15:15:00.000Z",
  "level": "WARN",
  "message": "Excessive status polling detected",
  "metadata": {
    "component": "incident-status-api",
    "operation": "poll-frequency-check",
    "incidentId": "cm3ghi789",
    "pollCount": 600,
    "durationMinutes": 45,
    "avgPollsPerMinute": 13.3,
    "threshold": 600
  }
}
```

## Usage Patterns

### 1. Client Sends Correlation ID

```typescript
// Client-side request with correlation ID
const response = await fetch('/api/compliance/audit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-correlation-id': 'cor_client123', // 👈 Custom correlation ID
  },
  body: JSON.stringify({ transcriptId, templateId }),
});
```

Logs will use `cor_client123` throughout the audit workflow.

### 2. Server Generates Correlation ID

```typescript
// No correlation ID header sent
const response = await fetch('/api/compliance/audit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcriptId, templateId }),
});
```

Server generates new correlation ID (e.g., `cor_a3f5d8c9e2b1f4a7`).

### 3. Filtering Logs by Correlation ID

```bash
# View all logs for a specific audit
cat logs/app.log | grep "cor_a3f5d8c9e2b1f4a7"

# Count operations per correlation ID
cat logs/app.log | grep "cor_a3f5d8c9e2b1f4a7" | wc -l

# Extract audit timeline
cat logs/app.log | grep "cor_a3f5d8c9e2b1f4a7" | jq '.timestamp, .message'
```

## Testing

### Test Poll Frequency Tracking

```typescript
// Simulate 650 status polls
for (let i = 0; i < 650; i++) {
  await fetch(`/api/incidents/${incidentId}/status`);
  await sleep(100); // 100ms between polls
}

// Check logs for warnings
// Should see warning at poll 600
// Should see another warning at poll 700 (every 100)
```

### Test Correlation ID Propagation

```typescript
const correlationId = 'cor_test123';

const response = await fetch('/api/compliance/audit?mode=modular', {
  method: 'POST',
  headers: {
    'x-correlation-id': correlationId,
  },
  body: JSON.stringify({ transcriptId, templateId }),
});

// Check logs - all entries should have correlationId: 'cor_test123'
```

## Benefits

1. **Request Tracing**: Track single audit request through entire system
2. **Debugging**: Quickly filter logs to specific operations
3. **Performance Analysis**: Measure end-to-end latency per request
4. **Error Tracking**: Link errors back to originating request
5. **Poll Monitoring**: Detect and log excessive status polling
6. **Distributed Tracing**: Correlate logs across services

## Implementation Checklist

- [x] Create `src/lib/utils/correlation.ts`
- [x] Add `correlationId` parameter to `ModularAuditOptions`
- [x] Update `complianceService.executeModularAudit` to accept and use `correlationId`
- [x] Add `correlationId` to all logger calls in `executeModularAudit`
- [x] Update audit API route to extract/generate correlation ID
- [x] Add correlation ID to all API route logs
- [x] Implement poll frequency tracking in status endpoint
- [x] Add warning logs for excessive polling (>600 requests)
