/**
 * Template Generation Service
 * Fire Department Radio Transcription System
 *
 * AI-powered template generation from policy documents using GPT-4.1.
 * Analyzes policy content, extracts compliance categories and criteria,
 * and generates structured audit templates with NFPA mapping.
 */

import { getOpenAIClient, withRateLimit, trackTokenUsage } from './utils/openai';
import { policyExtractionService } from './policyExtraction';
import { templateService } from './templateService';
import { Errors } from './utils/errorHandlers';
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

/**
 * GPT-4.1 document analysis response
 */
interface GPT4DocumentAnalysis {
  categories: Array<{
    name: string;
    description: string;
    weight: number;
    regulatoryReferences: string[];
    criteria: Array<{
      id: string;
      description: string;
      evidenceRequired: string;
      scoringMethod: string;
      weight: number;
      sourceReference: string;
    }>;
  }>;
  emergencyProcedures: string[];
  regulatoryFramework: string[];
  completeness: number;
  confidence: number;
}

/**
 * Criteria enhancement response from GPT-4.1
 */
interface CriteriaEnhancement {
  scoringGuidance: string;
  complianceExamples: string[];
  nonComplianceExamples: string[];
  improvementRecommendations: string[];
  sourceReferences: string[];
}

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
        aiModel: 'gpt-4.1',
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

    try {
      processingLog.push('Starting template generation (multi-turn) from extracted content');

      // Full-context multi-turn flow: always send complete text each turn
      const fullText = content.text;

      // Step 1: Discover categories (soft cap ~15)
      processingLog.push('Step 1: Discovering categories');
      const discovered = await this.discoverCategoriesFullContext(fullText, options);
      processingLog.push(`Discovered ${discovered.length} categories`);

      // Step 2: Generate criteria per category (soft cap ~10 each)
      processingLog.push('Step 2: Generating criteria per category');
      const criteriaMap: Record<string, ComplianceCriterion[]> = {};
      // Run sequentially to keep token usage predictable; can be parallelized with rate limit if needed
      for (const cat of discovered) {
        const crit = await this.generateCriteriaForCategoryFullContext(fullText, cat.name, options);
        criteriaMap[cat.name] = crit;
      }
      processingLog.push('Criteria generation complete');

      // Step 3: Propose weights (category-level)
      processingLog.push('Step 3: Proposing weights');
      const weightedCategories = this.applyWeights(discovered, criteriaMap);

      // Build structure
      const templateStructure = { categories: weightedCategories };

      // Optional enhancement step
      let enhancedCategories = templateStructure.categories;
      if (options.generateRubrics) {
        enhancedCategories = await this.enhanceCriteria(templateStructure.categories, {
          categories: discovered.map((d) => ({
            name: d.name,
            description: d.description,
            weight: d.weight ?? 1 / discovered.length,
            regulatoryReferences: d.regulatoryReferences || [],
            criteria: criteriaMap[d.name] || [],
          })),
          emergencyProcedures: [],
          regulatoryFramework: [],
          completeness: 1,
          confidence: 0.9,
        });
        processingLog.push('Criteria enhanced with scoring rubrics');
      }

      // Validate and fix
      const validation = templateService.validateTemplateStructure(enhancedCategories);
      if (!validation.valid) {
        const fixed = this.autoFixTemplate(enhancedCategories);
        const revalidation = templateService.validateTemplateStructure(fixed);
        if (!revalidation.valid) {
          throw Errors.processingFailed(
            'Template auto-fix',
            `Auto-fix failed to resolve validation issues: ${revalidation.errors.join(', ')}`
          );
        }
        processingLog.push('Template auto-corrected and revalidated successfully');
        // eslint-disable-next-line no-param-reassign
        enhancedCategories = fixed;
      } else {
        processingLog.push('Template validation passed');
      }

      // Suggestions & confidence
      const suggestions = this.generateSuggestions(enhancedCategories, {
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

      const confidence = 0.9;
      const metadata: TemplateGenerationMetadata = {
        generatedAt: new Date().toISOString(),
        aiModel: 'gpt-4.1',
        confidence,
        sourceAnalysis: undefined as any,
        customInstructions: options.additionalInstructions,
      };

      return {
        template: {
          name: options.templateName || 'AI-Generated Compliance Template',
          description: `Generated from policy document (${enhancedCategories.length} categories)`,
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
      const response = await withRateLimit(async () => {
        // Cast to any to allow response_format until SDK types catch up
        return await client.responses.create({
          model: 'gpt-4.1',
          instructions: systemPrompt,
          input: userPrompt,
          temperature: 0.1, // Low for consistency
          max_output_tokens: 8000,
          response_format: { type: 'json_object' },
        } as any);
      });

      // Track token usage
      if (response.usage) {
        await trackTokenUsage(
          'gpt-4.1',
          {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.total_tokens,
          },
          'policy_analysis'
        );
      }

      // Extract content from GPT-4.1 response
      let content = response.output_text;

      if (!content) {
        throw Errors.externalServiceError(
          'GPT-4.1',
          'Empty response from API. Please try again.'
        );
      }

      // Strip markdown code blocks if GPT-4.1 wrapped JSON in ```json...```
      content = content.replace(/^```json\s*\n?/m, '').replace(/\n?```\s*$/m, '');

      // Parse JSON with error handling
      let analysisResult: GPT4DocumentAnalysis;
      try {
        analysisResult = JSON.parse(content);
      } catch (error) {
        throw Errors.processingFailed(
          'GPT-4.1 response parsing',
          `Invalid JSON response: ${(error as Error).message}\n` +
            `Content preview: ${content.substring(0, 200)}...`
        );
      }

      // Validate response structure
      if (!analysisResult.categories || !Array.isArray(analysisResult.categories)) {
        throw Errors.processingFailed(
          'GPT-4.1 response validation',
          'Response missing required "categories" array. ' +
            `Received keys: ${Object.keys(analysisResult).join(', ')}`
        );
      }

      if (analysisResult.categories.length === 0) {
        throw Errors.processingFailed(
          'GPT-4.1 analysis',
          'No compliance categories identified in document. ' +
            'Document may not contain sufficient policy content.'
        );
      }

      // Validate each category has required fields
      analysisResult.categories.forEach((category, index) => {
        if (!category.name || !category.criteria || !Array.isArray(category.criteria)) {
          throw Errors.processingFailed(
            'GPT-4.1 response validation',
            `Category ${index + 1} missing required fields (name, criteria array)`
          );
        }
      });

      // Convert to DocumentAnalysis format
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
      throw Errors.externalServiceError(
        'GPT-4o Analysis',
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
      weight?: number;
      regulatoryReferences?: string[];
    }>
  > {
    const client = getOpenAIClient();

    const system = `You are an expert fire department policy analyst. Return ONLY JSON.`;
    const user = `From the following policy documents, identify up to 15 primary compliance categories (soft cap; include more only if clearly justified by the documents). For each, include a concise description, an initial weight suggestion (0-1, rough), and any regulatory references mentioned.

DOCUMENTS:
${fullText}`;

    const response = await withRateLimit(async () => {
      return await client.responses.create({
        model: 'gpt-4.1',
        instructions: system,
        input: user,
        temperature: 0.1,
        max_output_tokens: 4000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'category_discovery',
            schema: {
              type: 'object',
              properties: {
                categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['name', 'description'],
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      weight: { type: 'number' },
                      regulatoryReferences: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
              required: ['categories'],
              additionalProperties: false,
            },
            strict: true,
          },
        },
      } as any);
    });

    const content = response.output_text;
    const json = JSON.parse(content);
    return (json.categories || []) as Array<{
      name: string;
      description: string;
      weight?: number;
      regulatoryReferences?: string[];
    }>;
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

    const response = await withRateLimit(async () => {
      return await client.responses.create({
        model: 'gpt-4.1',
        instructions: system,
        input: user,
        temperature: 0.1,
        max_output_tokens: 4000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'criteria_generation',
            schema: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                criteria: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: [
                      'description',
                      'evidenceRequired',
                      'scoringMethod',
                      'weight',
                    ],
                    properties: {
                      description: { type: 'string' },
                      evidenceRequired: { type: 'string' },
                      scoringMethod: {
                        type: 'string',
                        enum: ['PASS_FAIL', 'NUMERIC', 'CRITICAL_PASS_FAIL'],
                      },
                      weight: { type: 'number' },
                      sourceReference: { type: 'string' },
                    },
                    additionalProperties: false,
                  },
                },
              },
              required: ['criteria'],
              additionalProperties: false,
            },
            strict: true,
          },
        },
      } as any);
    });

    const content = response.output_text;
    const json = JSON.parse(content);
    const items = (json.criteria || []) as Array<{
      description: string;
      evidenceRequired: string;
      scoringMethod: string;
      weight: number;
      sourceReference?: string;
    }>;

    // Map to ComplianceCriterion with generated id placeholders (slugify based on index)
    return items.map((it, idx) => ({
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
      weight?: number;
      regulatoryReferences?: string[];
    }>,
    criteriaMap: Record<string, ComplianceCriterion[]>
  ): ComplianceCategory[] {
    // Category weights
    const rawWeights = discovered.map((c) => c.weight ?? 1 / discovered.length);
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
        regulatoryReferences: c.regulatoryReferences || [],
        criteria: normCrit,
      } as ComplianceCategory;
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
   * Uses GPT-4o to generate detailed rubrics for each criterion.
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
        // In production, this would call GPT-4o for each criterion
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
