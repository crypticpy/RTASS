/**
 * Usage Examples for Generated Template Schema
 * Fire Department Radio Transcription System
 *
 * This file demonstrates how to use the GeneratedTemplateSchema
 * with OpenAI's Structured Outputs feature (GPT-4.1).
 */

import { zodTextFormat } from 'openai/helpers/zod';
import { GeneratedTemplateSchema } from './generated-template.schema';
import type { GeneratedTemplate } from './generated-template.schema';

/**
 * Example 1: Basic Usage with OpenAI Responses API
 *
 * This example shows how to generate a template from policy documents
 * using the schema with OpenAI's responses.create() method.
 */
export async function generateTemplateFromPolicy(
  openai: any,
  policyText: string,
  templateName: string
): Promise<GeneratedTemplate> {
  const systemPrompt = `You are an expert fire department policy analyst with deep knowledge of:
- NFPA standards (especially NFPA 1561 for incident management)
- OSHA fire service regulations
- Fire department standard operating procedures
- Emergency services compliance requirements

Your task is to analyze policy documents and extract structured compliance frameworks.
Return ONLY valid JSON with no additional text or formatting.`;

  const userPrompt = `Analyze this fire department policy document and generate a compliance template:

DOCUMENT TEXT:
${policyText}

REQUIREMENTS:
1. Identify 5-10 major compliance categories from the document
2. For each category, extract 5-10 specific criteria
3. Assign appropriate weights (must sum to 1.0)
4. Map to regulatory frameworks (NFPA, OSHA, Department SOPs)
5. Determine scoring methods (PASS_FAIL, NUMERIC, CRITICAL_PASS_FAIL)
6. Identify emergency procedures mentioned
7. Assess document completeness and your confidence
8. Generate actionable improvement suggestions`;

  const response = await openai.responses.create({
    model: 'gpt-4.1',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1, // Low for consistency
    max_output_tokens: 8000,
    text: {
      format: zodTextFormat(GeneratedTemplateSchema as any, 'generated_template'),
    },
  });

  // The response is automatically parsed and validated against the schema
  const template = response.output_parsed;

  return template;
}

/**
 * Example 2: Multi-turn Template Generation
 *
 * This example demonstrates the multi-turn approach used in the system,
 * where each turn sends the full policy context.
 */
export async function multiTurnTemplateGeneration(
  openai: any,
  fullPolicyText: string,
  jobId: string
): Promise<GeneratedTemplate> {
  // Turn 1: Discover categories (soft cap ~15)
  const categoriesPrompt = `From the following policy documents, identify up to 15 primary compliance categories.
For each, include a concise description, an initial weight suggestion (0-1, rough), and any regulatory references mentioned.

DOCUMENTS:
${fullPolicyText}`;

  const categoriesResponse = await openai.responses.create({
    model: 'gpt-4.1',
    input: [
      { role: 'system', content: 'You are an expert fire department policy analyst.' },
      { role: 'user', content: categoriesPrompt },
    ],
    temperature: 0.1,
    max_output_tokens: 4000,
    text: {
      format: {
        type: 'json_schema',
        name: 'category_discovery',
        schema: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'description'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  weight: { type: 'number' },
                  regulatoryReferences: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
                additionalProperties: false,
              },
            },
          },
          required: ['categories'],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  // Turn 2: Generate criteria for each category
  // (Implementation would loop through categories)

  // Final turn: Generate complete template with schema validation
  const finalResponse = await openai.responses.create({
    model: 'gpt-4.1',
    input: [
      {
        role: 'system',
        content: 'Generate final compliance template with all metadata.',
      },
      {
        role: 'user',
        content: `Policy text: ${fullPolicyText}\n\nJob ID: ${jobId}`,
      },
    ],
    temperature: 0.1,
    max_output_tokens: 8000,
    text: {
      format: zodTextFormat(GeneratedTemplateSchema as any, 'generated_template'),
    },
  });

  return finalResponse.output_parsed;
}

/**
 * Example 3: Validation and Error Handling
 *
 * This example shows how to validate templates and handle errors.
 */
export async function generateTemplateWithValidation(
  openai: any,
  policyText: string
): Promise<GeneratedTemplate> {
  try {
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: [
        {
          role: 'system',
          content: 'You are a fire department policy analyst. Generate a compliance template.',
        },
        {
          role: 'user',
          content: policyText,
        },
      ],
      text: {
        format: zodTextFormat(GeneratedTemplateSchema as any, 'generated_template'),
      },
    });

    // Check for incomplete responses
    if (response.status === 'incomplete' && response.incomplete_details?.reason === 'max_output_tokens') {
      throw new Error('Response incomplete: max tokens reached. Consider chunking the policy document.');
    }

    // Check for refusals
    const content = response.output?.[0]?.content?.[0];
    if (content?.type === 'refusal') {
      throw new Error(`AI refused to generate template: ${content.refusal}`);
    }

    // The schema is automatically validated by zodTextFormat
    const template = response.output_parsed;

    // Additional business logic validation
    validateTemplateBusinessRules(template);

    return template;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Template generation failed:', error.message);
    }
    throw error;
  }
}

/**
 * Example 4: Using Safe Validation
 *
 * For cases where you receive template data from external sources
 * and want to validate without throwing errors.
 */
export function validateExternalTemplate(data: unknown): {
  success: boolean;
  template?: GeneratedTemplate;
  errors?: string[];
} {
  const result = GeneratedTemplateSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      template: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`),
  };
}

/**
 * Example 5: Streaming with Structured Outputs
 *
 * Process template generation as it streams from the API.
 */
export async function streamTemplateGeneration(
  openai: any,
  policyText: string
): Promise<GeneratedTemplate> {
  const stream = openai.responses.stream({
    model: 'gpt-4.1',
    input: [
      {
        role: 'system',
        content: 'Generate a fire department compliance template.',
      },
      {
        role: 'user',
        content: policyText,
      },
    ],
    text: {
      format: zodTextFormat(GeneratedTemplateSchema as any, 'generated_template'),
    },
  });

  // Handle streaming events
  stream
    .on('response.output_text.delta', (event: any) => {
      process.stdout.write(event.delta);
    })
    .on('response.error', (event: any) => {
      console.error('Stream error:', event.error);
    })
    .on('response.completed', () => {
      console.log('\nTemplate generation completed');
    });

  // Get final validated result
  const finalResponse = await stream.finalResponse();
  return finalResponse.output_parsed;
}

/**
 * Business Rules Validation
 *
 * Additional validation beyond schema structure.
 */
function validateTemplateBusinessRules(template: GeneratedTemplate): void {
  // Validate category weights sum to 1.0 (within tolerance)
  const categoryWeightSum = template.template.categories.reduce(
    (sum, cat) => sum + cat.weight,
    0
  );

  if (Math.abs(categoryWeightSum - 1.0) > 0.01) {
    throw new Error(
      `Category weights must sum to 1.0, got ${categoryWeightSum.toFixed(3)}`
    );
  }

  // Validate criteria weights within each category
  for (const category of template.template.categories) {
    const criteriaWeightSum = category.criteria.reduce((sum, crit) => sum + crit.weight, 0);

    if (Math.abs(criteriaWeightSum - 1.0) > 0.01) {
      throw new Error(
        `Criteria weights in category "${category.name}" must sum to 1.0, got ${criteriaWeightSum.toFixed(3)}`
      );
    }
  }

  // Validate confidence scores
  if (template.confidence < 0.5) {
    console.warn(
      `Low confidence score: ${template.confidence}. Consider reviewing the template.`
    );
  }

  // Validate minimum criteria per category
  for (const category of template.template.categories) {
    if (category.criteria.length < 1) {
      throw new Error(`Category "${category.name}" must have at least 1 criterion`);
    }
  }
}

/**
 * Example 6: Converting JSON Schema to Zod (for reference)
 *
 * This shows the equivalent JSON Schema that zodTextFormat() generates.
 * Useful for understanding the underlying structure.
 */
export const GENERATED_TEMPLATE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    template: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        version: { type: 'string' },
        categories: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              weight: { type: 'number', minimum: 0, maximum: 1 },
              regulatoryReferences: {
                type: 'array',
                items: { type: 'string' },
              },
              criteria: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    description: { type: 'string' },
                    evidenceRequired: { type: 'string' },
                    scoringMethod: {
                      type: 'string',
                      enum: ['PASS_FAIL', 'NUMERIC', 'CRITICAL_PASS_FAIL'],
                    },
                    weight: { type: 'number', minimum: 0, maximum: 1 },
                    sourceReference: { type: ['string', 'null'] },
                  },
                  required: [
                    'id',
                    'description',
                    'evidenceRequired',
                    'scoringMethod',
                    'weight',
                    'sourceReference',
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ['name', 'description', 'weight', 'regulatoryReferences', 'criteria'],
            additionalProperties: false,
          },
        },
        metadata: {
          type: 'object',
          properties: {
            generatedAt: { type: 'string' },
            aiModel: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            sourceAnalysis: {
              type: 'object',
              // ... (nested structure)
            },
            customInstructions: { type: ['string', 'null'] },
          },
          required: [
            'generatedAt',
            'aiModel',
            'confidence',
            'sourceAnalysis',
            'customInstructions',
          ],
          additionalProperties: false,
        },
      },
      required: ['name', 'description', 'version', 'categories', 'metadata'],
      additionalProperties: false,
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    sourceDocuments: {
      type: 'array',
      minItems: 1,
      items: { type: 'string' },
    },
    processingLog: {
      type: 'array',
      items: { type: 'string' },
    },
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['ENHANCEMENT', 'ISSUE', 'REFERENCE'],
          },
          category: { type: ['string', 'null'] },
          description: { type: 'string' },
          priority: {
            type: 'string',
            enum: ['HIGH', 'MEDIUM', 'LOW'],
          },
          actionable: { type: 'boolean' },
        },
        required: ['type', 'category', 'description', 'priority', 'actionable'],
        additionalProperties: false,
      },
    },
  },
  required: ['template', 'confidence', 'sourceDocuments', 'processingLog', 'suggestions'],
  additionalProperties: false,
};
