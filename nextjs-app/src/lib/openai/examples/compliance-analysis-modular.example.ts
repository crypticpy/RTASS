/**
 * Example Usage: Modular Compliance Analysis
 *
 * Demonstrates how to use the category-by-category compliance scoring system
 * in a real-world Fire Department Radio Transcription application.
 */

import {
  scoreSingleCategory,
  generateAuditNarrative,
  calculateWeightedScore,
  identifyCriticalFindings,
  type TranscriptSegment,
  type IncidentContext,
} from '../compliance-analysis-modular';
import type { Template, TemplateCategory } from '@/types/policy';
import type { CategoryScore } from '@/lib/schemas/compliance-analysis.schema';

// ============================================================================
// Example 1: Basic Single Category Scoring
// ============================================================================

async function example1_basicCategoryScoring() {
  console.log('Example 1: Basic Single Category Scoring\n');

  // Sample incident context
  const context: IncidentContext = {
    type: 'STRUCTURE_FIRE',
    date: new Date('2024-12-15T14:30:00Z'),
    location: '456 Oak Street',
    units: ['Engine 1', 'Engine 2', 'Ladder 1', 'Battalion Chief 1'],
    notes: 'Two-story residential, heavy fire on arrival',
  };

  // Sample transcript
  const transcript = `
Engine 1 to dispatch, on scene at 456 Oak Street. Two-story residential, heavy fire showing Side Alpha.
Dispatch, copy Engine 1, time is 14:30.
Engine 1 establishing command. This is Oak Street Command.
Oak Street Command to all units, this is a defensive operation. Evacuate the building.
Ladder 1 on scene, setting up ladder pipe on Side Alpha.
Oak Street Command, requesting additional alarm.
  `.trim();

  // Sample segments (in a real app, these come from Whisper API)
  const segments: TranscriptSegment[] = [
    {
      id: 'seg-1',
      startTime: 0,
      endTime: 8,
      text: 'Engine 1 to dispatch, on scene at 456 Oak Street. Two-story residential, heavy fire showing Side Alpha.',
      speaker: 'Engine 1',
      confidence: 0.95,
    },
    {
      id: 'seg-2',
      startTime: 10,
      endTime: 15,
      text: 'Dispatch, copy Engine 1, time is 14:30.',
      speaker: 'Dispatch',
      confidence: 0.97,
    },
    {
      id: 'seg-3',
      startTime: 18,
      endTime: 24,
      text: 'Engine 1 establishing command. This is Oak Street Command.',
      speaker: 'Engine 1',
      confidence: 0.94,
    },
  ];

  // Sample category from compliance template
  const category: TemplateCategory = {
    id: 'comm-protocols',
    name: 'Communication Protocols',
    description: 'Evaluation of radio communication discipline and standards',
    weight: 0.35,
    sortOrder: 1,
    analysisPrompt: 'Assess radio discipline, proper identification, and clear messaging',
    criteria: [
      {
        id: 'comm-1',
        description: 'Units properly identify themselves before transmitting',
        scoringGuidance:
          'All transmissions must begin with unit identifier (e.g., "Engine 1 to...")',
        examplePass: 'Engine 1 to dispatch, on scene',
        exampleFail: 'We are on scene (no identification)',
        sortOrder: 1,
      },
      {
        id: 'comm-2',
        description: 'Clear and concise messages without unnecessary information',
        scoringGuidance: 'Messages should be brief, specific, and to the point',
        examplePass: 'Heavy fire showing Side Alpha',
        exampleFail: 'Um, we see fire, maybe on the front, lots of smoke, not sure',
        sortOrder: 2,
      },
    ],
  };

  try {
    // Score the category
    const categoryScore = await scoreSingleCategory(
      transcript,
      segments,
      category,
      context
    );

    console.log(`Category: ${categoryScore.categoryName}`);
    console.log(`Overall Score: ${categoryScore.overallCategoryScore}/100`);
    console.log(`Status: ${categoryScore.categoryStatus}`);
    console.log(`\nSummary: ${categoryScore.summary}`);

    console.log('\nCriterion Scores:');
    categoryScore.criteriaScores.forEach((criterion) => {
      console.log(`  - ${criterion.criterionId}: ${criterion.score} (${criterion.numericScore}/100)`);
      console.log(`    Confidence: ${(criterion.confidence * 100).toFixed(0)}%`);
      console.log(`    Reasoning: ${criterion.reasoning}`);
      if (criterion.evidence.length > 0) {
        console.log(`    Evidence:`);
        criterion.evidence.forEach((evidence) => {
          console.log(`      [${evidence.timestamp}] ${evidence.text.substring(0, 80)}...`);
        });
      }
    });

    if (categoryScore.criticalFindings.length > 0) {
      console.log('\nCritical Findings:');
      categoryScore.criticalFindings.forEach((finding) => {
        console.log(`  - ${finding}`);
      });
    }
  } catch (error) {
    console.error('Error scoring category:', error);
  }
}

// ============================================================================
// Example 2: Score All Categories with Error Handling
// ============================================================================

async function example2_scoreAllCategories(
  transcript: string,
  segments: TranscriptSegment[],
  template: Template,
  context: IncidentContext
) {
  console.log('\nExample 2: Score All Categories with Error Handling\n');

  const categoryScores: CategoryScore[] = [];
  const failures: { category: string; error: Error }[] = [];

  // Score each category with individual error handling
  for (const category of template.categories) {
    try {
      console.log(`Scoring: ${category.name}...`);
      const score = await scoreSingleCategory(transcript, segments, category, context);
      categoryScores.push(score);
      console.log(`  ✓ Score: ${score.overallCategoryScore}/100`);
    } catch (error) {
      console.error(`  ✗ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failures.push({
        category: category.name,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
    }
  }

  console.log(`\nResults: ${categoryScores.length}/${template.categories.length} categories scored`);

  if (failures.length > 0) {
    console.log('\nFailed Categories:');
    failures.forEach(({ category, error }) => {
      console.log(`  - ${category}: ${error.message}`);
    });
  }

  return { categoryScores, failures };
}

// ============================================================================
// Example 3: Parallel Processing with Rate Limiting
// ============================================================================

async function example3_parallelProcessing(
  transcript: string,
  segments: TranscriptSegment[],
  template: Template,
  context: IncidentContext
) {
  console.log('\nExample 3: Parallel Processing with Rate Limiting\n');

  // Use p-limit to control concurrency (avoid rate limits)
  // In a real app: import pLimit from 'p-limit';
  // const limit = pLimit(3); // Max 3 concurrent API calls

  // For this example, we'll use Promise.allSettled
  const startTime = Date.now();

  const results = await Promise.allSettled(
    template.categories.map((category) =>
      scoreSingleCategory(transcript, segments, category, context)
    )
  );

  const successful = results.filter(
    (result): result is PromiseFulfilledResult<CategoryScore> => result.status === 'fulfilled'
  );

  const failed = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`Completed in ${duration}s`);
  console.log(`Success: ${successful.length}, Failed: ${failed.length}`);

  return successful.map((result) => result.value);
}

// ============================================================================
// Example 4: Complete Audit with Narrative
// ============================================================================

async function example4_completeAudit(
  transcript: string,
  segments: TranscriptSegment[],
  template: Template,
  context: IncidentContext
) {
  console.log('\nExample 4: Complete Audit with Narrative\n');

  // Step 1: Score all categories
  const categoryScores: CategoryScore[] = [];

  for (const category of template.categories) {
    try {
      const score = await scoreSingleCategory(transcript, segments, category, context);
      categoryScores.push(score);
    } catch (error) {
      console.error(`Failed to score ${category.name}:`, error);
      // Continue with other categories
    }
  }

  if (categoryScores.length === 0) {
    throw new Error('No categories were successfully scored');
  }

  // Step 2: Calculate weighted overall score
  const categoryWeights = new Map(
    template.categories.map((cat) => [cat.name, cat.weight])
  );

  const overallScore = calculateWeightedScore(categoryScores, categoryWeights);
  console.log(`Overall Weighted Score: ${overallScore}/100`);

  // Step 3: Identify critical findings
  const criticalFindings = identifyCriticalFindings(categoryScores);

  if (criticalFindings.length > 0) {
    console.log('\nCritical Findings Requiring Immediate Attention:');
    criticalFindings.forEach((finding, idx) => {
      console.log(`${idx + 1}. ${finding}`);
    });
  }

  // Step 4: Generate comprehensive narrative
  console.log('\nGenerating audit narrative...');
  const narrative = await generateAuditNarrative(transcript, categoryScores, context);

  console.log('\n=== AUDIT NARRATIVE ===\n');
  console.log('EXECUTIVE SUMMARY:');
  console.log(narrative.executiveSummary);
  console.log(`\nOVERALL SCORE: ${narrative.overallScore}/100`);
  console.log(`OVERALL STATUS: ${narrative.overallStatus}`);

  if (narrative.strengths.length > 0) {
    console.log('\nSTRENGTHS:');
    narrative.strengths.forEach((strength, idx) => {
      console.log(`${idx + 1}. ${strength}`);
    });
  }

  if (narrative.areasForImprovement.length > 0) {
    console.log('\nAREAS FOR IMPROVEMENT:');
    narrative.areasForImprovement.forEach((area, idx) => {
      console.log(`${idx + 1}. ${area}`);
    });
  }

  if (narrative.criticalIssues.length > 0) {
    console.log('\nCRITICAL ISSUES:');
    narrative.criticalIssues.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue}`);
    });
  }

  console.log('\nRECOMMENDATIONS:');
  narrative.recommendations.forEach((rec, idx) => {
    console.log(`${idx + 1}. [${rec.priority}] ${rec.category}: ${rec.recommendation}`);
    rec.actionItems.forEach((item) => {
      console.log(`   - ${item}`);
    });
  });

  if (narrative.complianceHighlights.length > 0) {
    console.log('\nCOMPLIANCE HIGHLIGHTS:');
    narrative.complianceHighlights.forEach((highlight, idx) => {
      console.log(`${idx + 1}. ${highlight}`);
    });
  }

  return {
    categoryScores,
    narrative,
    overallScore,
    criticalFindings,
  };
}

// ============================================================================
// Example 5: Progressive UI Updates
// ============================================================================

async function example5_progressiveUpdates(
  transcript: string,
  segments: TranscriptSegment[],
  template: Template,
  context: IncidentContext,
  onCategoryComplete: (score: CategoryScore, progress: number) => void
) {
  console.log('\nExample 5: Progressive UI Updates\n');

  const categoryScores: CategoryScore[] = [];
  const totalCategories = template.categories.length;

  for (let i = 0; i < template.categories.length; i++) {
    const category = template.categories[i];

    try {
      console.log(`[${i + 1}/${totalCategories}] Scoring ${category.name}...`);

      const score = await scoreSingleCategory(transcript, segments, category, context);
      categoryScores.push(score);

      const progress = ((i + 1) / totalCategories) * 100;
      onCategoryComplete(score, progress);

      console.log(`  ✓ Completed (${progress.toFixed(0)}% overall)`);
    } catch (error) {
      console.error(`  ✗ Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  return categoryScores;
}

// ============================================================================
// Example 6: Integration with API Route
// ============================================================================

/**
 * Example API route handler for Next.js
 *
 * /api/compliance/analyze-modular/route.ts
 */
export async function POST_analyzeCompliance(request: Request) {
  try {
    const { transcriptId, templateId } = await request.json();

    // 1. Fetch transcript from database
    // const transcript = await prisma.transcript.findUnique({ where: { id: transcriptId } });

    // 2. Fetch template from database
    // const template = await prisma.template.findUnique({ where: { id: templateId }, include: { categories: true } });

    // 3. Build context from incident
    const context: IncidentContext = {
      type: 'STRUCTURE_FIRE', // from incident.type
      date: new Date(), // from incident.incidentDate
      units: [], // from incident.units
      location: '', // from incident.location
    };

    // 4. Score categories with progress updates
    const categoryScores: CategoryScore[] = [];

    // For each category, score and store results
    // for (const category of template.categories) {
    //   const score = await scoreSingleCategory(
    //     transcript.text,
    //     transcript.segments,
    //     category,
    //     context
    //   );
    //
    //   // Store category score in database
    //   await prisma.auditCategoryScore.create({
    //     data: {
    //       auditId: audit.id,
    //       categoryId: category.id,
    //       score: score.overallCategoryScore,
    //       status: score.categoryStatus,
    //       summary: score.summary,
    //       criteriaScores: score.criteriaScores,
    //     }
    //   });
    //
    //   categoryScores.push(score);
    // }

    // 5. Generate narrative
    // const narrative = await generateAuditNarrative(
    //   transcript.text,
    //   categoryScores,
    //   context
    // );

    // 6. Store complete audit
    // await prisma.audit.update({
    //   where: { id: audit.id },
    //   data: {
    //     status: 'COMPLETE',
    //     overallScore: narrative.overallScore,
    //     overallStatus: narrative.overallStatus,
    //     narrative: narrative.executiveSummary,
    //   }
    // });

    return Response.json({
      success: true,
      // audit: { id: audit.id, overallScore: narrative.overallScore }
    });
  } catch (error) {
    console.error('Compliance analysis failed:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Main Example Runner
// ============================================================================

export async function runExamples() {
  console.log('='.repeat(80));
  console.log('MODULAR COMPLIANCE ANALYSIS - EXAMPLES');
  console.log('='.repeat(80));

  // Example 1: Basic scoring
  await example1_basicCategoryScoring();

  // More examples would be run here...
  // await example2_scoreAllCategories(...);
  // await example3_parallelProcessing(...);
  // await example4_completeAudit(...);

  console.log('\n' + '='.repeat(80));
  console.log('Examples completed!');
  console.log('='.repeat(80));
}

// Uncomment to run examples
// runExamples().catch(console.error);
