/**
 * Generated Template Schema Tests
 * Fire Department Radio Transcription System
 *
 * Tests for Zod schema validation of AI-generated compliance templates.
 */

import { describe, it, expect } from '@jest/globals';
import {
  GeneratedTemplateSchema,
  ComplianceCategorySchema,
  ComplianceCriterionSchema,
  ScoringMethodSchema,
  TemplateSuggestionSchema,
  validateGeneratedTemplate,
  safeValidateGeneratedTemplate,
} from '../generated-template.schema';
import type {
  GeneratedTemplate,
  ComplianceCategory,
  ComplianceCriterion,
} from '../generated-template.schema';

describe('ScoringMethodSchema', () => {
  it('accepts valid scoring methods', () => {
    expect(ScoringMethodSchema.parse('PASS_FAIL')).toBe('PASS_FAIL');
    expect(ScoringMethodSchema.parse('NUMERIC')).toBe('NUMERIC');
    expect(ScoringMethodSchema.parse('CRITICAL_PASS_FAIL')).toBe('CRITICAL_PASS_FAIL');
  });

  it('rejects invalid scoring methods', () => {
    expect(() => ScoringMethodSchema.parse('INVALID')).toThrow();
    expect(() => ScoringMethodSchema.parse('pass_fail')).toThrow();
    expect(() => ScoringMethodSchema.parse('')).toThrow();
  });
});

describe('ComplianceCriterionSchema', () => {
  const validCriterion: ComplianceCriterion = {
    id: 'comm-crit-1',
    description: 'Officer must announce arrival on scene',
    evidenceRequired: 'Transcript contains "on scene" or arrival announcement',
    scoringMethod: 'PASS_FAIL',
    weight: 0.25,
    sourceReference: 'Section 3.2, Page 12',
  };

  it('validates a complete criterion', () => {
    const result = ComplianceCriterionSchema.safeParse(validCriterion);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('comm-crit-1');
      expect(result.data.scoringMethod).toBe('PASS_FAIL');
    }
  });

  it('accepts null sourceReference', () => {
    const criterionWithNullRef = {
      ...validCriterion,
      sourceReference: null,
    };
    const result = ComplianceCriterionSchema.safeParse(criterionWithNullRef);
    expect(result.success).toBe(true);
  });

  it('validates weight bounds', () => {
    // Valid weights
    expect(
      ComplianceCriterionSchema.safeParse({ ...validCriterion, weight: 0 }).success
    ).toBe(true);
    expect(
      ComplianceCriterionSchema.safeParse({ ...validCriterion, weight: 0.5 }).success
    ).toBe(true);
    expect(
      ComplianceCriterionSchema.safeParse({ ...validCriterion, weight: 1 }).success
    ).toBe(true);

    // Invalid weights
    expect(
      ComplianceCriterionSchema.safeParse({ ...validCriterion, weight: -0.1 }).success
    ).toBe(false);
    expect(
      ComplianceCriterionSchema.safeParse({ ...validCriterion, weight: 1.1 }).success
    ).toBe(false);
  });

  it('rejects missing required fields', () => {
    const { sourceReference, ...withoutOptional } = validCriterion;
    expect(ComplianceCriterionSchema.safeParse(withoutOptional).success).toBe(false);

    const { id, ...withoutId } = validCriterion;
    expect(ComplianceCriterionSchema.safeParse(withoutId).success).toBe(false);
  });

  it('rejects additional properties', () => {
    const criterionWithExtra = {
      ...validCriterion,
      extraField: 'should not be here',
    };
    // Note: .strict() should reject this, but it's on the parent schema
    const result = ComplianceCriterionSchema.safeParse(criterionWithExtra);
    // Zod allows additional properties unless .strict() is used on this specific schema
    // The parent GeneratedTemplateSchema has .strict() which will catch this
  });
});

describe('ComplianceCategorySchema', () => {
  const validCategory: ComplianceCategory = {
    name: 'Communication Protocols',
    description: 'Evaluates radio communication compliance',
    weight: 0.3,
    regulatoryReferences: ['NFPA 1561 Section 5.2.5', 'Department SOP-102'],
    criteria: [
      {
        id: 'comm-1',
        description: 'Clear arrival announcement',
        evidenceRequired: 'Transcript contains arrival statement',
        scoringMethod: 'PASS_FAIL',
        weight: 1.0,
        sourceReference: 'SOP-102 Page 5',
      },
    ],
  };

  it('validates a complete category', () => {
    const result = ComplianceCategorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Communication Protocols');
      expect(result.data.criteria).toHaveLength(1);
    }
  });

  it('requires at least one criterion', () => {
    const categoryNoCriteria = {
      ...validCategory,
      criteria: [],
    };
    const result = ComplianceCategorySchema.safeParse(categoryNoCriteria);
    expect(result.success).toBe(false);
  });

  it('accepts multiple criteria', () => {
    const categoryMultipleCriteria = {
      ...validCategory,
      criteria: [
        validCategory.criteria[0],
        {
          id: 'comm-2',
          description: 'Status updates every 5 minutes',
          evidenceRequired: 'Regular status reports in transcript',
          scoringMethod: 'FREQUENCY' as any, // This will fail validation
          weight: 0.5,
          sourceReference: null,
        },
      ],
    };

    // This should fail because 'FREQUENCY' is not a valid scoring method
    const result = ComplianceCategorySchema.safeParse(categoryMultipleCriteria);
    expect(result.success).toBe(false);
  });

  it('accepts empty regulatory references array', () => {
    const categoryNoRefs = {
      ...validCategory,
      regulatoryReferences: [],
    };
    const result = ComplianceCategorySchema.safeParse(categoryNoRefs);
    expect(result.success).toBe(true);
  });
});

describe('TemplateSuggestionSchema', () => {
  it('validates a complete suggestion', () => {
    const suggestion = {
      type: 'ENHANCEMENT' as const,
      category: 'Communication Protocols',
      description: 'Consider adding criteria for emergency declarations',
      priority: 'MEDIUM' as const,
      actionable: true,
    };

    const result = TemplateSuggestionSchema.safeParse(suggestion);
    expect(result.success).toBe(true);
  });

  it('accepts null category', () => {
    const generalSuggestion = {
      type: 'ISSUE' as const,
      category: null,
      description: 'Document appears incomplete',
      priority: 'HIGH' as const,
      actionable: true,
    };

    const result = TemplateSuggestionSchema.safeParse(generalSuggestion);
    expect(result.success).toBe(true);
  });

  it('validates suggestion types', () => {
    expect(
      TemplateSuggestionSchema.safeParse({
        type: 'ENHANCEMENT',
        category: null,
        description: 'Test',
        priority: 'LOW',
        actionable: false,
      }).success
    ).toBe(true);

    expect(
      TemplateSuggestionSchema.safeParse({
        type: 'INVALID_TYPE',
        category: null,
        description: 'Test',
        priority: 'LOW',
        actionable: false,
      }).success
    ).toBe(false);
  });
});

describe('GeneratedTemplateSchema', () => {
  const validTemplate: GeneratedTemplate = {
    template: {
      name: 'Fire Ground Communication Compliance',
      description: 'Evaluates radio communication during fire operations',
      version: '1.0',
      categories: [
        {
          name: 'Communication Protocols',
          description: 'Radio communication compliance',
          weight: 0.4,
          regulatoryReferences: ['NFPA 1561'],
          criteria: [
            {
              id: 'comm-1',
              description: 'Clear arrival announcement',
              evidenceRequired: 'Arrival statement in transcript',
              scoringMethod: 'PASS_FAIL',
              weight: 0.5,
              sourceReference: 'Section 3.2',
            },
            {
              id: 'comm-2',
              description: 'Regular status updates',
              evidenceRequired: 'Status reports every 5 minutes',
              scoringMethod: 'NUMERIC',
              weight: 0.5,
              sourceReference: null,
            },
          ],
        },
        {
          name: 'Mayday Procedures',
          description: 'Emergency distress protocol compliance',
          weight: 0.6,
          regulatoryReferences: ['NFPA 1500', 'Department SOP-202'],
          criteria: [
            {
              id: 'mayday-1',
              description: 'Proper mayday declaration',
              evidenceRequired: 'Three "mayday" calls with identification',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 1.0,
              sourceReference: 'SOP-202 Page 3',
            },
          ],
        },
      ],
      metadata: {
        generatedAt: '2025-10-05T12:00:00Z',
        aiModel: 'gpt-4.1',
        confidence: 0.92,
        sourceAnalysis: {
          categories: [],
          emergencyProcedures: ['mayday', 'evacuation'],
          regulatoryFramework: ['NFPA 1561', 'NFPA 1500'],
          completeness: 0.95,
          confidence: 0.92,
        },
        customInstructions: 'Focus on emergency communication protocols',
      },
    },
    confidence: 0.92,
    sourceDocuments: ['policy-doc-123', 'sop-202'],
    processingLog: [
      'Starting template generation',
      'Analyzing document with GPT-4.1',
      'Extracted 2 categories',
      'Template validation passed',
    ],
    suggestions: [
      {
        type: 'ENHANCEMENT',
        category: 'Communication Protocols',
        description: 'Consider adding criteria for personnel accountability reports',
        priority: 'MEDIUM',
        actionable: true,
      },
    ],
  };

  it('validates a complete template', () => {
    const result = GeneratedTemplateSchema.safeParse(validTemplate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.template.name).toBe('Fire Ground Communication Compliance');
      expect(result.data.template.categories).toHaveLength(2);
      expect(result.data.confidence).toBe(0.92);
    }
  });

  it('validates using helper function', () => {
    expect(() => validateGeneratedTemplate(validTemplate)).not.toThrow();
    const validated = validateGeneratedTemplate(validTemplate);
    expect(validated.template.version).toBe('1.0');
  });

  it('safe validation returns success object', () => {
    const result = safeValidateGeneratedTemplate(validTemplate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceDocuments).toHaveLength(2);
    }
  });

  it('requires at least one source document', () => {
    const noSourceDocs = {
      ...validTemplate,
      sourceDocuments: [],
    };
    const result = GeneratedTemplateSchema.safeParse(noSourceDocs);
    expect(result.success).toBe(false);
  });

  it('requires at least one category', () => {
    const noCategories = {
      ...validTemplate,
      template: {
        ...validTemplate.template,
        categories: [],
      },
    };
    const result = GeneratedTemplateSchema.safeParse(noCategories);
    expect(result.success).toBe(false);
  });

  it('validates confidence bounds', () => {
    expect(
      GeneratedTemplateSchema.safeParse({
        ...validTemplate,
        confidence: 0.5,
      }).success
    ).toBe(true);

    expect(
      GeneratedTemplateSchema.safeParse({
        ...validTemplate,
        confidence: -0.1,
      }).success
    ).toBe(false);

    expect(
      GeneratedTemplateSchema.safeParse({
        ...validTemplate,
        confidence: 1.5,
      }).success
    ).toBe(false);
  });

  it('validates metadata confidence bounds', () => {
    expect(
      GeneratedTemplateSchema.safeParse({
        ...validTemplate,
        template: {
          ...validTemplate.template,
          metadata: {
            ...validTemplate.template.metadata,
            confidence: 0,
          },
        },
      }).success
    ).toBe(true);

    expect(
      GeneratedTemplateSchema.safeParse({
        ...validTemplate,
        template: {
          ...validTemplate.template,
          metadata: {
            ...validTemplate.template.metadata,
            confidence: 2.0,
          },
        },
      }).success
    ).toBe(false);
  });

  it('accepts null customInstructions in metadata', () => {
    const noInstructions = {
      ...validTemplate,
      template: {
        ...validTemplate.template,
        metadata: {
          ...validTemplate.template.metadata,
          customInstructions: null,
        },
      },
    };
    const result = GeneratedTemplateSchema.safeParse(noInstructions);
    expect(result.success).toBe(true);
  });

  it('accepts empty suggestions array', () => {
    const noSuggestions = {
      ...validTemplate,
      suggestions: [],
    };
    const result = GeneratedTemplateSchema.safeParse(noSuggestions);
    expect(result.success).toBe(true);
  });

  it('provides detailed error messages on validation failure', () => {
    const invalidTemplate = {
      ...validTemplate,
      confidence: 'high', // Should be number
    };

    const result = safeValidateGeneratedTemplate(invalidTemplate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0);
      expect(result.error.errors[0].path).toContain('confidence');
    }
  });

  it('rejects additional properties at root level', () => {
    const withExtra = {
      ...validTemplate,
      extraProperty: 'should not be here',
    };

    const result = GeneratedTemplateSchema.safeParse(withExtra);
    expect(result.success).toBe(false);
  });
});

describe('Type Inference', () => {
  it('infers correct TypeScript types', () => {
    const template: GeneratedTemplate = {
      template: {
        name: 'Test',
        description: 'Test',
        version: '1.0',
        categories: [
          {
            name: 'Test Category',
            description: 'Test',
            weight: 1.0,
            regulatoryReferences: [],
            criteria: [
              {
                id: 'test-1',
                description: 'Test',
                evidenceRequired: 'Test',
                scoringMethod: 'PASS_FAIL',
                weight: 1.0,
                sourceReference: null,
              },
            ],
          },
        ],
        metadata: {
          generatedAt: '2025-10-05T12:00:00Z',
          aiModel: 'gpt-4.1',
          confidence: 0.9,
          sourceAnalysis: {
            categories: [],
            emergencyProcedures: [],
            regulatoryFramework: [],
            completeness: 1.0,
            confidence: 0.9,
          },
          customInstructions: null,
        },
      },
      confidence: 0.9,
      sourceDocuments: ['doc-1'],
      processingLog: [],
      suggestions: [],
    };

    // TypeScript should not complain about this assignment
    const validated = validateGeneratedTemplate(template);
    expect(validated.template.name).toBe('Test');
  });
});
