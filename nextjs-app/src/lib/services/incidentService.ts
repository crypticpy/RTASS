/**
 * Incident Service
 * Fire Department Radio Transcription System
 *
 * Handles incident creation, retrieval, and management operations.
 * Provides auto-generation for missing incident fields during transcription upload.
 */

import { prisma } from '@/lib/db';
import { Errors } from './utils/errorHandlers';
import type { Incident } from '@prisma/client';
import { z } from 'zod';

/**
 * Incident validation schemas
 */
const IncidentSeveritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
const IncidentStatusSchema = z.enum(['ACTIVE', 'RESOLVED', 'MONITORING']);

export const CreateIncidentSchema = z.object({
  number: z.string().optional(),
  type: z.string().min(1, 'Incident type is required'),
  severity: IncidentSeveritySchema,
  address: z.string().min(1, 'Address is required'),
  startTime: z.date().or(z.string()).optional(),
  endTime: z.date().or(z.string()).nullable().optional(),
  status: IncidentStatusSchema.optional(),
  summary: z.string().nullable().optional(),
  unitIds: z.array(z.string()).optional(),
  selectedTemplateIds: z.array(z.string()).optional(),
});

export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;

/**
 * Incident Service
 *
 * Provides CRUD operations for fire department incidents.
 *
 * @example
 * ```typescript
 * const incident = await incidentService.createIncident({
 *   type: 'Structure Fire',
 *   severity: 'HIGH',
 *   address: '123 Main St',
 * });
 * ```
 */
export class IncidentService {
  /**
   * Creates a new incident in the database
   * Auto-generates missing optional fields (number, startTime, status)
   * Requires: type, severity, address
   *
   * @param input - Incident data (required: type, severity, address)
   * @returns Created incident record with relationships
   * @throws {ServiceError} If validation fails or database operation fails
   */
  async createIncident(input: CreateIncidentInput): Promise<Incident> {
    // Validate input
    const validationResult = CreateIncidentSchema.safeParse(input);
    if (!validationResult.success) {
      throw Errors.invalidInput(
        'incident',
        validationResult.error.errors.map((e) => e.message).join('; ')
      );
    }

    const validatedInput = validationResult.data;

    // Validate template IDs exist and are active
    if (validatedInput.selectedTemplateIds && validatedInput.selectedTemplateIds.length > 0) {
      await this.validateTemplateIds(validatedInput.selectedTemplateIds);
    }

    // Generate defaults for optional fields
    const incidentData = await this.generateIncidentDefaults(validatedInput);

    try {
      const incident = await prisma.incident.create({
        data: {
          number: incidentData.number,
          type: incidentData.type,
          severity: incidentData.severity,
          address: incidentData.address,
          startTime: incidentData.startTime,
          endTime: incidentData.endTime,
          status: incidentData.status,
          summary: incidentData.summary,
          selectedTemplateIds: validatedInput.selectedTemplateIds || [],
          units: validatedInput.unitIds
            ? { connect: validatedInput.unitIds.map((id) => ({ id })) }
            : undefined,
        },
        include: {
          units: true,
        },
      });

      return incident;
    } catch (error) {
      throw Errors.processingFailed(
        'Incident creation',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Auto-generates incident fields that are missing from the input
   * Only generates: number, startTime, status
   * Required fields (type, severity, address) must be provided by caller
   *
   * @private
   */
  private async generateIncidentDefaults(
    input: CreateIncidentInput
  ): Promise<
    Required<
      Omit<CreateIncidentInput, 'endTime' | 'summary' | 'unitIds'>
    > & {
      endTime: Date | null;
      summary: string | null;
    }
  > {
    const now = new Date();

    return {
      number: input.number || (await this.generateIncidentNumber()),
      type: input.type,
      severity: input.severity,
      address: input.address,
      startTime: input.startTime
        ? typeof input.startTime === 'string'
          ? new Date(input.startTime)
          : input.startTime
        : now,
      status: input.status || 'MONITORING', // Safer default for auto-generated incidents
      endTime: input.endTime
        ? typeof input.endTime === 'string'
          ? new Date(input.endTime)
          : input.endTime
        : null,
      summary: input.summary || null,
    };
  }

  /**
   * Generate unique incident number
   * Format: YYYY-NNNN (e.g., 2024-0001)
   * Uses yearly sequence to avoid collisions
   *
   * @private
   */
  private async generateIncidentNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    // Get count of incidents this year to generate sequence number
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const yearCount = await prisma.incident.count({
      where: {
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
    });

    const sequence = (yearCount + 1).toString().padStart(4, '0');
    return `${year}-${sequence}`;
  }

  /**
   * Retrieves an incident by ID with relationships
   *
   * @param id - Incident ID
   * @returns Incident record with units and transcripts
   * @throws {ServiceError} If incident not found or retrieval fails
   */
  async getIncidentById(id: string): Promise<Incident> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id },
        include: {
          units: true,
          transcripts: true,
        },
      });

      if (!incident) {
        throw Errors.notFound('Incident', id);
      }

      return incident;
    } catch (error) {
      // Re-throw ServiceErrors (like notFound)
      if (error instanceof Error && error.name === 'ServiceError') {
        throw error;
      }
      throw Errors.processingFailed(
        'Incident retrieval',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Retrieves an incident by number
   *
   * @param number - Incident number
   * @returns Incident record or null if not found
   * @throws {ServiceError} If retrieval fails
   */
  async getIncidentByNumber(number: string): Promise<Incident | null> {
    try {
      return await prisma.incident.findUnique({
        where: { number },
        include: {
          units: true,
          transcripts: true,
        },
      });
    } catch (error) {
      throw Errors.processingFailed(
        'Incident retrieval by number',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Checks if an incident exists by ID
   *
   * @param id - Incident ID
   * @returns True if incident exists, false otherwise
   * @throws {ServiceError} If check fails
   */
  async incidentExists(id: string): Promise<boolean> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id },
        select: { id: true }, // Only select ID to minimize data transfer
      });
      return incident !== null;
    } catch (error) {
      throw Errors.processingFailed(
        'Incident existence check',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Updates an incident's status
   *
   * @param id - Incident ID
   * @param status - New status value
   * @returns Updated incident record
   * @throws {ServiceError} If incident not found or update fails
   */
  async updateIncidentStatus(
    id: string,
    status: 'ACTIVE' | 'RESOLVED' | 'MONITORING'
  ): Promise<Incident> {
    try {
      // Verify incident exists first
      await this.getIncidentById(id);

      return await prisma.incident.update({
        where: { id },
        data: { status },
      });
    } catch (error) {
      // Re-throw ServiceErrors (like notFound)
      if (error instanceof Error && error.name === 'ServiceError') {
        throw error;
      }
      throw Errors.processingFailed(
        'Incident status update',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Retrieves all active incidents
   *
   * @returns Array of active incidents
   * @throws {ServiceError} If retrieval fails
   */
  async getActiveIncidents(): Promise<Incident[]> {
    try {
      return await prisma.incident.findMany({
        where: { status: 'ACTIVE' },
        include: {
          units: true,
          transcripts: true,
        },
        orderBy: { startTime: 'desc' },
      });
    } catch (error) {
      throw Errors.processingFailed(
        'Active incidents retrieval',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Assigns units to an incident
   *
   * @param incidentId - Incident ID
   * @param unitIds - Array of unit IDs to assign
   * @returns Updated incident with units
   * @throws {ServiceError} If incident not found or assignment fails
   */
  async assignUnitsToIncident(
    incidentId: string,
    unitIds: string[]
  ): Promise<Incident> {
    try {
      // Verify incident exists
      await this.getIncidentById(incidentId);

      return await prisma.incident.update({
        where: { id: incidentId },
        data: {
          units: {
            connect: unitIds.map((id) => ({ id })),
          },
        },
        include: {
          units: true,
        },
      });
    } catch (error) {
      // Re-throw ServiceErrors (like notFound)
      if (error instanceof Error && error.name === 'ServiceError') {
        throw error;
      }
      throw Errors.processingFailed(
        'Unit assignment',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Validates that template IDs exist and are active
   *
   * @param templateIds - Array of template IDs to validate
   * @throws {ServiceError} If any template IDs are invalid or inactive
   * @private
   */
  private async validateTemplateIds(templateIds: string[]): Promise<void> {
    if (templateIds.length === 0) return;

    const templates = await prisma.template.findMany({
      where: {
        id: { in: templateIds },
        isActive: true, // Only allow active templates
      },
      select: { id: true, name: true },
    });

    if (templates.length !== templateIds.length) {
      const foundIds = templates.map((t) => t.id);
      const missingIds = templateIds.filter((id) => !foundIds.includes(id));

      // Fetch available active templates for helpful error message
      const availableTemplates = await prisma.template.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        take: 10, // Limit to 10 for readability
      });

      let errorMessage = `Invalid or inactive template IDs: ${missingIds.join(', ')}`;

      if (availableTemplates.length > 0) {
        errorMessage += `\n\nAvailable active templates:`;
        availableTemplates.forEach((t) => {
          errorMessage += `\n  - ${t.name} (ID: ${t.id})`;
        });
      } else {
        errorMessage += `\n\nNo active templates are currently available. Please create or activate a template first.`;
      }

      throw Errors.invalidInput('selectedTemplateIds', errorMessage);
    }
  }

  /**
   * Retrieves incident with all processing status information
   * Includes transcripts and audits for status polling
   *
   * @param id - Incident ID
   * @returns Incident record with transcripts and audits
   * @throws {ServiceError} If incident not found or retrieval fails
   */
  async getIncidentWithProcessingStatus(id: string): Promise<Incident> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id },
        include: {
          units: true,
          transcripts: true,
          audits: true, // Include audits for status checks
        },
      });

      if (!incident) {
        throw Errors.notFound('Incident', id);
      }

      return incident;
    } catch (error) {
      // Re-throw ServiceErrors (like notFound)
      if (error instanceof Error && error.name === 'ServiceError') {
        throw error;
      }
      throw Errors.processingFailed(
        'Incident retrieval with processing status',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

/**
 * Singleton incident service instance
 */
export const incidentService = new IncidentService();
