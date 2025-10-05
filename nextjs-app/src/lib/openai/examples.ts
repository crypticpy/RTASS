/**
 * OpenAI Integration - Usage Examples
 *
 * This file demonstrates various usage patterns for the OpenAI integration library.
 * These are example functions - not meant to be run directly in production.
 */

import * as fs from 'fs';
import {
  transcribeAudio,
  chunkAndTranscribe,
  generateTemplateFromPolicies,
  analyzeCategory,
  generateNarrative,
  calculateOverallScore,
  extractCriticalFindings,
  formatTimestamp,
  convertToSRT,
  normalizeWeights,
  WhisperResponse,
  GeneratedTemplate,
  CategoryAnalysisResult,
  AuditResults,
  IncidentContext,
  TemplateCategory,
  TranscriptionError,
  RateLimitError,
  AnalysisError,
} from './index';

// ============================================================================
// EXAMPLE 1: Basic Audio Transcription
// ============================================================================

export async function example1_BasicTranscription(audioPath: string) {
  console.log('=== Example 1: Basic Audio Transcription ===\n');

  try {
    // Read audio file
    const audioBuffer = fs.readFileSync(audioPath);

    // Transcribe with optional prompt for better accuracy
    const result = await transcribeAudio(audioBuffer, {
      language: 'en',
      prompt: 'Fire department radio communications. Units include Engine, Ladder, Battalion.',
    });

    console.log('Transcript:', result.text);
    console.log('\nDuration:', result.duration, 'seconds');
    console.log('Language:', result.language);
    console.log('Segments:', result.segments.length);

    // Display timestamped segments
    console.log('\nTimestamped Transcript:');
    result.segments.forEach((segment) => {
      const timestamp = formatTimestamp(segment.startTime);
      console.log(`[${timestamp}] ${segment.text}`);
    });

    // Convert to SRT format
    const srt = convertToSRT(result.segments);
    console.log('\nSRT Format:');
    console.log(srt.substring(0, 500) + '...');

    return result;
  } catch (error) {
    if (error instanceof TranscriptionError) {
      console.error('Transcription failed:', error.message);
      console.error('Audio path:', error.audioPath);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// ============================================================================
// EXAMPLE 2: Template Generation from Multiple Policies
// ============================================================================

export async function example2_TemplateGeneration(policyPaths: string[]) {
  console.log('=== Example 2: Template Generation ===\n');

  try {
    // Read policy documents
    const policyTexts = policyPaths.map((path) => fs.readFileSync(path, 'utf-8'));

    console.log(`Analyzing ${policyTexts.length} policy documents...`);

    // Generate template
    const template = await generateTemplateFromPolicies(policyTexts, {
      templateName: 'NFPA 1561 Radio Communications',
      focusAreas: [
        'Radio Discipline',
        'Mayday Procedures',
        'Personnel Accountability',
        'Command Structure',
      ],
    });

    console.log(`\nGenerated ${template.categories.length} categories`);
    console.log(`Confidence: ${(template.confidence * 100).toFixed(1)}%`);

    // Display template structure
    template.categories.forEach((category, idx) => {
      console.log(`\n${idx + 1}. ${category.name}`);
      console.log(`   Weight: ${(category.weight * 100).toFixed(0)}%`);
      console.log(`   Criteria: ${category.criteria.length}`);

      category.criteria.forEach((criterion, critIdx) => {
        console.log(`   ${idx + 1}.${critIdx + 1} ${criterion.description}`);
        if (criterion.sourcePageNumber) {
          console.log(`        Source: Page ${criterion.sourcePageNumber}`);
        }
      });
    });

    // Display notes if any
    if (template.notes.length > 0) {
      console.log('\nNotes:');
      template.notes.forEach((note) => console.log(`- ${note}`));
    }

    return template;
  } catch (error) {
    if (error instanceof AnalysisError) {
      console.error('Template generation failed:', error.message);
      console.error('Context:', error.context);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// ============================================================================
// EXAMPLE 3: Single Category Analysis
// ============================================================================

export async function example3_CategoryAnalysis(
  transcript: string,
  category: TemplateCategory
) {
  console.log('=== Example 3: Category Analysis ===\n');

  try {
    // Define incident context
    const context: IncidentContext = {
      type: 'Structure Fire',
      date: new Date('2024-12-15'),
      units: ['Engine 1', 'Engine 2', 'Ladder 2', 'Battalion 1'],
      notes: '2-alarm commercial building fire, multiple victims reported',
    };

    console.log(`Analyzing category: ${category.name}`);
    console.log(`Criteria to evaluate: ${category.criteria.length}\n`);

    // Analyze
    const result = await analyzeCategory(transcript, context, category);

    console.log(`Category Score: ${(result.categoryScore * 100).toFixed(1)}%`);
    console.log(`\nOverall Analysis:\n${result.overallAnalysis}`);

    // Display criteria scores
    console.log('\nCriteria Scores:');
    result.criteriaScores.forEach((score) => {
      console.log(`\n${score.criterionId}: ${score.score}`);
      console.log(`  Confidence: ${(score.confidence * 100).toFixed(0)}%`);
      console.log(`  Reasoning: ${score.reasoning}`);

      if (score.impact) {
        console.log(`  Impact: ${score.impact}`);
      }

      if (score.evidence.length > 0) {
        console.log('  Evidence:');
        score.evidence.forEach((ev) => {
          const excerpt =
            ev.text.length > 80 ? ev.text.substring(0, 80) + '...' : ev.text;
          console.log(`    [${ev.timestamp}] ${excerpt}`);
        });
      }

      if (score.recommendation) {
        console.log(`  Recommendation: ${score.recommendation}`);
      }
    });

    // Display key findings
    if (result.keyFindings.length > 0) {
      console.log('\nKey Findings:');
      result.keyFindings.forEach((finding) => console.log(`- ${finding}`));
    }

    // Display recommendations
    if (result.recommendations.length > 0) {
      console.log('\nRecommendations:');
      result.recommendations.forEach((rec) => console.log(`- ${rec}`));
    }

    return result;
  } catch (error) {
    if (error instanceof AnalysisError) {
      console.error('Category analysis failed:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// ============================================================================
// EXAMPLE 4: Complete End-to-End Audit
// ============================================================================

export async function example4_CompleteAudit(
  audioPath: string,
  policyPaths: string[]
) {
  console.log('=== Example 4: Complete Audit Workflow ===\n');

  try {
    // Step 1: Transcribe audio
    console.log('Step 1: Transcribing audio...');
    const audioBuffer = fs.readFileSync(audioPath);
    const transcription = await transcribeAudio(audioBuffer, {
      language: 'en',
      prompt: 'Fire department radio communications',
    });
    console.log(`✓ Transcribed ${transcription.duration}s of audio\n`);

    // Step 2: Generate template
    console.log('Step 2: Generating audit template from policies...');
    const policyTexts = policyPaths.map((path) => fs.readFileSync(path, 'utf-8'));
    const template = await generateTemplateFromPolicies(policyTexts);
    console.log(`✓ Generated template with ${template.categories.length} categories\n`);

    // Step 3: Analyze each category
    console.log('Step 3: Analyzing compliance...');
    const categoryResults: CategoryAnalysisResult[] = [];

    const context: IncidentContext = {
      type: 'Structure Fire',
      date: new Date(),
      units: ['Engine 1', 'Engine 2', 'Ladder 2'],
    };

    for (const category of template.categories) {
      console.log(`  Analyzing: ${category.name}...`);
      const result = await analyzeCategory(transcription.text, context, category);
      categoryResults.push(result);
      console.log(`  ✓ Score: ${(result.categoryScore * 100).toFixed(1)}%`);
    }
    console.log();

    // Step 4: Calculate overall score
    const categoryWeights = new Map(
      template.categories.map((c) => [c.name, c.weight])
    );
    const overallScore = calculateOverallScore(categoryResults, categoryWeights);

    // Step 5: Generate narrative summary
    console.log('Step 4: Generating executive summary...');
    const auditResults: AuditResults = {
      overallScore,
      categories: categoryResults,
    };

    const criticalFindings = extractCriticalFindings(auditResults);
    const narrative = await generateNarrative(auditResults);
    console.log('✓ Summary generated\n');

    // Display results
    console.log('='.repeat(70));
    console.log('AUDIT RESULTS');
    console.log('='.repeat(70));
    console.log(`\nOverall Compliance Score: ${(overallScore * 100).toFixed(1)}%\n`);

    console.log('Category Scores:');
    categoryResults.forEach((cat) => {
      const weight = categoryWeights.get(cat.category) || 0;
      console.log(
        `  ${cat.category}: ${(cat.categoryScore * 100).toFixed(1)}% (Weight: ${(weight * 100).toFixed(0)}%)`
      );
    });

    if (criticalFindings.length > 0) {
      console.log('\nCritical Findings:');
      criticalFindings.forEach((finding) => console.log(`  ⚠ ${finding}`));
    }

    console.log('\n' + '-'.repeat(70));
    console.log('EXECUTIVE SUMMARY');
    console.log('-'.repeat(70));
    console.log(narrative);
    console.log('='.repeat(70));

    return {
      transcription,
      template,
      auditResults,
      narrative,
    };
  } catch (error) {
    console.error('Audit workflow failed:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 5: Error Handling and Retry Logic
// ============================================================================

export async function example5_ErrorHandling(audioPath: string) {
  console.log('=== Example 5: Error Handling ===\n');

  try {
    const audioBuffer = fs.readFileSync(audioPath);

    // The retry logic is built-in, but you can add custom handling
    const result = await transcribeAudio(audioBuffer);

    console.log('✓ Transcription successful');
    return result;
  } catch (error) {
    if (error instanceof TranscriptionError) {
      console.error('❌ Transcription Error');
      console.error('  Message:', error.message);
      console.error('  Audio Path:', error.audioPath);
      console.error('  Cause:', error.cause);
    } else if (error instanceof RateLimitError) {
      console.error('❌ Rate Limit Error');
      console.error('  Message:', error.message);
      console.error('  Retry After:', error.retryAfter, 'ms');

      // You could implement queuing here
      console.log('  → Consider implementing a job queue for rate-limited requests');
    } else if (error instanceof AnalysisError) {
      console.error('❌ Analysis Error');
      console.error('  Message:', error.message);
      console.error('  Context:', error.context);
    } else {
      console.error('❌ Unexpected Error:', error);
    }

    // Re-throw or handle gracefully
    throw error;
  }
}

// ============================================================================
// EXAMPLE 6: Working with Template Weights
// ============================================================================

export async function example6_WeightNormalization() {
  console.log('=== Example 6: Template Weight Normalization ===\n');

  // Sample categories with weights that don't sum to 1.0
  const categories: TemplateCategory[] = [
    {
      id: 'comm-1',
      name: 'Communication Protocols',
      weight: 3, // Raw weight
      criteria: [],
      analysisPrompt: 'Analyze communication protocols',
    },
    {
      id: 'safety-1',
      name: 'Safety Procedures',
      weight: 4, // Raw weight
      criteria: [],
      analysisPrompt: 'Analyze safety procedures',
    },
    {
      id: 'accountability-1',
      name: 'Personnel Accountability',
      weight: 2, // Raw weight
      criteria: [],
      analysisPrompt: 'Analyze personnel accountability',
    },
  ];

  console.log('Original weights:');
  categories.forEach((cat) => {
    console.log(`  ${cat.name}: ${cat.weight}`);
  });

  const totalBefore = categories.reduce((sum, cat) => sum + cat.weight, 0);
  console.log(`Total: ${totalBefore} (should be 1.0)\n`);

  // Normalize weights
  const normalized = normalizeWeights(categories);

  console.log('Normalized weights:');
  normalized.forEach((cat) => {
    console.log(`  ${cat.name}: ${cat.weight.toFixed(3)} (${(cat.weight * 100).toFixed(1)}%)`);
  });

  const totalAfter = normalized.reduce((sum, cat) => sum + cat.weight, 0);
  console.log(`Total: ${totalAfter.toFixed(3)}`);

  return normalized;
}

// ============================================================================
// Helper function to run examples
// ============================================================================

export async function runExample(
  exampleNumber: number,
  ...args: any[]
): Promise<void> {
  const examples: Record<number, (...args: any[]) => Promise<any>> = {
    1: example1_BasicTranscription,
    2: example2_TemplateGeneration,
    3: example3_CategoryAnalysis,
    4: example4_CompleteAudit,
    5: example5_ErrorHandling,
    6: example6_WeightNormalization,
  };

  const example = examples[exampleNumber];
  if (!example) {
    console.error(`Example ${exampleNumber} not found`);
    console.log('Available examples: 1-6');
    return;
  }

  try {
    await example(...args);
  } catch (error) {
    console.error('\nExample failed with error:', error);
    process.exit(1);
  }
}

// ============================================================================
// Usage:
// ============================================================================
// import { runExample } from './examples';
//
// // Run a specific example
// await runExample(1, '/path/to/audio.mp3');
// await runExample(2, ['/path/to/policy1.pdf', '/path/to/policy2.pdf']);
// await runExample(4, '/path/to/audio.mp3', ['/path/to/policy.pdf']);
