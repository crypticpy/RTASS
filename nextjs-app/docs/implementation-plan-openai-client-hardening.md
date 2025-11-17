# Implementation Plan: OpenAI Client Hardening

## Situation Assessment

### Current State Analysis
The OpenAI client configuration has several critical issues based on official SDK v6.1.0 best practices:

1. **Timeout Issues:**
   - No explicit timeout configured (using 10-minute default!)
   - This is far too long for production use cases
   - Could cause request pile-ups and poor UX

2. **Retry Configuration:**
   - No explicit `maxRetries` setting (using default of 2)
   - Should be explicitly configured for production reliability

3. **Error Handling:**
   - Generic error handling without specific APIError detection
   - Not catching OpenAI's specific error properties (status, code, type, request_id)
   - Missing rate limit error handling (429)
   - Missing service unavailability handling (503)
   - Missing context length exceeded errors

4. **Per-Operation Timeout Missing:**
   - Whisper transcription: Large audio files need longer timeouts (5 minutes)
   - GPT-4.1 compliance/templates: Complex analysis needs moderate timeouts (3 minutes)
   - Currently all operations use same 10-minute default

5. **Logging Deficiencies:**
   - Not capturing OpenAI request IDs for debugging
   - Missing structured error context

### Files Requiring Modification

1. `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/openai/client.ts`
   - Add explicit timeout configuration (2 minutes default)
   - Add explicit maxRetries configuration (3 retries)
   - Update documentation

2. `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/openai/whisper.ts`
   - Add per-request timeout: 5 minutes (300,000ms)
   - Add specific APIError handling
   - Improve error logging with request IDs

3. `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/openai/compliance-analysis-modular.ts`
   - Add per-request timeout: 3 minutes (180,000ms)
   - Add specific APIError handling with status/code/type
   - Handle rate limits (429) and service unavailability (503)
   - Handle context length exceeded errors

4. `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/openai/template-generation.ts`
   - Add per-request timeout: 3 minutes (180,000ms)
   - Add specific APIError handling
   - Consistent error handling pattern

5. `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/openai/errors.ts`
   - Add new error types: ContextLengthExceededError, ServiceUnavailableError
   - Enhance RateLimitError with more context

6. `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/services/utils/errorHandlers.ts`
   - Add helper functions for OpenAI-specific errors
   - Add `Errors.rateLimited()` factory
   - Add `Errors.serviceUnavailable()` factory
   - Add `Errors.contextLimitExceeded()` factory

## Strategy

### High-Level Approach

1. **Client Configuration Hardening**
   - Set explicit, production-appropriate defaults
   - Document timeout rationale
   - Maintain backward compatibility

2. **Per-Operation Timeout Strategy**
   - Whisper: 5 minutes (large audio processing)
   - GPT-4.1 responses: 3 minutes (complex analysis)
   - Default: 2 minutes (general operations)

3. **Enhanced Error Handling**
   - Catch OpenAI.APIError instances specifically
   - Extract structured error information (status, code, type, request_id)
   - Map to appropriate service errors
   - Include request IDs in all error logs

4. **Retry Logic**
   - Increase from 2 to 3 retries
   - Rely on SDK's built-in exponential backoff
   - Works automatically for 429, 500, 502, 503, 504

### Technical Decisions

1. **Why these timeout values?**
   - Whisper 5 min: Audio files can be large, transcription is CPU-intensive
   - GPT-4.1 3 min: Complex compliance analysis needs time but shouldn't hang forever
   - Default 2 min: Down from 10 min to prevent request pile-up

2. **Why 3 retries?**
   - OpenAI default is 2, we increase to 3 for better resilience
   - Automatic exponential backoff prevents thundering herd
   - Balances reliability vs. latency

3. **Import strategy for APIError**
   ```typescript
   import OpenAI from 'openai';

   // Then check with:
   if (error instanceof OpenAI.APIError) { ... }
   ```

## Detailed Implementation Plan

### Step 1: Update Client Configuration
**File:** `src/lib/openai/client.ts`

**Changes:**
- Add `maxRetries: 3` to client config
- Add `timeout: 120 * 1000` (2 minutes) to client config
- Add comprehensive JSDoc explaining timeout strategy
- Update logger.info to include timeout/retry config

**Rationale:**
- Explicit configuration prevents reliance on SDK defaults
- Documentation ensures maintainability
- Logging provides observability

### Step 2: Enhance Error Types
**File:** `src/lib/openai/errors.ts`

**New error types:**
1. `ContextLengthExceededError` - For when content exceeds model limits
2. `ServiceUnavailableError` - For 503 responses

**Enhanced types:**
- `RateLimitError` - Add requestId property

### Step 3: Add Error Helper Functions
**File:** `src/lib/services/utils/errorHandlers.ts`

**New factory functions:**
- `Errors.rateLimited(resource: string)`
- `Errors.serviceUnavailable(service: string)`
- `Errors.contextLimitExceeded(limit: number, actual: number)`

### Step 4: Harden Whisper Integration
**File:** `src/lib/openai/whisper.ts`

**Changes:**
1. Add timeout option to API call (5 minutes)
2. Import OpenAI for APIError checking
3. Add try-catch with specific error handling:
   - Check `error instanceof OpenAI.APIError`
   - Extract status, code, type, request_id
   - Log structured error data
   - Map to appropriate TranscriptionError

### Step 5: Harden Compliance Analysis
**File:** `src/lib/openai/compliance-analysis-modular.ts`

**Changes (both `scoreSingleCategory` and `generateAuditNarrative`):**
1. Add timeout option to API calls (3 minutes)
2. Import OpenAI for APIError checking
3. Add specific error handling:
   - 429 → throw Errors.rateLimited()
   - 503 → throw Errors.serviceUnavailable()
   - context_length_exceeded → throw Errors.contextLimitExceeded()
   - Other APIErrors → log with request_id and rethrow

### Step 6: Harden Template Generation
**File:** `src/lib/openai/template-generation.ts`

**Changes:**
1. Add timeout option to API call (3 minutes)
2. Import OpenAI for APIError checking
3. Add specific error handling (same pattern as compliance-analysis)

### Step 7: Testing & Validation
- Verify timeout configuration takes effect
- Test error handling with simulated failures
- Confirm logging includes request IDs
- Validate per-operation timeouts work correctly

## Implementation Order

1. ✅ **Error Infrastructure** (Step 2-3)
   - Create new error types
   - Add helper functions
   - Foundation for other changes

2. ✅ **Client Configuration** (Step 1)
   - Update client with timeouts and retries
   - Document configuration

3. ✅ **Service Hardening** (Steps 4-6)
   - Whisper integration
   - Compliance analysis
   - Template generation
   - All use same patterns

4. ✅ **Validation**
   - Code review
   - Documentation check
   - Error handling verification

## Expected Outcomes

### Performance Improvements
- ✅ Requests timeout after reasonable durations (not 10 minutes!)
- ✅ Better resource utilization (no hung connections)
- ✅ Improved user experience (faster failure detection)

### Reliability Improvements
- ✅ 3 retries with exponential backoff (up from 2)
- ✅ Specific handling for rate limits (429)
- ✅ Specific handling for service unavailability (503)
- ✅ Graceful handling of context limit exceeded

### Observability Improvements
- ✅ Request IDs in all error logs
- ✅ Structured error information (status, code, type)
- ✅ Better debugging capabilities
- ✅ Clear timeout configuration visibility

### Maintainability Improvements
- ✅ Explicit configuration (no hidden defaults)
- ✅ Comprehensive documentation
- ✅ Consistent error handling patterns
- ✅ Type-safe error detection

## Risk Mitigation

### Potential Issues

1. **Timeout too short for some operations**
   - Mitigation: Per-operation timeouts allow tuning
   - Monitoring: Log timeout errors to identify if adjustments needed

2. **Breaking changes if SDK behavior changes**
   - Mitigation: Explicit version pinning in package.json
   - Monitoring: Test suite covers error handling

3. **Retry storms during outages**
   - Mitigation: SDK's exponential backoff prevents this
   - Monitoring: Log retry attempts to detect issues

## Success Criteria

- ✅ All OpenAI API calls have explicit timeout configuration
- ✅ Error handling catches OpenAI.APIError specifically
- ✅ Request IDs logged for all errors
- ✅ Rate limit errors handled gracefully
- ✅ Service unavailability handled gracefully
- ✅ Context length errors handled with clear messages
- ✅ No regression in existing functionality
- ✅ Documentation updated to reflect changes
