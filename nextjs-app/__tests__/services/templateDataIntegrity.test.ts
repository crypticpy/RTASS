/**
 * Template Data Integrity Tests
 * Fire Department Radio Transcription System
 *
 * Tests for Phase 5.4: Data Integrity Checks
 * Validates mathematical correctness and consistency of template data.
 */

import { templateGenerationService } from '@/lib/services/templateGeneration';
import { templateService } from '@/lib/services/templateService';
import type { ComplianceCategory } from '@/lib/types';

describe('Template Data Integrity Validation', () => {
  describe('Category Weight Validation', () => {
    it('should reject category weights that sum to less than 1.0', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 0.4, // Should be 0.5
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
        {
          name: 'Category 2',
          description: 'Test category',
          weight: 0.4, // Should be 0.5 (total: 0.8 instead of 1.0)
          criteria: [
            {
              id: 'crit-2',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Category weights sum to 0.800, must sum to 1.0 (±0.01 tolerance)'
      );
    });

    it('should reject category weights that sum to more than 1.0', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 0.6,
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
        {
          name: 'Category 2',
          description: 'Test category',
          weight: 0.6, // Total: 1.2 instead of 1.0
          criteria: [
            {
              id: 'crit-2',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Category weights sum to 1.200, must sum to 1.0 (±0.01 tolerance)'
      );
    });

    it('should accept category weights that sum to 1.0 within tolerance', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 0.333,
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
        {
          name: 'Category 2',
          description: 'Test category',
          weight: 0.334,
          criteria: [
            {
              id: 'crit-2',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
        {
          name: 'Category 3',
          description: 'Test category',
          weight: 0.333, // Total: 1.000 (within tolerance)
          criteria: [
            {
              id: 'crit-3',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(true);
    });

    it('should reject negative category weights', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: -0.5, // Invalid: negative
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
        {
          name: 'Category 2',
          description: 'Test category',
          weight: 1.5,
          criteria: [
            {
              id: 'crit-2',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('must be between 0 and 1'))).toBe(true);
    });

    it('should reject category weights greater than 1.0', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 1.5, // Invalid: > 1.0
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Category "Category 1" weight must be between 0 and 1 (got 1.5)'
      );
    });

    it('should reject zero category weights', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 0, // Invalid: zero weight
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
        {
          name: 'Category 2',
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: 'crit-2',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Category "Category 1" weight cannot be 0 (categories with zero weight should be removed)'
      );
    });
  });

  describe('Criterion Weight Validation', () => {
    it('should reject criterion weights that sum to less than 1.0', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 0.4, // Should sum to 1.0
            },
            {
              id: 'crit-2',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 0.4, // Total: 0.8 instead of 1.0
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Category "Category 1" criterion weights sum to 0.800, must sum to 1.0 (±0.01 tolerance)'
      );
    });

    it('should reject criterion weights that sum to more than 1.0', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 0.6,
            },
            {
              id: 'crit-2',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 0.6, // Total: 1.2 instead of 1.0
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Category "Category 1" criterion weights sum to 1.200, must sum to 1.0 (±0.01 tolerance)'
      );
    });

    it('should reject negative criterion weights', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: -0.5, // Invalid: negative
            },
            {
              id: 'crit-2',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.5,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('must be between 0 and 1'))).toBe(true);
    });

    it('should reject criterion weights greater than 1.0', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.5, // Invalid: > 1.0
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Criterion "crit-1" weight must be between 0 and 1 (got 1.5)'
      );
    });

    it('should reject zero criterion weights', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 0, // Invalid: zero weight
            },
            {
              id: 'crit-2',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Criterion "crit-1" weight cannot be 0 (criteria with zero weight should be removed)'
      );
    });
  });

  describe('Criterion ID Uniqueness Validation', () => {
    it('should reject duplicate criterion IDs within same category', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: 'duplicate-id',
              description: 'Test criterion 1',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 0.5,
            },
            {
              id: 'duplicate-id', // Duplicate ID
              description: 'Test criterion 2',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 0.5,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate criterion ID'))).toBe(true);
    });

    it('should reject duplicate criterion IDs across different categories', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 0.5,
          criteria: [
            {
              id: 'duplicate-id',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
        {
          name: 'Category 2',
          description: 'Test category',
          weight: 0.5,
          criteria: [
            {
              id: 'duplicate-id', // Duplicate ID in different category
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate criterion ID'))).toBe(true);
    });

    it('should accept unique criterion IDs across all categories', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 0.5,
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
        {
          name: 'Category 2',
          description: 'Test category',
          weight: 0.5,
          criteria: [
            {
              id: 'crit-2', // Unique ID
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(true);
    });
  });

  describe('Template Structure Validation', () => {
    it('should require at least one category', () => {
      const categories: ComplianceCategory[] = [];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template must have at least one category');
    });

    it('should require each category to have at least one criterion', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Empty Category',
          description: 'Test category',
          weight: 1.0,
          criteria: [], // No criteria
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Category "Empty Category" must have at least one criterion'
      );
    });

    it('should require category names', () => {
      const categories: ComplianceCategory[] = [
        {
          name: '', // Empty name
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('must have a name'))).toBe(true);
    });

    it('should require criterion IDs', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: '', // Empty ID
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('must have an ID'))).toBe(true);
    });

    it('should require criterion descriptions', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: 'crit-1',
              description: '', // Empty description
              evidenceRequired: 'Test evidence',
              scoringMethod: 'PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('must have a description'))).toBe(true);
    });

    it('should validate scoring method values', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Test category',
          weight: 1.0,
          criteria: [
            {
              id: 'crit-1',
              description: 'Test criterion',
              evidenceRequired: 'Test evidence',
              scoringMethod: 'INVALID_METHOD' as any, // Invalid scoring method
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('invalid scoringMethod'))).toBe(true);
    });
  });

  describe('Valid Template Examples', () => {
    it('should accept a fully valid template', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Radio Communications',
          description: 'Radio protocol compliance',
          weight: 0.6,
          regulatoryReferences: ['NFPA 1561'],
          criteria: [
            {
              id: 'radio-clear-transmission',
              description: 'Clear transmission protocol',
              evidenceRequired: 'Clear audio without interference',
              scoringMethod: 'PASS_FAIL',
              weight: 0.5,
            },
            {
              id: 'radio-proper-terminology',
              description: 'Proper terminology usage',
              evidenceRequired: 'Standard radio codes used',
              scoringMethod: 'NUMERIC',
              weight: 0.5,
            },
          ],
        },
        {
          name: 'Safety Procedures',
          description: 'Safety protocol compliance',
          weight: 0.4,
          regulatoryReferences: ['NFPA 1500'],
          criteria: [
            {
              id: 'safety-par-conducted',
              description: 'Personnel Accountability Report conducted',
              evidenceRequired: 'PAR requested and received',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 1.0,
            },
          ],
        },
      ];

      const result = templateService.validateTemplateStructure(categories);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
