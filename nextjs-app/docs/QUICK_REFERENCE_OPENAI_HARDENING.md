# OpenAI Client Hardening - Quick Reference

## Timeout Values

| Operation | File | Line | Timeout | Reason |
|-----------|------|------|---------|--------|
| **Client Default** | `client.ts` | 76 | 2 min (120,000ms) | Down from 10-minute SDK default |
| **Whisper API** | `whisper.ts` | 121 | 5 min (300,000ms) | Large audio file processing |
| **GPT-4.1 Category** | `compliance-analysis-modular.ts` | 424 | 3 min (180,000ms) | Complex category analysis |
| **GPT-4.1 Narrative** | `compliance-analysis-modular.ts` | 604 | 3 min (180,000ms) | Narrative synthesis |
| **GPT-4.1 Template** | `template-generation.ts` | 205 | 3 min (180,000ms) | Policy template generation |

## Retry Configuration

- **maxRetries**: 3 (up from SDK default of 2)
- **Location**: `client.ts:75`
- **Automatic Backoff**: Exponential (SDK built-in)
- **Retryable Errors**: 429, 500, 502, 503, 504

## New Error Types

| Error Type | File | Line | HTTP Status | Use Case |
|------------|------|------|-------------|----------|
| `ContextLengthExceededError` | `errors.ts` | 82-93 | 400 | Content exceeds model limit |
| `ServiceUnavailableError` | `errors.ts` | 98-108 | 503 | OpenAI API unavailable |
| `RateLimitError` (enhanced) | `errors.ts` | 22-32 | 429 | Rate limit with request ID |

## New Error Factory Functions

| Function | File | Line | Returns |
|----------|------|------|---------|
| `Errors.rateLimited(resource)` | `errorHandlers.ts` | 385-391 | ServiceError (429) |
| `Errors.serviceUnavailable(service)` | `errorHandlers.ts` | 396-402 | ServiceError (503) |
| `Errors.contextLimitExceeded(limit, actual)` | `errorHandlers.ts` | 407-413 | ServiceError (400) |

## Error Handling Pattern

All OpenAI integrations now follow this pattern:

```typescript
try {
  const result = await openai.responses.create(
    { /* config */ },
    { timeout: 3 * 60 * 1000 } // Per-request timeout
  );
} catch (error) {
  // Catch OpenAI.APIError specifically
  if (error instanceof OpenAI.APIError) {
    logger.error('OpenAI API error', {
      status: error.status,
      code: error.code,
      type: error.type,
      requestId: error.request_id, // ← For debugging
    });

    // Handle specific cases
    if (error.status === 429) throw Errors.rateLimited('OpenAI API');
    if (error.status === 503) throw Errors.serviceUnavailable('OpenAI API');
    if (error.code === 'context_length_exceeded') throw Errors.contextLimitExceeded();
  }
  
  // Other error handling...
}
```

## Files Modified

1. `/src/lib/openai/client.ts` - Client configuration
2. `/src/lib/openai/errors.ts` - Error types
3. `/src/lib/services/utils/errorHandlers.ts` - Error factories
4. `/src/lib/openai/whisper.ts` - Whisper integration
5. `/src/lib/openai/compliance-analysis-modular.ts` - Compliance analysis
6. `/src/lib/openai/template-generation.ts` - Template generation

## Key Improvements

✅ **10-minute default eliminated** (now 2 minutes)
✅ **3 retries** with exponential backoff
✅ **Per-operation timeouts** for Whisper (5m) and GPT-4.1 (3m)
✅ **Structured error logging** with request IDs
✅ **Specific error handling** for 429, 503, context_length_exceeded
✅ **No breaking changes** - fully backward compatible

## Quick Commands

```bash
# Lint modified files
npx eslint src/lib/openai/*.ts src/lib/services/utils/errorHandlers.ts

# Find timeout configurations
grep -n "timeout:" src/lib/openai/*.ts

# Find error handling blocks
grep -n "instanceof OpenAI.APIError" src/lib/openai/*.ts
```

## Documentation

- Full Summary: `/docs/openai-client-hardening-summary.md`
- Implementation Plan: `/docs/implementation-plan-openai-client-hardening.md`
- Project Guidelines: `/CLAUDE.md`

---

Last Updated: 2025-11-16
