/**
 * Dashboard Service
 * Fire Department Radio Transcription System
 *
 * Provides analytics and statistics for the dashboard:
 * - Overall system statistics
 * - Recent incidents with compliance data
 * - Performance trends
 * - Usage metrics
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { Errors } from './utils/errorHandlers';

/**
 * Dashboard statistics response
 */
export interface DashboardStats {
  incidents: {
    total: number;
    active: number;
    resolved: number;
    withMayday: number;
  };
  templates: {
    total: number;
    active: number;
    aiGenerated: number;
  };
  transcriptions: {
    total: number;
    averageDuration: number;
    totalDuration: number;
  };
  audits: {
    total: number;
    averageScore: number;
    passCount: number;
    failCount: number;
    needsImprovementCount: number;
  };
  recentActivity: {
    lastIncidentDate: Date | null;
    lastTranscriptionDate: Date | null;
    lastAuditDate: Date | null;
  };
}

/**
 * Incident list item for dashboard
 */
export interface DashboardIncident {
  id: string;
  number: string;
  type: string;
  severity: string;
  address: string;
  startTime: Date;
  endTime: Date | null;
  status: string;
  hasMayday: boolean;
  transcriptCount: number;
  auditCount: number;
  averageScore: number | null;
  overallStatus: string | null;
  createdAt: Date;
}

/**
 * Dashboard Service Class
 *
 * Provides analytics and statistics for the fire department dashboard.
 *
 * @example
 * ```typescript
 * const dashboardService = new DashboardService();
 *
 * // Get overall statistics
 * const stats = await dashboardService.getStats();
 * console.log('Total incidents:', stats.incidents.total);
 *
 * // Get recent incidents
 * const incidents = await dashboardService.getRecentIncidents({ limit: 20 });
 * ```
 */
export class DashboardService {
  /**
   * Get comprehensive dashboard statistics
   *
   * Calculates overall metrics including:
   * - Incident counts and statuses
   * - Template counts and types
   * - Transcription statistics
   * - Audit scores and outcomes
   * - Recent activity timestamps
   *
   * @returns {Promise<DashboardStats>} Dashboard statistics
   * @throws {ServiceError} If database query fails
   *
   * @example
   * ```typescript
   * const stats = await dashboardService.getStats();
   * console.log(`Average compliance score: ${stats.audits.averageScore}%`);
   * ```
   */
  async getStats(): Promise<DashboardStats> {
    try {
      // Fetch all statistics in parallel for performance
      const [
        incidentStats,
        templateStats,
        transcriptStats,
        auditStats,
        recentActivity,
      ] = await Promise.all([
        this.getIncidentStats(),
        this.getTemplateStats(),
        this.getTranscriptStats(),
        this.getAuditStats(),
        this.getRecentActivity(),
      ]);

      return {
        incidents: incidentStats,
        templates: templateStats,
        transcriptions: transcriptStats,
        audits: auditStats,
        recentActivity,
      };
    } catch (error) {
      throw Errors.processingFailed(
        'Dashboard statistics',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get incident statistics
   * @private
   */
  private async getIncidentStats() {
    const [total, active, resolved, withMayday] = await Promise.all([
      prisma.incident.count(),
      prisma.incident.count({ where: { status: 'ACTIVE' } }),
      prisma.incident.count({ where: { status: 'RESOLVED' } }),
      prisma.incident.count({
        where: {
          transcripts: {
            some: {
              detections: {
                path: ['mayday'],
                not: Prisma.JsonNull,
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      active,
      resolved,
      withMayday,
    };
  }

  /**
   * Get template statistics
   * @private
   */
  private async getTemplateStats() {
    const [total, active, aiGenerated] = await Promise.all([
      prisma.template.count(),
      prisma.template.count({ where: { isActive: true } }),
      prisma.template.count({ where: { isAIGenerated: true } }),
    ]);

    return {
      total,
      active,
      aiGenerated,
    };
  }

  /**
   * Get transcript statistics
   * @private
   */
  private async getTranscriptStats() {
    const [total, durationStats] = await Promise.all([
      prisma.transcript.count(),
      prisma.transcript.aggregate({
        _avg: {
          duration: true,
        },
        _sum: {
          duration: true,
        },
      }),
    ]);

    return {
      total,
      averageDuration: Math.round(durationStats._avg.duration || 0),
      totalDuration: durationStats._sum.duration || 0,
    };
  }

  /**
   * Get audit statistics
   * @private
   */
  private async getAuditStats() {
    const [total, averageScoreData, passCount, failCount, needsImprovementCount] =
      await Promise.all([
        prisma.audit.count(),
        prisma.audit.aggregate({
          _avg: {
            overallScore: true,
          },
        }),
        prisma.audit.count({ where: { overallStatus: 'PASS' } }),
        prisma.audit.count({ where: { overallStatus: 'FAIL' } }),
        prisma.audit.count({ where: { overallStatus: 'NEEDS_IMPROVEMENT' } }),
      ]);

    return {
      total,
      averageScore: averageScoreData._avg.overallScore
        ? Math.round(averageScoreData._avg.overallScore * 100) / 100
        : 0,
      passCount,
      failCount,
      needsImprovementCount,
    };
  }

  /**
   * Get recent activity timestamps
   * @private
   */
  private async getRecentActivity() {
    const [lastIncident, lastTranscript, lastAudit] = await Promise.all([
      prisma.incident.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.transcript.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      prisma.audit.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      lastIncidentDate: lastIncident?.createdAt || null,
      lastTranscriptionDate: lastTranscript?.createdAt || null,
      lastAuditDate: lastAudit?.createdAt || null,
    };
  }

  /**
   * Get recent incidents with compliance data
   *
   * Retrieves a list of recent incidents with:
   * - Basic incident information
   * - Mayday detection status
   * - Transcript and audit counts
   * - Average compliance score
   *
   * @param {object} options - Query options
   * @param {number} options.limit - Maximum number of incidents (default: 30)
   * @param {number} options.offset - Pagination offset (default: 0)
   * @param {Date} options.startDate - Filter incidents after this date
   * @param {Date} options.endDate - Filter incidents before this date
   * @param {string} options.status - Filter by incident status
   * @param {string} options.severity - Filter by severity
   * @returns {Promise<DashboardIncident[]>} List of incidents
   * @throws {ServiceError} If database query fails
   *
   * @example
   * ```typescript
   * const incidents = await dashboardService.getRecentIncidents({
   *   limit: 20,
   *   status: 'RESOLVED'
   * });
   * ```
   */
  async getRecentIncidents(options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    severity?: string;
  } = {}): Promise<DashboardIncident[]> {
    const {
      limit = 30,
      offset = 0,
      startDate,
      endDate,
      status,
      severity,
    } = options;

    try {
      // Build where clause
      const where: any = {};

      if (startDate || endDate) {
        where.startTime = {};
        if (startDate) where.startTime.gte = startDate;
        if (endDate) where.startTime.lte = endDate;
      }

      if (status) {
        where.status = status;
      }

      if (severity) {
        where.severity = severity;
      }

      // Fetch incidents with related data
      const incidents = await prisma.incident.findMany({
        where,
        include: {
          transcripts: {
            select: {
              id: true,
              detections: true,
            },
          },
          audits: {
            select: {
              id: true,
              overallScore: true,
              overallStatus: true,
            },
          },
        },
        orderBy: {
          startTime: 'desc',
        },
        take: limit,
        skip: offset,
      });

      // Format incidents for dashboard
      return incidents.map((incident) => {
        // Check for mayday in any transcript
        const hasMayday = incident.transcripts.some((transcript) => {
          const detections = transcript.detections as any;
          return detections?.mayday && detections.mayday.length > 0;
        });

        // Calculate average audit score
        let averageScore: number | null = null;
        let overallStatus: string | null = null;

        if (incident.audits.length > 0) {
          const totalScore = incident.audits.reduce(
            (sum, audit) => sum + (audit.overallScore || 0),
            0
          );
          averageScore =
            Math.round((totalScore / incident.audits.length) * 100) / 100;

          // Determine overall status (worst case)
          if (incident.audits.some((a) => a.overallStatus === 'FAIL')) {
            overallStatus = 'FAIL';
          } else if (
            incident.audits.some((a) => a.overallStatus === 'NEEDS_IMPROVEMENT')
          ) {
            overallStatus = 'NEEDS_IMPROVEMENT';
          } else {
            overallStatus = 'PASS';
          }
        }

        return {
          id: incident.id,
          number: incident.number,
          type: incident.type,
          severity: incident.severity,
          address: incident.address,
          startTime: incident.startTime,
          endTime: incident.endTime,
          status: incident.status,
          hasMayday,
          transcriptCount: incident.transcripts.length,
          auditCount: incident.audits.length,
          averageScore,
          overallStatus,
          createdAt: incident.createdAt,
        };
      });
    } catch (error) {
      throw Errors.processingFailed(
        'Recent incidents retrieval',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get performance trends over time
   *
   * Calculates compliance score trends by day, week, or month.
   *
   * @param {object} options - Trend options
   * @param {'day' | 'week' | 'month'} options.period - Time period granularity
   * @param {number} options.limit - Number of periods to return (default: 30)
   * @returns {Promise<Array>} Trend data points
   *
   * @example
   * ```typescript
   * const trends = await dashboardService.getTrends({ period: 'week', limit: 12 });
   * ```
   */
  async getTrends(options: {
    period?: 'day' | 'week' | 'month';
    limit?: number;
  } = {}): Promise<
    Array<{
      period: string;
      averageScore: number;
      auditCount: number;
      passRate: number;
    }>
  > {
    const { period = 'day', limit = 30 } = options;

    try {
      // This is a simplified version
      // In production, you'd use more sophisticated date grouping
      const audits = await prisma.audit.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        select: {
          overallScore: true,
          overallStatus: true,
          createdAt: true,
        },
      });

      // Group by period (simplified - groups all into one period for now)
      if (audits.length === 0) {
        return [];
      }

      const totalScore = audits.reduce(
        (sum, audit) => sum + (audit.overallScore || 0),
        0
      );
      const averageScore = totalScore / audits.length;
      const passCount = audits.filter((a) => a.overallStatus === 'PASS').length;
      const passRate = passCount / audits.length;

      return [
        {
          period: 'current',
          averageScore: Math.round(averageScore * 100) / 100,
          auditCount: audits.length,
          passRate: Math.round(passRate * 100) / 100,
        },
      ];
    } catch (error) {
      throw Errors.processingFailed(
        'Trends calculation',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

/**
 * Singleton dashboard service instance
 */
export const dashboardService = new DashboardService();
