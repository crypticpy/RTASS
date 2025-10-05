/**
 * Emergency Detection Service Tests
 * Fire Department Radio Transcription System
 *
 * Test suite for emergency detection with 15+ mayday patterns,
 * edge cases, and confidence score verification.
 * Target: >95% accuracy for mayday detection.
 */

import { emergencyDetectionService } from '@/lib/services/emergencyDetection';
import { TranscriptionSegment } from '@/lib/types';

describe('EmergencyDetectionService', () => {
  describe('detectMayday', () => {
    it('should detect explicit "mayday mayday mayday" with >98% confidence', () => {
      const text = 'Mayday mayday mayday, Engine 1 is trapped on the second floor';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 15, end: 25, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].confidence).toBeGreaterThan(0.98);
      expect(detections[0].keyword.toLowerCase()).toContain('mayday');
      expect(detections[0].severity).toBe('CRITICAL');
      expect(detections[0].timestamp).toBe(15);
    });

    it('should detect single "mayday" with high confidence', () => {
      const text = 'Mayday, this is Engine 5, we need immediate assistance';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].confidence).toBeGreaterThan(0.95);
      expect(detections[0].keyword.toLowerCase()).toContain('mayday');
    });

    it('should detect "may day" (separated) with high confidence', () => {
      const text = 'May day may day, firefighter down on the third floor';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 5, end: 15, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].confidence).toBeGreaterThan(0.93);
      expect(detections[0].keyword.toLowerCase()).toContain('may day');
    });

    it('should detect "firefighter down" with 100% confidence', () => {
      const text = 'Command, we have a firefighter down in the basement';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 20, end: 30, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].confidence).toBeGreaterThanOrEqual(0.98);
      expect(detections[0].keyword.toLowerCase()).toContain('firefighter down');
    });

    it('should detect "FF down" (abbreviated firefighter)', () => {
      const text = 'FF down, FF down, immediate assistance needed';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 10, end: 20, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections.length).toBeGreaterThanOrEqual(1);
      expect(detections[0].keyword.toLowerCase()).toContain('ff down');
      expect(detections[0].confidence).toBeGreaterThan(0.9);
    });

    it('should detect "structural collapse" with high confidence', () => {
      const text = 'Structural collapse! Evacuate the building immediately';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].keyword.toLowerCase()).toContain('structural collapse');
      expect(detections[0].confidence).toBeGreaterThan(0.9);
    });

    it('should detect "trapped firefighter" with high confidence', () => {
      const text = 'We have a trapped firefighter on the second floor, need RIT activation';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 30, end: 40, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].keyword.toLowerCase()).toContain('trapped firefighter');
      expect(detections[0].confidence).toBeGreaterThan(0.93);
    });

    it('should detect "firefighter trapped" (reversed order)', () => {
      const text = 'Command, firefighter trapped in the rear bedroom';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 15, end: 25, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].keyword.toLowerCase()).toContain('firefighter trapped');
    });

    it('should detect "emergency evacuation" with high confidence', () => {
      const text = 'Emergency evacuation, all units exit the building now';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 45, end: 55, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].keyword.toLowerCase()).toContain('emergency evacuation');
      expect(detections[0].confidence).toBeGreaterThan(0.85);
    });

    it('should detect "low air" emergency', () => {
      const text = 'Engine 3 to command, we have low air and need to exit';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 60, end: 70, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].keyword.toLowerCase()).toContain('low air');
      expect(detections[0].confidence).toBeGreaterThan(0.75);
    });

    it('should detect "out of air" emergency', () => {
      const text = 'Firefighter out of air on the third floor, immediate assistance';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 100, end: 110, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].keyword.toLowerCase()).toContain('out of air');
      expect(detections[0].confidence).toBeGreaterThan(0.9);
    });

    it('should detect "PASS alarm" emergency', () => {
      const text = 'Command, we hear a PASS alarm in the second floor hallway';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 120, end: 130, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].keyword.toLowerCase()).toContain('pass alarm');
      expect(detections[0].confidence).toBeGreaterThan(0.8);
    });

    it('should detect "all out" evacuation order', () => {
      const text = 'All out, all out, evacuate the structure immediately';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 150, end: 160, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections.length).toBeGreaterThanOrEqual(1);
      expect(detections[0].keyword.toLowerCase()).toContain('all out');
      expect(detections[0].confidence).toBeGreaterThan(0.8);
    });

    it('should detect "member down" emergency', () => {
      const text = 'Member down, member down, activate RIT immediately';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 200, end: 210, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections.length).toBeGreaterThanOrEqual(1);
      expect(detections[0].keyword.toLowerCase()).toContain('member down');
      expect(detections[0].confidence).toBeGreaterThan(0.9);
    });

    it('should detect "emergency emergency" double call', () => {
      const text = 'Emergency emergency, we need help on the roof';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 250, end: 260, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].keyword.toLowerCase()).toContain('emergency emergency');
      expect(detections[0].confidence).toBeGreaterThan(0.93);
    });

    it('should detect "lost firefighter"', () => {
      const text = 'Command, we have a lost firefighter in the basement area';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 300, end: 310, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(1);
      expect(detections[0].keyword.toLowerCase()).toContain('lost firefighter');
      expect(detections[0].confidence).toBeGreaterThan(0.9);
    });

    it('should detect "abandon building" evacuation', () => {
      const text = 'Abandon building, abandon building, structural instability';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 350, end: 360, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections.length).toBeGreaterThanOrEqual(1);
      expect(detections[0].keyword.toLowerCase()).toContain('abandon building');
      expect(detections[0].confidence).toBeGreaterThan(0.85);
    });

    it('should detect "collapse" standalone term', () => {
      const text = 'Collapse! Collapse! Get everyone out now';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 400, end: 410, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections.length).toBeGreaterThanOrEqual(1);
      expect(detections[0].keyword.toLowerCase()).toContain('collapse');
      expect(detections[0].confidence).toBeGreaterThan(0.7);
    });

    it('should be case-insensitive for mayday detection', () => {
      const testCases = [
        'MAYDAY MAYDAY MAYDAY',
        'mayday mayday mayday',
        'MayDay MayDay MayDay',
        'MaYdAy MaYdAy MaYdAy',
      ];

      testCases.forEach((text) => {
        const segments: TranscriptionSegment[] = [
          { id: 0, start: 0, end: 10, text },
        ];
        const detections = emergencyDetectionService.detectMayday(text, segments);
        expect(detections.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should handle multiple mayday calls in one transcript', () => {
      const text = `
        Mayday mayday mayday, Engine 1 trapped on second floor.
        Command acknowledges, RIT activated.
        Mayday, firefighter down in the basement.
        PASS alarm sounding on third floor.
      `;
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text: 'Mayday mayday mayday, Engine 1 trapped on second floor.' },
        { id: 1, start: 10, end: 20, text: 'Command acknowledges, RIT activated.' },
        { id: 2, start: 20, end: 30, text: 'Mayday, firefighter down in the basement.' },
        { id: 3, start: 30, end: 40, text: 'PASS alarm sounding on third floor.' },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections.length).toBeGreaterThanOrEqual(3);
      expect(detections.filter((d) => d.keyword.toLowerCase().includes('mayday')).length).toBeGreaterThanOrEqual(2);
    });

    it('should boost confidence with supporting context keywords', () => {
      const textWithContext = 'Mayday mayday mayday, Engine 1 firefighter trapped, immediate help needed';
      const textWithoutContext = 'Mayday mayday mayday';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text: textWithContext },
      ];
      const segmentsNoContext: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text: textWithoutContext },
      ];

      const detectionsWithContext = emergencyDetectionService.detectMayday(textWithContext, segments);
      const detectionsNoContext = emergencyDetectionService.detectMayday(textWithoutContext, segmentsNoContext);

      expect(detectionsWithContext[0].confidence).toBeGreaterThanOrEqual(detectionsNoContext[0].confidence);
    });

    // Edge cases
    it('should handle empty transcript gracefully', () => {
      const text = '';
      const segments: TranscriptionSegment[] = [];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(0);
    });

    it('should handle no segments', () => {
      const text = 'Some normal radio traffic without emergencies';
      const segments: TranscriptionSegment[] = [];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(0);
    });

    it('should not detect false positives in normal traffic', () => {
      const text = 'Engine 1 to command, we are making entry through the front door';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      expect(detections).toHaveLength(0);
    });

    it('should deduplicate detections in the same segment', () => {
      const text = 'Mayday trapped firefighter mayday trapped';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text },
      ];

      const detections = emergencyDetectionService.detectMayday(text, segments);

      // Should deduplicate to avoid multiple detections for same segment
      expect(detections.length).toBeLessThanOrEqual(2);
    });
  });

  describe('detectEmergencyTerms', () => {
    it('should detect "trapped" with context boost', () => {
      const text = 'Engine 1 to command, we have a trapped firefighter on the second floor';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text },
      ];

      const detections = emergencyDetectionService.detectEmergencyTerms(text, segments);

      expect(detections.some((d) => d.term.toLowerCase().includes('trapped'))).toBe(true);
      const trappedDetection = detections.find((d) => d.term.toLowerCase().includes('trapped'));
      expect(trappedDetection?.severity).toBe('CRITICAL');
      expect(trappedDetection?.category).toBe('DISTRESS');
    });

    it('should detect MAYDAY category terms', () => {
      const text = 'Mayday, we need assistance';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text },
      ];

      const detections = emergencyDetectionService.detectEmergencyTerms(text, segments);

      const maydayTerm = detections.find((d) => d.category === 'MAYDAY');
      expect(maydayTerm).toBeDefined();
      expect(maydayTerm?.severity).toBe('CRITICAL');
    });

    it('should detect EMERGENCY category terms', () => {
      const text = 'This is an emergency, we need urgent assistance';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text },
      ];

      const detections = emergencyDetectionService.detectEmergencyTerms(text, segments);

      const emergencyTerms = detections.filter((d) => d.category === 'EMERGENCY');
      expect(emergencyTerms.length).toBeGreaterThanOrEqual(1);
      expect(emergencyTerms.some((d) => d.term.toLowerCase().includes('emergency'))).toBe(true);
    });

    it('should detect DISTRESS category terms', () => {
      const text = 'Firefighter is lost and disoriented in the smoke';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text },
      ];

      const detections = emergencyDetectionService.detectEmergencyTerms(text, segments);

      const distressTerms = detections.filter((d) => d.category === 'DISTRESS');
      expect(distressTerms.length).toBeGreaterThanOrEqual(1);
      expect(distressTerms.some((d) => d.term.toLowerCase().includes('lost'))).toBe(true);
    });

    it('should detect SAFETY category terms', () => {
      const text = 'Command requesting PAR from all units, withdraw to defensive positions';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text },
      ];

      const detections = emergencyDetectionService.detectEmergencyTerms(text, segments);

      const safetyTerms = detections.filter((d) => d.category === 'SAFETY');
      expect(safetyTerms.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect EVACUATION category terms', () => {
      const text = 'Evacuate the building, all units get out now';
      const segments: TranscriptionSegment[] = [
        { id: 0, start: 0, end: 10, text },
      ];

      const detections = emergencyDetectionService.detectEmergencyTerms(text, segments);

      const evacuationTerms = detections.filter((d) => d.category === 'EVACUATION');
      expect(evacuationTerms.length).toBeGreaterThanOrEqual(1);
      expect(evacuationTerms.some((d) => d.term.toLowerCase().includes('evacuate'))).toBe(true);
    });

    it('should handle empty input', () => {
      const text = '';
      const segments: TranscriptionSegment[] = [];

      const detections = emergencyDetectionService.detectEmergencyTerms(text, segments);

      expect(detections).toHaveLength(0);
    });
  });

  describe('analyzeEmergencySeverity', () => {
    it('should classify multiple maydays as CRITICAL', () => {
      const maydays = [
        {
          type: 'MAYDAY' as const,
          severity: 'CRITICAL' as const,
          keyword: 'mayday mayday mayday',
          confidence: 1.0,
          timestamp: 10,
          context: 'Engine 1 trapped',
        },
        {
          type: 'MAYDAY' as const,
          severity: 'CRITICAL' as const,
          keyword: 'firefighter down',
          confidence: 1.0,
          timestamp: 20,
          context: 'Basement area',
        },
      ];
      const terms: any[] = [];

      const analysis = emergencyDetectionService.analyzeEmergencySeverity(maydays, terms);

      expect(analysis.overallSeverity).toBe('CRITICAL');
      expect(analysis.maydayCount).toBe(2);
      expect(analysis.hasFirefighterDown).toBe(true);
    });

    it('should classify structural collapse as CRITICAL', () => {
      const maydays = [
        {
          type: 'MAYDAY' as const,
          severity: 'CRITICAL' as const,
          keyword: 'structural collapse',
          confidence: 0.92,
          timestamp: 30,
          context: 'Building collapse',
        },
      ];
      const terms = [
        {
          term: 'collapse',
          category: 'DISTRESS' as const,
          timestamp: 30,
          context: 'Building collapse',
          severity: 'CRITICAL' as const,
        },
      ];

      const analysis = emergencyDetectionService.analyzeEmergencySeverity(maydays, terms);

      expect(analysis.overallSeverity).toBe('CRITICAL');
      expect(analysis.hasStructuralCollapse).toBe(true);
    });

    it('should classify firefighter down as CRITICAL', () => {
      const maydays = [
        {
          type: 'MAYDAY' as const,
          severity: 'CRITICAL' as const,
          keyword: 'firefighter down',
          confidence: 1.0,
          timestamp: 15,
          context: 'Second floor',
        },
      ];
      const terms: any[] = [];

      const analysis = emergencyDetectionService.analyzeEmergencySeverity(maydays, terms);

      expect(analysis.overallSeverity).toBe('CRITICAL');
      expect(analysis.hasFirefighterDown).toBe(true);
      expect(analysis.maydayCount).toBe(1);
    });

    it('should classify evacuation as HIGH severity when no mayday', () => {
      const maydays: any[] = [];
      const terms = [
        {
          term: 'evacuate',
          category: 'EVACUATION' as const,
          timestamp: 10,
          context: 'All units evacuate',
          severity: 'CRITICAL' as const,
        },
        {
          term: 'all out',
          category: 'EVACUATION' as const,
          timestamp: 12,
          context: 'All out',
          severity: 'CRITICAL' as const,
        },
      ];

      const analysis = emergencyDetectionService.analyzeEmergencySeverity(maydays, terms);

      expect(analysis.overallSeverity).toBe('HIGH');
      expect(analysis.hasEvacuation).toBe(true);
    });

    it('should calculate average confidence correctly', () => {
      const maydays = [
        {
          type: 'MAYDAY' as const,
          severity: 'CRITICAL' as const,
          keyword: 'mayday',
          confidence: 0.98,
          timestamp: 10,
          context: '',
        },
        {
          type: 'MAYDAY' as const,
          severity: 'CRITICAL' as const,
          keyword: 'mayday',
          confidence: 1.0,
          timestamp: 20,
          context: '',
        },
      ];
      const terms: any[] = [];

      const analysis = emergencyDetectionService.analyzeEmergencySeverity(maydays, terms);

      expect(analysis.averageConfidence).toBeCloseTo(0.99, 2);
    });

    it('should classify normal traffic as LOW severity', () => {
      const maydays: any[] = [];
      const terms: any[] = [];

      const analysis = emergencyDetectionService.analyzeEmergencySeverity(maydays, terms);

      expect(analysis.overallSeverity).toBe('LOW');
      expect(analysis.maydayCount).toBe(0);
      expect(analysis.criticalTermCount).toBe(0);
    });
  });
});
