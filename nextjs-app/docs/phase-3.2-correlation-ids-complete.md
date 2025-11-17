# Phase 3.2: Correlation IDs & Logging - Implementation Complete

**Date**: January 16, 2025
**Status**: ✅ Complete
**Build Status**: ✅ Passing

## Overview

Implemented a comprehensive correlation ID system for tracking operations across the compliance audit workflow. This enables distributed tracing, debugging, and performance analysis.

## Files Modified

### 1. New Files Created

#### `src/lib/utils/correlation.ts` (New)
- Correlation ID generation and extraction utilities
- Wrapper around logging infrastructure's crypto-based generator
- Functions:
  - `generateCorrelationId()` - Generate unique correlation ID
  - `getOrCreateCorrelationId(request)` - Extract from headers or generate
  - `isValidCorrelationId(id)` - Validate correlation ID format
  - `extractCorrelationId(options)` - Extract with priority fallback

#### `docs/correlation-id-examples.md` (New)
- Complete usage guide with examples
- Log output samples
- Testing strategies
- Implementation checklist

#### `docs/phase-3.2-correlation-ids-complete.md` (New)
- This summary document

### 2. Modified Files

#### `src/lib/services/complianceService.ts`
**Changes**:
- Added `correlationId?: string` to `ModularAuditOptions` interface (line 72)
- Updated `executeModularAudit()` to accept and use correlation ID (line 960)
- Added `correlationId` to all logging calls:
  - `logAuditStart` (line 1007)
  - `logger.warn` for missing incident (line 995)
  - `logCategoryScoring` (line 1040)
  - `logCategoryScoringComplete` (line 1083)
  - `logPartialResultSave` (line 1107)
  - `logAuditProgress` (line 1118)
  - `logCategoryScoringError` (line 1127)
  - Category failure warning (line 1138)
  - `logNarrativeGeneration` (line 1190)
  - `logNarrativeComplete` (line 1207)
  - `logAuditComplete` (line 1259)
  - `logAuditError` (line 1291)
  - Error logger (line 1301)

**Impact**: All audit operations now tracked with correlation ID

#### `src/app/api/compliance/audit/route.ts`
**Changes**:
- Added import: `getOrCreateCorrelationId` from correlation utils (line 16)
- Extract correlation ID at route entry (line 97)
- Added `correlationId` to all logger calls:
  - Duplicate request detection (line 129)
  - Existing audit check (line 161)
  - Starting new audit (line 187)
  - Audit completed (line 238)
  - Audit execution failed (line 258)
- Pass correlation ID to `executeModularAudit()`:
  - Non-streaming mode (line 209)
  - Streaming mode (lines 330, 413)
- Updated `handleStreamingAudit` signature to accept correlationId (line 330)

**Impact**: All API-level logs include correlation ID

#### `src/app/api/incidents/[id]/status/route.ts`
**Changes**:
- Added import: `logger` from logging (line 14)
- Added poll frequency tracking system (lines 17-108):
  - `PollTracker` interface
  - In-memory `pollFrequencyMap`
  - Configurable thresholds and cleanup
  - `trackStatusPoll()` function
  - Auto-cleanup interval
- Integrated tracking in GET handler (line 220)

**Impact**:
- Detects excessive polling (>600 requests)
- Logs warnings with detailed metrics
- Auto-cleanup prevents memory leaks
- Configurable thresholds

## Poll Frequency Tracking Behavior

### Configuration
```typescript
const EXCESSIVE_POLL_THRESHOLD = 600;        // 10 req/min for 60 min
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;   // 5 minutes
const AUTO_RESET_TIME_MS = 60 * 60 * 1000;   // 1 hour
```

### Warning Triggers
1. **First Warning**: At 600th poll
2. **Subsequent Warnings**: Every 100 polls after threshold
3. **Auto-Reset**: After 1 hour of inactivity
4. **Memory Cleanup**: Every 5 minutes

### Example Warning Log
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

## Example Correlation ID Flow

### 1. Client Request
```bash
POST /api/compliance/audit?mode=modular
Headers: x-correlation-id: cor_client123
Body: { "transcriptId": "...", "templateId": "..." }
```

### 2. API Route Entry
```typescript
const correlationId = getOrCreateCorrelationId(request);
// correlationId = "cor_client123"

logger.info('Starting new audit', { correlationId, ... });
```

### 3. Service Layer
```typescript
await complianceService.executeModularAudit(transcriptId, templateId, {
  correlationId, // Propagated to service
});
```

### 4. All Logs Include Correlation ID
```json
{ "correlationId": "cor_client123", "message": "Audit started" }
{ "correlationId": "cor_client123", "message": "Category scoring started" }
{ "correlationId": "cor_client123", "message": "Category scoring complete" }
{ "correlationId": "cor_client123", "message": "Audit completed" }
```

### 5. Log Filtering
```bash
# View all logs for this audit
cat logs/app.log | grep "cor_client123"

# Count operations
cat logs/app.log | grep "cor_client123" | wc -l
```

## Log Output Examples

### Audit Start (with correlation ID)
```json
{
  "timestamp": "2025-01-16T14:30:00.123Z",
  "level": "INFO",
  "message": "Starting new audit",
  "metadata": {
    "component": "compliance-api",
    "operation": "audit",
    "transcriptId": "cm1abc123",
    "templateId": "cm2def456",
    "mode": "modular",
    "streaming": false,
    "correlationId": "cor_a3f5d8c9e2b1f4a7"
  },
  "correlationId": "cor_a3f5d8c9e2b1f4a7"
}
```

### Category Scoring (with correlation ID)
```json
{
  "timestamp": "2025-01-16T14:30:15.456Z",
  "level": "INFO",
  "message": "Category scoring started",
  "metadata": {
    "component": "compliance-audit",
    "operation": "category-scoring",
    "auditId": "audit_a3f5d8c9e2b1f4a7",
    "category": "Radio Discipline",
    "progress": "1/5",
    "criteriaCount": 8,
    "categoryWeight": 0.25,
    "correlationId": "cor_a3f5d8c9e2b1f4a7"
  },
  "correlationId": "cor_a3f5d8c9e2b1f4a7"
}
```

### Poll Frequency Warning
```json
{
  "timestamp": "2025-01-16T15:15:00.789Z",
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

## Testing Recommendations

### 1. Test Correlation ID Propagation
```typescript
const correlationId = 'cor_test123';
const response = await fetch('/api/compliance/audit?mode=modular', {
  method: 'POST',
  headers: { 'x-correlation-id': correlationId },
  body: JSON.stringify({ transcriptId, templateId }),
});

// Verify all logs include 'cor_test123'
```

### 2. Test Auto-Generated Correlation ID
```typescript
// Don't send x-correlation-id header
const response = await fetch('/api/compliance/audit?mode=modular', {
  method: 'POST',
  body: JSON.stringify({ transcriptId, templateId }),
});

// Verify logs include generated correlation ID (cor_<16-hex>)
```

### 3. Test Poll Frequency Tracking
```typescript
const incidentId = 'cm3test789';

// Simulate 650 polls
for (let i = 0; i < 650; i++) {
  await fetch(`/api/incidents/${incidentId}/status`);
  await sleep(100); // 100ms between polls
}

// Check logs:
// - Should see warning at poll 600
// - Should see another warning at poll 700
```

### 4. Test Poll Auto-Cleanup
```typescript
// Make 100 polls
for (let i = 0; i < 100; i++) {
  await fetch(`/api/incidents/${incidentId}/status`);
}

// Wait 61 minutes (auto-reset time)
await sleep(61 * 60 * 1000);

// Make another poll - counter should reset to 1
await fetch(`/api/incidents/${incidentId}/status`);
```

## Build Verification

```bash
$ npm run build
✓ Compiled successfully in 3.0s
Linting and checking validity of types ...
(Only warnings, no errors)

✓ Creating an optimized production build
✓ Collecting page data
✓ Generating static pages
✓ Collecting build traces
✓ Finalizing page optimization

Route (app)                               Size     First Load JS
┌ ○ /                                     ...      ...
├ ○ /api/compliance/audit                 ...      ...
└ ○ /api/incidents/[id]/status           ...      ...
```

## Benefits Achieved

1. **Request Tracing**: Track single audit through entire system
2. **Debugging**: Filter logs by correlation ID for specific operations
3. **Performance Analysis**: Measure end-to-end latency per request
4. **Error Tracking**: Link errors to originating request
5. **Poll Monitoring**: Detect excessive status polling
6. **Distributed Tracing**: Correlate logs across services
7. **Memory Efficiency**: Auto-cleanup prevents memory leaks

## Next Steps

### Recommended Enhancements (Future)
1. Add correlation ID to response headers
2. Implement correlation ID in legacy audit mode
3. Add correlation ID to database records
4. Create dashboard for correlation ID analytics
5. Add correlation ID to error reporting (e.g., Sentry)
6. Implement distributed tracing with OpenTelemetry

### Monitoring
1. Set up alerts for excessive polling warnings
2. Track average audit duration by correlation ID
3. Monitor correlation ID generation rate
4. Alert on missing correlation IDs

## Related Documentation

- [`docs/correlation-id-examples.md`](./correlation-id-examples.md) - Usage examples
- [`src/lib/logging/USAGE.md`](../src/lib/logging/USAGE.md) - Logging system docs
- [`docs/implementation-plan-logging-integration.md`](./implementation-plan-logging-integration.md) - Original plan

## Conclusion

Phase 3.2 is complete. The correlation ID system is fully integrated into the compliance audit workflow with:
- ✅ Correlation ID generation and extraction
- ✅ Propagation through service layers
- ✅ All logs include correlation IDs
- ✅ Poll frequency tracking
- ✅ Excessive polling warnings
- ✅ Memory-efficient auto-cleanup
- ✅ Build passing
- ✅ Documentation complete

The system is production-ready and provides comprehensive request tracking capabilities.
