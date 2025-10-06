# Template Generation Schemas

Zod schemas for AI-generated compliance templates using OpenAI Structured Outputs.

## Overview

This directory contains TypeScript Zod schemas for validating AI-generated compliance templates in the Fire Department Radio Transcription System. These schemas are designed to work seamlessly with OpenAI's Structured Outputs feature (GPT-4.1), ensuring type-safe, validated responses from the AI.

## Files

- **`generated-template.schema.ts`** - Core Zod schema definitions
- **`generated-template.example.ts`** - Comprehensive usage examples
- **`README.md`** - This documentation

## Quick Start

### Installation

The schemas use Zod 4.x, which is already installed in this project:

```bash
npm install zod@^4.1.11
```

### Basic Usage

```typescript
import { zodTextFormat } from 'openai/helpers/zod';
import { GeneratedTemplateSchema } from '@/lib/schemas/generated-template.schema';
import type { GeneratedTemplate } from '@/lib/schemas/generated-template.schema';

// Use with OpenAI responses.create()
const response = await openai.responses.create({
  model: 'gpt-4.1',
  input: [
    { role: 'system', content: 'You are a fire department policy analyst.' },
    { role: 'user', content: policyText },
  ],
  text: {
    format: zodTextFormat(GeneratedTemplateSchema, 'generated_template'),
  },
});

// Automatically parsed and validated
const template: GeneratedTemplate = response.output_parsed;
```

## Schema Structure

### Root Schema: `GeneratedTemplateSchema`

The complete AI-generated template structure:

```typescript
{
  template: {
    name: string;
    description: string;
    version: string;
    categories: ComplianceCategory[];
    metadata: TemplateGenerationMetadata;
  };
  confidence: number;         // 0-1
  sourceDocuments: string[];  // min 1 document ID
  processingLog: string[];
  suggestions: TemplateSuggestion[];
}
```

### Nested Schemas

#### `ComplianceCategorySchema`

```typescript
{
  name: string;
  description: string;
  weight: number;                 // 0-1, must sum to 1.0 across categories
  regulatoryReferences: string[]; // NFPA, OSHA, etc.
  criteria: ComplianceCriterion[]; // min 1 criterion
}
```

#### `ComplianceCriterionSchema`

```typescript
{
  id: string;
  description: string;
  evidenceRequired: string;
  scoringMethod: 'PASS_FAIL' | 'NUMERIC' | 'CRITICAL_PASS_FAIL';
  weight: number;              // 0-1, must sum to 1.0 within category
  sourceReference: string | null;
}
```

#### `TemplateGenerationMetadataSchema`

```typescript
{
  generatedAt: string;        // ISO 8601
  aiModel: string;            // e.g., "gpt-4.1"
  confidence: number;         // 0-1
  sourceAnalysis: DocumentAnalysis;
  customInstructions: string | null;
}
```

#### `TemplateSuggestionSchema`

```typescript
{
  type: 'ENHANCEMENT' | 'ISSUE' | 'REFERENCE';
  category: string | null;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
}
```

## Key Design Principles

### 1. OpenAI Structured Outputs Compliance

All schemas follow OpenAI's requirements:

- ✅ All fields are **required** (use `.nullable()` for optional fields)
- ✅ Uses `.strict()` (equivalent to `additionalProperties: false`)
- ✅ Proper enum definitions
- ✅ Nested object validation
- ✅ Compatible with `zodTextFormat()` helper

### 2. Type Safety

TypeScript types are automatically inferred from schemas:

```typescript
import type {
  GeneratedTemplate,
  ComplianceCategory,
  ComplianceCriterion,
  ScoringMethod,
} from '@/lib/schemas/generated-template.schema';
```

### 3. Validation Helpers

Two validation approaches:

```typescript
// Throws ZodError on validation failure
const template = validateGeneratedTemplate(data);

// Returns success/error object
const result = safeValidateGeneratedTemplate(data);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error.errors);
}
```

## OpenAI Structured Outputs Requirements

### All Fields Must Be Required

OpenAI requires all fields to be present. For optional fields, use `.nullable()`:

```typescript
// ❌ Wrong - OpenAI will reject
const schema = z.object({
  optionalField: z.string().optional(),
});

// ✅ Correct - Use nullable for optional fields
const schema = z.object({
  optionalField: z.string().nullable(),
});
```

### No Additional Properties

All objects must use `.strict()`:

```typescript
// ✅ Correct
const schema = z.object({
  name: z.string(),
  age: z.number(),
}).strict(); // No additional properties allowed
```

### Supported Types

- String (with optional `pattern`, `format`)
- Number (with optional `minimum`, `maximum`, `multipleOf`)
- Boolean
- Integer
- Object (with `.strict()`)
- Array (with optional `minItems`, `maxItems`)
- Enum (`z.enum()`)
- `anyOf` (nested schemas)

### Constraints

- **Nesting depth**: Max 10 levels
- **Total properties**: Max 5000
- **Enum values**: Max 1000
- **String length**: Max 120,000 chars (all property names, enum values, const values)

## Advanced Usage

### Multi-Turn Generation

For complex templates, use multi-turn generation with full context per turn:

```typescript
// Turn 1: Discover categories
const categoriesResponse = await openai.responses.create({
  model: 'gpt-4.1',
  input: [/* ... */],
  text: { format: zodTextFormat(CategoryDiscoverySchema, 'categories') },
});

// Turn 2: Generate criteria per category
for (const category of categoriesResponse.output_parsed.categories) {
  const criteriaResponse = await openai.responses.create({
    model: 'gpt-4.1',
    input: [/* full context + category */],
    text: { format: zodTextFormat(CriteriaGenerationSchema, 'criteria') },
  });
}

// Final: Complete template with all metadata
const finalResponse = await openai.responses.create({
  model: 'gpt-4.1',
  input: [/* aggregated results */],
  text: { format: zodTextFormat(GeneratedTemplateSchema, 'template') },
});
```

### Streaming Responses

```typescript
const stream = openai.responses.stream({
  model: 'gpt-4.1',
  input: [/* ... */],
  text: {
    format: zodTextFormat(GeneratedTemplateSchema, 'generated_template'),
  },
});

stream.on('response.output_text.delta', (event) => {
  console.log(event.delta); // Partial JSON
});

const template = await stream.finalResponse().output_parsed;
```

### Error Handling

```typescript
try {
  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: [/* ... */],
    text: {
      format: zodTextFormat(GeneratedTemplateSchema, 'generated_template'),
    },
  });

  // Check for incomplete responses
  if (response.status === 'incomplete') {
    if (response.incomplete_details?.reason === 'max_output_tokens') {
      // Handle token limit
    }
  }

  // Check for refusals
  const content = response.output?.[0]?.content?.[0];
  if (content?.type === 'refusal') {
    console.error(content.refusal);
  }

  const template = response.output_parsed;
} catch (error) {
  // Handle network errors, etc.
}
```

## Business Logic Validation

Beyond schema validation, implement business rules:

```typescript
function validateTemplateBusinessRules(template: GeneratedTemplate): void {
  // Category weights must sum to 1.0
  const categoryWeightSum = template.template.categories.reduce(
    (sum, cat) => sum + cat.weight,
    0
  );

  if (Math.abs(categoryWeightSum - 1.0) > 0.01) {
    throw new Error(`Category weights must sum to 1.0, got ${categoryWeightSum}`);
  }

  // Criteria weights within each category must sum to 1.0
  for (const category of template.template.categories) {
    const criteriaWeightSum = category.criteria.reduce(
      (sum, crit) => sum + crit.weight,
      0
    );

    if (Math.abs(criteriaWeightSum - 1.0) > 0.01) {
      throw new Error(
        `Criteria in "${category.name}" must sum to 1.0, got ${criteriaWeightSum}`
      );
    }
  }

  // Minimum confidence threshold
  if (template.confidence < 0.5) {
    console.warn(`Low confidence: ${template.confidence}`);
  }
}
```

## Integration with Existing Types

These schemas are designed to match the existing TypeScript types in `/src/lib/types/index.ts`:

```typescript
// Existing types (for reference)
import type {
  ComplianceCategory,
  ComplianceCriterion,
  GeneratedTemplate,
} from '@/lib/types';

// Zod schemas (new)
import {
  ComplianceCategorySchema,
  ComplianceCriterionSchema,
  GeneratedTemplateSchema,
} from '@/lib/schemas/generated-template.schema';
```

The Zod-inferred types should be identical to the existing TypeScript types, ensuring seamless integration.

## Testing

Example test cases:

```typescript
import { describe, it, expect } from '@jest/globals';
import { GeneratedTemplateSchema } from './generated-template.schema';

describe('GeneratedTemplateSchema', () => {
  it('validates a complete template', () => {
    const validTemplate = {
      template: {
        name: 'Test Template',
        description: 'Test description',
        version: '1.0',
        categories: [
          {
            name: 'Communication',
            description: 'Communication protocols',
            weight: 1.0,
            regulatoryReferences: ['NFPA 1561'],
            criteria: [
              {
                id: 'comm-1',
                description: 'Clear radio communication',
                evidenceRequired: 'Transcript excerpts',
                scoringMethod: 'PASS_FAIL',
                weight: 1.0,
                sourceReference: 'Section 3.2',
              },
            ],
          },
        ],
        metadata: {
          generatedAt: '2025-10-05T12:00:00Z',
          aiModel: 'gpt-4.1',
          confidence: 0.95,
          sourceAnalysis: {
            categories: [],
            emergencyProcedures: [],
            regulatoryFramework: [],
            completeness: 1.0,
            confidence: 0.95,
          },
          customInstructions: null,
        },
      },
      confidence: 0.95,
      sourceDocuments: ['doc-123'],
      processingLog: ['Step 1', 'Step 2'],
      suggestions: [],
    };

    const result = GeneratedTemplateSchema.safeParse(validTemplate);
    expect(result.success).toBe(true);
  });

  it('rejects invalid scoring method', () => {
    const invalidTemplate = {
      // ... other fields
      template: {
        // ... other fields
        categories: [
          {
            // ... other fields
            criteria: [
              {
                // ... other fields
                scoringMethod: 'INVALID_METHOD', // ❌ Not in enum
              },
            ],
          },
        ],
      },
    };

    const result = GeneratedTemplateSchema.safeParse(invalidTemplate);
    expect(result.success).toBe(false);
  });
});
```

## Migration Guide

To migrate existing code to use these schemas:

1. **Import the schema and types:**
   ```typescript
   import { GeneratedTemplateSchema } from '@/lib/schemas/generated-template.schema';
   import type { GeneratedTemplate } from '@/lib/schemas/generated-template.schema';
   ```

2. **Replace manual JSON schema definitions with `zodTextFormat()`:**
   ```typescript
   // Before
   text: {
     format: {
       type: 'json_schema',
       schema: { /* manual schema */ },
       strict: true,
     }
   }

   // After
   text: {
     format: zodTextFormat(GeneratedTemplateSchema, 'generated_template'),
   }
   ```

3. **Use automatic parsing:**
   ```typescript
   // Before
   const content = extractJsonPayload(response);
   const data = JSON.parse(content);

   // After
   const template = response.output_parsed; // Already validated!
   ```

## Resources

- [OpenAI Structured Outputs Guide](https://platform.openai.com/docs/guides/structured-outputs)
- [Zod Documentation](https://zod.dev/)
- [OpenAI Node.js SDK - Structured Outputs Helpers](https://github.com/openai/openai-node/blob/master/helpers.md#structured-outputs-parsing-helpers)

## Support

For issues or questions:
1. Check `/docs/structured_outputs_guide.md` for OpenAI API reference
2. See `generated-template.example.ts` for comprehensive examples
3. Review existing implementation in `/src/lib/services/templateGeneration.ts`
