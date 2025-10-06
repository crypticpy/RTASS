# Migration Guide: JSON Schema to Zod

This guide shows how to migrate from manual JSON Schema definitions to Zod schemas for the template generation system.

## Overview

The template generation service currently uses manual JSON Schema definitions. This migration replaces them with type-safe Zod schemas that provide:

- **Type inference** - TypeScript types automatically derived from schemas
- **Runtime validation** - Validate data at runtime with detailed error messages
- **Better DX** - IDE autocomplete, type checking, and refactoring support
- **Reduced boilerplate** - Less code to maintain, single source of truth

## Before: Manual JSON Schema

### Current Implementation (`templateGeneration.ts`)

```typescript
const GPT4_DOCUMENT_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'description', 'weight', 'regulatoryReferences', 'criteria'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          weight: { type: 'number' },
          regulatoryReferences: {
            type: 'array',
            items: { type: 'string' },
          },
          criteria: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'description', 'evidenceRequired', 'scoringMethod', 'weight'],
              properties: {
                id: { type: 'string' },
                description: { type: 'string' },
                evidenceRequired: { type: 'string' },
                scoringMethod: {
                  type: 'string',
                  enum: ['PASS_FAIL', 'NUMERIC', 'CRITICAL_PASS_FAIL'],
                },
                weight: { type: 'number' },
                sourceReference: { type: 'string' },
              },
            },
          },
        },
      },
    },
    emergencyProcedures: {
      type: 'array',
      items: { type: 'string' },
    },
    regulatoryFramework: {
      type: 'array',
      items: { type: 'string' },
    },
    completeness: { type: 'number' },
    confidence: { type: 'number' },
  },
  required: ['categories', 'emergencyProcedures', 'regulatoryFramework', 'completeness', 'confidence'],
  additionalProperties: false,
};

// Usage
const response = await client.responses.create({
  model: 'gpt-4.1',
  input: [...],
  text: {
    format: {
      type: 'json_schema',
      name: 'policy_analysis',
      schema: GPT4_DOCUMENT_ANALYSIS_SCHEMA,
      strict: true,
    },
  },
});

// Manual parsing and type assertion
let content = this.extractJsonPayload(response, 'GPT-4.1 analysis response');
content = content.replace(/^```json\s*\n?/m, '').replace(/\n?```\s*$/m, '');
const analysisResult = this.parseJsonPayload<GPT4DocumentAnalysis>(content, 'parsing');
```

## After: Zod Schema

### New Implementation

```typescript
import { zodTextFormat } from 'openai/helpers/zod';
import { DocumentAnalysisSchema } from '@/lib/schemas/generated-template.schema';
import type { DocumentAnalysis } from '@/lib/schemas/generated-template.schema';

// Usage - much simpler!
const response = await client.responses.create({
  model: 'gpt-4.1',
  input: [...],
  text: {
    format: zodTextFormat(DocumentAnalysisSchema, 'policy_analysis'),
  },
});

// Automatic parsing and validation - no manual JSON parsing needed!
const analysisResult: DocumentAnalysis = response.output_parsed;
```

## Key Changes

### 1. Replace Manual Schema Definitions

**Before:**
```typescript
const GPT4_DOCUMENT_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    categories: {
      type: 'array',
      items: {
        // ... 50+ lines of nested JSON schema
      },
    },
  },
  required: ['categories'],
  additionalProperties: false,
};
```

**After:**
```typescript
import { DocumentAnalysisSchema } from '@/lib/schemas/generated-template.schema';

// That's it! The schema is already defined and typed.
```

### 2. Simplify OpenAI API Calls

**Before:**
```typescript
const response = await client.responses.create({
  model: 'gpt-4.1',
  input: [...],
  temperature: 0.1,
  max_output_tokens: 8000,
  text: {
    format: {
      type: 'json_schema',
      name: 'policy_analysis',
      schema: GPT4_DOCUMENT_ANALYSIS_SCHEMA,
      strict: true,
    },
  },
});
```

**After:**
```typescript
import { zodTextFormat } from 'openai/helpers/zod';

const response = await client.responses.create({
  model: 'gpt-4.1',
  input: [...],
  temperature: 0.1,
  max_output_tokens: 8000,
  text: {
    format: zodTextFormat(DocumentAnalysisSchema, 'policy_analysis'),
  },
});
```

### 3. Remove Manual JSON Parsing

**Before:**
```typescript
// Extract and clean JSON
let content = this.extractJsonPayload(response, 'GPT-4.1 analysis response');
content = content.replace(/^```json\s*\n?/m, '').replace(/\n?```\s*$/m, '');

// Parse JSON
const analysisResult = this.parseJsonPayload<GPT4DocumentAnalysis>(
  content,
  'GPT-4.1 response parsing'
);

// Manual validation
if (!analysisResult.categories || !Array.isArray(analysisResult.categories)) {
  throw Errors.processingFailed('GPT-4.1 response validation', 'Missing categories');
}

if (analysisResult.categories.length === 0) {
  throw Errors.processingFailed('GPT-4.1 analysis', 'No categories found');
}

// Validate each category
analysisResult.categories.forEach((category, index) => {
  if (!category.name || !category.criteria || !Array.isArray(category.criteria)) {
    throw Errors.processingFailed('validation', `Category ${index + 1} invalid`);
  }
});
```

**After:**
```typescript
// Automatically parsed and validated by Zod!
const analysisResult: DocumentAnalysis = response.output_parsed;

// All validation is done by the schema - no manual checks needed
// If validation fails, Zod throws a detailed error automatically
```

### 4. Update TypeScript Interfaces

**Before:**
```typescript
// Manual interface definition
interface GPT4DocumentAnalysis {
  categories: Array<{
    name: string;
    description: string;
    weight: number;
    regulatoryReferences: string[];
    criteria: Array<{
      id: string;
      description: string;
      evidenceRequired: string;
      scoringMethod: string;
      weight: number;
      sourceReference: string;
    }>;
  }>;
  emergencyProcedures: string[];
  regulatoryFramework: string[];
  completeness: number;
  confidence: number;
}

// Separate from schema - can drift out of sync!
```

**After:**
```typescript
// Type automatically inferred from schema
import type { DocumentAnalysis } from '@/lib/schemas/generated-template.schema';

// Schema and type are always in sync!
```

## Step-by-Step Migration

### Step 1: Update Imports

```typescript
// Remove manual schema and interface definitions
- const GPT4_DOCUMENT_ANALYSIS_SCHEMA = { ... };
- interface GPT4DocumentAnalysis { ... }

// Add Zod schema imports
+ import { zodTextFormat } from 'openai/helpers/zod';
+ import {
+   DocumentAnalysisSchema,
+   GeneratedTemplateSchema,
+ } from '@/lib/schemas/generated-template.schema';
+ import type {
+   DocumentAnalysis,
+   GeneratedTemplate,
+ } from '@/lib/schemas/generated-template.schema';
```

### Step 2: Replace Schema in API Calls

```typescript
// In analyzeDocument method
const response = await client.responses.create({
  model: 'gpt-4.1',
  input: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  temperature: 0.1,
  max_output_tokens: 8000,
  text: {
-   format: {
-     type: 'json_schema',
-     name: 'policy_analysis',
-     schema: GPT4_DOCUMENT_ANALYSIS_SCHEMA,
-     strict: true,
-   },
+   format: zodTextFormat(DocumentAnalysisSchema, 'policy_analysis'),
  },
});
```

### Step 3: Remove Manual Parsing Logic

```typescript
- // Extract JSON payload
- let content = this.extractJsonPayload(response, 'GPT-4.1 analysis response');
- content = content.replace(/^```json\s*\n?/m, '').replace(/\n?```\s*$/m, '');
-
- // Parse JSON
- const analysisResult = this.parseJsonPayload<GPT4DocumentAnalysis>(
-   content,
-   'GPT-4.1 response parsing'
- );
-
- // Validate response structure
- if (!analysisResult.categories || !Array.isArray(analysisResult.categories)) {
-   throw Errors.processingFailed('validation', 'Missing categories');
- }

+ // Automatically parsed and validated!
+ const analysisResult: DocumentAnalysis = response.output_parsed;
```

### Step 4: Update Multi-turn Generation

For the multi-turn category discovery and criteria generation:

```typescript
// discoverCategoriesFullContext method
const response = await client.responses.create({
  model: 'gpt-4.1',
  input: [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ],
  temperature: 0.1,
  max_output_tokens: 4000,
  text: {
-   format: {
-     type: 'json_schema',
-     name: 'category_discovery',
-     schema: {
-       type: 'object',
-       properties: {
-         categories: {
-           type: 'array',
-           items: {
-             type: 'object',
-             required: ['name', 'description'],
-             properties: {
-               name: { type: 'string' },
-               description: { type: 'string' },
-               weight: { type: 'number' },
-               regulatoryReferences: {
-                 type: 'array',
-                 items: { type: 'string' },
-               },
-             },
-           },
-         },
-       },
-       required: ['categories'],
-       additionalProperties: false,
-     },
-     strict: true,
-   },
+   format: zodTextFormat(CategoryDiscoverySchema, 'category_discovery'),
  },
});

- const content = this.extractJsonPayload(response, 'Category discovery');
- const json = this.parseJsonPayload<{ categories?: Array<...> }>(content, 'parsing');
- return json.categories || [];
+ return response.output_parsed.categories;
```

### Step 5: Remove Helper Methods

Once all usages are migrated, remove these methods:

```typescript
- private extractJsonPayload(response: any, context: string): string { ... }
- private parseJsonPayload<T>(content: string, context: string): T { ... }
```

## Breaking Changes

### 1. Type Changes

If you're using the old `GPT4DocumentAnalysis` type, replace it:

```typescript
- import type { GPT4DocumentAnalysis } from './templateGeneration';
+ import type { DocumentAnalysis } from '@/lib/schemas/generated-template.schema';
```

### 2. Null vs Undefined

OpenAI Structured Outputs requires **all fields to be required**. Optional fields must use `null`:

```typescript
// Before (TypeScript optional)
interface Criterion {
  sourceReference?: string;
}

// After (explicitly nullable)
const CriterionSchema = z.object({
  sourceReference: z.string().nullable(),
});

// This means you must check for null, not undefined:
if (criterion.sourceReference !== null) {
  // Use the reference
}
```

### 3. Error Handling

Zod throws `ZodError` with detailed validation issues:

```typescript
try {
  const template = response.output_parsed;
} catch (error) {
  if (error instanceof ZodError) {
    console.error('Validation failed:', error.errors);
    // error.errors is an array of validation issues
  }
}
```

## Benefits

### 1. Type Safety

```typescript
// Before: Manual type assertion, no validation
const result = JSON.parse(content) as GPT4DocumentAnalysis;
result.categories[0].critiera; // Typo - no error! 💥

// After: Validated and typed
const result = response.output_parsed;
result.categories[0].critiera; // TypeScript error: Property doesn't exist ✅
```

### 2. Single Source of Truth

```typescript
// Before: Schema and types can drift
const SCHEMA = { properties: { name: { type: 'string' } } };
interface Type { name: number; } // Mismatch! 💥

// After: Types derived from schema
const Schema = z.object({ name: z.string() });
type Type = z.infer<typeof Schema>; // Always in sync ✅
```

### 3. Better Error Messages

```typescript
// Before
// Error: Invalid JSON

// After (Zod)
// Error: Validation failed at path "template.categories[0].criteria[2].weight"
// Expected number between 0 and 1, got 1.5
```

### 4. Reusable Schemas

```typescript
// Use the same schema for:
// - OpenAI API calls (zodTextFormat)
// - Runtime validation (schema.parse)
// - Type inference (z.infer<typeof schema>)
// - Testing (schema.safeParse)
```

## Testing Migration

Update tests to use Zod schemas:

```typescript
// Before
const mockResponse = {
  categories: [/* ... */],
  completeness: 0.95,
  confidence: 0.92,
};
// Hope it matches the expected structure! 🤞

// After
const mockResponse = DocumentAnalysisSchema.parse({
  categories: [/* ... */],
  completeness: 0.95,
  confidence: 0.92,
});
// Validated at test-time ✅
```

## Checklist

- [ ] Install dependencies (Zod is already in package.json)
- [ ] Update imports in `templateGeneration.ts`
- [ ] Replace `GPT4_DOCUMENT_ANALYSIS_SCHEMA` with `DocumentAnalysisSchema`
- [ ] Update `analyzeDocument()` method
- [ ] Update `discoverCategoriesFullContext()` method
- [ ] Update `generateCriteriaForCategoryFullContext()` method
- [ ] Remove `extractJsonPayload()` and `parseJsonPayload()` methods
- [ ] Update type imports throughout the codebase
- [ ] Update tests to use Zod schemas
- [ ] Run all tests to ensure nothing broke
- [ ] Update API routes that use template generation
- [ ] Update documentation

## Rollback Plan

If issues arise, the old implementation can coexist:

```typescript
// Keep old schemas but use new ones where possible
const USE_ZOD = process.env.USE_ZOD_SCHEMAS === 'true';

const response = await client.responses.create({
  model: 'gpt-4.1',
  input: [...],
  text: {
    format: USE_ZOD
      ? zodTextFormat(DocumentAnalysisSchema, 'policy_analysis')
      : {
          type: 'json_schema',
          name: 'policy_analysis',
          schema: GPT4_DOCUMENT_ANALYSIS_SCHEMA,
          strict: true,
        },
  },
});
```

## Resources

- [Zod Documentation](https://zod.dev/)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [OpenAI Node SDK - Zod Helpers](https://github.com/openai/openai-node/blob/master/helpers.md)
- Local schemas: `/src/lib/schemas/generated-template.schema.ts`
- Examples: `/src/lib/schemas/generated-template.example.ts`
