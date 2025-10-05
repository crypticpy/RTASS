# OpenAI Integration Library

This library provides comprehensive OpenAI API integration for the Fire Department Radio Transcription System, including audio transcription (Whisper), policy analysis, and compliance auditing (GPT-4).

## Features

- **Audio Transcription**: Whisper API integration with automatic chunking for large files
- **Template Generation**: GPT-4-powered policy analysis to create audit templates
- **Compliance Analysis**: Automated compliance checking against radio transcripts
- **Retry Logic**: Exponential backoff for transient failures
- **Type Safety**: Full TypeScript type definitions
- **Error Handling**: Comprehensive custom error types

## Setup

### Environment Variables

Create a `.env.local` file in your Next.js project root:

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_ORG_ID=org-...  # Optional
```

## Usage Examples

### 1. Audio Transcription (Whisper)

```typescript
import { transcribeAudio, WhisperResponse } from '@/app/lib/openai';
import * as fs from 'fs';

// Transcribe audio file
async function transcribeRadioAudio(audioPath: string) {
  const buffer = fs.readFileSync(audioPath);

  const result: WhisperResponse = await transcribeAudio(buffer, {
    language: 'en',
    prompt: 'Fire department radio communications with technical terminology',
  });

  console.log('Transcript:', result.text);
  console.log('Duration:', result.duration, 'seconds');

  // Access individual segments with timestamps
  result.segments.forEach(segment => {
    console.log(`[${formatTimestamp(segment.startTime)}] ${segment.text}`);
  });

  return result;
}
```

### 2. Template Generation from Policies

```typescript
import { generateTemplateFromPolicies, GeneratedTemplate } from '@/app/lib/openai';

// Generate audit template from policy documents
async function createAuditTemplate(policyTexts: string[]) {
  const template: GeneratedTemplate = await generateTemplateFromPolicies(
    policyTexts,
    {
      templateName: 'NFPA 1561 Communications Protocol',
      focusAreas: ['Radio Discipline', 'Mayday Procedures', 'Unit Identification'],
    }
  );

  console.log(`Generated ${template.categories.length} categories`);
  console.log(`Confidence: ${(template.confidence * 100).toFixed(0)}%`);

  // Examine categories
  template.categories.forEach(category => {
    console.log(`\n${category.name} (Weight: ${(category.weight * 100).toFixed(0)}%)`);
    console.log(`  ${category.criteria.length} criteria`);

    category.criteria.forEach(criterion => {
      console.log(`  - ${criterion.description}`);
      if (criterion.sourcePageNumber) {
        console.log(`    (Source: Page ${criterion.sourcePageNumber})`);
      }
    });
  });

  return template;
}
```

### 3. Compliance Analysis

```typescript
import {
  analyzeCategory,
  CategoryAnalysisResult,
  IncidentContext,
  TemplateCategory,
} from '@/app/lib/openai';

// Analyze radio transcript against a template category
async function analyzeCompliance(
  transcript: string,
  category: TemplateCategory
) {
  const context: IncidentContext = {
    type: 'Structure Fire',
    date: new Date('2024-12-15'),
    units: ['Engine 1', 'Engine 2', 'Ladder 2', 'Battalion 1'],
    notes: '2-alarm commercial structure fire',
  };

  const result: CategoryAnalysisResult = await analyzeCategory(
    transcript,
    context,
    category
  );

  console.log(`Category: ${result.category}`);
  console.log(`Score: ${(result.categoryScore * 100).toFixed(0)}%`);

  // Review criteria scores
  result.criteriaScores.forEach(score => {
    console.log(`\n${score.criterionId}: ${score.score}`);
    console.log(`  Confidence: ${(score.confidence * 100).toFixed(0)}%`);
    console.log(`  Reasoning: ${score.reasoning}`);

    if (score.evidence.length > 0) {
      console.log('  Evidence:');
      score.evidence.forEach(ev => {
        console.log(`    [${ev.timestamp}] ${ev.text.substring(0, 100)}...`);
      });
    }

    if (score.recommendation) {
      console.log(`  Recommendation: ${score.recommendation}`);
    }
  });

  return result;
}
```

### 4. Complete Audit Workflow

```typescript
import {
  transcribeAudio,
  generateTemplateFromPolicies,
  analyzeCategory,
  generateNarrative,
  calculateOverallScore,
  AuditResults,
} from '@/app/lib/openai';

async function performCompleteAudit(
  audioPath: string,
  policyTexts: string[]
) {
  // Step 1: Transcribe audio
  console.log('Step 1: Transcribing audio...');
  const audioBuffer = fs.readFileSync(audioPath);
  const transcription = await transcribeAudio(audioBuffer);

  // Step 2: Generate template from policies
  console.log('Step 2: Generating audit template...');
  const template = await generateTemplateFromPolicies(policyTexts);

  // Step 3: Analyze each category
  console.log('Step 3: Analyzing compliance...');
  const categoryResults = [];

  for (const category of template.categories) {
    const result = await analyzeCategory(
      transcription.text,
      { type: 'Structure Fire', date: new Date() },
      category
    );
    categoryResults.push(result);
  }

  // Step 4: Calculate overall score
  const categoryWeights = new Map(
    template.categories.map(c => [c.name, c.weight])
  );
  const overallScore = calculateOverallScore(categoryResults, categoryWeights);

  // Step 5: Generate narrative summary
  console.log('Step 4: Generating summary...');
  const auditResults: AuditResults = {
    overallScore,
    categories: categoryResults,
  };

  const narrative = await generateNarrative(auditResults);

  console.log('\n=== AUDIT COMPLETE ===');
  console.log(`Overall Score: ${(overallScore * 100).toFixed(1)}%`);
  console.log('\nExecutive Summary:');
  console.log(narrative);

  return auditResults;
}
```

### 5. Error Handling

```typescript
import {
  transcribeAudio,
  TranscriptionError,
  RateLimitError,
  AnalysisError,
} from '@/app/lib/openai';

async function transcribeWithErrorHandling(audioBuffer: Buffer) {
  try {
    return await transcribeAudio(audioBuffer);
  } catch (error) {
    if (error instanceof TranscriptionError) {
      console.error('Transcription failed:', error.message);
      console.error('Audio path:', error.audioPath);
    } else if (error instanceof RateLimitError) {
      console.error('Rate limit exceeded. Retry after:', error.retryAfter, 'ms');
      // Implement backoff or queue for later
    } else if (error instanceof AnalysisError) {
      console.error('Analysis failed:', error.message);
      console.error('Context:', error.context);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

## API Reference

### Whisper Integration

#### `transcribeAudio(audioBuffer, options?)`

Transcribe audio using Whisper API.

**Parameters:**
- `audioBuffer: Buffer` - Audio file buffer (max 25MB)
- `options?: TranscribeOptions`
  - `language?: string` - Language code (e.g., 'en')
  - `prompt?: string` - Context prompt for better accuracy
  - `temperature?: number` - Sampling temperature (default: 0)

**Returns:** `Promise<WhisperResponse>`

**Throws:** `TranscriptionError`

#### `chunkAndTranscribe(audioPath, options?, onProgress?)`

Transcribe large audio files by chunking (requires ffmpeg - not yet implemented).

### Template Generation

#### `generateTemplateFromPolicies(policyTexts, options?)`

Generate audit template from policy documents using GPT-4.

**Parameters:**
- `policyTexts: string[]` - Array of policy document texts
- `options?: TemplateGenerationOptions`
  - `templateName?: string` - Name for the template
  - `focusAreas?: string[]` - Specific areas to focus on
  - `model?: string` - GPT-4 model to use (default: gpt-4-turbo-preview)

**Returns:** `Promise<GeneratedTemplate>`

**Throws:** `AnalysisError`

#### `normalizeWeights(categories)`

Normalize category weights to sum to 1.0.

### Compliance Analysis

#### `analyzeCategory(transcript, incidentContext, category, options?)`

Analyze transcript against a single category.

**Parameters:**
- `transcript: string` - Full radio transcript with timestamps
- `incidentContext: IncidentContext` - Context about the incident
- `category: TemplateCategory` - Category to analyze
- `options?: AnalysisOptions`
  - `model?: string` - GPT-4 model to use
  - `temperature?: number` - Sampling temperature (default: 0.3)

**Returns:** `Promise<CategoryAnalysisResult>`

**Throws:** `AnalysisError`

#### `generateNarrative(auditResults, options?)`

Generate executive summary from audit results.

**Parameters:**
- `auditResults: AuditResults` - Complete audit results
- `options?: AnalysisOptions`

**Returns:** `Promise<string>`

**Throws:** `AnalysisError`

#### `calculateOverallScore(categories, categoryWeights)`

Calculate weighted overall score.

#### `extractCriticalFindings(auditResults)`

Extract critical findings from audit results.

### Utilities

#### `retryWithBackoff(fn, maxRetries?)`

Retry function with exponential backoff.

#### `estimateTokens(text)`

Estimate token count for text (approximate).

#### `parseJSONResponse<T>(response)`

Parse and validate JSON response.

## Error Types

- `OpenAIError` - Base error class
- `RateLimitError` - Rate limit exceeded
- `InvalidResponseError` - Invalid/unparseable response
- `TranscriptionError` - Audio transcription failure
- `AnalysisError` - Policy/compliance analysis failure

## Type Definitions

See individual module files for complete type definitions:
- `whisper.ts` - Transcription types
- `template-generation.ts` - Template types
- `compliance-analysis.ts` - Analysis types

## Performance Considerations

### Token Usage

- **Whisper**: Charged per second of audio (~$0.006/minute)
- **GPT-4**: Charged per token (~$0.01/1K input, ~$0.03/1K output tokens)

Use `estimateTokens()` to estimate costs before API calls.

### Rate Limits

- **Whisper**: 50 requests/minute (default tier)
- **GPT-4**: 10,000 tokens/minute (default tier)

The library includes automatic retry logic with exponential backoff.

### Best Practices

1. **Cache Results**: Store transcriptions and analyses to avoid redundant API calls
2. **Batch Processing**: Process multiple categories in parallel when possible
3. **Progress Tracking**: Use progress callbacks for long operations
4. **Error Handling**: Always handle rate limits and transient failures
5. **Token Management**: Monitor token usage for cost optimization

## Limitations

- Maximum audio file size: 25MB (Whisper API limit)
- Large file chunking requires ffmpeg (not yet implemented)
- JSON mode requires GPT-4 Turbo or later
- Rate limits apply based on OpenAI tier

## Contributing

When adding new features:
1. Follow existing TypeScript patterns
2. Add comprehensive JSDoc comments
3. Include error handling
4. Update this README with examples
5. Add unit tests (future)

## License

Internal use for Fire Department Radio Transcription System.
