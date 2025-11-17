# Implementation Plan: Request Queue and Rate Limiting

**Date**: 2025-11-16
**Author**: Claude Code
**Status**: In Progress

---

## 1. Situation Assessment

### Current State Analysis

**Existing Infrastructure**:
- OpenAI client with basic retry logic (`src/lib/openai/client.ts`)
- Exponential backoff retry in `src/lib/openai/utils.ts` (`retryWithBackoff`)
- Logging system integrated (`src/lib/logging/`)
- Request caching implemented (`src/lib/utils/requestCache.ts`)

**Current OpenAI Call Patterns**:
- Direct calls to `openai.responses.create()` wrapped in `retryWithBackoff`
- No centralized rate limiting or concurrency control
- Each request retries independently without global coordination
- Risk of exceeding OpenAI rate limits during high traffic

**Integration Points**:
- `src/lib/openai/compliance-analysis-modular.ts` - Category scoring and narrative generation
- `src/lib/openai/template-generation.ts` - Multi-turn template generation
- `src/lib/services/complianceService.ts` - Compliance auditing service
- `src/lib/services/templateGeneration.ts` - Template generation service

**Requirements**:
- Must maintain existing OpenAI model requirements (gpt-4.1, responses.create())
- Must integrate seamlessly with existing retry logic
- Must provide metrics for monitoring
- Must support priority queueing for user-initiated vs background requests

---

## 2. Strategy

### High-Level Approach

**Request Queue Design**:
1. **Priority-based Queue**: Support prioritizing user-initiated requests over background tasks
2. **Concurrency Control**: Limit simultaneous OpenAI API requests
3. **Rate Limiting**: Enforce requests-per-minute limits to prevent exceeding OpenAI quotas
4. **Graceful Degradation**: Queue requests when limits approached, don't drop them
5. **Observability**: Expose metrics for monitoring queue depth, wait times, throughput

**Integration Strategy**:
1. Create `RequestQueue` class in `src/lib/utils/requestQueue.ts`
2. Create singleton instances for different service types (OpenAI API, etc.)
3. Wrap existing OpenAI calls with queue.enqueue() calls
4. Maintain existing retry logic (queue handles admission control, retry handles failures)
5. Add logging integration for queue events

**Technical Decisions**:
- **Concurrency Limit**: 10 concurrent requests (conservative for API stability)
- **Rate Limit**: 50 requests per 60-second window (safe default, configurable)
- **Priority Levels**: Simple numeric priority (higher = more important)
- **Queue Structure**: In-memory array (sufficient for single-instance deployment)
- **Timestamp Tracking**: Rolling window for rate limit enforcement

---

## 3. Detailed Implementation Plan

### Phase 1: Core Queue Implementation

**File**: `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/utils/requestQueue.ts`

**Components**:
1. **QueueItem Interface**:
   - Function to execute
   - Promise resolve/reject handlers
   - Priority level
   - Enqueue timestamp

2. **RequestQueueConfig Interface**:
   - maxConcurrent: number
   - maxRequestsPerWindow: number
   - windowMs: number
   - name: string (for logging)

3. **RequestQueue Class**:
   - Private queue array (sorted by priority)
   - Running request counter
   - Request timestamp array (for rate limiting)
   - Configuration

4. **Key Methods**:
   - `enqueue<T>(fn, priority)`: Add request to queue
   - `processQueue()`: Process queued requests respecting limits
   - `executeRequest(item)`: Execute single request
   - `canMakeRequest()`: Check rate limit
   - `cleanupTimestamps()`: Remove old timestamps
   - `getMetrics()`: Return queue statistics
   - `clear()`: Clear queue (for testing)

5. **Singleton Instances**:
   - `requestQueues.openaiAPI`: OpenAI-specific queue configuration

### Phase 2: Integration with Existing Code

**Files to Update**:
1. `src/lib/openai/compliance-analysis-modular.ts`:
   - Wrap `openai.responses.create()` calls in queue.enqueue()
   - Maintain existing retry logic
   - Pass appropriate priority levels

2. `src/lib/openai/template-generation.ts`:
   - Wrap API calls similarly
   - Use same priority for consistency

### Phase 3: Logging and Monitoring

**Logging Events**:
- Queue initialization (with config)
- Requests delayed in queue (when wait time > 1s)
- Queue status when requests waiting
- Queue cleared

**Metrics Exposed**:
- Current queue length
- Running request count
- Requests in current window
- Oldest request wait time
- Configuration limits

---

## 4. Technical Specifications

### RequestQueue Class API

```typescript
interface QueueItem<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: number;
  enqueueTime: number;
}

interface RequestQueueConfig {
  maxConcurrent: number;
  maxRequestsPerWindow: number;
  windowMs: number;
  name: string;
}

class RequestQueue {
  constructor(config: RequestQueueConfig);

  async enqueue<T>(fn: () => Promise<T>, priority?: number): Promise<T>;

  getMetrics(): {
    queueLength: number;
    running: number;
    requestsInWindow: number;
    maxConcurrent: number;
    maxRequestsPerWindow: number;
    oldestWaitMs: number;
  };

  clear(): void;
}
```

### Integration Pattern

**Before** (compliance-analysis-modular.ts):
```typescript
const completion = await retryWithBackoff(async () => {
  return await openai.responses.create({...});
});
```

**After**:
```typescript
const completion = await requestQueues.openaiAPI.enqueue(
  async () => retryWithBackoff(async () => {
    return await openai.responses.create({...});
  }),
  1 // priority
);
```

### Priority Levels

- **0**: Background/batch processing
- **1**: Normal user-initiated requests (default)
- **2**: High-priority user requests
- **3**: Critical/emergency operations

---

## 5. Risk Mitigation

### Potential Issues and Solutions

**Issue 1**: Queue grows unbounded during high traffic
- **Mitigation**: Monitor queue metrics, add alerts for queue depth > 50
- **Future**: Implement queue size limits with overflow handling

**Issue 2**: Long-running requests block queue
- **Mitigation**: OpenAI calls already have 3-minute timeout
- **Future**: Add per-request timeout configuration

**Issue 3**: Priority inversion (low priority requests block high priority)
- **Mitigation**: Queue is sorted by priority, high priority processed first
- **Design**: New high-priority requests jump to front of queue

**Issue 4**: Memory leak from timestamp accumulation
- **Mitigation**: Automatic cleanup every 60 seconds
- **Design**: Filter timestamps outside rolling window

**Issue 5**: Queue state lost on server restart
- **Mitigation**: In-memory queue acceptable for MVP (requests retry on failure)
- **Future**: Persistent queue with Redis if needed

---

## 6. Testing Strategy

### Unit Tests (Future Work)

**Test Cases**:
1. Queue respects concurrency limit
2. Queue respects rate limit
3. Priority ordering works correctly
4. Timestamps cleaned up properly
5. Metrics accurate
6. Clear() resets state

### Integration Testing

**Manual Verification**:
1. Run compliance audit (watch logs for queue activity)
2. Run template generation (verify queueing)
3. Monitor metrics during normal operation
4. Verify no breaking changes to existing functionality

---

## 7. Success Criteria

**Implementation Complete When**:
- ✅ RequestQueue class implemented with full API
- ✅ Singleton instances created for OpenAI API
- ✅ Compliance analysis integrated with queue
- ✅ Template generation integrated with queue
- ✅ Logging integrated at all key points
- ✅ Metrics exposed and accurate
- ✅ No breaking changes to existing functionality
- ✅ Rate limiting prevents exceeding OpenAI quotas

**Validation**:
- Run existing compliance audit - should work identically
- Check logs for queue activity
- Verify metrics are populated
- Confirm rate limits enforced under load

---

## 8. Future Enhancements

**Not in Current Scope** (document for later):
1. Redis-backed persistent queue
2. Queue size limits with overflow handling
3. Dynamic rate limit adjustment based on API headers
4. Per-user request quotas
5. Request cancellation support
6. Queue metrics dashboard
7. Circuit breaker integration (mentioned in task)

---

## Notes

- Queue operates at request admission level (before retry logic)
- Retry logic handles individual request failures
- Queue handles global rate limiting and concurrency
- Both layers work together: Queue → Retry → OpenAI API
