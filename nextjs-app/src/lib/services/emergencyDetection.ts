/**
 * Emergency Detection Service
 * Fire Department Radio Transcription System
 *
 * Detects mayday calls, emergency communications, and critical terms in
 * radio transcripts. Uses pattern matching with confidence scoring to
 * achieve >95% accuracy target.
 */

import type {
  TranscriptionSegment,
  MaydayDetection,
  EmergencyTerm,
} from '@/lib/types';

/**
 * Mayday detection pattern with confidence weight
 */
interface MaydayPattern {
  pattern: RegExp;
  confidence: number; // Base confidence (0-1)
  keyword: string; // Human-readable keyword
  severity: 'CRITICAL';
}

/**
 * Emergency term pattern with category
 */
interface EmergencyPattern {
  pattern: RegExp;
  category: EmergencyTerm['category'];
  severity: EmergencyTerm['severity'];
  term: string;
}

/**
 * Mayday detection patterns ordered by specificity and reliability
 *
 * High confidence (1.0-0.9): Explicit mayday calls and critical emergencies
 * Medium confidence (0.89-0.7): Distress signals and emergency situations
 * Lower confidence (0.69-0.6): Contextual emergency indicators
 */
const MAYDAY_PATTERNS: MaydayPattern[] = [
  // Explicit mayday calls (highest confidence)
  {
    pattern: /\bmayday\s+mayday\s+mayday\b/gi,
    confidence: 1.0,
    keyword: 'mayday mayday mayday',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bmayday\b/gi,
    confidence: 0.98,
    keyword: 'mayday',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bmay\s+day\b/gi,
    confidence: 0.95,
    keyword: 'may day',
    severity: 'CRITICAL',
  },

  // Firefighter down emergencies (very high confidence)
  {
    pattern: /\bfirefighter\s+down\b/gi,
    confidence: 1.0,
    keyword: 'firefighter down',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bff\s+down\b/gi,
    confidence: 0.95,
    keyword: 'FF down',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bdown\s+firefighter\b/gi,
    confidence: 0.98,
    keyword: 'down firefighter',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bmember\s+down\b/gi,
    confidence: 0.92,
    keyword: 'member down',
    severity: 'CRITICAL',
  },

  // Double emergency calls
  {
    pattern: /\bemergency\s+emergency\b/gi,
    confidence: 0.95,
    keyword: 'emergency emergency',
    severity: 'CRITICAL',
  },

  // Structural collapse
  {
    pattern: /\bstructural\s+collapse\b/gi,
    confidence: 0.92,
    keyword: 'structural collapse',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bcollapse\b/gi,
    confidence: 0.75,
    keyword: 'collapse',
    severity: 'CRITICAL',
  },

  // Trapped/lost firefighters
  {
    pattern: /\btrapped\s+firefighter\b/gi,
    confidence: 0.95,
    keyword: 'trapped firefighter',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bfirefighter\s+trapped\b/gi,
    confidence: 0.95,
    keyword: 'firefighter trapped',
    severity: 'CRITICAL',
  },
  {
    pattern: /\blost\s+firefighter\b/gi,
    confidence: 0.92,
    keyword: 'lost firefighter',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bdisoriented\b/gi,
    confidence: 0.75,
    keyword: 'disoriented',
    severity: 'CRITICAL',
  },

  // Evacuation orders
  {
    pattern: /\bemergency\s+evacuation\b/gi,
    confidence: 0.9,
    keyword: 'emergency evacuation',
    severity: 'CRITICAL',
  },
  {
    pattern: /\ball\s+out\b/gi,
    confidence: 0.85,
    keyword: 'all out',
    severity: 'CRITICAL',
  },
  {
    pattern: /\babandon\s+building\b/gi,
    confidence: 0.88,
    keyword: 'abandon building',
    severity: 'CRITICAL',
  },

  // Air emergency
  {
    pattern: /\blow\s+air\b/gi,
    confidence: 0.8,
    keyword: 'low air',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bout\s+of\s+air\b/gi,
    confidence: 0.92,
    keyword: 'out of air',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bpass\s+alarm\b/gi,
    confidence: 0.85,
    keyword: 'PASS alarm',
    severity: 'CRITICAL',
  },

  // General distress (lower confidence)
  {
    pattern: /\btrapped\b/gi,
    confidence: 0.7,
    keyword: 'trapped',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bcan't\s+get\s+out\b/gi,
    confidence: 0.8,
    keyword: "can't get out",
    severity: 'CRITICAL',
  },
  {
    pattern: /\bneed\s+help\b/gi,
    confidence: 0.65,
    keyword: 'need help',
    severity: 'CRITICAL',
  },
  {
    pattern: /\bstuck\b/gi,
    confidence: 0.6,
    keyword: 'stuck',
    severity: 'CRITICAL',
  },
];

/**
 * Emergency term patterns for broader detection
 */
const EMERGENCY_PATTERNS: EmergencyPattern[] = [
  // Mayday category (duplicate of MAYDAY_PATTERNS for categorization)
  {
    pattern: /\bmayday\b/gi,
    category: 'MAYDAY',
    severity: 'CRITICAL',
    term: 'mayday',
  },

  // Emergency category
  {
    pattern: /\bemergency\b/gi,
    category: 'EMERGENCY',
    severity: 'HIGH',
    term: 'emergency',
  },
  {
    pattern: /\burgent\b/gi,
    category: 'EMERGENCY',
    severity: 'HIGH',
    term: 'urgent',
  },
  {
    pattern: /\bcritical\b/gi,
    category: 'EMERGENCY',
    severity: 'HIGH',
    term: 'critical',
  },

  // Distress category
  {
    pattern: /\btrapped\b/gi,
    category: 'DISTRESS',
    severity: 'CRITICAL',
    term: 'trapped',
  },
  {
    pattern: /\blost\b/gi,
    category: 'DISTRESS',
    severity: 'HIGH',
    term: 'lost',
  },
  {
    pattern: /\bdisoriented\b/gi,
    category: 'DISTRESS',
    severity: 'HIGH',
    term: 'disoriented',
  },
  {
    pattern: /\bstuck\b/gi,
    category: 'DISTRESS',
    severity: 'MEDIUM',
    term: 'stuck',
  },
  {
    pattern: /\binjured\b/gi,
    category: 'DISTRESS',
    severity: 'HIGH',
    term: 'injured',
  },

  // Safety category
  {
    pattern: /\bllow\s+air\b/gi,
    category: 'SAFETY',
    severity: 'CRITICAL',
    term: 'low air',
  },
  {
    pattern: /\bpass\s+alarm\b/gi,
    category: 'SAFETY',
    severity: 'CRITICAL',
    term: 'PASS alarm',
  },
  {
    pattern: /\bpar\b/gi,
    category: 'SAFETY',
    severity: 'HIGH',
    term: 'PAR (Personnel Accountability Report)',
  },
  {
    pattern: /\bwithdraw\b/gi,
    category: 'SAFETY',
    severity: 'HIGH',
    term: 'withdraw',
  },
  {
    pattern: /\bdefensive\s+mode\b/gi,
    category: 'SAFETY',
    severity: 'HIGH',
    term: 'defensive mode',
  },

  // Evacuation category
  {
    pattern: /\bevacuate\b/gi,
    category: 'EVACUATION',
    severity: 'CRITICAL',
    term: 'evacuate',
  },
  {
    pattern: /\ball\s+out\b/gi,
    category: 'EVACUATION',
    severity: 'CRITICAL',
    term: 'all out',
  },
  {
    pattern: /\babandon\b/gi,
    category: 'EVACUATION',
    severity: 'CRITICAL',
    term: 'abandon',
  },
  {
    pattern: /\bget\s+out\b/gi,
    category: 'EVACUATION',
    severity: 'HIGH',
    term: 'get out',
  },
];

/**
 * Emergency Detection Service
 *
 * Analyzes radio transcripts for mayday calls and emergency communications.
 * Uses pattern matching with context analysis and confidence scoring.
 *
 * @example
 * ```typescript
 * const detectionService = new EmergencyDetectionService();
 *
 * const maydays = detectionService.detectMayday(transcriptText, segments);
 * const emergencyTerms = detectionService.detectEmergencyTerms(transcriptText, segments);
 *
 * console.log(`Found ${maydays.length} mayday calls`);
 * ```
 */
export class EmergencyDetectionService {
  /**
   * Detect mayday calls in transcript
   *
   * Searches for mayday patterns and returns detections with context,
   * timestamps, and confidence scores.
   *
   * @param {string} text - Full transcript text
   * @param {TranscriptionSegment[]} segments - Timed transcript segments
   * @returns {MaydayDetection[]} Array of mayday detections
   *
   * @example
   * ```typescript
   * const maydays = service.detectMayday(transcript.text, transcript.segments);
   * maydays.forEach(mayday => {
   *   console.log(`Mayday at ${mayday.timestamp}s: ${mayday.keyword}`);
   *   console.log(`Context: ${mayday.context}`);
   *   console.log(`Confidence: ${mayday.confidence}`);
   * });
   * ```
   */
  detectMayday(
    text: string,
    segments: TranscriptionSegment[]
  ): MaydayDetection[] {
    const detections: MaydayDetection[] = [];

    // Search for each mayday pattern
    for (const pattern of MAYDAY_PATTERNS) {
      const matches = text.matchAll(pattern.pattern);

      for (const match of matches) {
        const matchIndex = match.index!;
        const matchText = match[0];

        // Find corresponding segment
        const segment = this.findSegmentByTextPosition(
          matchIndex,
          text,
          segments
        );

        // Extract context around the match
        const context = this.extractContext(text, matchIndex, 100);

        // Calculate confidence based on context
        const contextConfidence = this.calculateContextConfidence(
          context,
          pattern.keyword
        );
        const finalConfidence = Math.min(
          1.0,
          pattern.confidence + contextConfidence
        );

        const detection: MaydayDetection = {
          type: 'MAYDAY',
          severity: 'CRITICAL',
          keyword: pattern.keyword,
          timestamp: segment?.start || null,
          context,
          confidence: finalConfidence,
          segment,
        };

        detections.push(detection);
      }
    }

    // Remove duplicate detections (same segment, similar keywords)
    return this.deduplicateDetections(detections);
  }

  /**
   * Detect emergency terms in transcript
   *
   * Identifies emergency-related terminology across multiple categories.
   *
   * @param {string} text - Full transcript text
   * @param {TranscriptionSegment[]} segments - Timed transcript segments
   * @returns {EmergencyTerm[]} Array of emergency term detections
   *
   * @example
   * ```typescript
   * const terms = service.detectEmergencyTerms(transcript.text, transcript.segments);
   * const criticalTerms = terms.filter(t => t.severity === 'CRITICAL');
   * ```
   */
  detectEmergencyTerms(
    text: string,
    segments: TranscriptionSegment[]
  ): EmergencyTerm[] {
    const detections: EmergencyTerm[] = [];

    // Search for each emergency pattern
    for (const pattern of EMERGENCY_PATTERNS) {
      const matches = text.matchAll(pattern.pattern);

      for (const match of matches) {
        const matchIndex = match.index!;

        // Find corresponding segment
        const segment = this.findSegmentByTextPosition(
          matchIndex,
          text,
          segments
        );

        // Extract context
        const context = this.extractContext(text, matchIndex, 80);

        const detection: EmergencyTerm = {
          term: pattern.term,
          category: pattern.category,
          timestamp: segment?.start || null,
          context,
          severity: pattern.severity,
        };

        detections.push(detection);
      }
    }

    return detections;
  }

  /**
   * Find segment containing text at given position
   *
   * @private
   */
  private findSegmentByTextPosition(
    position: number,
    fullText: string,
    segments: TranscriptionSegment[]
  ): TranscriptionSegment | undefined {
    let currentPosition = 0;

    for (const segment of segments) {
      const segmentEnd = currentPosition + segment.text.length;

      if (position >= currentPosition && position < segmentEnd) {
        return segment;
      }

      currentPosition = segmentEnd + 1; // +1 for space between segments
    }

    return undefined;
  }

  /**
   * Extract context around a match position
   *
   * Returns surrounding text for better understanding of the detection.
   *
   * @private
   * @param {string} text - Full text
   * @param {number} position - Match position
   * @param {number} windowSize - Characters to include before and after
   * @returns {string} Context text
   */
  private extractContext(
    text: string,
    position: number,
    windowSize: number
  ): string {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + windowSize);

    let context = text.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context.trim();
  }

  /**
   * Calculate additional confidence based on context
   *
   * Looks for supporting keywords in the context to increase confidence.
   *
   * @private
   * @param {string} context - Context text
   * @param {string} keyword - Primary keyword
   * @returns {number} Confidence boost (0-0.15)
   */
  private calculateContextConfidence(
    context: string,
    keyword: string
  ): number {
    const lowerContext = context.toLowerCase();
    let boost = 0;

    // Supporting keywords that indicate genuine emergency
    const supportingKeywords = [
      'firefighter',
      'member',
      'crew',
      'unit',
      'engine',
      'ladder',
      'command',
      'ic',
      'battalion',
      'immediate',
      'now',
      'help',
      'need',
      'urgent',
    ];

    // Check for supporting keywords
    for (const support of supportingKeywords) {
      if (lowerContext.includes(support)) {
        boost += 0.03; // Small boost per supporting keyword
      }
    }

    // Cap the boost
    return Math.min(0.15, boost);
  }

  /**
   * Remove duplicate detections
   *
   * Filters out detections that occur in the same segment with overlapping keywords.
   *
   * @private
   */
  private deduplicateDetections(
    detections: MaydayDetection[]
  ): MaydayDetection[] {
    if (detections.length === 0) return [];

    // Sort by confidence (highest first)
    const sorted = [...detections].sort(
      (a, b) => b.confidence - a.confidence
    );

    const unique: MaydayDetection[] = [];
    const seenSegments = new Set<number>();

    for (const detection of sorted) {
      const segmentStart = detection.segment?.start;

      // If no segment or segment not seen, keep this detection
      if (!segmentStart || !seenSegments.has(segmentStart)) {
        unique.push(detection);
        if (segmentStart !== undefined) {
          seenSegments.add(segmentStart);
        }
      }
    }

    // Sort by timestamp
    return unique.sort((a, b) => {
      const aTime = a.timestamp || 0;
      const bTime = b.timestamp || 0;
      return aTime - bTime;
    });
  }

  /**
   * Analyze overall emergency severity of transcript
   *
   * Provides aggregate statistics about emergency detections.
   *
   * @param {MaydayDetection[]} maydays - Detected mayday calls
   * @param {EmergencyTerm[]} terms - Detected emergency terms
   * @returns {object} Emergency analysis summary
   *
   * @example
   * ```typescript
   * const analysis = service.analyzeEmergencySeverity(maydays, terms);
   * console.log(`Overall severity: ${analysis.overallSeverity}`);
   * console.log(`Mayday count: ${analysis.maydayCount}`);
   * ```
   */
  analyzeEmergencySeverity(
    maydays: MaydayDetection[],
    terms: EmergencyTerm[]
  ): {
    overallSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    maydayCount: number;
    criticalTermCount: number;
    highSeverityTermCount: number;
    hasStructuralCollapse: boolean;
    hasFirefighterDown: boolean;
    hasEvacuation: boolean;
    averageConfidence: number;
  } {
    const maydayCount = maydays.length;
    const criticalTerms = terms.filter((t) => t.severity === 'CRITICAL');
    const highSeverityTerms = terms.filter((t) => t.severity === 'HIGH');

    const hasStructuralCollapse = terms.some((t) =>
      t.term.toLowerCase().includes('collapse')
    );
    const hasFirefighterDown =
      maydays.some((m) => m.keyword.toLowerCase().includes('down')) ||
      terms.some((t) => t.term.toLowerCase().includes('down'));
    const hasEvacuation = terms.some((t) => t.category === 'EVACUATION');

    const averageConfidence =
      maydays.length > 0
        ? maydays.reduce((sum, m) => sum + m.confidence, 0) / maydays.length
        : 0;

    // Determine overall severity
    let overallSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

    if (maydayCount > 0 || hasFirefighterDown || hasStructuralCollapse) {
      overallSeverity = 'CRITICAL';
    } else if (criticalTerms.length > 2 || hasEvacuation) {
      overallSeverity = 'HIGH';
    } else if (criticalTerms.length > 0 || highSeverityTerms.length > 3) {
      overallSeverity = 'MEDIUM';
    } else {
      overallSeverity = 'LOW';
    }

    return {
      overallSeverity,
      maydayCount,
      criticalTermCount: criticalTerms.length,
      highSeverityTermCount: highSeverityTerms.length,
      hasStructuralCollapse,
      hasFirefighterDown,
      hasEvacuation,
      averageConfidence,
    };
  }
}

/**
 * Singleton emergency detection service instance
 */
export const emergencyDetectionService = new EmergencyDetectionService();
