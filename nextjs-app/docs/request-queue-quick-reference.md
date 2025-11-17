# Request Queue - Quick Reference Guide

**File**: `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/utils/requestQueue.ts`

---

## Quick Start

### Import
```typescript
import { requestQueues } from '@/lib/utils/requestQueue';
```

### Basic Usage
```typescript
// Enqueue a request with default priority
const result = await requestQueues.openaiAPI.enqueue(
  async () => {
    return await openai.responses.create({...});
  }
);
```

### With Priority
```typescript
// High priority user request
const result = await requestQueues.openaiAPI.enqueue(
  async () => {
    return await openai.responses.create({...});
  },
  2  // higher priority = processed first
);
```

---

## Priority Levels

| Priority | Use Case | Example |
|----------|----------|---------|
| 0 | Background tasks | Batch processing, cleanup |
| 1 | Normal requests | User-initiated audits (current) |
| 2 | High priority | Urgent user operations |
| 3 | Critical | Emergency/safety operations |

---

## Configuration

### Current Limits (OpenAI API)
```typescript
requestQueues.openaiAPI = {
  maxConcurrent: 10,          // Max simultaneous requests
  maxRequestsPerWindow: 50,    // Max requests per minute
  windowMs: 60000,            // 1 minute window
  name: 'openai-api'
}
```

### Adjusting Limits
Edit `src/lib/utils/requestQueue.ts`:
```typescript
export const requestQueues = {
  openaiAPI: new RequestQueue({
    name: 'openai-api',
    maxConcurrent: 20,        // Increase concurrent requests
    maxRequestsPerWindow: 100, // Increase rate limit
    windowMs: 60000,
  }),
};
```

---

## Monitoring

### Get Metrics
```typescript
const metrics = requestQueues.openaiAPI.getMetrics();

console.log({
  queueLength: metrics.queueLength,      // Requests waiting
  running: metrics.running,              // Requests executing
  requestsInWindow: metrics.requestsInWindow,
  oldestWaitMs: metrics.oldestWaitMs,    // Longest wait time
});
```

### Example Alert Logic
```typescript
const metrics = requestQueues.openaiAPI.getMetrics();

if (metrics.queueLength > 50) {
  logger.warn('Queue backing up', { metrics });
}

if (metrics.oldestWaitMs > 30000) {
  logger.error('Request delayed over 30s', { metrics });
}
```

---

## Integration Pattern

### Current Architecture
```
requestQueue.enqueue()              ← Admission control
  ↓
circuitBreaker.execute()            ← Failure protection
  ↓
wrapOpenAICall()                    ← Logging
  ↓
retryWithBackoff()                  ← Error handling
  ↓
openai.responses.create()           ← API call
```

### Adding to New Endpoints

**Before:**
```typescript
const result = await retryWithBackoff(async () => {
  return await openai.responses.create({...});
});
```

**After:**
```typescript
const result = await requestQueues.openaiAPI.enqueue(
  async () => {
    return await retryWithBackoff(async () => {
      return await openai.responses.create({...});
    });
  },
  1  // priority
);
```

---

## Logging Events

### Queue Initialization
```
INFO: Request queue initialized
  - name: openai-api
  - maxConcurrent: 10
  - maxRequestsPerWindow: 50
```

### Request Delayed
```
WARN: Request delayed in queue
  - waitTimeMs: 1234
  - queueLength: 5
  - running: 10
```

### Requests Waiting
```
DEBUG: Requests waiting in queue
  - queueLength: 3
  - running: 8
  - requestsInWindow: 45
  - oldestWaitMs: 567
```

---

## Troubleshooting

### Queue Growing Unbounded

**Symptom**: `queueLength` keeps increasing

**Solutions**:
1. Increase `maxConcurrent` (more parallel requests)
2. Increase `maxRequestsPerWindow` (higher rate limit)
3. Check if circuit breaker is open (blocking requests)
4. Verify OpenAI API is responding normally

### Requests Timing Out

**Symptom**: Requests failing with timeout errors

**Solutions**:
1. Check `oldestWaitMs` - long waits indicate saturation
2. Review OpenAI API quotas (may have hit limit)
3. Increase rate limits if quota allows
4. Implement request cancellation for old requests

### High Wait Times

**Symptom**: `oldestWaitMs > 5000` (5+ seconds)

**Solutions**:
1. Increase `maxConcurrent` if resources allow
2. Review priority distribution (too many high priority?)
3. Check for slow OpenAI responses
4. Consider implementing request timeout

---

## Testing

### Manual Test
```typescript
// In a route or service
const metrics1 = requestQueues.openaiAPI.getMetrics();
console.log('Before:', metrics1);

const result = await requestQueues.openaiAPI.enqueue(
  async () => {
    return await openai.responses.create({...});
  },
  1
);

const metrics2 = requestQueues.openaiAPI.getMetrics();
console.log('After:', metrics2);
```

### Load Test Simulation
```typescript
// Enqueue multiple requests to test limits
const promises = [];
for (let i = 0; i < 100; i++) {
  promises.push(
    requestQueues.openaiAPI.enqueue(
      async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      },
      Math.floor(Math.random() * 3)  // Random priority 0-2
    )
  );
}

const results = await Promise.all(promises);
console.log('Completed:', results.length);
console.log('Metrics:', requestQueues.openaiAPI.getMetrics());
```

---

## Best Practices

### ✅ Do
- Use appropriate priority levels
- Monitor queue metrics regularly
- Set up alerts for queue depth
- Adjust limits based on usage patterns
- Test under expected load

### ❌ Don't
- Use priority 3 for non-critical operations
- Ignore queue growth warnings
- Set limits below actual traffic needs
- Call `.clear()` in production (loses pending requests)
- Forget to handle enqueue errors

---

## API Reference

### RequestQueue Class

#### Methods

**`enqueue<T>(fn: () => Promise<T>, priority?: number): Promise<T>`**
- Enqueues async function with optional priority
- Returns promise that resolves when function completes
- Throws if function throws

**`getMetrics(): RequestQueueMetrics`**
- Returns current queue statistics
- Use for monitoring and alerting

**`clear(): void`**
- Clears all pending requests (testing only!)
- Resets counters
- Pending requests are NOT executed

**`destroy(): void`**
- Cleanup on shutdown
- Stops timestamp cleanup interval

### RequestQueueMetrics

```typescript
interface RequestQueueMetrics {
  queueLength: number;           // Requests waiting
  running: number;               // Requests executing
  requestsInWindow: number;      // Requests in current window
  maxConcurrent: number;         // Concurrency limit
  maxRequestsPerWindow: number;  // Rate limit
  oldestWaitMs: number;          // Oldest request wait time (0 if empty)
}
```

---

## Examples in Codebase

### Category Scoring
**File**: `src/lib/openai/compliance-analysis-modular.ts`
**Line**: ~401

```typescript
const completion = await requestQueues.openaiAPI.enqueue(
  async () => {
    return await circuitBreakers.openaiGPT4.execute(async () => {
      return await wrapOpenAICall(
        'compliance-category-scoring',
        model,
        inputTokens,
        async () => {
          return await retryWithBackoff(async () => {
            return await openai.responses.create({...});
          });
        },
        {...}
      );
    });
  },
  1  // Normal priority
);
```

### Narrative Generation
**File**: `src/lib/openai/compliance-analysis-modular.ts`
**Line**: ~620

```typescript
const completion = await requestQueues.openaiAPI.enqueue(
  async () => {
    return await circuitBreakers.openaiGPT4.execute(async () => {
      return await wrapOpenAICall(
        'compliance-narrative-generation',
        model,
        inputTokens,
        async () => {
          return await retryWithBackoff(async () => {
            return await openai.responses.create({...});
          });
        },
        {...}
      );
    });
  },
  1  // Normal priority
);
```

---

## Support

**Documentation**:
- Implementation Plan: `/docs/implementation-plan-request-queue.md`
- Summary: `/docs/request-queue-implementation-summary.md`
- Quick Reference: `/docs/request-queue-quick-reference.md` (this file)

**Source Code**:
- Queue Implementation: `/src/lib/utils/requestQueue.ts`
- Integration: `/src/lib/openai/compliance-analysis-modular.ts`
