# Circuit Breaker Implementation Plan

**Date:** 2025-11-16
**Feature:** Production-ready circuit breaker pattern for OpenAI API calls
**Priority:** High (Reliability & Resilience)

---

## Situation Assessment

### Current State

**Existing OpenAI Integration:**
- Centralized OpenAI client in `src/lib/openai/client.ts`
- Retry logic with exponential backoff in `src/lib/openai/utils.ts` (`retryWithBackoff`)
- Two primary OpenAI API endpoints:
  - **GPT-4.1** via `client.responses.create()` in:
    - `src/lib/openai/compliance-analysis-modular.ts` (category-by-category compliance scoring)
    - `src/lib/openai/template-generation.ts` (policy template generation)
  - **Whisper** via `client.audio.transcriptions.create()` in:
    - `src/lib/openai/whisper.ts` (audio transcription)
- Comprehensive logging integration via `src/lib/logging/`
- Custom error types: `OpenAIError`, `RateLimitError`, `TranscriptionError`, `AnalysisError`

**Gaps Identified:**
1. **No circuit breaker protection** - Cascading failures can occur if OpenAI API goes down
2. **No service-level isolation** - Whisper failures can't be isolated from GPT-4.1 failures
3. **No automatic recovery testing** - System doesn't test if API has recovered before retrying
4. **No metrics for monitoring** - No visibility into circuit breaker state for dashboards

### Requirements

**Functional Requirements:**
- ✅ Prevent cascading failures when OpenAI API is degraded
- ✅ Separate circuit breakers for Whisper and GPT-4.1 (isolated failure domains)
- ✅ Automatic recovery testing with half-open state
- ✅ Configurable failure thresholds and timeout periods
- ✅ Integration with existing retry logic (circuit breaker wraps retry logic)
- ✅ Comprehensive logging for monitoring and debugging

**Non-Functional Requirements:**
- ✅ Zero breaking changes to existing OpenAI integration code
- ✅ Preserve GPT-4.1 and Responses API requirements (DO NOT change model or API)
- ✅ Type-safe implementation with TypeScript
- ✅ Production-grade error handling
- ✅ Metrics exportable for dashboard integration

---

## Strategy

### Architecture Overview

**Circuit Breaker Pattern:**
```
┌─────────────────────────────────────────────────────────────┐
│                     Circuit Breaker                          │
│                                                               │
│  CLOSED ──[5 failures]──> OPEN ──[60s timeout]──> HALF_OPEN │
│    ▲                        │                         │       │
│    │                        │                         │       │
│    └───[2 successes]────────┴─────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

**States:**
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Too many failures, reject requests immediately with error
- **HALF_OPEN**: Testing if service recovered (allow limited requests)

**Integration Points:**
1. Create `src/lib/utils/circuitBreaker.ts` with `CircuitBreaker` class
2. Wrap OpenAI API calls in `compliance-analysis-modular.ts` (2 locations)
3. Wrap OpenAI API calls in `template-generation.ts` (1 location)
4. Wrap OpenAI API calls in `whisper.ts` (1 location)

### Design Decisions

**1. Separate Circuit Breakers for Each Service**
- **Decision**: Create distinct circuit breakers for `openaiGPT4` and `openaiWhisper`
- **Rationale**: Whisper and GPT-4.1 are separate API endpoints with different failure characteristics. Isolating them prevents Whisper failures from blocking GPT-4.1 and vice versa.

**2. Circuit Breaker Wraps Retry Logic**
- **Decision**: Circuit breaker executes before retry logic
- **Rationale**: If circuit is open, don't waste time retrying. Fail fast and preserve resources.

**3. Configuration Values**
- **Failure Threshold**: 5 consecutive failures before opening circuit
- **Success Threshold**: 2 consecutive successes in half-open state to close circuit
- **Timeout**: 60 seconds before attempting recovery
- **Rationale**: Conservative values that balance resilience with availability

**4. Integration with Existing Logging**
- **Decision**: Use existing `logger` from `src/lib/logging/logger.ts`
- **Rationale**: Consistent structured logging across the application

---

## Detailed Implementation Plan

### Phase 1: Create Circuit Breaker Core

**File:** `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/utils/circuitBreaker.ts`

**Implementation:**
1. Define `CircuitState` type: `'CLOSED' | 'OPEN' | 'HALF_OPEN'`
2. Define `CircuitBreakerConfig` interface with:
   - `failureThreshold: number`
   - `successThreshold: number`
   - `timeout: number` (milliseconds)
   - `name: string` (for logging)
3. Implement `CircuitBreaker` class with:
   - Private state tracking: `state`, `failureCount`, `successCount`, `nextAttempt`
   - Public `execute<T>(fn: () => Promise<T>): Promise<T>` method
   - Private `onSuccess()` and `onFailure()` state transition methods
   - Public `getState(): CircuitState` for monitoring
   - Public `getMetrics()` for dashboard integration
   - Public `reset()` for testing
4. Create singleton instances:
   - `circuitBreakers.openaiGPT4`
   - `circuitBreakers.openaiWhisper`
5. Comprehensive JSDoc documentation with examples

**Success Criteria:**
- ✅ All TypeScript types are properly defined
- ✅ State transitions follow circuit breaker pattern correctly
- ✅ Logger integration with structured metadata
- ✅ Error handling for open circuit state

### Phase 2: Integrate with Compliance Analysis (GPT-4.1)

**File:** `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/openai/compliance-analysis-modular.ts`

**Locations to Modify:**

1. **`scoreSingleCategory` function** (lines 356-497):
   - Import: `import { circuitBreakers } from '@/lib/utils/circuitBreaker';`
   - Wrap the `wrapOpenAICall` block (lines 387-412) with circuit breaker:
   ```typescript
   const completion = await circuitBreakers.openaiGPT4.execute(async () => {
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
   ```

2. **`generateAuditNarrative` function** (lines 532-657):
   - Wrap the `wrapOpenAICall` block (lines 557-581) with circuit breaker:
   ```typescript
   const completion = await circuitBreakers.openaiGPT4.execute(async () => {
     return await wrapOpenAICall(...);
   });
   ```

**Success Criteria:**
- ✅ Both GPT-4.1 API calls protected by circuit breaker
- ✅ No changes to model or API endpoint (still uses `gpt-4.1` and `responses.create`)
- ✅ Error handling preserves existing error types
- ✅ Logging includes circuit breaker state

### Phase 3: Integrate with Template Generation (GPT-4.1)

**File:** `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/openai/template-generation.ts`

**Location to Modify:**

1. **`generateTemplateFromPolicies` function**:
   - Find the `wrapOpenAICall` block that calls `openai.responses.create`
   - Wrap with circuit breaker:
   ```typescript
   const completion = await circuitBreakers.openaiGPT4.execute(async () => {
     return await wrapOpenAICall(...);
   });
   ```

**Success Criteria:**
- ✅ Template generation API call protected by circuit breaker
- ✅ No changes to model or API endpoint
- ✅ Shares same circuit breaker instance as compliance analysis

### Phase 4: Integrate with Whisper Transcription

**File:** `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/openai/whisper.ts`

**Location to Modify:**

1. **`transcribeAudio` function** (lines 77-135):
   - Import: `import { circuitBreakers } from '@/lib/utils/circuitBreaker';`
   - Wrap the `retryWithBackoff` block (lines 97-107) with circuit breaker:
   ```typescript
   const result = await circuitBreakers.openaiWhisper.execute(async () => {
     return await retryWithBackoff(async () => {
       return await openai.audio.transcriptions.create({...}, {
         timeout: 5 * 60 * 1000, // 5 minute timeout
       });
     });
   });
   ```

**Success Criteria:**
- ✅ Whisper API call protected by separate circuit breaker
- ✅ Failure isolation from GPT-4.1 circuit breaker
- ✅ Preserves existing transcription logic

### Phase 5: Testing & Validation

**Manual Testing Checklist:**
1. ✅ Test circuit breaker opens after 5 consecutive failures
2. ✅ Test circuit breaker rejects requests when open
3. ✅ Test circuit breaker transitions to half-open after timeout
4. ✅ Test circuit breaker closes after 2 successes in half-open
5. ✅ Test circuit breaker isolation (Whisper vs GPT-4.1)
6. ✅ Verify logging output contains circuit breaker metadata
7. ✅ Verify metrics endpoint returns circuit breaker state

**Integration Testing:**
- ✅ Run existing compliance analysis tests
- ✅ Run existing template generation tests
- ✅ Run existing transcription tests
- ✅ Verify no regressions in existing functionality

---

## Technical Specifications

### Circuit Breaker API

```typescript
/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;    // 5 failures to open
  successThreshold: number;    // 2 successes to close from half-open
  timeout: number;             // 60000ms (1 minute) before half-open
  name: string;                // 'openai-gpt4' or 'openai-whisper'
}

/**
 * Circuit breaker class
 */
class CircuitBreaker {
  constructor(config: CircuitBreakerConfig);

  // Execute function with circuit protection
  execute<T>(fn: () => Promise<T>): Promise<T>;

  // Get current state for monitoring
  getState(): CircuitState;

  // Get metrics for dashboard
  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    nextAttempt: string | null;
  };

  // Reset circuit (for testing only)
  reset(): void;
}
```

### Error Handling

**When Circuit is Open:**
```typescript
throw new Error(`Circuit breaker open for ${this.config.name}`);
```

**Error Flow:**
1. Circuit breaker throws error
2. Existing error handlers in API routes catch and return appropriate HTTP status
3. Client receives 503 Service Unavailable (or similar) response

### Logging Schema

**Circuit Breaker Events:**
```typescript
// Initialization
logger.info('Circuit breaker initialized', {
  component: 'circuit-breaker',
  name: 'openai-gpt4',
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000,
});

// State transitions
logger.info('Circuit breaker opened due to failures', {
  component: 'circuit-breaker',
  name: 'openai-gpt4',
  state: 'OPEN',
  failureCount: 5,
  nextAttempt: '2025-11-16T15:45:00.000Z',
});

logger.info('Circuit breaker transitioning to half-open', {
  component: 'circuit-breaker',
  name: 'openai-gpt4',
  state: 'HALF_OPEN',
});

logger.info('Circuit breaker closed after recovery', {
  component: 'circuit-breaker',
  name: 'openai-gpt4',
  state: 'CLOSED',
});

// Request rejections
logger.warn('Circuit breaker open, rejecting request', {
  component: 'circuit-breaker',
  name: 'openai-gpt4',
  state: 'OPEN',
  nextAttempt: '2025-11-16T15:45:00.000Z',
});
```

---

## Risk Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:**
- Circuit breaker wraps existing retry logic, doesn't replace it
- Comprehensive testing of all integration points
- Preserve all existing error types and handling

### Risk 2: False Positives (Circuit Opens Unnecessarily)
**Mitigation:**
- Conservative failure threshold (5 failures)
- Only open circuit on retryable errors
- Manual reset capability for testing

### Risk 3: Model/API Changes
**Mitigation:**
- **DO NOT modify model or API endpoint** (critical requirement)
- Circuit breaker only wraps execution, doesn't change parameters
- Add comments in code to prevent future modifications

---

## Expected Outcomes

### Functional Outcomes
- ✅ Circuit breaker prevents cascading failures during OpenAI API outages
- ✅ Automatic recovery testing reduces manual intervention
- ✅ Separate circuit breakers provide service-level isolation
- ✅ Fail-fast behavior preserves system resources

### Observability Outcomes
- ✅ Comprehensive logging for debugging and monitoring
- ✅ Metrics available for dashboard integration
- ✅ Clear visibility into circuit breaker state and transitions

### Code Quality Outcomes
- ✅ Production-ready implementation with comprehensive documentation
- ✅ Type-safe TypeScript implementation
- ✅ Zero breaking changes to existing OpenAI integration
- ✅ Follows existing code patterns and conventions

---

## Future Enhancements

1. **Dashboard Integration**: Add circuit breaker metrics to admin dashboard
2. **Alerting**: Notify administrators when circuit opens
3. **Dynamic Configuration**: Allow runtime adjustment of thresholds
4. **Circuit Breaker Per-Operation**: More granular circuit breakers (e.g., separate for category scoring vs narrative generation)
5. **Metrics Export**: Export circuit breaker metrics to monitoring systems (Prometheus, Datadog, etc.)

---

## References

- **Martin Fowler - Circuit Breaker Pattern**: https://martinfowler.com/bliki/CircuitBreaker.html
- **Microsoft Azure - Circuit Breaker Pattern**: https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker
- **Project CLAUDE.md**: OpenAI API requirements and protected files
