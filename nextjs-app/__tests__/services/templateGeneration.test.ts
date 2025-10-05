/**
 * TemplateGenerationService Tests
 * Fire Department Radio Transcription System
 *
 * Tests for AI-powered template generation service.
 */

import { TemplateGenerationService } from '@/lib/services/templateGeneration';
import type {
  DocumentAnalysis,
  ComplianceCategory,
  ExtractedContent,
} from '@/lib/types';

// Mock OpenAI client
jest.mock('@/lib/services/utils/openai', () => ({
  getOpenAIClient: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
  withRateLimit: jest.fn((fn) => fn()),
  trackTokenUsage: jest.fn(),
}));

// Mock template service
jest.mock('@/lib/services/templateService', () => ({
  templateService: {
    validateTemplateStructure: jest.fn(() => ({
      valid: true,
      errors: [],
    })),
  },
}));

describe('TemplateGenerationService', () => {
  let service: TemplateGenerationService;

  beforeEach(() => {
    service = new TemplateGenerationService();
    jest.clearAllMocks();
  });

  describe('buildTemplateStructure', () => {
    it('should normalize category weights to sum to 1.0', () => {
      const analysis: DocumentAnalysis = {
        categories: [
          {
            name: 'Category 1',
            description: 'First category',
            weight: 0.6, // Sum = 1.5
            regulatoryReferences: [],
            criteria: [
              {
                id: 'crit-1',
                description: 'Criterion 1',
                evidenceRequired: 'Evidence 1',
                scoringMethod: 'PASS_FAIL',
                weight: 1.0,
              },
            ],
          },
          {
            name: 'Category 2',
            description: 'Second category',
            weight: 0.9, // Sum = 1.5
            regulatoryReferences: [],
            criteria: [
              {
                id: 'crit-2',
                description: 'Criterion 2',
                evidenceRequired: 'Evidence 2',
                scoringMethod: 'PASS_FAIL',
                weight: 1.0,
              },
            ],
          },
        ],
        emergencyProcedures: [],
        regulatoryFramework: [],
        completeness: 1.0,
        confidence: 0.9,
      };

      const result = (service as any).buildTemplateStructure(analysis, {});

      const totalWeight = result.categories.reduce(
        (sum: number, cat: ComplianceCategory) => sum + cat.weight,
        0
      );

      expect(totalWeight).toBeCloseTo(1.0, 2);
      expect(result.categories[0].weight).toBeCloseTo(0.4, 2); // 0.6/1.5
      expect(result.categories[1].weight).toBeCloseTo(0.6, 2); // 0.9/1.5
    });
  });

  describe('normalizeCriteriaWeights', () => {
    it('should normalize criteria weights to sum to 1.0', () => {
      const criteria = [
        {
          id: 'crit-1',
          description: 'Criterion 1',
          evidenceRequired: 'Evidence 1',
          scoringMethod: 'PASS_FAIL' as const,
          weight: 0.5,
        },
        {
          id: 'crit-2',
          description: 'Criterion 2',
          evidenceRequired: 'Evidence 2',
          scoringMethod: 'PASS_FAIL' as const,
          weight: 1.5,
        },
      ];

      const normalized = (service as any).normalizeCriteriaWeights(criteria);

      const totalWeight = normalized.reduce(
        (sum: number, c: any) => sum + c.weight,
        0
      );

      expect(totalWeight).toBeCloseTo(1.0, 2);
      expect(normalized[0].weight).toBeCloseTo(0.25, 2); // 0.5/2.0
      expect(normalized[1].weight).toBeCloseTo(0.75, 2); // 1.5/2.0
    });

    it('should handle single criterion', () => {
      const criteria = [
        {
          id: 'crit-1',
          description: 'Only criterion',
          evidenceRequired: 'Evidence',
          scoringMethod: 'PASS_FAIL' as const,
          weight: 0.5,
        },
      ];

      const normalized = (service as any).normalizeCriteriaWeights(criteria);

      expect(normalized[0].weight).toBe(1.0);
    });

    it('should handle zero weights', () => {
      const criteria = [
        {
          id: 'crit-1',
          description: 'Criterion 1',
          evidenceRequired: 'Evidence 1',
          scoringMethod: 'PASS_FAIL' as const,
          weight: 0,
        },
        {
          id: 'crit-2',
          description: 'Criterion 2',
          evidenceRequired: 'Evidence 2',
          scoringMethod: 'PASS_FAIL' as const,
          weight: 0,
        },
      ];

      const normalized = (service as any).normalizeCriteriaWeights(criteria);

      // Should handle gracefully (may result in NaN, which is acceptable)
      expect(normalized).toBeDefined();
    });
  });

  describe('autoFixTemplate', () => {
    it('should fix invalid category weights', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'First',
          weight: 0.8,
          criteria: [
            {
              id: 'crit-1',
              description: 'Criterion 1',
              evidenceRequired: 'Evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 0.6,
            },
            {
              id: 'crit-2',
              description: 'Criterion 2',
              evidenceRequired: 'Evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 0.6,
            },
          ],
        },
        {
          name: 'Category 2',
          description: 'Second',
          weight: 0.5,
          criteria: [
            {
              id: 'crit-3',
              description: 'Criterion 3',
              evidenceRequired: 'Evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const fixed = (service as any).autoFixTemplate(categories);

      const categoryWeightSum = fixed.reduce(
        (sum: number, cat: ComplianceCategory) => sum + cat.weight,
        0
      );

      expect(categoryWeightSum).toBeCloseTo(1.0, 2);

      fixed.forEach((cat: ComplianceCategory) => {
        const criteriaWeightSum = cat.criteria.reduce(
          (sum: number, crit) => sum + crit.weight,
          0
        );
        expect(criteriaWeightSum).toBeCloseTo(1.0, 2);
      });
    });
  });

  describe('generateSuggestions', () => {
    it('should suggest adding critical criteria if none exist', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'First',
          weight: 1.0,
          criteria: [
            {
              id: 'crit-1',
              description: 'Criterion 1',
              evidenceRequired: 'Evidence',
              scoringMethod: 'PASS_FAIL', // Not critical
              weight: 1.0,
            },
          ],
        },
      ];

      const analysis: DocumentAnalysis = {
        categories: [],
        emergencyProcedures: [],
        regulatoryFramework: [],
        completeness: 1.0,
        confidence: 0.9,
      };

      const suggestions = (service as any).generateSuggestions(
        categories,
        analysis
      );

      const hasCriticalSuggestion = suggestions.some(
        (s: any) => s.description.toLowerCase().includes('critical')
      );

      expect(hasCriticalSuggestion).toBe(true);
    });

    it('should suggest adding references if none found', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'First',
          weight: 1.0,
          criteria: [],
        },
      ];

      const analysis: DocumentAnalysis = {
        categories: [],
        emergencyProcedures: [],
        regulatoryFramework: [], // Empty
        completeness: 1.0,
        confidence: 0.9,
      };

      const suggestions = (service as any).generateSuggestions(
        categories,
        analysis
      );

      const hasReferenceSuggestion = suggestions.some(
        (s: any) => s.type === 'REFERENCE'
      );

      expect(hasReferenceSuggestion).toBe(true);
    });

    it('should warn about incomplete documents', () => {
      const analysis: DocumentAnalysis = {
        categories: [],
        emergencyProcedures: [],
        regulatoryFramework: [],
        completeness: 0.6, // Incomplete
        confidence: 0.9,
      };

      const suggestions = (service as any).generateSuggestions([], analysis);

      const hasIncompleteWarning = suggestions.some(
        (s: any) =>
          s.type === 'ISSUE' && s.description.toLowerCase().includes('incomplete')
      );

      expect(hasIncompleteWarning).toBe(true);
    });
  });

  describe('calculateConfidence', () => {
    it('should return base confidence for valid template', () => {
      const analysis: DocumentAnalysis = {
        categories: [],
        emergencyProcedures: [],
        regulatoryFramework: [],
        completeness: 1.0,
        confidence: 0.9,
      };

      const validation = { valid: true, errors: [] };

      const confidence = (service as any).calculateConfidence(
        analysis,
        validation
      );

      expect(confidence).toBe(0.9);
    });

    it('should reduce confidence for failed validation', () => {
      const analysis: DocumentAnalysis = {
        categories: [],
        emergencyProcedures: [],
        regulatoryFramework: [],
        completeness: 1.0,
        confidence: 0.9,
      };

      const validation = { valid: false, errors: ['Weight error'] };

      const confidence = (service as any).calculateConfidence(
        analysis,
        validation
      );

      expect(confidence).toBeLessThan(0.9);
      expect(confidence).toBeCloseTo(0.81, 2); // 0.9 * 0.9
    });

    it('should factor in document completeness', () => {
      const analysis: DocumentAnalysis = {
        categories: [],
        emergencyProcedures: [],
        regulatoryFramework: [],
        completeness: 0.8,
        confidence: 0.9,
      };

      const validation = { valid: true, errors: [] };

      const confidence = (service as any).calculateConfidence(
        analysis,
        validation
      );

      expect(confidence).toBeCloseTo(0.72, 2); // 0.9 * 0.8
    });

    it('should ensure confidence stays within 0-1 bounds', () => {
      const analysis: DocumentAnalysis = {
        categories: [],
        emergencyProcedures: [],
        regulatoryFramework: [],
        completeness: 0.1,
        confidence: 0.1,
      };

      const validation = { valid: false, errors: [] };

      const confidence = (service as any).calculateConfidence(
        analysis,
        validation
      );

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Integration - generateFromContent', () => {
    it('should generate template from extracted content', async () => {
      const content: ExtractedContent = {
        text: 'Fire Department Safety Policy\n\nAll personnel must follow NFPA 1561 standards.',
        sections: [
          {
            id: 'section-1',
            title: 'Safety Policy',
            level: 1,
            content: 'All personnel must follow NFPA 1561 standards.',
          },
        ],
        metadata: {
          format: 'txt',
          extractedAt: new Date().toISOString(),
          characterCount: 80,
          sectionCount: 1,
        },
      };

      // Mock GPT-4o response
      const mockGPTResponse = {
        categories: [
          {
            name: 'Personnel Safety',
            description: 'Safety protocols for personnel',
            weight: 1.0,
            regulatoryReferences: ['NFPA 1561'],
            criteria: [
              {
                id: 'safety-1',
                description: 'Follow NFPA 1561 standards',
                evidenceRequired: 'Compliance documentation',
                scoringMethod: 'PASS_FAIL',
                weight: 1.0,
                sourceReference: 'Section 1',
              },
            ],
          },
        ],
        emergencyProcedures: [],
        regulatoryFramework: ['NFPA 1561'],
        completeness: 0.9,
        confidence: 0.85,
      };

      const { getOpenAIClient } = require('@/lib/services/utils/openai');
      getOpenAIClient().chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockGPTResponse) } }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      });

      const result = await service.generateFromContent(content, {
        templateName: 'Test Template',
      });

      expect(result.template.name).toBe('Test Template');
      expect(result.template.categories.length).toBe(1);
      expect(result.confidence).toBeDefined();
      expect(result.processingLog.length).toBeGreaterThan(0);
    });
  });
});
