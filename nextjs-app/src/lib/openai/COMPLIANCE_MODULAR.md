# Modular Compliance Analysis

## Overview

The modular compliance analysis system scores radio transcripts category-by-category using GPT-4.1 with structured outputs. This approach provides **higher accuracy**, **better token management**, and **graceful degradation** compared to analyzing all categories at once.

## Architecture

### Two-Phase Analysis

1. **Category Scoring Phase**: Each category is analyzed independently with laser-focused AI attention
2. **Narrative Generation Phase**: All category scores are synthesized into a comprehensive executive summary

```typescript
// Phase 1: Score each category independently
const categoryScores = await Promise.all(
  template.categories.map(category =>
    scoreSingleCategory(transcript, segments, category, context)
  )
);

// Phase 2: Generate comprehensive narrative from all scores
const narrative = await generateAuditNarrative(transcript, categoryScores, context);
```

### Benefits

| Feature | Monolithic Approach | Modular Approach |
|---------|---------------------|------------------|
| **Accuracy** | Lower (AI loses focus across many categories) | Higher (focused attention per category) |
| **Token Limits** | Hits limits with large templates | No token issues (categories analyzed separately) |
| **Failure Handling** | One failure loses all work | One category failure doesn't affect others |
| **Parallelization** | Not possible | Can analyze categories concurrently |
| **Cost** | Expensive failures | Only pay for successful categories |

## Usage

### Basic Example

```typescript
import {
  scoreSingleCategory,
  generateAuditNarrative,
} from '@/lib/openai/compliance-analysis-modular';
import type { TemplateCategory } from '@/types/policy';
import type { TranscriptSegment } from '@/lib/openai/compliance-analysis-modular';

// 1. Define incident context
const context = {
  type: 'STRUCTURE_FIRE',
  date: new Date('2024-12-15'),
  location: '123 Main St',
  units: ['Engine 1', 'Ladder 2', 'Battalion 1'],
  notes: 'Commercial building, heavy smoke on arrival'
};

// 2. Prepare transcript
const transcript = "..."; // Full transcript text
const segments: TranscriptSegment[] = [
  {
    id: 'seg-1',
    startTime: 0,
    endTime: 5,
    text: 'Engine 1 to dispatch, on scene...',
    speaker: 'Engine 1',
    confidence: 0.95
  },
  // ... more segments
];

// 3. Score each category
const categoryScores = [];
for (const category of template.categories) {
  try {
    const score = await scoreSingleCategory(
      transcript,
      segments,
      category,
      context
    );
    categoryScores.push(score);
    console.log(`Scored ${category.name}: ${score.overallCategoryScore}/100`);
  } catch (error) {
    console.error(`Failed to score ${category.name}:`, error);
    // Continue with other categories
  }
}

// 4. Generate audit narrative
const narrative = await generateAuditNarrative(
  transcript,
  categoryScores,
  context
);

console.log('Executive Summary:', narrative.executiveSummary);
console.log('Overall Score:', narrative.overallScore);
console.log('Critical Issues:', narrative.criticalIssues);
```

### Parallel Processing

Score multiple categories concurrently for faster analysis:

```typescript
import pLimit from 'p-limit';

// Limit concurrent API calls to avoid rate limits
const limit = pLimit(3);

const categoryScores = await Promise.all(
  template.categories.map(category =>
    limit(() =>
      scoreSingleCategory(transcript, segments, category, context)
    )
  )
);
```

### Error Handling

Handle category failures gracefully:

```typescript
const categoryScores = await Promise.allSettled(
  template.categories.map(category =>
    scoreSingleCategory(transcript, segments, category, context)
  )
);

const successful = categoryScores
  .filter((result): result is PromiseFulfilledResult<CategoryScore> =>
    result.status === 'fulfilled'
  )
  .map(result => result.value);

const failed = categoryScores
  .filter((result): result is PromiseRejectedResult =>
    result.status === 'rejected'
  )
  .map((result, idx) => ({
    category: template.categories[idx].name,
    error: result.reason
  }));

console.log(`Successfully scored: ${successful.length}/${template.categories.length}`);
failed.forEach(({ category, error }) => {
  console.error(`Failed to score ${category}:`, error);
});
```

## API Reference

### `scoreSingleCategory()`

Scores a single category against the transcript with focused AI attention.

```typescript
async function scoreSingleCategory(
  transcriptText: string,
  transcriptSegments: TranscriptSegment[],
  category: TemplateCategory,
  incidentContext: IncidentContext,
  options?: CategoryScoringOptions
): Promise<CategoryScore>
```

**Parameters:**
- `transcriptText`: Full radio transcript as plain text
- `transcriptSegments`: Timed segments with timestamps for evidence extraction
- `category`: Template category to analyze (from your compliance template)
- `incidentContext`: Context about the incident (type, date, units, etc.)
- `options`: Optional scoring configuration
  - `model`: OpenAI model to use (default: `gpt-4.1`)
  - `temperature`: Temperature for AI generation (default: `0.3`)

**Returns:** `CategoryScore` - Validated category analysis with criterion scores

**Throws:** `AnalysisError` if scoring fails or AI refuses

**Example:**
```typescript
const categoryScore = await scoreSingleCategory(
  transcript,
  segments,
  communicationCategory,
  {
    type: 'STRUCTURE_FIRE',
    date: new Date(),
    units: ['Engine 1', 'Ladder 2']
  }
);

console.log(`Category: ${categoryScore.categoryName}`);
console.log(`Score: ${categoryScore.overallCategoryScore}/100`);
console.log(`Status: ${categoryScore.categoryStatus}`);
console.log(`Critical Findings: ${categoryScore.criticalFindings.length}`);
```

### `generateAuditNarrative()`

Generates a comprehensive audit narrative from category scores.

```typescript
async function generateAuditNarrative(
  transcriptText: string,
  categoryScores: CategoryScore[],
  incidentContext: IncidentContext,
  options?: NarrativeGenerationOptions
): Promise<AuditNarrative>
```

**Parameters:**
- `transcriptText`: Full radio transcript (for reference)
- `categoryScores`: All category analysis results
- `incidentContext`: Context about the incident
- `options`: Optional narrative generation configuration
  - `model`: OpenAI model to use (default: `gpt-4.1`)
  - `temperature`: Temperature for AI generation (default: `0.5`)

**Returns:** `AuditNarrative` - Executive summary, recommendations, and insights

**Throws:** `AnalysisError` if generation fails or AI refuses

**Example:**
```typescript
const narrative = await generateAuditNarrative(
  transcript,
  [commScore, safetyScore, commandScore],
  {
    type: 'STRUCTURE_FIRE',
    date: new Date(),
    units: ['Engine 1', 'Ladder 2']
  }
);

console.log(narrative.executiveSummary);
console.log(`Overall Score: ${narrative.overallScore}/100`);
console.log(`Overall Status: ${narrative.overallStatus}`);

narrative.recommendations.forEach(rec => {
  console.log(`[${rec.priority}] ${rec.category}: ${rec.recommendation}`);
  rec.actionItems.forEach(item => {
    console.log(`  - ${item}`);
  });
});
```

### Helper Functions

#### `extractEvidenceFromTranscript()`

Finds transcript excerpts matching a search term with context.

```typescript
function extractEvidenceFromTranscript(
  transcriptSegments: TranscriptSegment[],
  searchTerm: string,
  contextWindowSec?: number
): EvidenceItem[]
```

**Example:**
```typescript
const maydayEvidence = extractEvidenceFromTranscript(
  segments,
  'mayday',
  10 // 10 seconds of context
);

maydayEvidence.forEach(evidence => {
  console.log(`[${evidence.timestamp}] ${evidence.text}`);
});
```

#### `calculateWeightedScore()`

Computes weighted overall score from category scores.

```typescript
function calculateWeightedScore(
  categoryScores: CategoryScore[],
  categoryWeights: Map<string, number>
): number
```

**Example:**
```typescript
const weights = new Map([
  ['Communication Protocols', 0.4],
  ['Safety Procedures', 0.4],
  ['Command Structure', 0.2]
]);

const overallScore = calculateWeightedScore(categoryScores, weights);
console.log(`Weighted Score: ${overallScore}/100`);
```

#### `identifyCriticalFindings()`

Extracts high-priority issues across all categories.

```typescript
function identifyCriticalFindings(
  categoryScores: CategoryScore[]
): string[]
```

**Example:**
```typescript
const criticalIssues = identifyCriticalFindings(categoryScores);

if (criticalIssues.length > 0) {
  console.error('CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:');
  criticalIssues.forEach((issue, idx) => {
    console.error(`${idx + 1}. ${issue}`);
  });
}
```

## Type Definitions

### `TranscriptSegment`

```typescript
interface TranscriptSegment {
  id: string;
  startTime: number;      // seconds from start
  endTime: number;        // seconds from start
  text: string;           // transcript text
  speaker?: string;       // speaker identifier
  confidence?: number;    // 0-1 confidence score
}
```

### `IncidentContext`

```typescript
interface IncidentContext {
  type?: string;          // e.g., 'STRUCTURE_FIRE', 'MEDICAL'
  date?: Date;            // incident date
  units?: string[];       // units involved (e.g., ['Engine 1', 'Ladder 2'])
  location?: string;      // incident location
  notes?: string;         // additional context
}
```

### `CategoryScore`

```typescript
interface CategoryScore {
  categoryName: string;
  categoryDescription: string;
  criteriaScores: CriterionScore[];
  overallCategoryScore: number;      // 0-100
  categoryStatus: 'PASS' | 'FAIL' | 'NEEDS_IMPROVEMENT';
  summary: string;
  criticalFindings: string[];
  timestamp: string;                 // ISO 8601
}
```

### `CriterionScore`

```typescript
interface CriterionScore {
  criterionId: string;
  score: 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_APPLICABLE';
  numericScore: number | null;       // 0-100, null if not applicable
  confidence: number;                 // 0-1
  reasoning: string;
  evidence: EvidenceItem[];
  recommendation: string | null;
}
```

### `AuditNarrative`

```typescript
interface AuditNarrative {
  executiveSummary: string;
  overallScore: number;               // 0-100
  overallStatus: 'PASS' | 'FAIL' | 'NEEDS_IMPROVEMENT';
  strengths: string[];
  areasForImprovement: string[];
  criticalIssues: string[];
  recommendations: Recommendation[];
  complianceHighlights: string[];
}
```

### `Recommendation`

```typescript
interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  recommendation: string;
  actionItems: string[];
}
```

## Structured Outputs

This implementation uses **OpenAI Structured Outputs** with Zod schemas to guarantee valid, type-safe responses. The AI response format is enforced by the OpenAI API, eliminating the need for response validation and retry logic.

### Schema Enforcement

```typescript
// Category scoring uses CategoryScoreSchema
response_format: zodResponseFormat(CategoryScoreSchema, 'category_score')

// Narrative generation uses AuditNarrativeSchema
response_format: zodResponseFormat(AuditNarrativeSchema, 'audit_narrative')
```

All schemas are defined in `/src/lib/schemas/compliance-analysis.schema.ts` with full Zod validation.

## Best Practices

### 1. Provide Rich Context

The more context you provide, the better the AI can understand the incident:

```typescript
const context: IncidentContext = {
  type: 'STRUCTURE_FIRE',
  date: new Date('2024-12-15T14:30:00Z'),
  location: '123 Main St, Building 5',
  units: ['Engine 1', 'Engine 2', 'Ladder 1', 'Battalion Chief 1'],
  notes: 'Commercial building, heavy smoke on arrival, rescue operations underway'
};
```

### 2. Use High-Quality Transcripts

- Include accurate timestamps
- Segment by speaker when possible
- Include speaker identification
- Provide confidence scores if available

### 3. Handle Failures Gracefully

Always wrap scoring calls in try-catch and handle partial failures:

```typescript
const categoryScores = [];
const failures = [];

for (const category of template.categories) {
  try {
    const score = await scoreSingleCategory(transcript, segments, category, context);
    categoryScores.push(score);
  } catch (error) {
    failures.push({ category: category.name, error });
    console.error(`Failed to score ${category.name}:`, error);
  }
}

// Continue with successful scores
if (categoryScores.length > 0) {
  const narrative = await generateAuditNarrative(transcript, categoryScores, context);
}
```

### 4. Monitor Token Usage

Each API call logs token usage for cost tracking:

```typescript
// Check logs for token usage
// Example output:
// {"timestamp":"2024-12-15T...","operation":"compliance-category-scoring","model":"gpt-4.1","inputTokens":2500,"outputTokens":800,"totalTokens":3300}
```

### 5. Respect Rate Limits

Use concurrency limiting when scoring many categories:

```typescript
import pLimit from 'p-limit';

const limit = pLimit(3); // Max 3 concurrent API calls

const scores = await Promise.all(
  categories.map(cat => limit(() => scoreSingleCategory(...)))
);
```

## Migration from Monolithic Approach

If you're currently using the monolithic `compliance-analysis.ts`, here's how to migrate:

### Before (Monolithic)

```typescript
import { analyzeCategory } from '@/lib/openai/compliance-analysis';

// Score all categories at once (single API call)
const results = await Promise.all(
  template.categories.map(category =>
    analyzeCategory(transcript, context, category)
  )
);
```

### After (Modular)

```typescript
import {
  scoreSingleCategory,
  generateAuditNarrative
} from '@/lib/openai/compliance-analysis-modular';

// Score each category independently (separate API calls)
const categoryScores = await Promise.all(
  template.categories.map(category =>
    scoreSingleCategory(transcript, segments, category, context)
  )
);

// Generate final narrative
const narrative = await generateAuditNarrative(transcript, categoryScores, context);
```

### Key Differences

1. **Segments Required**: Modular approach requires `TranscriptSegment[]` for better evidence extraction
2. **Two-Phase Process**: Scoring + narrative generation (vs. single call)
3. **Schema Validation**: Uses Zod schemas for guaranteed type safety
4. **Better Error Handling**: Individual category failures don't affect others

## Troubleshooting

### "AI refused to score category"

**Cause**: The AI safety system declined to generate a response (rare).

**Solution**:
- Check if transcript contains inappropriate content
- Retry with the same inputs (may succeed on retry)
- Contact support if persistent

### "Invalid category score structure from AI"

**Cause**: AI response didn't match the expected Zod schema (very rare with structured outputs).

**Solution**:
- This should never happen with structured outputs enabled
- If it occurs, it's likely a transient API issue - retry
- Report to development team if persistent

### "Transcript text is empty"

**Cause**: Empty or whitespace-only transcript provided.

**Solution**: Ensure transcript is properly extracted from audio before analysis.

### "Category has no criteria to analyze"

**Cause**: Template category has no criteria defined.

**Solution**: Verify template structure - each category must have at least one criterion.

## Performance Considerations

### Token Costs

Approximate token usage per category (GPT-4.1 pricing):
- **Input**: 2,000-5,000 tokens (depends on transcript length + criteria count)
- **Output**: 500-1,500 tokens (depends on evidence volume)
- **Cost per category**: ~$0.05-$0.15

### Processing Time

- **Category scoring**: 3-8 seconds per category
- **Narrative generation**: 5-12 seconds
- **Total for 5 categories**: ~30-50 seconds

### Optimization Tips

1. **Parallel processing**: Score categories concurrently (respect rate limits)
2. **Caching**: Cache category scores to avoid re-analysis
3. **Progressive loading**: Display results as each category completes
4. **Incremental updates**: Update UI incrementally rather than waiting for all categories

## Examples

See `/src/lib/openai/__tests__/compliance-analysis-modular.test.ts` for comprehensive examples and test cases.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the schema definitions in `/src/lib/schemas/compliance-analysis.schema.ts`
- See the structured outputs guide in `/docs/structured_outputs_guide.md`
- Contact the development team
