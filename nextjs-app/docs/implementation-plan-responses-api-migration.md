# Implementation Plan: OpenAI Responses API Migration

**Date**: 2025-10-05
**Feature**: Refactor Template Generation to Use OpenAI Responses API with Structured Outputs
**Scope**: `src/lib/openai/template-generation.ts`, `src/lib/services/templateGeneration.ts`

---

## 1. Situation Assessment

### Current State Analysis

#### Existing Implementation

**File**: `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/openai/template-generation.ts`
- Uses legacy `chat.completions.create()` API
- Manual JSON parsing with `parseJSONResponse()` utility
- Uses `response_format: { type: 'json_object' }` for JSON mode
- Model: `gpt-4-turbo-preview` (DEFAULT_MODEL)
- Manual validation and transformation of responses
- Error-prone JSON parsing with potential for malformed responses

**File**: `/Users/aiml/Projects/transcriber/nextjs-app/src/lib/services/templateGeneration.ts`
- Already migrated to new Responses API (`client.responses.create()`)
- Uses `gpt-4.1` model
- Uses `text.format.json_schema` with strict mode
- Has multi-turn template generation with full-context per turn
- Custom `extractJsonPayload()` and `parseJsonPayload()` methods
- No Zod schema usage - relies on plain JSON schema objects

#### Dependencies

- **OpenAI SDK**: `openai@^6.1.0` (package.json line 42)
- **Zod**: `zod@^4.1.11` (package.json line 51) - Latest Zod 4.x
- **Client utilities**: `src/lib/services/utils/openai.ts` provides `getOpenAIClient()`, `withRateLimit()`, `trackTokenUsage()`
- **Legacy client**: `src/lib/openai/client.ts` provides singleton `openai` client

#### Key Findings

1. **Inconsistent Migration**: `templateGeneration.ts` service has partially migrated to Responses API, but `template-generation.ts` OpenAI integration is still using legacy Chat Completions API
2. **No Zod Integration**: Both files use plain JSON schema objects instead of Zod schemas
3. **Manual Parsing**: Custom JSON extraction and parsing logic prone to errors
4. **Model Inconsistency**: Using `gpt-4-turbo-preview` in legacy file vs `gpt-4.1` in service layer
5. **Duplicate Functionality**: Both files handle template generation with different approaches

### Architecture Issues

1. **Separation of Concerns**: The `template-generation.ts` file should be the low-level OpenAI integration, while `templateGeneration.ts` should orchestrate multi-turn flows
2. **Type Safety**: No compile-time type checking for response schemas
3. **Error Handling**: Inconsistent error handling between manual JSON parsing and structured outputs

---

## 2. Strategy

### High-Level Approach

1. **Consolidate on Responses API**: Fully migrate to `client.responses.create()` across all template generation code
2. **Zod Schema Integration**: Define comprehensive Zod schemas for all AI responses using Zod 4.x features
3. **Eliminate Manual Parsing**: Remove all custom JSON parsing logic in favor of structured outputs
4. **Unified Error Handling**: Implement robust error handling for refusals, incomplete responses, and validation failures
5. **Model Standardization**: Use `gpt-4.1` across all template generation operations
6. **Maintain Multi-Turn Architecture**: Preserve the full-context multi-turn generation flow

### Migration Pattern

```typescript
// OLD APPROACH (Chat Completions API)
const completion = await openai.chat.completions.create({
  model: 'gpt-4-turbo-preview',
  messages: [...],
  response_format: { type: 'json_object' }
});
const parsed = JSON.parse(completion.choices[0].message.content);

// NEW APPROACH (Responses API with Zod)
import { zodResponseFormat } from 'openai/helpers/zod';

const response = await client.responses.parse({
  model: 'gpt-4.1',
  messages: [...],
  response_format: zodResponseFormat(MyZodSchema, 'schema_name')
});
const parsed = response.parsed; // Fully typed and validated
```

### Key Technical Decisions

1. **Use Zod 4.x `z.object()` schemas**: Zod 4.x has full OpenAI integration support
2. **Leverage `zodResponseFormat()` helper**: Converts Zod schemas to OpenAI-compatible JSON schemas
3. **Handle `response.parsed` vs `response.refusal`**: Proper branching for different response types
4. **Preserve rate limiting**: Continue using `withRateLimit()` wrapper
5. **Maintain token tracking**: Keep `trackTokenUsage()` integration for cost monitoring

---

## 3. Detailed Implementation Plan

### Phase 1: Define Zod Schemas

**Objective**: Create comprehensive Zod schemas for all AI response types

**Tasks**:
1. Create new file: `src/lib/openai/schemas/template-generation.ts`
2. Define Zod schemas:
   - `GeneratedTemplateSchema` - Main template generation response
   - `TemplateCategorySchema` - Category structure
   - `TemplateCriterionSchema` - Individual criterion
   - `DocumentAnalysisSchema` - Document analysis response
   - `CategoryDiscoverySchema` - Multi-turn category discovery
   - `CriteriaGenerationSchema` - Multi-turn criteria generation

**Schema Structure** (example):
```typescript
import { z } from 'zod';

export const TemplateCriterionSchema = z.object({
  id: z.string(),
  description: z.string(),
  scoringGuidance: z.string(),
  sourcePageNumber: z.number().optional(),
  sourceText: z.string().optional(),
  examplePass: z.string().optional(),
  exampleFail: z.string().optional(),
});

export const TemplateCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  weight: z.number().min(0).max(1),
  criteria: z.array(TemplateCriterionSchema),
  analysisPrompt: z.string(),
});

export const GeneratedTemplateSchema = z.object({
  categories: z.array(TemplateCategorySchema),
  confidence: z.number().min(0).max(1),
  notes: z.array(z.string()),
});
```

### Phase 2: Refactor `template-generation.ts`

**Objective**: Migrate low-level OpenAI integration to Responses API

**File**: `src/lib/openai/template-generation.ts`

**Changes**:
1. **Replace imports**:
   - Remove: `parseJSONResponse`, `validateResponseFields` from `./utils`
   - Add: `zodResponseFormat` from `openai/helpers/zod`
   - Add: Schema imports from `./schemas/template-generation`

2. **Update `generateTemplateFromPolicies()` function**:
   - Replace `openai.chat.completions.create()` with `openai.responses.parse()`
   - Use `zodResponseFormat(GeneratedTemplateSchema, 'template_generation')`
   - Handle `response.parsed` and `response.refusal`
   - Remove manual JSON parsing
   - Update model to `gpt-4.1`

3. **Simplify validation**:
   - Remove `validateAndTransformTemplate()` function (Zod handles this)
   - Remove manual weight validation (enforce in schema with refinements)

4. **Preserve exports**:
   - Keep `GeneratedTemplate`, `TemplateCategory`, `TemplateCriterion` interfaces (derive from Zod schemas)
   - Keep `normalizeWeights()` utility function

### Phase 3: Refactor `templateGeneration.ts`

**Objective**: Update service layer to use Zod schemas and new response handling

**File**: `src/lib/services/templateGeneration.ts`

**Changes**:
1. **Replace JSON schemas with Zod schemas**:
   - Remove `GPT4_DOCUMENT_ANALYSIS_SCHEMA` JSON object
   - Import Zod schemas from `../openai/schemas/template-generation`
   - Use `zodResponseFormat()` in all API calls

2. **Update `analyzeDocument()` method**:
   - Replace `client.responses.create()` with `client.responses.parse()`
   - Use `zodResponseFormat(DocumentAnalysisSchema, 'policy_analysis')`
   - Replace `extractJsonPayload()` and `parseJsonPayload()` with `response.parsed`
   - Add refusal handling

3. **Update `discoverCategoriesFullContext()` method**:
   - Replace `client.responses.create()` with `client.responses.parse()`
   - Use `zodResponseFormat(CategoryDiscoverySchema, 'category_discovery')`
   - Remove manual JSON extraction
   - Handle typed response directly

4. **Update `generateCriteriaForCategoryFullContext()` method**:
   - Replace `client.responses.create()` with `client.responses.parse()`
   - Use `zodResponseFormat(CriteriaGenerationSchema, 'criteria_generation')`
   - Remove manual JSON extraction

5. **Remove utility methods**:
   - Delete `extractJsonPayload()` - no longer needed with structured outputs
   - Delete `parseJsonPayload()` - Zod handles validation

6. **Add error handling**:
   - Check for `response.refusal` in all methods
   - Throw appropriate errors for incomplete/refused responses
   - Preserve existing error wrapping with `Errors.processingFailed()`

### Phase 4: Type Safety Improvements

**Objective**: Ensure end-to-end type safety

**Changes**:
1. **Derive TypeScript types from Zod schemas**:
```typescript
export type GeneratedTemplate = z.infer<typeof GeneratedTemplateSchema>;
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;
export type TemplateCriterion = z.infer<typeof TemplateCriterionSchema>;
```

2. **Update type exports**:
   - Export types from `schemas/template-generation.ts`
   - Re-export from `lib/types/index.ts` if needed

3. **Ensure consistency**:
   - Match schema definitions with existing `ComplianceCategory`, `ComplianceCriterion` types from `lib/types/index.ts`

### Phase 5: Error Handling Enhancement

**Objective**: Robust handling of all failure modes

**Error Cases**:
1. **Refusals**: `response.refusal` is set when AI refuses to respond
2. **Incomplete responses**: `response.parsed` is null
3. **Validation failures**: Zod schema validation fails
4. **Rate limiting**: Existing `withRateLimit()` handles this
5. **Network errors**: OpenAI SDK handles with retries

**Implementation**:
```typescript
const response = await client.responses.parse({
  model: 'gpt-4.1',
  messages: [...],
  response_format: zodResponseFormat(MySchema, 'schema_name')
});

if (response.refusal) {
  throw new AnalysisError(
    `AI refused to generate template: ${response.refusal}`,
    'template-generation'
  );
}

if (!response.parsed) {
  throw new AnalysisError(
    'Incomplete response from AI - no parsed output available',
    'template-generation'
  );
}

// response.parsed is fully typed and validated by Zod
return response.parsed;
```

---

## 4. Risk Mitigation

### Potential Issues

1. **Breaking Changes**: Zod schema might not match existing JSON responses exactly
   - **Mitigation**: Define schemas to match current response structures, add optional fields where needed

2. **Performance**: Zod validation adds overhead
   - **Mitigation**: Zod 4.x is highly optimized; negligible impact for our use case

3. **API Changes**: OpenAI API evolving rapidly
   - **Mitigation**: Pin `openai` SDK version, test thoroughly, monitor OpenAI changelog

4. **Schema Mismatch**: AI might generate responses that don't match schema
   - **Mitigation**: Use `strict: true` in Zod schemas, add refinements for business logic validation

5. **Multi-turn State**: Preserving state across turns
   - **Mitigation**: Already solved - full-context approach sends complete text each turn

### Rollback Strategy

1. **Git branch**: Create feature branch for migration
2. **Preserve old code**: Comment out old implementations, don't delete initially
3. **Feature flag**: If needed, add environment variable to toggle between old/new implementations
4. **Tests**: Run existing tests to ensure parity

---

## 5. Testing Strategy

### Unit Tests

**File**: `__tests__/services/templateGeneration.test.ts`

**Test Cases**:
1. **Successful template generation**:
   - Mock OpenAI `responses.parse()` to return valid parsed data
   - Verify response structure matches Zod schema
   - Check all fields are populated correctly

2. **Refusal handling**:
   - Mock response with `refusal` set
   - Verify appropriate error is thrown

3. **Incomplete response handling**:
   - Mock response with `parsed: null`
   - Verify error handling

4. **Zod validation failure**:
   - Mock response with invalid data (should not happen with strict mode, but test anyway)
   - Verify Zod throws validation error

5. **Multi-turn flow**:
   - Mock sequential `responses.parse()` calls for category discovery, criteria generation
   - Verify state is preserved and responses are combined correctly

### Integration Tests

1. **End-to-end with real API** (optional, for manual testing):
   - Test with sample policy document
   - Verify template is generated successfully
   - Check all categories and criteria are valid

### Manual Verification

1. **Compare outputs**: Generate template with old and new implementations, compare results
2. **Database integration**: Verify templates save correctly to Prisma
3. **API endpoint**: Test `/api/policy/generate-template` route

---

## 6. Implementation Checklist

- [ ] Create `src/lib/openai/schemas/template-generation.ts` with all Zod schemas
- [ ] Refactor `src/lib/openai/template-generation.ts` to use Responses API
- [ ] Refactor `src/lib/services/templateGeneration.ts` to use Zod schemas
- [ ] Update type exports in `src/lib/types/index.ts`
- [ ] Add comprehensive error handling for refusals and incomplete responses
- [ ] Update unit tests to mock `responses.parse()`
- [ ] Run test suite: `npm run test:policy`
- [ ] Manual testing with sample policy documents
- [ ] Update documentation in CLAUDE.md
- [ ] Create migration notes document

---

## 7. Post-Migration

### Documentation Updates

1. **CLAUDE.md**:
   - Update OpenAI integration section to mention Responses API
   - Document Zod schema usage
   - Update example code snippets

2. **OpenAI README** (`src/lib/openai/README.md`):
   - Add section on Responses API with structured outputs
   - Document Zod schema patterns
   - Provide examples

### Monitoring

1. **Token usage**: Verify `trackTokenUsage()` still works correctly
2. **Error rates**: Monitor for increased validation errors
3. **Response quality**: Compare template quality before/after migration
4. **Performance**: Check response times haven't degraded

### Cleanup

1. Remove commented-out old code after 1-2 weeks of stable operation
2. Delete unused utility functions (`parseJSONResponse`, `validateResponseFields`)
3. Archive old implementation in git history

---

## 8. Success Criteria

✅ All template generation uses `client.responses.parse()` with Zod schemas
✅ No manual JSON parsing with `JSON.parse()`
✅ All responses are type-safe with compile-time checking
✅ Error handling covers refusals, incomplete responses, and validation failures
✅ All existing tests pass
✅ Generated templates match previous quality and structure
✅ Token usage tracking continues to work
✅ Documentation is updated

---

## 9. Timeline Estimate

- **Phase 1** (Zod schemas): 1-2 hours
- **Phase 2** (`template-generation.ts`): 2-3 hours
- **Phase 3** (`templateGeneration.ts`): 3-4 hours
- **Phase 4** (Type safety): 1 hour
- **Phase 5** (Error handling): 1-2 hours
- **Testing**: 2-3 hours
- **Documentation**: 1 hour

**Total**: 11-16 hours of focused development

---

## Notes

- The OpenAI SDK version 6.1.0 is recent but may not have all Responses API features. Verify `responses.parse()` is available.
- Zod 4.1.11 is the latest version with full TypeScript 5.x support.
- The `zodResponseFormat()` helper should be available in `openai/helpers/zod`.
- If `responses.parse()` is not available, may need to upgrade OpenAI SDK or use `responses.create()` with manual Zod validation.
