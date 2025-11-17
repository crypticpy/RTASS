/**
 * IncidentService Tests
 * Fire Department Radio Transcription System
 *
 * Tests for incident creation and management service.
 */

// Mock Prisma client first
jest.mock('@/lib/db', () => ({
  prisma: {
    incident: {
      create: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { IncidentService } from '@/lib/services/incidentService';
import { prisma } from '@/lib/db';
import type { Incident } from '@prisma/client';

// Type assertion for mocked prisma
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('IncidentService', () => {
  let service: IncidentService;

  beforeEach(() => {
    service = new IncidentService();
    jest.clearAllMocks();
  });

  describe('createIncident', () => {
    it('should create incident with all required fields', async () => {
      const mockIncident: Incident = {
        id: 'test-incident-id',
        number: '2024-0001',
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: null,
        status: 'ACTIVE',
        summary: 'Test summary',
        selectedTemplateIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.incident.create.mockResolvedValue(mockIncident);

      const result = await service.createIncident({
        number: '2024-0001',
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        startTime: '2024-01-01T10:00:00Z',
        status: 'ACTIVE',
        summary: 'Test summary',
      });

      expect(result).toEqual(mockIncident);
      expect(mockedPrisma.incident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          number: '2024-0001',
          type: 'Structure Fire',
          severity: 'HIGH',
          address: '123 Main St',
        }),
        include: {
          units: true,
        },
      });
    });

    it('should auto-generate incident number if not provided', async () => {
      const now = new Date();
      const year = now.getFullYear();

      // Mock incident count for this year
      mockedPrisma.incident.count.mockResolvedValue(5);

      const mockIncident: Incident = {
        id: 'test-incident-id',
        number: `${year}-0006`,
        type: 'Medical Emergency',
        severity: 'CRITICAL',
        address: '456 Oak Ave',
        startTime: now,
        endTime: null,
        status: 'MONITORING',
        summary: null,
        selectedTemplateIds: [],
        createdAt: now,
        updatedAt: now,
      };

      mockedPrisma.incident.create.mockResolvedValue(mockIncident);

      const result = await service.createIncident({
        type: 'Medical Emergency',
        severity: 'CRITICAL',
        address: '456 Oak Ave',
      });

      expect(mockedPrisma.incident.count).toHaveBeenCalled();
      expect(result.number).toBe(`${year}-0006`);
    });

    it('should reject invalid severity values', async () => {
      await expect(
        service.createIncident({
          type: 'Structure Fire',
          severity: 'SUPER_HIGH' as any, // Invalid severity
          address: '123 Main St',
        })
      ).rejects.toThrow();
    });

    it('should require type field', async () => {
      await expect(
        service.createIncident({
          type: '', // Empty type
          severity: 'HIGH',
          address: '123 Main St',
        })
      ).rejects.toThrow();
    });

    it('should require address field', async () => {
      await expect(
        service.createIncident({
          type: 'Structure Fire',
          severity: 'HIGH',
          address: '', // Empty address
        })
      ).rejects.toThrow();
    });

    it('should support unit assignment during creation', async () => {
      const mockIncident: Incident = {
        id: 'test-incident-id',
        number: '2024-0001',
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        startTime: new Date(),
        endTime: null,
        status: 'ACTIVE',
        summary: null,
        selectedTemplateIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.incident.create.mockResolvedValue({
        ...mockIncident,
        units: [{ id: 'unit-1' }, { id: 'unit-2' }],
      });

      await service.createIncident({
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        unitIds: ['unit-1', 'unit-2'],
      });

      expect(mockedPrisma.incident.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          units: {
            connect: [{ id: 'unit-1' }, { id: 'unit-2' }],
          },
        }),
        include: { units: true },
      });
    });
  });

  describe('getIncidentById', () => {
    it('should return incident when found', async () => {
      const mockIncident: Incident = {
        id: 'test-id',
        number: '2024-0001',
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        startTime: new Date(),
        endTime: null,
        status: 'ACTIVE',
        summary: null,
        selectedTemplateIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.incident.findUnique.mockResolvedValue(mockIncident);

      const result = await service.getIncidentById('test-id');

      expect(result).toEqual(mockIncident);
      expect(mockedPrisma.incident.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: { units: true, transcripts: true },
      });
    });

    it('should throw error when incident not found', async () => {
      mockedPrisma.incident.findUnique.mockResolvedValue(null);

      await expect(
        service.getIncidentById('nonexistent-id')
      ).rejects.toThrow();
    });
  });

  describe('incidentExists', () => {
    it('should return true when incident exists', async () => {
      mockedPrisma.incident.findUnique.mockResolvedValue({ id: 'test-id' });

      const result = await service.incidentExists('test-id');

      expect(result).toBe(true);
    });

    it('should return false when incident does not exist', async () => {
      mockedPrisma.incident.findUnique.mockResolvedValue(null);

      const result = await service.incidentExists('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('updateIncidentStatus', () => {
    it('should update incident status', async () => {
      const mockIncident: Incident = {
        id: 'test-id',
        number: '2024-0001',
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        startTime: new Date(),
        endTime: null,
        status: 'RESOLVED',
        summary: null,
        selectedTemplateIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.incident.findUnique.mockResolvedValue(mockIncident);
      mockedPrisma.incident.update.mockResolvedValue(mockIncident);

      const result = await service.updateIncidentStatus('test-id', 'RESOLVED');

      expect(result.status).toBe('RESOLVED');
      expect(mockedPrisma.incident.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { status: 'RESOLVED' },
      });
    });

    it('should throw error when incident not found', async () => {
      mockedPrisma.incident.findUnique.mockResolvedValue(null);

      await expect(
        service.updateIncidentStatus('nonexistent-id', 'RESOLVED')
      ).rejects.toThrow();
    });
  });

  describe('getActiveIncidents', () => {
    it('should return only active incidents', async () => {
      const mockIncidents: Incident[] = [
        {
          id: 'incident-1',
          number: '2024-0001',
          type: 'Structure Fire',
          severity: 'HIGH',
          address: '123 Main St',
          startTime: new Date(),
          endTime: null,
          status: 'ACTIVE',
          summary: null,
          selectedTemplateIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'incident-2',
          number: '2024-0002',
          type: 'Medical Emergency',
          severity: 'CRITICAL',
          address: '456 Oak Ave',
          startTime: new Date(),
          endTime: null,
          status: 'ACTIVE',
          summary: null,
          selectedTemplateIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedPrisma.incident.findMany.mockResolvedValue(mockIncidents);

      const result = await service.getActiveIncidents();

      expect(result).toHaveLength(2);
      expect(mockedPrisma.incident.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        include: { units: true, transcripts: true },
        orderBy: { startTime: 'desc' },
      });
    });
  });

  describe('assignUnitsToIncident', () => {
    it('should assign units to incident', async () => {
      const mockIncident: Incident = {
        id: 'test-id',
        number: '2024-0001',
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        startTime: new Date(),
        endTime: null,
        status: 'ACTIVE',
        summary: null,
        selectedTemplateIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.incident.findUnique.mockResolvedValue(mockIncident);
      mockedPrisma.incident.update.mockResolvedValue({
        ...mockIncident,
        units: [{ id: 'unit-1' }, { id: 'unit-2' }],
      });

      await service.assignUnitsToIncident('test-id', ['unit-1', 'unit-2']);

      expect(mockedPrisma.incident.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          units: {
            connect: [{ id: 'unit-1' }, { id: 'unit-2' }],
          },
        },
        include: { units: true },
      });
    });
  });
});
