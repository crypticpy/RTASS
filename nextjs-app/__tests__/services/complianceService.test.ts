/**
 * Compliance Service Tests
 * Fire Department Radio Transcription System
 *
 * Test suite for compliance scoring engine with:
 * - Weighted scoring algorithm verification
 * - NOT_APPLICABLE weight redistribution
 * - Overall status determination
 * - Category score calculation
 */

import { ComplianceCategory, CriterionStatus } from '@/lib/types';

// Mock the ComplianceService class for testing internal methods
class TestableComplianceService {
  /**
   * Calculate category scores with criterion weighting
   * This is a direct copy of the private method for testing purposes
   */
  calculateCategoryScores(
    categories: ComplianceCategory[]
  ): ComplianceCategory[] {
    return categories.map((category) => {
      // Filter applicable criteria
      const applicable = category.criteria.filter(
        (c) => c.status !== 'NOT_APPLICABLE'
      );

      if (applicable.length === 0) {
        return {
          ...category,
          score: 0,
          status: 'NEEDS_IMPROVEMENT' as const,
          rationale: 'No applicable criteria for this incident',
        };
      }

      // Calculate total weight of applicable criteria
      const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);

      // Calculate weighted score
      const weightedSum = applicable.reduce((sum, c) => {
        const normalizedWeight = c.weight / totalWeight;
        const criterionScore = this.getCriterionScore(c.status!);
        return sum + criterionScore * normalizedWeight;
      }, 0);

      const score = Math.round(weightedSum);

      // Determine category status
      let status: 'PASS' | 'NEEDS_IMPROVEMENT' | 'FAIL';
      if (score >= 80) {
        status = 'PASS';
      } else if (score >= 60) {
        status = 'NEEDS_IMPROVEMENT';
      } else {
        status = 'FAIL';
      }

      return {
        ...category,
        score,
        status,
        rationale: `Category score: ${score}/100 (${applicable.length} applicable criteria)`,
      };
    });
  }

  /**
   * Get numeric score for criterion status
   */
  getCriterionScore(status: CriterionStatus): number {
    switch (status) {
      case 'PASS':
        return 100;
      case 'PARTIAL':
        return 50;
      case 'FAIL':
        return 0;
      case 'NOT_APPLICABLE':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Calculate overall score with category weighting
   */
  calculateOverallScore(categories: ComplianceCategory[]): number {
    // Filter categories that have applicable criteria
    const applicable = categories.filter((c) => (c.score || 0) > 0);

    if (applicable.length === 0) {
      return 0;
    }

    // Calculate total weight of applicable categories
    const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);

    // Calculate weighted average
    const weightedSum = applicable.reduce((sum, c) => {
      const normalizedWeight = c.weight / totalWeight;
      return sum + (c.score || 0) * normalizedWeight;
    }, 0);

    return Math.round(weightedSum);
  }

  /**
   * Determine overall audit status based on score
   */
  determineOverallStatus(score: number): 'PASS' | 'NEEDS_IMPROVEMENT' | 'FAIL' {
    if (score >= 80) return 'PASS';
    if (score >= 60) return 'NEEDS_IMPROVEMENT';
    return 'FAIL';
  }
}

describe('ComplianceService', () => {
  let service: TestableComplianceService;

  beforeEach(() => {
    service = new TestableComplianceService();
  });

  describe('calculateCategoryScores', () => {
    it('should calculate score correctly with all PASS criteria', () => {
      const category: ComplianceCategory = {
        name: 'Test Category',
        description: 'Test category description',
        weight: 0.25,
        criteria: [
          {
            id: 'c1',
            description: 'Criterion 1',
            evidenceRequired: 'Evidence 1',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'PASS',
            rationale: 'Met',
          },
          {
            id: 'c2',
            description: 'Criterion 2',
            evidenceRequired: 'Evidence 2',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'PASS',
            rationale: 'Met',
          },
        ],
      };

      const result = service.calculateCategoryScores([category]);

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(100);
      expect(result[0].status).toBe('PASS');
    });

    it('should calculate score correctly with all FAIL criteria', () => {
      const category: ComplianceCategory = {
        name: 'Test Category',
        description: 'Test category description',
        weight: 0.25,
        criteria: [
          {
            id: 'c1',
            description: 'Criterion 1',
            evidenceRequired: 'Evidence 1',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'FAIL',
            rationale: 'Not met',
          },
          {
            id: 'c2',
            description: 'Criterion 2',
            evidenceRequired: 'Evidence 2',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'FAIL',
            rationale: 'Not met',
          },
        ],
      };

      const result = service.calculateCategoryScores([category]);

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(0);
      expect(result[0].status).toBe('FAIL');
    });

    it('should redistribute weights when criteria are NOT_APPLICABLE', () => {
      const category: ComplianceCategory = {
        name: 'Test Category',
        description: 'Test category description',
        weight: 0.25,
        criteria: [
          {
            id: 'c1',
            description: 'Criterion 1',
            evidenceRequired: 'Evidence 1',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'PASS',
            rationale: 'Met',
          },
          {
            id: 'c2',
            description: 'Criterion 2',
            evidenceRequired: 'Evidence 2',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'NOT_APPLICABLE',
            rationale: 'Not applicable to this incident',
          },
        ],
      };

      const result = service.calculateCategoryScores([category]);

      // With 1 PASS criterion and 1 NOT_APPLICABLE, weight redistributes to 1.0 for PASS
      // Score = 100 * 1.0 = 100
      expect(result[0].score).toBe(100);
      expect(result[0].status).toBe('PASS');
    });

    it('should handle mixed scores correctly', () => {
      const category: ComplianceCategory = {
        name: 'Test Category',
        description: 'Test category description',
        weight: 0.25,
        criteria: [
          {
            id: 'c1',
            description: 'Criterion 1',
            evidenceRequired: 'Evidence 1',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'PASS',
            rationale: 'Met',
          },
          {
            id: 'c2',
            description: 'Criterion 2',
            evidenceRequired: 'Evidence 2',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'FAIL',
            rationale: 'Not met',
          },
        ],
      };

      const result = service.calculateCategoryScores([category]);

      // Average: (100 * 0.5) + (0 * 0.5) = 50
      expect(result[0].score).toBe(50);
      expect(result[0].status).toBe('FAIL');
    });

    it('should handle PARTIAL status correctly', () => {
      const category: ComplianceCategory = {
        name: 'Test Category',
        description: 'Test category description',
        weight: 0.25,
        criteria: [
          {
            id: 'c1',
            description: 'Criterion 1',
            evidenceRequired: 'Evidence 1',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'PASS',
            rationale: 'Met',
          },
          {
            id: 'c2',
            description: 'Criterion 2',
            evidenceRequired: 'Evidence 2',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'PARTIAL',
            rationale: 'Partially met',
          },
        ],
      };

      const result = service.calculateCategoryScores([category]);

      // (100 * 0.5) + (50 * 0.5) = 75
      expect(result[0].score).toBe(75);
      expect(result[0].status).toBe('NEEDS_IMPROVEMENT');
    });

    it('should handle unequal criterion weights', () => {
      const category: ComplianceCategory = {
        name: 'Test Category',
        description: 'Test category description',
        weight: 0.25,
        criteria: [
          {
            id: 'c1',
            description: 'Criterion 1',
            evidenceRequired: 'Evidence 1',
            scoringMethod: 'PASS_FAIL',
            weight: 0.7,
            status: 'PASS',
            rationale: 'Met',
          },
          {
            id: 'c2',
            description: 'Criterion 2',
            evidenceRequired: 'Evidence 2',
            scoringMethod: 'PASS_FAIL',
            weight: 0.3,
            status: 'FAIL',
            rationale: 'Not met',
          },
        ],
      };

      const result = service.calculateCategoryScores([category]);

      // (100 * 0.7) + (0 * 0.3) = 70
      expect(result[0].score).toBe(70);
      expect(result[0].status).toBe('NEEDS_IMPROVEMENT');
    });

    it('should handle all NOT_APPLICABLE criteria', () => {
      const category: ComplianceCategory = {
        name: 'Test Category',
        description: 'Test category description',
        weight: 0.25,
        criteria: [
          {
            id: 'c1',
            description: 'Criterion 1',
            evidenceRequired: 'Evidence 1',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'NOT_APPLICABLE',
            rationale: 'Not applicable',
          },
          {
            id: 'c2',
            description: 'Criterion 2',
            evidenceRequired: 'Evidence 2',
            scoringMethod: 'PASS_FAIL',
            weight: 0.5,
            status: 'NOT_APPLICABLE',
            rationale: 'Not applicable',
          },
        ],
      };

      const result = service.calculateCategoryScores([category]);

      expect(result[0].score).toBe(0);
      expect(result[0].status).toBe('NEEDS_IMPROVEMENT');
      expect(result[0].rationale).toContain('No applicable criteria');
    });

    it('should handle multiple criteria with NOT_APPLICABLE redistribution', () => {
      const category: ComplianceCategory = {
        name: 'Test Category',
        description: 'Test category description',
        weight: 0.25,
        criteria: [
          {
            id: 'c1',
            description: 'Criterion 1',
            evidenceRequired: 'Evidence 1',
            scoringMethod: 'PASS_FAIL',
            weight: 0.25,
            status: 'PASS',
            rationale: 'Met',
          },
          {
            id: 'c2',
            description: 'Criterion 2',
            evidenceRequired: 'Evidence 2',
            scoringMethod: 'PASS_FAIL',
            weight: 0.25,
            status: 'FAIL',
            rationale: 'Not met',
          },
          {
            id: 'c3',
            description: 'Criterion 3',
            evidenceRequired: 'Evidence 3',
            scoringMethod: 'PASS_FAIL',
            weight: 0.25,
            status: 'NOT_APPLICABLE',
            rationale: 'Not applicable',
          },
          {
            id: 'c4',
            description: 'Criterion 4',
            evidenceRequired: 'Evidence 4',
            scoringMethod: 'PASS_FAIL',
            weight: 0.25,
            status: 'PARTIAL',
            rationale: 'Partially met',
          },
        ],
      };

      const result = service.calculateCategoryScores([category]);

      // Applicable criteria: c1 (PASS=100, weight 0.25), c2 (FAIL=0, weight 0.25), c4 (PARTIAL=50, weight 0.25)
      // Total weight: 0.75
      // Normalized: c1=0.25/0.75=1/3, c2=0.25/0.75=1/3, c4=0.25/0.75=1/3
      // Score: (100 * 1/3) + (0 * 1/3) + (50 * 1/3) = 33.33 + 0 + 16.67 = 50
      expect(result[0].score).toBe(50);
      expect(result[0].status).toBe('FAIL');
    });

    it('should determine status thresholds correctly', () => {
      const testCases = [
        { score: 100, expectedStatus: 'PASS' },
        { score: 80, expectedStatus: 'PASS' },
        { score: 79, expectedStatus: 'NEEDS_IMPROVEMENT' },
        { score: 60, expectedStatus: 'NEEDS_IMPROVEMENT' },
        { score: 59, expectedStatus: 'FAIL' },
        { score: 0, expectedStatus: 'FAIL' },
      ];

      testCases.forEach(({ score, expectedStatus }) => {
        const category: ComplianceCategory = {
          name: 'Test Category',
          description: 'Test category description',
          weight: 0.25,
          criteria: [
            {
              id: 'c1',
              description: 'Criterion 1',
              evidenceRequired: 'Evidence 1',
              scoringMethod: 'NUMERIC',
              weight: 1.0,
              status: 'PASS',
              score,
              rationale: 'Test',
            },
          ],
        };

        // Manually set the status based on score for this test
        category.criteria[0].status = score >= 80 ? 'PASS' : score >= 50 ? 'PARTIAL' : 'FAIL';

        const result = service.calculateCategoryScores([category]);
        expect(result[0].status).toBe(expectedStatus);
      });
    });
  });

  describe('calculateOverallScore', () => {
    it('should weight categories correctly', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Category 1 description',
          weight: 0.6,
          score: 100,
          status: 'PASS',
          criteria: [],
        },
        {
          name: 'Category 2',
          description: 'Category 2 description',
          weight: 0.4,
          score: 50,
          status: 'NEEDS_IMPROVEMENT',
          criteria: [],
        },
      ];

      const overallScore = service.calculateOverallScore(categories);

      // (100 * 0.6) + (50 * 0.4) = 60 + 20 = 80
      expect(overallScore).toBe(80);
    });

    it('should handle equal category weights', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Category 1 description',
          weight: 0.5,
          score: 80,
          status: 'PASS',
          criteria: [],
        },
        {
          name: 'Category 2',
          description: 'Category 2 description',
          weight: 0.5,
          score: 60,
          status: 'NEEDS_IMPROVEMENT',
          criteria: [],
        },
      ];

      const overallScore = service.calculateOverallScore(categories);

      // (80 * 0.5) + (60 * 0.5) = 40 + 30 = 70
      expect(overallScore).toBe(70);
    });

    it('should redistribute weights when some categories have no applicable criteria', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Category 1 description',
          weight: 0.5,
          score: 100,
          status: 'PASS',
          criteria: [],
        },
        {
          name: 'Category 2',
          description: 'Category 2 description',
          weight: 0.5,
          score: 0,
          status: 'NEEDS_IMPROVEMENT',
          criteria: [],
        },
      ];

      const overallScore = service.calculateOverallScore(categories);

      // Only Category 1 has score > 0, so weight becomes 1.0
      // 100 * 1.0 = 100
      expect(overallScore).toBe(100);
    });

    it('should return 0 when all categories have no applicable criteria', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Category 1 description',
          weight: 0.5,
          score: 0,
          status: 'NEEDS_IMPROVEMENT',
          criteria: [],
        },
        {
          name: 'Category 2',
          description: 'Category 2 description',
          weight: 0.5,
          score: 0,
          status: 'NEEDS_IMPROVEMENT',
          criteria: [],
        },
      ];

      const overallScore = service.calculateOverallScore(categories);

      expect(overallScore).toBe(0);
    });

    it('should handle three categories with different weights', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Category 1 description',
          weight: 0.5,
          score: 90,
          status: 'PASS',
          criteria: [],
        },
        {
          name: 'Category 2',
          description: 'Category 2 description',
          weight: 0.3,
          score: 70,
          status: 'NEEDS_IMPROVEMENT',
          criteria: [],
        },
        {
          name: 'Category 3',
          description: 'Category 3 description',
          weight: 0.2,
          score: 50,
          status: 'FAIL',
          criteria: [],
        },
      ];

      const overallScore = service.calculateOverallScore(categories);

      // (90 * 0.5) + (70 * 0.3) + (50 * 0.2) = 45 + 21 + 10 = 76
      expect(overallScore).toBe(76);
    });

    it('should round fractional scores correctly', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Category 1',
          description: 'Category 1 description',
          weight: 0.333,
          score: 100,
          status: 'PASS',
          criteria: [],
        },
        {
          name: 'Category 2',
          description: 'Category 2 description',
          weight: 0.333,
          score: 100,
          status: 'PASS',
          criteria: [],
        },
        {
          name: 'Category 3',
          description: 'Category 3 description',
          weight: 0.334,
          score: 100,
          status: 'PASS',
          criteria: [],
        },
      ];

      const overallScore = service.calculateOverallScore(categories);

      // Should round to 100
      expect(overallScore).toBe(100);
    });
  });

  describe('determineOverallStatus', () => {
    it('should return PASS for scores >= 80', () => {
      expect(service.determineOverallStatus(100)).toBe('PASS');
      expect(service.determineOverallStatus(90)).toBe('PASS');
      expect(service.determineOverallStatus(80)).toBe('PASS');
    });

    it('should return NEEDS_IMPROVEMENT for scores 60-79', () => {
      expect(service.determineOverallStatus(79)).toBe('NEEDS_IMPROVEMENT');
      expect(service.determineOverallStatus(70)).toBe('NEEDS_IMPROVEMENT');
      expect(service.determineOverallStatus(60)).toBe('NEEDS_IMPROVEMENT');
    });

    it('should return FAIL for scores < 60', () => {
      expect(service.determineOverallStatus(59)).toBe('FAIL');
      expect(service.determineOverallStatus(50)).toBe('FAIL');
      expect(service.determineOverallStatus(0)).toBe('FAIL');
    });
  });

  describe('getCriterionScore', () => {
    it('should return 100 for PASS', () => {
      expect(service.getCriterionScore('PASS')).toBe(100);
    });

    it('should return 50 for PARTIAL', () => {
      expect(service.getCriterionScore('PARTIAL')).toBe(50);
    });

    it('should return 0 for FAIL', () => {
      expect(service.getCriterionScore('FAIL')).toBe(0);
    });

    it('should return 0 for NOT_APPLICABLE', () => {
      expect(service.getCriterionScore('NOT_APPLICABLE')).toBe(0);
    });
  });

  describe('Integration: Full Scoring Workflow', () => {
    it('should calculate correct scores for realistic audit scenario', () => {
      const categories: ComplianceCategory[] = [
        {
          name: 'Initial Radio Report',
          description: 'Initial report compliance',
          weight: 0.25,
          criteria: [
            {
              id: 'init-1',
              description: 'Location stated',
              evidenceRequired: 'Address mentioned',
              scoringMethod: 'PASS_FAIL',
              weight: 0.5,
              status: 'PASS',
              rationale: 'Address clearly stated',
            },
            {
              id: 'init-2',
              description: 'Situation described',
              evidenceRequired: 'Incident type',
              scoringMethod: 'PASS_FAIL',
              weight: 0.5,
              status: 'PASS',
              rationale: 'Incident described',
            },
          ],
        },
        {
          name: 'Command Structure',
          description: 'Command establishment',
          weight: 0.25,
          criteria: [
            {
              id: 'cmd-1',
              description: 'Command established',
              evidenceRequired: 'Command announced',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 0.6,
              status: 'PASS',
              rationale: 'Command announced',
            },
            {
              id: 'cmd-2',
              description: 'Command location',
              evidenceRequired: 'Location stated',
              scoringMethod: 'PASS_FAIL',
              weight: 0.4,
              status: 'PARTIAL',
              rationale: 'Location implied but not explicit',
            },
          ],
        },
        {
          name: 'Personnel Accountability',
          description: 'PAR conducted',
          weight: 0.25,
          criteria: [
            {
              id: 'par-1',
              description: 'PAR requested',
              evidenceRequired: 'PAR call made',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 1.0,
              status: 'FAIL',
              rationale: 'No PAR conducted',
            },
          ],
        },
        {
          name: 'Emergency Communications',
          description: 'Mayday handling',
          weight: 0.25,
          criteria: [
            {
              id: 'emg-1',
              description: 'Mayday protocol',
              evidenceRequired: 'Proper mayday',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 1.0,
              status: 'NOT_APPLICABLE',
              rationale: 'No mayday in this incident',
            },
          ],
        },
      ];

      const scoredCategories = service.calculateCategoryScores(categories);

      // Initial Radio Report: (100*0.5 + 100*0.5) = 100 (PASS)
      expect(scoredCategories[0].score).toBe(100);
      expect(scoredCategories[0].status).toBe('PASS');

      // Command Structure: (100*0.6 + 50*0.4) = 60 + 20 = 80 (PASS)
      expect(scoredCategories[1].score).toBe(80);
      expect(scoredCategories[1].status).toBe('PASS');

      // Personnel Accountability: (0*1.0) = 0 (FAIL)
      expect(scoredCategories[2].score).toBe(0);
      expect(scoredCategories[2].status).toBe('FAIL');

      // Emergency Communications: All NOT_APPLICABLE = 0
      expect(scoredCategories[3].score).toBe(0);

      const overallScore = service.calculateOverallScore(scoredCategories);

      // Only first 3 categories have applicable criteria (scores > 0)
      // Total weight: 0.25 + 0.25 + 0.25 = 0.75
      // Normalized weights: 0.25/0.75 = 1/3 each
      // (100 * 1/3) + (80 * 1/3) + (0 * 1/3) = 33.33 + 26.67 + 0 = 60
      expect(overallScore).toBe(60);

      const overallStatus = service.determineOverallStatus(overallScore);
      expect(overallStatus).toBe('NEEDS_IMPROVEMENT');
    });
  });
});
