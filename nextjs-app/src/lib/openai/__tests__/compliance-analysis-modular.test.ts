/**
 * Tests for Modular Compliance Analysis
 *
 * Comprehensive test suite demonstrating category-by-category scoring
 * and narrative generation with structured outputs.
 */

import {
  scoreSingleCategory,
  generateAuditNarrative,
  extractEvidenceFromTranscript,
  calculateWeightedScore,
  identifyCriticalFindings,
  type TranscriptSegment,
  type IncidentContext,
} from '../compliance-analysis-modular';
import type { TemplateCategory } from '@/types/policy';
import type { CategoryScore } from '@/lib/schemas/compliance-analysis.schema';

// Mock OpenAI client
jest.mock('../client', () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

describe('compliance-analysis-modular', () => {
  // Test data
  const mockTranscript = `
[00:00:15] Engine 1: Engine 1 to dispatch, we're on scene at 123 Main Street.
[00:00:22] Dispatch: Copy Engine 1, time is 14:30.
[00:00:30] Engine 1: We have heavy smoke showing from side Alpha, single-story commercial.
[00:00:45] Engine 1: Initiating 360 survey. Side Bravo shows no visible fire.
[00:01:10] Engine 1: Completing 360. Side Charlie shows heavy smoke, possible fire in rear.
[00:01:25] Ladder 2: Ladder 2 on scene, staging at corner of Main and Oak.
[00:01:40] Engine 1: Engine 1 establishing command, this is Main Street Command.
[00:01:55] Main Street Command: All units, this is a defensive operation. Ladder 2, set up for master stream.
[00:02:10] Ladder 2: Copy, setting up master stream on Side Alpha.
[00:02:30] Main Street Command: Dispatch, request additional engine company for water supply.
[00:02:45] Dispatch: Copy, Engine 3 is en route, ETA 4 minutes.
[00:03:00] Main Street Command: All units, PAR report.
[00:03:05] Engine 1: Engine 1, PAR 4.
[00:03:10] Ladder 2: Ladder 2, PAR 5.
[00:03:30] Main Street Command: Safety to Main Street Command, I'm establishing safety sector.
[00:03:45] Safety: Copy, safety sector established. All units maintain defensive posture.
  `.trim();

  const mockSegments: TranscriptSegment[] = [
    {
      id: 'seg-1',
      startTime: 15,
      endTime: 20,
      text: "Engine 1 to dispatch, we're on scene at 123 Main Street.",
      speaker: 'Engine 1',
      confidence: 0.95,
    },
    {
      id: 'seg-2',
      startTime: 22,
      endTime: 27,
      text: 'Copy Engine 1, time is 14:30.',
      speaker: 'Dispatch',
      confidence: 0.97,
    },
    {
      id: 'seg-3',
      startTime: 30,
      endTime: 40,
      text: 'We have heavy smoke showing from side Alpha, single-story commercial.',
      speaker: 'Engine 1',
      confidence: 0.93,
    },
    {
      id: 'seg-4',
      startTime: 45,
      endTime: 55,
      text: 'Initiating 360 survey. Side Bravo shows no visible fire.',
      speaker: 'Engine 1',
      confidence: 0.94,
    },
    {
      id: 'seg-5',
      startTime: 70,
      endTime: 80,
      text: 'Completing 360. Side Charlie shows heavy smoke, possible fire in rear.',
      speaker: 'Engine 1',
      confidence: 0.92,
    },
    {
      id: 'seg-6',
      startTime: 100,
      endTime: 105,
      text: 'Engine 1 establishing command, this is Main Street Command.',
      speaker: 'Engine 1',
      confidence: 0.96,
    },
    {
      id: 'seg-7',
      startTime: 185,
      endTime: 190,
      text: 'Engine 1, PAR 4.',
      speaker: 'Engine 1',
      confidence: 0.98,
    },
    {
      id: 'seg-8',
      startTime: 190,
      endTime: 195,
      text: 'Ladder 2, PAR 5.',
      speaker: 'Ladder 2',
      confidence: 0.97,
    },
  ];

  const mockIncidentContext: IncidentContext = {
    type: 'STRUCTURE_FIRE',
    date: new Date('2024-12-15T14:30:00Z'),
    units: ['Engine 1', 'Ladder 2', 'Engine 3', 'Battalion 1'],
    location: '123 Main Street',
    notes: 'Commercial building, defensive operation',
  };

  const mockCategory: TemplateCategory = {
    id: 'comm-protocols',
    name: 'Communication Protocols',
    description: 'Evaluation of radio communication standards and procedures',
    weight: 0.4,
    sortOrder: 1,
    analysisPrompt:
      'Evaluate radio discipline, proper terminology, and clear communication',
    criteria: [
      {
        id: 'comm-1',
        description: 'Units identify themselves before transmitting',
        scoringGuidance: 'All radio transmissions must begin with unit identifier',
        examplePass: 'Engine 1 to dispatch, we are on scene',
        exampleFail: 'We are on scene (no unit identification)',
        sortOrder: 1,
      },
      {
        id: 'comm-2',
        description: 'Clear and concise messages',
        scoringGuidance:
          'Messages should be brief, specific, and free of unnecessary information',
        examplePass: 'Engine 1, heavy smoke showing, Side Alpha',
        exampleFail: 'Um, well, we see some smoke, maybe on the front side, not sure',
        sortOrder: 2,
      },
      {
        id: 'comm-3',
        description: 'Proper use of phonetic alphabet for building sides',
        scoringGuidance: 'Building sides must be identified as Alpha, Bravo, Charlie, Delta',
        examplePass: 'Side Alpha shows heavy smoke',
        exampleFail: 'Front side shows heavy smoke',
        sortOrder: 3,
      },
    ],
  };

  describe('scoreSingleCategory', () => {
    it('should score a category successfully with valid response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                categoryName: 'Communication Protocols',
                categoryDescription: 'Evaluation of radio communication standards',
                criteriaScores: [
                  {
                    criterionId: 'comm-1',
                    score: 'PASS',
                    numericScore: 100,
                    confidence: 0.95,
                    reasoning:
                      'All units properly identified themselves before transmitting',
                    evidence: [
                      {
                        timestamp: '00:00:15',
                        text: "Engine 1 to dispatch, we're on scene at 123 Main Street.",
                        relevance: 'SUPPORTING',
                      },
                    ],
                    recommendation: null,
                  },
                  {
                    criterionId: 'comm-2',
                    score: 'PASS',
                    numericScore: 95,
                    confidence: 0.9,
                    reasoning: 'Messages were clear and concise throughout the incident',
                    evidence: [
                      {
                        timestamp: '00:00:30',
                        text: 'We have heavy smoke showing from side Alpha, single-story commercial.',
                        relevance: 'SUPPORTING',
                      },
                    ],
                    recommendation: null,
                  },
                  {
                    criterionId: 'comm-3',
                    score: 'PASS',
                    numericScore: 100,
                    confidence: 0.98,
                    reasoning: 'Phonetic alphabet used correctly for all building sides',
                    evidence: [
                      {
                        timestamp: '00:00:30',
                        text: 'We have heavy smoke showing from side Alpha',
                        relevance: 'SUPPORTING',
                      },
                      {
                        timestamp: '00:01:10',
                        text: 'Side Charlie shows heavy smoke',
                        relevance: 'SUPPORTING',
                      },
                    ],
                    recommendation: null,
                  },
                ],
                overallCategoryScore: 98,
                categoryStatus: 'PASS',
                summary:
                  'Excellent communication discipline demonstrated throughout. All units properly identified themselves, used correct phonetic alphabet, and maintained clear, concise transmissions.',
                criticalFindings: [],
                timestamp: new Date().toISOString(),
              }),
              refusal: null,
            },
          },
        ],
      };

      const { openai } = require('../client');
      openai.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await scoreSingleCategory(
        mockTranscript,
        mockSegments,
        mockCategory,
        mockIncidentContext
      );

      expect(result.categoryName).toBe('Communication Protocols');
      expect(result.overallCategoryScore).toBe(98);
      expect(result.categoryStatus).toBe('PASS');
      expect(result.criteriaScores).toHaveLength(3);
      expect(result.criticalFindings).toHaveLength(0);
    });

    it('should handle AI refusal gracefully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
              refusal: 'I cannot analyze this content for safety reasons',
            },
          },
        ],
      };

      const { openai } = require('../client');
      openai.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(
        scoreSingleCategory(
          mockTranscript,
          mockSegments,
          mockCategory,
          mockIncidentContext
        )
      ).rejects.toThrow('AI refused to score category');
    });

    it('should validate input parameters', async () => {
      await expect(
        scoreSingleCategory('', mockSegments, mockCategory, mockIncidentContext)
      ).rejects.toThrow('Transcript text is empty');

      await expect(
        scoreSingleCategory(
          mockTranscript,
          mockSegments,
          { ...mockCategory, criteria: [] },
          mockIncidentContext
        )
      ).rejects.toThrow('Category has no criteria to analyze');
    });
  });

  describe('generateAuditNarrative', () => {
    const mockCategoryScores: CategoryScore[] = [
      {
        categoryName: 'Communication Protocols',
        categoryDescription: 'Radio communication standards',
        criteriaScores: [],
        overallCategoryScore: 95,
        categoryStatus: 'PASS',
        summary: 'Excellent communication discipline',
        criticalFindings: [],
        timestamp: new Date().toISOString(),
      },
      {
        categoryName: 'Safety Procedures',
        categoryDescription: 'Safety protocol adherence',
        criteriaScores: [],
        overallCategoryScore: 88,
        categoryStatus: 'NEEDS_IMPROVEMENT',
        summary: 'Good safety practices with minor gaps',
        criticalFindings: ['PAR report delayed by 30 seconds'],
        timestamp: new Date().toISOString(),
      },
    ];

    it('should generate comprehensive narrative from category scores', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                executiveSummary:
                  'This audit evaluated radio communications during a commercial structure fire response. The incident commander and responding units demonstrated strong adherence to communication protocols and safety procedures.\n\nOverall, the response was highly effective with a score of 91.5/100. Communication discipline was exemplary, with all units properly identifying themselves and using correct phonetic alphabet. Safety procedures were generally followed, though there was a minor delay in PAR reporting.\n\nNo critical safety issues were identified. The response serves as a good example of coordinated firefighting operations with professional communication standards.',
                overallScore: 92,
                overallStatus: 'PASS',
                strengths: [
                  'All units properly identified themselves on every transmission',
                  'Correct use of phonetic alphabet for building sides (Alpha, Bravo, Charlie)',
                  'Clear establishment of command structure',
                  'Proper defensive strategy communicated',
                ],
                areasForImprovement: [
                  'PAR reports could be initiated more promptly after command request',
                  'More frequent safety sector updates would enhance situational awareness',
                ],
                criticalIssues: [],
                recommendations: [
                  {
                    priority: 'MEDIUM',
                    category: 'Safety Procedures',
                    recommendation:
                      'Implement standardized PAR report timing to ensure accountability',
                    actionItems: [
                      'Review PAR report procedures in next training session',
                      'Set expectation for PAR reports within 15 seconds of request',
                      'Practice PAR report drills during apparatus checks',
                    ],
                  },
                  {
                    priority: 'LOW',
                    category: 'Communication Protocols',
                    recommendation:
                      'Continue reinforcing excellent communication discipline',
                    actionItems: [
                      'Recognize units for professional radio communication',
                      'Use this incident as training example for new personnel',
                    ],
                  },
                ],
                complianceHighlights: [
                  'Incident Commander established command immediately upon completion of 360 survey',
                  'Safety officer proactively established safety sector',
                  'All units maintained defensive posture as directed',
                ],
              }),
              refusal: null,
            },
          },
        ],
      };

      const { openai } = require('../client');
      openai.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await generateAuditNarrative(
        mockTranscript,
        mockCategoryScores,
        mockIncidentContext
      );

      expect(result.overallScore).toBe(92);
      expect(result.overallStatus).toBe('PASS');
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.criticalIssues).toHaveLength(0);
    });

    it('should validate input parameters', async () => {
      await expect(
        generateAuditNarrative(mockTranscript, [], mockIncidentContext)
      ).rejects.toThrow('No category scores provided');
    });
  });

  describe('extractEvidenceFromTranscript', () => {
    it('should find evidence matching search term', () => {
      const evidence = extractEvidenceFromTranscript(mockSegments, 'PAR', 5);

      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence[0].text).toContain('PAR');
      expect(evidence[0].timestamp).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should include context from surrounding segments', () => {
      const evidence = extractEvidenceFromTranscript(mockSegments, 'command', 10);

      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence[0].relevance).toBe('CONTEXTUAL');
    });

    it('should format timestamps correctly', () => {
      const evidence = extractEvidenceFromTranscript(mockSegments, 'Engine 1', 5);

      evidence.forEach((item) => {
        expect(item.timestamp).toMatch(/^\d{1,2}:\d{2}(:\d{2})?$/);
      });
    });
  });

  describe('calculateWeightedScore', () => {
    it('should calculate weighted average correctly', () => {
      const categoryScores: CategoryScore[] = [
        {
          categoryName: 'Communication',
          categoryDescription: 'Test',
          criteriaScores: [],
          overallCategoryScore: 90,
          categoryStatus: 'PASS',
          summary: 'Test',
          criticalFindings: [],
          timestamp: new Date().toISOString(),
        },
        {
          categoryName: 'Safety',
          categoryDescription: 'Test',
          criteriaScores: [],
          overallCategoryScore: 80,
          categoryStatus: 'PASS',
          summary: 'Test',
          criticalFindings: [],
          timestamp: new Date().toISOString(),
        },
        {
          categoryName: 'Command',
          categoryDescription: 'Test',
          criteriaScores: [],
          overallCategoryScore: 70,
          categoryStatus: 'NEEDS_IMPROVEMENT',
          summary: 'Test',
          criticalFindings: [],
          timestamp: new Date().toISOString(),
        },
      ];

      const weights = new Map([
        ['Communication', 0.4],
        ['Safety', 0.4],
        ['Command', 0.2],
      ]);

      const result = calculateWeightedScore(categoryScores, weights);

      // (90 * 0.4) + (80 * 0.4) + (70 * 0.2) = 36 + 32 + 14 = 82
      expect(result).toBe(82);
    });

    it('should handle missing weights gracefully', () => {
      const categoryScores: CategoryScore[] = [
        {
          categoryName: 'Communication',
          categoryDescription: 'Test',
          criteriaScores: [],
          overallCategoryScore: 90,
          categoryStatus: 'PASS',
          summary: 'Test',
          criticalFindings: [],
          timestamp: new Date().toISOString(),
        },
      ];

      const weights = new Map([['OtherCategory', 0.5]]);

      const result = calculateWeightedScore(categoryScores, weights);
      expect(result).toBe(0); // No matching weights
    });
  });

  describe('identifyCriticalFindings', () => {
    it('should extract critical findings from categories', () => {
      const categoryScores: CategoryScore[] = [
        {
          categoryName: 'Safety',
          categoryDescription: 'Test',
          criteriaScores: [
            {
              criterionId: 'safety-1',
              score: 'FAIL',
              numericScore: 0,
              confidence: 0.9,
              reasoning: 'No mayday acknowledgment observed',
              evidence: [],
              recommendation: 'Review mayday procedures',
            },
          ],
          overallCategoryScore: 60,
          categoryStatus: 'FAIL',
          summary: 'Test',
          criticalFindings: ['Mayday protocol not followed'],
          timestamp: new Date().toISOString(),
        },
      ];

      const findings = identifyCriticalFindings(categoryScores);

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0]).toContain('Safety');
    });

    it('should filter by confidence threshold', () => {
      const categoryScores: CategoryScore[] = [
        {
          categoryName: 'Communication',
          categoryDescription: 'Test',
          criteriaScores: [
            {
              criterionId: 'comm-1',
              score: 'FAIL',
              numericScore: 0,
              confidence: 0.5, // Below threshold
              reasoning: 'Unclear transmission',
              evidence: [],
              recommendation: 'Improve clarity',
            },
            {
              criterionId: 'comm-2',
              score: 'FAIL',
              numericScore: 0,
              confidence: 0.95, // Above threshold
              reasoning: 'No unit identification',
              evidence: [],
              recommendation: 'Always identify unit',
            },
          ],
          overallCategoryScore: 50,
          categoryStatus: 'FAIL',
          summary: 'Test',
          criticalFindings: [],
          timestamp: new Date().toISOString(),
        },
      ];

      const findings = identifyCriticalFindings(categoryScores);

      // Only the high-confidence finding should be included
      expect(findings.length).toBe(1);
      expect(findings[0]).toContain('No unit identification');
    });
  });
});
