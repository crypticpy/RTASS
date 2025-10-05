/**
 * Template Service
 * Fire Department Radio Transcription System
 *
 * Manages compliance templates with CRUD operations, validation,
 * and default NFPA 1561 template seeding.
 */

import { prisma } from '@/lib/db';
import { Errors } from './utils/errorHandlers';
import type { ComplianceCategory, ComplianceCriterion } from '@/lib/types';

// Prisma JSON type helper
type PrismaJson = Record<string, unknown> | unknown[];

/**
 * Template creation input
 */
export interface TemplateCreateInput {
  name: string;
  description?: string;
  categories: ComplianceCategory[];
  source?: string;
  isActive?: boolean;
}

/**
 * Template update input
 */
export interface TemplateUpdateInput {
  name?: string;
  description?: string;
  categories?: ComplianceCategory[];
  source?: string;
  isActive?: boolean;
}

/**
 * Template filter options
 */
export interface TemplateFilters {
  isActive?: boolean;
  source?: string;
  isAIGenerated?: boolean;
}

/**
 * Template validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Template Service
 *
 * Provides CRUD operations for compliance templates with validation
 * and default template seeding.
 *
 * @example
 * ```typescript
 * const templateService = new TemplateService();
 *
 * // Create template
 * const template = await templateService.createTemplate({
 *   name: "Custom SOP Template",
 *   categories: [...]
 * });
 *
 * // Get all active templates
 * const templates = await templateService.getTemplates({ isActive: true });
 * ```
 */
export class TemplateService {
  /**
   * Create a new compliance template
   *
   * Validates template structure and persists to database.
   *
   * @param {TemplateCreateInput} data - Template data
   * @returns {Promise} Created template
   * @throws {ServiceError} If validation fails or creation fails
   *
   * @example
   * ```typescript
   * const template = await templateService.createTemplate({
   *   name: "NFPA 1561 Compliance",
   *   description: "Standard for radio communications",
   *   categories: [...],
   *   source: "NFPA 1561"
   * });
   * ```
   */
  async createTemplate(data: TemplateCreateInput) {
    // Validate template structure
    const validation = this.validateTemplateStructure(data.categories);
    if (!validation.valid) {
      throw Errors.invalidInput(
        'template',
        validation.errors.join('; ')
      );
    }

    try {
      const template = await prisma.template.create({
        data: {
          name: data.name,
          description: data.description,
          version: '1.0',
          categories: data.categories as any,
          isActive: data.isActive ?? true,
          source: data.source,
          isAIGenerated: false,
        },
      });

      return template;
    } catch (error) {
      throw Errors.processingFailed(
        'Template creation',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get templates with optional filtering
   *
   * @param {TemplateFilters} filters - Filter criteria
   * @returns {Promise} Array of templates
   *
   * @example
   * ```typescript
   * // Get all active templates
   * const templates = await templateService.getTemplates({ isActive: true });
   *
   * // Get NFPA templates
   * const nfpaTemplates = await templateService.getTemplates({ source: "NFPA 1561" });
   * ```
   */
  async getTemplates(filters?: TemplateFilters) {
    try {
      const where: any = {};

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters?.source) {
        where.source = filters.source;
      }

      if (filters?.isAIGenerated !== undefined) {
        where.isAIGenerated = filters.isAIGenerated;
      }

      const templates = await prisma.template.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return templates;
    } catch (error) {
      throw Errors.processingFailed(
        'Templates retrieval',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get template by ID
   *
   * @param {string} id - Template ID
   * @returns {Promise} Template or null if not found
   * @throws {ServiceError} If retrieval fails
   *
   * @example
   * ```typescript
   * const template = await templateService.getTemplateById('template-123');
   * ```
   */
  async getTemplateById(id: string) {
    try {
      const template = await prisma.template.findUnique({
        where: { id },
      });

      if (!template) {
        throw Errors.notFound('Template', id);
      }

      return template;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw Errors.processingFailed(
        'Template retrieval',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Update an existing template
   *
   * @param {string} id - Template ID
   * @param {TemplateUpdateInput} data - Updated data
   * @returns {Promise} Updated template
   * @throws {ServiceError} If validation fails or update fails
   *
   * @example
   * ```typescript
   * const updated = await templateService.updateTemplate('template-123', {
   *   isActive: false
   * });
   * ```
   */
  async updateTemplate(id: string, data: TemplateUpdateInput) {
    // Validate categories if provided
    if (data.categories) {
      const validation = this.validateTemplateStructure(data.categories);
      if (!validation.valid) {
        throw Errors.invalidInput(
          'template',
          validation.errors.join('; ')
        );
      }
    }

    try {
      // Check if template exists
      await this.getTemplateById(id);

      const updateData: any = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.categories !== undefined) updateData.categories = data.categories as PrismaJson;
      if (data.source !== undefined) updateData.source = data.source;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const template = await prisma.template.update({
        where: { id },
        data: updateData,
      });

      return template;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw error;
      }
      throw Errors.processingFailed(
        'Template update',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Delete a template (soft delete by setting isActive = false)
   *
   * @param {string} id - Template ID
   * @returns {Promise<void>}
   * @throws {ServiceError} If deletion fails
   *
   * @example
   * ```typescript
   * await templateService.deleteTemplate('template-123');
   * ```
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      // Soft delete by deactivating
      await prisma.template.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      throw Errors.processingFailed(
        'Template deletion',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Validate template structure
   *
   * Ensures:
   * - Each category has at least 1 criterion
   * - Category weights sum to 1.0 (±0.01 tolerance)
   * - Criterion weights within category sum to 1.0
   * - Criterion IDs are unique within template
   *
   * @param {ComplianceCategory[]} categories - Categories to validate
   * @returns {ValidationResult} Validation result with errors
   *
   * @example
   * ```typescript
   * const result = templateService.validateTemplateStructure(categories);
   * if (!result.valid) {
   *   console.error('Validation errors:', result.errors);
   * }
   * ```
   */
  validateTemplateStructure(
    categories: ComplianceCategory[]
  ): ValidationResult {
    const errors: string[] = [];

    // Check if categories exist
    if (!categories || categories.length === 0) {
      errors.push('Template must have at least one category');
      return { valid: false, errors };
    }

    // Track criterion IDs for uniqueness check
    const criterionIds = new Set<string>();

    // Validate each category
    categories.forEach((category, categoryIndex) => {
      // Check if category has criteria
      if (!category.criteria || category.criteria.length === 0) {
        errors.push(
          `Category "${category.name}" must have at least one criterion`
        );
      }

      // Check if category has name
      if (!category.name) {
        errors.push(`Category at index ${categoryIndex} must have a name`);
      }

      // Check if category weight is valid
      if (
        category.weight === undefined ||
        category.weight < 0 ||
        category.weight > 1
      ) {
        errors.push(
          `Category "${category.name}" weight must be between 0 and 1`
        );
      }

      // Validate criteria
      let criterionWeightSum = 0;

      category.criteria.forEach((criterion, criterionIndex) => {
        // Check criterion ID uniqueness
        if (criterion.id) {
          if (criterionIds.has(criterion.id)) {
            errors.push(
              `Duplicate criterion ID "${criterion.id}" in category "${category.name}"`
            );
          }
          criterionIds.add(criterion.id);
        } else {
          errors.push(
            `Criterion at index ${criterionIndex} in category "${category.name}" must have an ID`
          );
        }

        // Check criterion has description
        if (!criterion.description) {
          errors.push(
            `Criterion "${criterion.id}" in category "${category.name}" must have a description`
          );
        }

        // Check criterion weight
        if (
          criterion.weight === undefined ||
          criterion.weight < 0 ||
          criterion.weight > 1
        ) {
          errors.push(
            `Criterion "${criterion.id}" weight must be between 0 and 1`
          );
        } else {
          criterionWeightSum += criterion.weight;
        }
      });

      // Check if criterion weights sum to 1.0 (±0.01 tolerance)
      if (category.criteria.length > 0) {
        if (Math.abs(criterionWeightSum - 1.0) > 0.01) {
          errors.push(
            `Category "${category.name}" criterion weights sum to ${criterionWeightSum.toFixed(
              2
            )}, must sum to 1.0`
          );
        }
      }
    });

    // Check if category weights sum to 1.0 (±0.01 tolerance)
    const categoryWeightSum = categories.reduce(
      (sum, cat) => sum + (cat.weight || 0),
      0
    );

    if (Math.abs(categoryWeightSum - 1.0) > 0.01) {
      errors.push(
        `Category weights sum to ${categoryWeightSum.toFixed(
          2
        )}, must sum to 1.0`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Seed default NFPA 1561 template
   *
   * Creates the default NFPA 1561 radio communications compliance template
   * if it doesn't already exist.
   *
   * @returns {Promise} Created or existing template
   *
   * @example
   * ```typescript
   * await templateService.seedDefaultTemplates();
   * ```
   */
  async seedDefaultTemplates() {
    // Check if NFPA 1561 template already exists
    const existing = await prisma.template.findFirst({
      where: {
        name: 'NFPA 1561 Radio Communications Compliance',
        source: 'NFPA 1561',
      },
    });

    if (existing) {
      console.log('NFPA 1561 template already exists');
      return existing;
    }

    // Create default NFPA 1561 template
    const nfpa1561Template = this.createNFPA1561Template();

    return await this.createTemplate(nfpa1561Template);
  }

  /**
   * Create NFPA 1561 default template structure
   *
   * @private
   * @returns {TemplateCreateInput} NFPA 1561 template data
   */
  private createNFPA1561Template(): TemplateCreateInput {
    return {
      name: 'NFPA 1561 Radio Communications Compliance',
      description:
        'Compliance template based on NFPA 1561 Standard on Emergency Services Incident Management System and Command Safety',
      source: 'NFPA 1561',
      isActive: true,
      categories: [
        {
          name: 'Initial Radio Report',
          description:
            'Evaluation of initial incident report and size-up communications',
          weight: 0.25,
          regulatoryReferences: ['NFPA 1561 5.2.5'],
          criteria: [
            {
              id: 'initial-report-location',
              description:
                'Incident location clearly stated with address or identifiable landmarks',
              evidenceRequired:
                'Specific address, intersection, or landmarks mentioned in initial radio report',
              scoringMethod: 'PASS_FAIL',
              weight: 0.25,
            },
            {
              id: 'initial-report-situation',
              description:
                'Nature and extent of emergency clearly communicated',
              evidenceRequired:
                'Description of incident type, visible conditions, and scope',
              scoringMethod: 'PASS_FAIL',
              weight: 0.25,
            },
            {
              id: 'initial-report-actions',
              description: 'Initial actions and mode of operation stated',
              evidenceRequired:
                'Offensive/defensive mode, rescue in progress, or initial tactics mentioned',
              scoringMethod: 'PASS_FAIL',
              weight: 0.25,
            },
            {
              id: 'initial-report-resources',
              description: 'Resource needs or staging instructions provided',
              evidenceRequired:
                'Request for additional resources or staging location communicated',
              scoringMethod: 'PASS_FAIL',
              weight: 0.25,
            },
          ],
        },
        {
          name: 'Incident Command Structure',
          description:
            'Assessment of command establishment and transfer procedures',
          weight: 0.20,
          regulatoryReferences: ['NFPA 1561 5.2.1', 'NFPA 1561 5.2.3'],
          criteria: [
            {
              id: 'command-establishment',
              description:
                'Incident command formally established and communicated',
              evidenceRequired:
                'Officer announces assumption of command with unit designation',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 0.40,
            },
            {
              id: 'command-location',
              description: 'Command post location identified',
              evidenceRequired: 'Specific command post location stated',
              scoringMethod: 'PASS_FAIL',
              weight: 0.30,
            },
            {
              id: 'command-transfer',
              description:
                'Command transfers (if any) properly announced and acknowledged',
              evidenceRequired:
                'Formal transfer announcement with acknowledgment from receiving officer',
              scoringMethod: 'PASS_FAIL',
              weight: 0.30,
            },
          ],
        },
        {
          name: 'Personnel Accountability',
          description: 'Verification of personnel accountability reporting',
          weight: 0.20,
          regulatoryReferences: ['NFPA 1561 5.4.5'],
          criteria: [
            {
              id: 'par-conducted',
              description:
                'Personnel Accountability Report (PAR) conducted at appropriate intervals',
              evidenceRequired:
                'PAR request made and units respond with personnel count',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 0.50,
            },
            {
              id: 'par-responses',
              description: 'All units respond to PAR requests',
              evidenceRequired:
                'All assigned units acknowledge and provide PAR',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 0.30,
            },
            {
              id: 'par-frequency',
              description:
                'PAR conducted at scene changes or every 10-20 minutes',
              evidenceRequired:
                'PAR timing aligns with incident milestones or time intervals',
              scoringMethod: 'PASS_FAIL',
              weight: 0.20,
            },
          ],
        },
        {
          name: 'Progress Reports',
          description:
            'Quality and frequency of tactical progress communications',
          weight: 0.15,
          regulatoryReferences: ['NFPA 1561 5.2.6'],
          criteria: [
            {
              id: 'progress-provided',
              description:
                'Units provide progress reports on assigned tasks',
              evidenceRequired:
                'Status updates on search completion, fire knockdown, ventilation, etc.',
              scoringMethod: 'PASS_FAIL',
              weight: 0.40,
            },
            {
              id: 'progress-conditions',
              description:
                'Reports include current conditions and any changes',
              evidenceRequired:
                'Mention of fire extension, structural conditions, or hazards',
              scoringMethod: 'PASS_FAIL',
              weight: 0.30,
            },
            {
              id: 'progress-needs',
              description:
                'Units communicate needs or request resources proactively',
              evidenceRequired:
                'Requests for additional personnel, equipment, or support',
              scoringMethod: 'PASS_FAIL',
              weight: 0.30,
            },
          ],
        },
        {
          name: 'Emergency Communications',
          description:
            'Mayday procedures and emergency traffic handling',
          weight: 0.20,
          regulatoryReferences: ['NFPA 1561 5.4.7'],
          criteria: [
            {
              id: 'emergency-mayday',
              description:
                'Mayday calls (if any) follow proper protocol with clear transmission',
              evidenceRequired:
                'MAYDAY transmitted three times, identification, and emergency description',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 0.30,
            },
            {
              id: 'emergency-acknowledgment',
              description:
                'Emergency traffic immediately acknowledged by command',
              evidenceRequired:
                'Command acknowledges mayday and clears radio traffic',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 0.30,
            },
            {
              id: 'emergency-response',
              description:
                'Appropriate emergency response actions initiated',
              evidenceRequired:
                'RIT activation, evacuation orders, or other emergency procedures',
              scoringMethod: 'CRITICAL_PASS_FAIL',
              weight: 0.20,
            },
            {
              id: 'emergency-discipline',
              description:
                'Radio discipline maintained during emergency traffic',
              evidenceRequired:
                'Non-emergency units remain off radio during emergency',
              scoringMethod: 'PASS_FAIL',
              weight: 0.20,
            },
          ],
        },
      ],
    };
  }
}

/**
 * Singleton template service instance
 */
export const templateService = new TemplateService();
