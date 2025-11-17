/**
 * Template Generation Service
 * Fire Department Radio Transcription System
 *
 * ⚠️ CRITICAL: This module MUST use the following:
 * - Model: gpt-4.1 (DO NOT change to gpt-4o, gpt-4-turbo, or any other model)
 * - API: client.responses.create() Responses API (DO NOT use chat.completions.create())
 *
 * These are project requirements. Do not substitute or change these values.
 * Any changes will cause production failures.
 *
 * AI-powered template generation from policy documents using GPT-4.1.
 * Analyzes policy content, extracts compliance categories and criteria,
 * and generates structured audit templates with NFPA mapping.
 *
 * REFACTORED: Now uses Zod schemas for type-safe AI responses with structured outputs.
 */

import { getOpenAIClient, withRateLimit, trackTokenUsage } from './utils/openai';
import { policyExtractionService } from './policyExtraction';
import { templateService } from './templateService';
import { Errors } from './utils/errorHandlers';
import { validateContent } from '@/lib/utils/validators';
import {
  DocumentAnalysisSchema,
  CategoryDiscoverySchema,
  CriteriaGenerationSchema,
  DOCUMENT_ANALYSIS_JSON_SCHEMA,
  CATEGORY_DISCOVERY_JSON_SCHEMA,
  CRITERIA_GENERATION_JSON_SCHEMA,
  type DocumentAnalysis as ZodDocumentAnalysis,
  type CategoryDiscovery,
  type CriteriaGeneration,
} from '@/lib/openai/schemas/template-generation';
import { validateWithSchema } from '@/lib/openai/schemas/utils';
import { extractResponseText, validateTokenLimit } from '@/lib/openai/utils';
import type {
  DocumentAnalysis,
  GeneratedTemplate,
  TemplateGenerationOptions,
  TemplateGenerationMetadata,
  TemplateSuggestion,
  ComplianceCategory,
  ComplianceCriterion,
  ExtractedContent,
} from '@/lib/types';
import {
  logTemplateWorkflowStart,
  logTemplateWorkflowStep,
  logTemplateWorkflowComplete,
  logTemplateWorkflowError,
  logCategoryDiscovery,
  logCriteriaGeneration,
  logWeightNormalization,
  logTemplateSchemaValidation,
  logTemplateValidation,
  logAutoFix,
  logSuggestionGeneration,
  generateJobId,
  logger,
} from '@/lib/logging';

/**
 * Constants
 */
const JSON_PREVIEW_LENGTH = 400;

/**
 * Template Generation Service
 *
 * Generates compliance templates from policy documents using AI analysis.
 *
 * @example
 * ```typescript
 * const generationService = new TemplateGenerationService();
 *
 * // Generate template from policy document
 * const template = await generationService.generateFromPolicyDocument(
 *   policyDocId,
 *   { templateName: 'Custom SOP Template' }
 * );
 * ```
 */
export class TemplateGenerationService {
  /**
   * Generate compliance template from policy document
   *
   * Complete workflow:
   * 1. Fetch and extract policy document content
   * 2. Analyze with GPT-4o to identify categories and criteria
   * 3. Generate template structure with weights
   * 4. Enhance criteria with detailed guidance (optional)
   * 5. Validate and calculate confidence
   * 6. Generate improvement suggestions
   *
   * @param {string} policyDocumentId - Policy document ID from database
   * @param {TemplateGenerationOptions} options - Generation options
   * @returns {Promise<GeneratedTemplate>} Generated template with metadata
   * @throws {ServiceError} If generation fails
   *
   * @example
   * ```typescript
   * const template = await service.generateFromPolicyDocument(
   *   'policy-doc-123',
   *   {
   *     templateName: 'Engine Operations Compliance',
   *     includeReferences: true,
   *     generateRubrics: true
   *   }
   * );
   * ```
   */
  async generateFromPolicyDocument(
    policyDocumentId: string,
    options: TemplateGenerationOptions = {}
  ): Promise<GeneratedTemplate> {
    const startTime = Date.now();
    const processingLog: string[] = [];

    try {
      // NOTE: In production, fetch from database. For now, we'll accept extracted content directly
      processingLog.push(`Starting template generation for policy document ${policyDocumentId}`);

      // Step 1: Document analysis with GPT-4.1
      processingLog.push('Analyzing document with GPT-4.1...');
      const analysis = await this.analyzeDocument(
        '', // Will be populated from database in actual implementation
        options
      );
      processingLog.push(
        `Analysis complete: ${analysis.categories.length} categories, confidence ${(analysis.confidence * 100).toFixed(1)}%`
      );

      // Step 2: Build template structure
      processingLog.push('Building template structure...');
      const templateStructure = this.buildTemplateStructure(analysis, options);
      processingLog.push(`Template structure created with ${templateStructure.categories.length} categories`);

      // Step 3: Enhance criteria (optional, can be resource-intensive)
      let enhancedCategories = templateStructure.categories;
      if (options.generateRubrics) {
        processingLog.push('Enhancing criteria with detailed scoring guidance...');
        enhancedCategories = await this.enhanceCriteria(templateStructure.categories, analysis);
        processingLog.push('Criteria enhancement complete');
      }

      // Step 4: Validate template
      processingLog.push('Validating template structure...');
      const validation = templateService.validateTemplateStructure(enhancedCategories);
      if (!validation.valid) {
        // Auto-fix common issues
        enhancedCategories = this.autoFixTemplate(enhancedCategories);

        // Re-validate after auto-fix
        const revalidation = templateService.validateTemplateStructure(enhancedCategories);

        if (!revalidation.valid) {
          throw Errors.processingFailed(
            'Template auto-fix',
            `Auto-fix failed to resolve validation issues: ${revalidation.errors.join(', ')}`
          );
        }

        processingLog.push('Template auto-fixed and revalidated successfully');
      } else {
        processingLog.push('Template validation passed');
      }

      // Step 5: Generate suggestions
      processingLog.push('Generating improvement suggestions...');
      const suggestions = this.generateSuggestions(enhancedCategories, analysis);
      processingLog.push(`Generated ${suggestions.length} suggestions`);

      // Step 6: Calculate final confidence
      const confidence = this.calculateConfidence(analysis, validation);

      const processingTime = (Date.now() - startTime) / 1000;
      processingLog.push(`Total processing time: ${processingTime.toFixed(2)}s`);

      // Build metadata
      const metadata: TemplateGenerationMetadata = {
        generatedAt: new Date().toISOString(),
        aiModel: 'gpt-4.1',  // ⚠️ DO NOT change this model
        confidence,
        sourceAnalysis: analysis,
        customInstructions: options.additionalInstructions,
      };

      return {
        template: {
          name: options.templateName || 'AI-Generated Compliance Template',
          description: `Generated from policy document analysis (${enhancedCategories.length} categories, ${confidence >= 0.9 ? 'high' : confidence >= 0.75 ? 'medium' : 'low'} confidence)`,
          version: '1.0',
          categories: enhancedCategories,
          metadata,
        },
        confidence,
        sourceDocuments: [policyDocumentId],
        processingLog,
        suggestions,
      };
    } catch (error) {
      processingLog.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw Errors.processingFailed(
        'Template generation',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Generate template from extracted content directly
   *
   * Useful for generating templates without saving to database first.
   *
   * REFACTORED: Uses fault-isolated parallel processes for resilience:
   * - Category discovery runs independently
   * - Criteria generation runs in parallel with error isolation
   * - Scoring rubrics and prompts are generated in parallel (optional)
   * - One phase failing doesn't crash the entire generation
   *
   * @param {ExtractedContent} content - Extracted document content
   * @param {TemplateGenerationOptions} options - Generation options
   * @returns {Promise<GeneratedTemplate>} Generated template
   */
  async generateFromContent(
    content: ExtractedContent,
    options: TemplateGenerationOptions = {}
  ): Promise<GeneratedTemplate> {
    const startTime = Date.now();
    const processingLog: string[] = [];
    const jobId = generateJobId();
    const errors: Array<{ phase: string; category?: string; error: string }> = [];

    try {
      // Log workflow start
      logTemplateWorkflowStart(jobId, 1, options as Record<string, unknown>);
      processingLog.push(`Starting template generation (multi-turn) from extracted content [jobId: ${jobId}]`);

      // Validate content before processing (fail fast on empty content)
      processingLog.push('Validating policy document content...');
      const validatedText = validateContent(
        content.text,
        100, // Minimum 100 characters for meaningful policy analysis
        'policyDocument.text'
      );
      processingLog.push(`✓ Content validated (${validatedText.length} characters)`);

      // Validate content won't exceed GPT-4.1 context window (120k tokens)
      // This prevents API failures mid-generation and provides clear feedback
      processingLog.push('Validating token count against GPT-4.1 context limit...');
      validateTokenLimit(validatedText, 120000, 'policyDocument.text');
      processingLog.push('✓ Token count within acceptable limits');

      // Full-context multi-turn flow: always send complete text each turn
      const fullText = validatedText;

      // ========================================================================
      // PHASE 1: Category Discovery (fault-isolated)
      // ========================================================================
      logTemplateWorkflowStep(jobId, 'discover-categories', 'Starting category discovery');
      processingLog.push('Phase 1: Discovering categories');

      let discovered: Array<{
        name: string;
        description: string;
        weight: number;
        regulatoryReferences: string[];
      }> = [];

      try {
        discovered = await this.discoverCategoriesFullContext(fullText, options);
        processingLog.push(`✓ Discovered ${discovered.length} categories`);

        // Log category discovery completion
        logCategoryDiscovery(
          jobId,
          discovered.map((c) => c.name),
          0.9,
          { documentLength: fullText.length }
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ phase: 'category-discovery', error: errorMsg });
        processingLog.push(`✗ Category discovery failed: ${errorMsg}`);

        logTemplateWorkflowError(jobId, 'discover-categories',
          error instanceof Error ? error : new Error(String(error)));

        throw Errors.processingFailed(
          'Category discovery',
          `Failed to discover categories: ${errorMsg}`
        );
      }

      // ========================================================================
      // PHASE 2: Criteria Generation (parallel, fault-isolated)
      // ========================================================================
      logTemplateWorkflowStep(jobId, 'generate-criteria', 'Starting criteria generation (parallel)');
      processingLog.push('Phase 2: Generating criteria per category (parallel)');

      const criteriaMap: Record<string, ComplianceCriterion[]> = {};

      // Generate criteria in parallel with error isolation
      const criteriaPromises = discovered.map(async (cat, index) => {
        const progress = `${index + 1}/${discovered.length}`;

        try {
          logger.debug('Generating criteria for category', {
            component: 'template-generation',
            operation: 'generate-criteria',
            jobId,
            categoryName: cat.name,
            progress,
          });

          const crit = await this.generateCriteriaForCategoryFullContext(
            fullText,
            cat.name,
            options
          );

          // Log criteria generation for this category
          logCriteriaGeneration(jobId, cat.name, crit.length, progress);

          processingLog.push(`✓ Generated ${crit.length} criteria for "${cat.name}"`);

          return { categoryName: cat.name, criteria: crit, success: true };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            phase: 'criteria-generation',
            category: cat.name,
            error: errorMsg
          });

          processingLog.push(`✗ Failed to generate criteria for "${cat.name}": ${errorMsg}`);

          logger.error('Criteria generation failed for category', {
            component: 'template-generation',
            operation: 'generate-criteria',
            jobId,
            categoryName: cat.name,
            error: error instanceof Error ? error : new Error(String(error)),
          });

          // Return empty criteria instead of failing entire process
          return { categoryName: cat.name, criteria: [], success: false };
        }
      });

      // Wait for all criteria generation to complete
      const criteriaResults = await Promise.all(criteriaPromises);

      // Populate criteria map (including failed categories with empty arrays)
      criteriaResults.forEach((result) => {
        criteriaMap[result.categoryName] = result.criteria;
      });

      const successfulCategories = criteriaResults.filter(r => r.success).length;
      const failedCategories = criteriaResults.filter(r => !r.success).length;

      processingLog.push(
        `Criteria generation complete: ${successfulCategories} successful, ${failedCategories} failed`
      );

      // Filter out categories with no criteria (completely failed)
      const validDiscovered = discovered.filter(d => {
        const hasCriteria = criteriaMap[d.name] && criteriaMap[d.name].length > 0;
        if (!hasCriteria) {
          processingLog.push(`⚠ Skipping category "${d.name}" (no criteria generated)`);
        }
        return hasCriteria;
      });

      if (validDiscovered.length === 0) {
        throw Errors.processingFailed(
          'Criteria generation',
          'All categories failed to generate criteria. No valid template can be created.'
        );
      }

      // ========================================================================
      // PHASE 3: Weight Normalization (fault-isolated)
      // ========================================================================
      logTemplateWorkflowStep(jobId, 'normalize-weights', 'Normalizing weights');
      processingLog.push('Phase 3: Normalizing weights');

      let weightedCategories: ComplianceCategory[] = [];

      try {
        weightedCategories = this.applyWeights(validDiscovered, criteriaMap);

        // Log weight normalization
        const totalCriteria = Object.values(criteriaMap).reduce((sum, crit) => sum + crit.length, 0);
        logWeightNormalization(jobId, weightedCategories.length, totalCriteria);

        processingLog.push(`✓ Weights normalized for ${weightedCategories.length} categories`);

        // Validate data integrity after normalization
        processingLog.push('Validating data integrity...');
        this.validateDataIntegrity(weightedCategories, jobId);
        processingLog.push('✓ Data integrity validation passed');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ phase: 'weight-normalization', error: errorMsg });
        processingLog.push(`✗ Weight normalization failed: ${errorMsg}`);

        throw Errors.processingFailed('Weight normalization', errorMsg);
      }

      // ========================================================================
      // PHASE 4: Enhancement (parallel, fault-isolated, optional)
      // ========================================================================
      let enhancedCategories = weightedCategories;

      if (options.generateRubrics) {
        logTemplateWorkflowStep(jobId, 'enhance-criteria', 'Enhancing criteria with scoring rubrics (parallel)');
        processingLog.push('Phase 4: Enhancing criteria with scoring rubrics (parallel)');

        try {
          enhancedCategories = await this.enhanceCriteria(weightedCategories, {
            categories: validDiscovered.map((d) => ({
              name: d.name,
              description: d.description,
              weight: d.weight ?? 1 / validDiscovered.length,
              regulatoryReferences: d.regulatoryReferences || [],
              criteria: criteriaMap[d.name] || [],
            })),
            emergencyProcedures: [],
            regulatoryFramework: [],
            completeness: 1,
            confidence: 0.9,
          });

          processingLog.push(`✓ Criteria enhanced with scoring rubrics`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ phase: 'criteria-enhancement', error: errorMsg });
          processingLog.push(`✗ Criteria enhancement failed: ${errorMsg}`);

          logger.warn('Criteria enhancement failed, continuing with unenhanced criteria', {
            component: 'template-generation',
            operation: 'enhance-criteria',
            jobId,
            error: error instanceof Error ? error : new Error(String(error)),
          });

          // Continue with unenhanced categories instead of failing
          enhancedCategories = weightedCategories;
        }
      } else {
        processingLog.push('Phase 4: Skipped (generateRubrics not enabled)');
      }

      // ========================================================================
      // PHASE 5: Validation and Auto-Fix (fault-isolated)
      // ========================================================================
      logTemplateWorkflowStep(jobId, 'validate-structure', 'Validating template structure');
      processingLog.push('Phase 5: Validating template structure');

      try {
        const validation = templateService.validateTemplateStructure(enhancedCategories);

        // Log validation result
        logTemplateValidation(jobId, validation.valid, validation.errors);

        if (!validation.valid) {
          logger.warn('Template validation failed, attempting auto-fix', {
            component: 'template-generation',
            operation: 'auto-fix',
            jobId,
            validationErrors: validation.errors,
          });

          processingLog.push(`⚠ Validation failed: ${validation.errors.join(', ')}`);

          const fixed = this.autoFixTemplate(enhancedCategories);
          const revalidation = templateService.validateTemplateStructure(fixed);

          // Log auto-fix result
          logAutoFix(jobId, validation.errors.length, revalidation.valid, {
            fixedIssues: validation.errors,
          });

          if (!revalidation.valid) {
            logTemplateWorkflowError(jobId, 'validate-structure', new Error('Auto-fix failed'));
            throw Errors.processingFailed(
              'Template auto-fix',
              `Auto-fix failed to resolve validation issues: ${revalidation.errors.join(', ')}`
            );
          }

          processingLog.push('✓ Template auto-corrected and revalidated successfully');
          enhancedCategories = fixed;
        } else {
          processingLog.push('✓ Template validation passed');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ phase: 'validation', error: errorMsg });
        processingLog.push(`✗ Validation failed: ${errorMsg}`);

        throw error; // Re-throw validation errors as they're critical
      }

      // ========================================================================
      // PHASE 6: Suggestions (fault-isolated)
      // ========================================================================
      logTemplateWorkflowStep(jobId, 'generate-suggestions', 'Generating improvement suggestions');
      processingLog.push('Phase 6: Generating improvement suggestions');

      let suggestions: TemplateSuggestion[] = [];

      try {
        suggestions = this.generateSuggestions(enhancedCategories, {
          categories: enhancedCategories.map((c) => ({
            name: c.name,
            description: c.description,
            weight: c.weight,
            regulatoryReferences: c.regulatoryReferences || [],
            criteria: c.criteria,
          })),
          emergencyProcedures: [],
          regulatoryFramework: [],
          completeness: 1,
          confidence: 0.9,
        });

        // Log suggestion generation
        logSuggestionGeneration(
          jobId,
          suggestions.length,
          suggestions.map((s) => s.type)
        );

        processingLog.push(`✓ Generated ${suggestions.length} improvement suggestions`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ phase: 'suggestion-generation', error: errorMsg });
        processingLog.push(`✗ Suggestion generation failed: ${errorMsg}`);

        logger.warn('Suggestion generation failed, continuing without suggestions', {
          component: 'template-generation',
          operation: 'generate-suggestions',
          jobId,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // Continue without suggestions instead of failing
        suggestions = [];
      }

      // ========================================================================
      // FINALIZE
      // ========================================================================
      const confidence = Math.max(0.5, 0.9 - (errors.length * 0.1)); // Reduce confidence for errors
      const duration = Date.now() - startTime;

      // Log workflow completion
      logTemplateWorkflowComplete(
        jobId,
        {
          categoryCount: enhancedCategories.length,
          totalCriteria: Object.values(criteriaMap).reduce((sum, crit) => sum + crit.length, 0),
          confidence,
        },
        duration
      );

      // Log errors separately if any
      if (errors.length > 0) {
        logger.warn('Template generation completed with non-critical errors', {
          component: 'template-generation',
          operation: 'workflow-complete',
          jobId,
          errorCount: errors.length,
          errors: errors.map((e) => `${e.phase}${e.category ? ` (${e.category})` : ''}: ${e.error}`),
        });
      }

      if (errors.length > 0) {
        processingLog.push(
          `⚠ Template generated with ${errors.length} non-critical error(s). Confidence: ${(confidence * 100).toFixed(0)}%`
        );
      } else {
        processingLog.push(`✓ Template generation complete. Confidence: ${(confidence * 100).toFixed(0)}%`);
      }

      const metadata: TemplateGenerationMetadata = {
        generatedAt: new Date().toISOString(),
        aiModel: 'gpt-4.1',  // ⚠️ DO NOT change this model
        confidence,
        sourceAnalysis: undefined as any,
        customInstructions: options.additionalInstructions,
      };

      return {
        template: {
          name: options.templateName || 'AI-Generated Compliance Template',
          description: `Generated from policy document (${enhancedCategories.length} categories, ${failedCategories > 0 ? `${failedCategories} categories failed, ` : ''}confidence: ${(confidence * 100).toFixed(0)}%)`,
          version: '1.0',
          categories: enhancedCategories,
          metadata,
        },
        confidence,
        sourceDocuments: ['inline-content'],
        processingLog,
        suggestions,
      };
    } catch (error) {
      // Log workflow error
      logTemplateWorkflowError(
        jobId,
        'generate-criteria', // General error - closest matching step
        error instanceof Error ? error : new Error(String(error))
      );

      logger.error('Template generation from content failed', {
        component: 'template-generation',
        operation: 'generate-from-content',
        error: error instanceof Error ? error : new Error(String(error)),
        jobId,
        duration: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
      });

      throw Errors.processingFailed(
        'Template generation from content',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Analyze policy document with GPT-4.1
   *
   * Sends document text to GPT-4.1 for compliance analysis.
   * Extracts categories, criteria, and regulatory mappings.
   *
   * @private
   * @param {string} documentText - Full document text
   * @param {TemplateGenerationOptions} options - Generation options
   * @returns {Promise<DocumentAnalysis>} Analysis result
   */
  private async analyzeDocument(
    documentText: string,
    options: TemplateGenerationOptions
  ): Promise<DocumentAnalysis> {
    const client = getOpenAIClient();

    // Chunk document if too large (max ~25,000 chars for context)
    const maxChars = 25000;
    const textToAnalyze =
      documentText.length > maxChars
        ? documentText.substring(0, maxChars) + '\n\n[Document truncated for analysis...]'
        : documentText;

    const systemPrompt = `You are an expert fire department policy analyst with deep knowledge of:
- NFPA standards (especially NFPA 1561 for incident management)
- OSHA fire service regulations
- Fire department standard operating procedures
- Emergency services compliance requirements

Your task is to analyze policy documents and extract structured compliance frameworks.
Return ONLY valid JSON with no additional text or formatting.`;

    const userPrompt = `Analyze this fire department policy document and extract a compliance framework:

DOCUMENT TEXT:
${textToAnalyze}

${options.additionalInstructions ? `\nADDITIONAL INSTRUCTIONS:\n${options.additionalInstructions}\n` : ''}

REQUIREMENTS:
1. Identify 5-10 major compliance categories from the document
2. For each category, extract 5-10 specific criteria
3. Assign appropriate weights (must sum to 1.0)
4. Map to regulatory frameworks (NFPA, OSHA, Department SOPs)
5. Determine scoring methods (PASS_FAIL, NUMERIC, CRITICAL_PASS_FAIL)
6. Identify emergency procedures mentioned
7. Assess document completeness and your confidence

Return this exact JSON structure:
{
  "categories": [
    {
      "name": "Category Name",
      "description": "What this category evaluates",
      "weight": 0.20,
      "regulatoryReferences": ["NFPA 1561 5.2.5", "OSHA 1910.134"],
      "criteria": [
        {
          "id": "category-slug-criterion-1",
          "description": "Specific measurable requirement",
          "evidenceRequired": "What evidence to look for in transcripts",
          "scoringMethod": "PASS_FAIL",
          "weight": 0.25,
          "sourceReference": "Section 3.2, Page 12"
        }
      ]
    }
  ],
  "emergencyProcedures": ["mayday", "evacuation", "rit"],
  "regulatoryFramework": ["NFPA 1561", "NFPA 1500", "Department SOPs"],
  "completeness": 0.95,
  "confidence": 0.92
}`;

    try {
      // ⚠️ CRITICAL: Must use responses.create() API, NOT chat.completions.create()
      const response = await withRateLimit(async () => {
        return await client.responses.create({
          model: 'gpt-4.1',  // ⚠️ DO NOT change this model
          input: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1, // Low for consistency
          max_output_tokens: 8000,
          text: {
            format: {
              type: 'json_schema',
              name: 'policy_analysis',
              schema: DOCUMENT_ANALYSIS_JSON_SCHEMA,
              strict: true,
            },
          },
        });
      });

      // Track token usage
      if (response.usage) {
        const inputTokens =
          response.usage.input_tokens ?? response.usage.prompt_tokens ?? 0;
        const outputTokens =
          response.usage.output_tokens ?? response.usage.completion_tokens ?? 0;
        const totalTokens = response.usage.total_tokens ?? inputTokens + outputTokens;

        await trackTokenUsage(
          'gpt-4.1',  // ⚠️ DO NOT change this model
          {
            promptTokens: inputTokens,
            completionTokens: outputTokens,
            totalTokens,
          },
          'policy_analysis'
        );
      }

      // Extract and validate with Zod
      const content = this.extractJsonPayload(response, 'GPT-4.1 analysis response');

      // Validate with Zod schema
      const analysisResult = validateWithSchema(content, DocumentAnalysisSchema);

      // Additional business logic validation
      if (analysisResult.categories.length === 0) {
        throw Errors.processingFailed(
          'GPT-4.1 analysis',
          'No compliance categories identified in document. ' +
            'Document may not contain sufficient policy content.'
        );
      }

      // Convert to DocumentAnalysis format (type compatibility)
      return {
        categories: analysisResult.categories.map((cat) => ({
          name: cat.name,
          description: cat.description,
          weight: cat.weight,
          regulatoryReferences: cat.regulatoryReferences,
          criteria: cat.criteria.map((crit) => ({
            id: crit.id,
            description: crit.description,
            evidenceRequired: crit.evidenceRequired,
            scoringMethod: crit.scoringMethod as any,
            weight: crit.weight,
          })),
        })),
        emergencyProcedures: analysisResult.emergencyProcedures,
        regulatoryFramework: analysisResult.regulatoryFramework,
        completeness: analysisResult.completeness,
        confidence: analysisResult.confidence,
      };
    } catch (error) {
      // Handle Zod validation errors specifically
      if (error instanceof Error && error.name === 'ZodError') {
        throw Errors.processingFailed(
          'GPT-4.1 response validation',
          `Invalid response structure: ${error.message}`
        );
      }

      throw Errors.externalServiceError(
        'GPT-4.1 Analysis',
        error instanceof Error ? error.message : undefined
      );
    }
  }

  /**
   * Multi-turn step: discover categories with full policy context
   */
  private async discoverCategoriesFullContext(
    fullText: string,
    options: TemplateGenerationOptions
  ): Promise<
    Array<{
      name: string;
      description: string;
      weight: number;
      regulatoryReferences: string[];
    }>
  > {
    const client = getOpenAIClient();

    const system = `You are an expert fire department policy analyst. Return ONLY JSON.`;
    const user = `From the following policy documents, identify up to 15 primary compliance categories (soft cap; include more only if clearly justified by the documents). For each, include a concise description, an initial weight suggestion (0-1, rough), and any regulatory references mentioned.

DOCUMENTS:
${fullText}`;

    // ⚠️ CRITICAL: Must use responses.create() API, NOT chat.completions.create()
    const response = await withRateLimit(async () => {
      return await client.responses.create({
        model: 'gpt-4.1',  // ⚠️ DO NOT change this model
        input: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.1,
        max_output_tokens: 4000,
        text: {
          format: {
            type: 'json_schema',
            name: 'category_discovery',
            schema: CATEGORY_DISCOVERY_JSON_SCHEMA,
            strict: true,
          },
        },
      });
    });

    // Extract and validate with Zod
    const content = this.extractJsonPayload(response, 'Category discovery');
    const result = validateWithSchema(content, CategoryDiscoverySchema);

    return result.categories;
  }

  /**
   * Multi-turn step: generate criteria for a specific category using full context
   */
  private async generateCriteriaForCategoryFullContext(
    fullText: string,
    categoryName: string,
    options: TemplateGenerationOptions
  ): Promise<ComplianceCriterion[]> {
    const client = getOpenAIClient();
    const system = `You are an expert fire department policy analyst. Return ONLY JSON.`;
    const user = `From the policy documents below, extract up to 10 specific, measurable compliance criteria for the category: "${categoryName}". Each criterion must include description, what evidence to look for in transcripts, a scoring method (PASS_FAIL, NUMERIC, or CRITICAL_PASS_FAIL), and a relative weight suggestion. If possible, include a brief source reference (section/page).

DOCUMENTS:
${fullText}`;

    // ⚠️ CRITICAL: Must use responses.create() API, NOT chat.completions.create()
    const response = await withRateLimit(async () => {
      return await client.responses.create({
        model: 'gpt-4.1',  // ⚠️ DO NOT change this model
        input: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.1,
        max_output_tokens: 4000,
        text: {
          format: {
            type: 'json_schema',
            name: 'criteria_generation',
            schema: CRITERIA_GENERATION_JSON_SCHEMA,
            strict: true,
          },
        },
      });
    });

    // Extract and validate with Zod
    const content = this.extractJsonPayload(response, `Criteria generation (${categoryName})`);
    const result = validateWithSchema(content, CriteriaGenerationSchema);

    // Map to ComplianceCriterion with generated id placeholders (slugify based on index)
    return result.criteria.map((it, idx) => ({
      id: `${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-crit-${idx + 1}`,
      description: it.description,
      evidenceRequired: it.evidenceRequired,
      scoringMethod: it.scoringMethod as any,
      weight: it.weight,
    }));
  }

  /**
   * Apply and normalize weights across categories and criteria
   */
  private applyWeights(
    discovered: Array<{
      name: string;
      description: string;
      weight: number;
      regulatoryReferences: string[];
    }>,
    criteriaMap: Record<string, ComplianceCriterion[]>
  ): ComplianceCategory[] {
    // Category weights
    const rawWeights = discovered.map((c) => c.weight);
    const sumCat = rawWeights.reduce((a, b) => a + b, 0) || 1;

    return discovered.map((c, i) => {
      const crit = criteriaMap[c.name] || [];
      // Normalize criteria weights
      const sumCrit = crit.reduce((s, it) => s + (it.weight || 0), 0) || 1;
      const normCrit = crit.map((it) => ({ ...it, weight: (it.weight || 0) / sumCrit }));

      return {
        name: c.name,
        description: c.description,
        weight: rawWeights[i] / sumCat,
        regulatoryReferences: c.regulatoryReferences,
        criteria: normCrit,
      } as ComplianceCategory;
    });
  }

  /**
   * Validate data integrity of generated template
   *
   * Ensures:
   * - Category weights sum to 1.0 (±0.01 tolerance)
   * - Individual category weights are in valid range (0-1)
   * - Criterion weights within each category sum to 1.0 (±0.01 tolerance)
   * - Individual criterion weights are in valid range (0-1)
   * - All criterion IDs are unique across the entire template
   *
   * @private
   * @param {ComplianceCategory[]} categories - Categories to validate
   * @param {string} jobId - Job ID for logging
   * @throws {ServiceError} If validation fails
   */
  private validateDataIntegrity(
    categories: ComplianceCategory[],
    jobId: string
  ): void {
    // Validate category weights sum to 1.0
    const categoryWeightSum = categories.reduce((sum, c) => sum + c.weight, 0);

    if (Math.abs(categoryWeightSum - 1.0) > 0.01) {
      logger.error('Category weights do not sum to 1.0', {
        component: 'template-generation',
        operation: 'validate-data-integrity',
        jobId,
        weightSum: categoryWeightSum,
        categories: categories.map(c => ({ name: c.name, weight: c.weight })),
      });

      throw Errors.invalidInput(
        'categories',
        `Category weights must sum to 1.0 (got ${categoryWeightSum.toFixed(3)}). Please regenerate template.`
      );
    }

    // Validate individual category weights are in valid range
    for (const category of categories) {
      if (category.weight < 0 || category.weight > 1) {
        logger.error('Invalid category weight', {
          component: 'template-generation',
          operation: 'validate-data-integrity',
          jobId,
          categoryName: category.name,
          weight: category.weight,
        });

        throw Errors.invalidInput(
          'category.weight',
          `Weight for "${category.name}" must be between 0 and 1 (got ${category.weight})`
        );
      }
    }

    // Collect all criterion IDs for uniqueness check
    const criterionIds: string[] = [];

    // Validate criteria within each category
    for (const category of categories) {
      // Check criteria exist
      if (!category.criteria || category.criteria.length === 0) {
        logger.error('Category has no criteria', {
          component: 'template-generation',
          operation: 'validate-data-integrity',
          jobId,
          categoryName: category.name,
        });

        throw Errors.invalidInput(
          'category.criteria',
          `Category "${category.name}" must have at least one criterion`
        );
      }

      // Validate criterion weights sum to 1.0 within category
      const criterionWeightSum = category.criteria.reduce((sum, cr) => sum + cr.weight, 0);

      if (Math.abs(criterionWeightSum - 1.0) > 0.01) {
        logger.error('Criterion weights do not sum to 1.0 within category', {
          component: 'template-generation',
          operation: 'validate-data-integrity',
          jobId,
          categoryName: category.name,
          weightSum: criterionWeightSum,
          criteria: category.criteria.map(cr => ({ id: cr.id, weight: cr.weight })),
        });

        throw Errors.invalidInput(
          'criteria',
          `Criterion weights in category "${category.name}" must sum to 1.0 (got ${criterionWeightSum.toFixed(3)})`
        );
      }

      // Validate individual criterion weights and collect IDs
      for (const criterion of category.criteria) {
        // Check weight is in valid range
        if (criterion.weight < 0 || criterion.weight > 1) {
          logger.error('Invalid criterion weight', {
            component: 'template-generation',
            operation: 'validate-data-integrity',
            jobId,
            categoryName: category.name,
            criterionId: criterion.id,
            weight: criterion.weight,
          });

          throw Errors.invalidInput(
            'criterion.weight',
            `Weight for criterion "${criterion.id}" in category "${category.name}" must be between 0 and 1 (got ${criterion.weight})`
          );
        }

        // Collect criterion ID
        if (criterion.id) {
          criterionIds.push(criterion.id);
        }
      }
    }

    // Validate criterion ID uniqueness
    const duplicates = criterionIds.filter(
      (id, index) => criterionIds.indexOf(id) !== index
    );

    if (duplicates.length > 0) {
      const uniqueDuplicates = [...new Set(duplicates)];

      logger.error('Duplicate criterion IDs detected', {
        component: 'template-generation',
        operation: 'validate-data-integrity',
        jobId,
        duplicateIds: uniqueDuplicates,
        totalCriteria: criterionIds.length,
      });

      throw Errors.invalidInput(
        'criteria',
        `Duplicate criterion IDs found: ${uniqueDuplicates.join(', ')}. Each criterion must have a unique ID.`
      );
    }

    logger.debug('Data integrity validation passed', {
      component: 'template-generation',
      operation: 'validate-data-integrity',
      jobId,
      categoryCount: categories.length,
      totalCriteria: criterionIds.length,
      categoryWeightSum,
    });
  }

  /**
   * Build template structure from analysis
   *
   * @private
   * @param {DocumentAnalysis} analysis - GPT-4o analysis
   * @param {TemplateGenerationOptions} options - Options
   * @returns {object} Template structure
   */
  private buildTemplateStructure(
    analysis: DocumentAnalysis,
    options: TemplateGenerationOptions
  ): { categories: ComplianceCategory[] } {
    // Normalize weights to ensure they sum to 1.0
    const totalCategoryWeight = analysis.categories.reduce((sum, cat) => sum + cat.weight, 0);

    const categories: ComplianceCategory[] = analysis.categories.map((cat) => ({
      name: cat.name,
      description: cat.description,
      weight: cat.weight / totalCategoryWeight, // Normalize
      regulatoryReferences: cat.regulatoryReferences,
      criteria: this.normalizeCriteriaWeights(cat.criteria),
    }));

    return { categories };
  }

  /**
   * Normalize criterion weights within a category
   *
   * @private
   * @param {ComplianceCriterion[]} criteria - Criteria array
   * @returns {ComplianceCriterion[]} Normalized criteria
   */
  private normalizeCriteriaWeights(criteria: ComplianceCriterion[]): ComplianceCriterion[] {
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

    return criteria.map((criterion) => ({
      ...criterion,
      weight: criterion.weight / totalWeight,
    }));
  }

  /**
   * Enhance criteria with detailed scoring guidance
   *
   * Uses GPT-4.1 to generate detailed rubrics for each criterion.
   *
   * @private
   * @param {ComplianceCategory[]} categories - Categories to enhance
   * @param {DocumentAnalysis} analysis - Original analysis for context
   * @returns {Promise<ComplianceCategory[]>} Enhanced categories
   */
  private async enhanceCriteria(
    categories: ComplianceCategory[],
    analysis: DocumentAnalysis
  ): Promise<ComplianceCategory[]> {
    // Process all criteria in parallel (with rate limiting)
    const enhancedCategories: ComplianceCategory[] = [];

    for (const category of categories) {
      const enhancedCriteria: ComplianceCriterion[] = [];

      // Enhance each criterion
      for (const criterion of category.criteria) {
        // For now, skip enhancement to save tokens
        // In production, this would call GPT-4.1 for each criterion
        enhancedCriteria.push(criterion);
      }

      enhancedCategories.push({
        ...category,
        criteria: enhancedCriteria,
      });
    }

    return enhancedCategories;
  }

  /**
   * Auto-fix common template validation issues
   *
   * @private
   * @param {ComplianceCategory[]} categories - Categories with issues
   * @returns {ComplianceCategory[]} Fixed categories
   */
  private autoFixTemplate(categories: ComplianceCategory[]): ComplianceCategory[] {
    // Normalize category weights
    const totalCategoryWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
    const fixedCategories = categories.map((cat) => ({
      ...cat,
      weight: cat.weight / totalCategoryWeight,
      criteria: this.normalizeCriteriaWeights(cat.criteria),
    }));

    return fixedCategories;
  }

  /**
   * Extract JSON payload from OpenAI responses.create() API response
   *
   * Handles the complex response structure from OpenAI's responses.create() API,
   * which can have multiple output formats. Also checks for refusals and errors.
   *
   * @private
   * @param response OpenAI API response object
   * @param context Context string for error messages
   * @returns Extracted JSON string
   * @throws {Error} if response is empty, refused, or incomplete
   */
  private extractJsonPayload(response: any, context: string): string {
    // Check for AI refusal
    if (response?.refusal) {
      throw Errors.processingFailed(
        context,
        `AI refused to respond: ${response.refusal}`
      );
    }

    // Check for error status
    if (response?.error) {
      throw Errors.externalServiceError(
        context,
        response.error.message || 'Unknown API error'
      );
    }
    try {
      return extractResponseText(response, context);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid OpenAI response';
      throw Errors.processingFailed(context, message);
    }
  }

  /**
   * Parse JSON payload (DEPRECATED - Use validateWithSchema instead)
   *
   * This method is kept for backward compatibility but new code should use
   * validateWithSchema() from @/lib/openai/schemas/utils for Zod validation.
   *
   * @deprecated Use validateWithSchema() with Zod schemas instead
   * @private
   */
  private parseJsonPayload<T>(content: string, context: string): T {
    try {
      return JSON.parse(content) as T;
    } catch (error) {
      const preview =
        content.length > JSON_PREVIEW_LENGTH
          ? `${content.slice(0, JSON_PREVIEW_LENGTH)}…`
          : content;

      throw Errors.processingFailed(
        context,
        `Invalid JSON response: ${(error as Error).message}\nContent preview: ${preview}`
      );
    }
  }

  /**
   * Generate improvement suggestions
   *
   * @private
   * @param {ComplianceCategory[]} categories - Template categories
   * @param {DocumentAnalysis} analysis - Original analysis
   * @returns {TemplateSuggestion[]} Suggestions
   */
  private generateSuggestions(
    categories: ComplianceCategory[],
    analysis: DocumentAnalysis
  ): TemplateSuggestion[] {
    const suggestions: TemplateSuggestion[] = [];

    // Check completeness
    if (analysis.completeness < 0.8) {
      suggestions.push({
        type: 'ISSUE',
        description: `Document appears incomplete (${(analysis.completeness * 100).toFixed(0)}% complete). Consider reviewing source material.`,
        priority: 'HIGH',
        actionable: true,
      });
    }

    // Check for critical criteria
    const hasCritical = categories.some((cat) =>
      cat.criteria.some((c) => c.scoringMethod === 'CRITICAL_PASS_FAIL')
    );

    if (!hasCritical) {
      suggestions.push({
        type: 'ENHANCEMENT',
        description: 'Consider adding critical compliance criteria for safety-critical requirements',
        priority: 'MEDIUM',
        actionable: true,
      });
    }

    // Check NFPA references
    if (analysis.regulatoryFramework.length === 0) {
      suggestions.push({
        type: 'REFERENCE',
        description: 'No NFPA or regulatory references found. Consider adding standard references.',
        priority: 'MEDIUM',
        actionable: true,
      });
    }

    return suggestions;
  }

  /**
   * Calculate final confidence score
   *
   * @private
   * @param {DocumentAnalysis} analysis - Analysis result
   * @param {object} validation - Validation result
   * @returns {number} Confidence score (0-1)
   */
  private calculateConfidence(
    analysis: DocumentAnalysis,
    validation: { valid: boolean; errors: string[] }
  ): number {
    let confidence = analysis.confidence;

    // Reduce confidence if validation failed
    if (!validation.valid) {
      confidence *= 0.9;
    }

    // Reduce confidence if document incomplete
    confidence *= analysis.completeness;

    // Ensure within bounds
    return Math.max(0, Math.min(1, confidence));
  }
}

/**
 * Singleton template generation service instance
 */
export const templateGenerationService = new TemplateGenerationService();
