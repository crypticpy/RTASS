/**
 * Incident Creation API Route Tests
 * Fire Department Radio Transcription System
 *
 * Tests for POST /api/incidents/create endpoint.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';

// Mock incident service before importing the route
const mockCreateIncident = jest.fn();
const CreateIncidentSchema = z.object({
  number: z.string().optional(),
  type: z.string().min(1, 'Incident type is required'),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  address: z.string().min(1, 'Address is required'),
  startTime: z.date().or(z.string()).optional(),
  endTime: z.date().or(z.string()).nullable().optional(),
  status: z.enum(['ACTIVE', 'RESOLVED', 'MONITORING']).optional(),
  summary: z.string().nullable().optional(),
  unitIds: z.array(z.string()).optional(),
});

jest.mock('@/lib/services/incidentService', () => ({
  incidentService: {
    createIncident: mockCreateIncident,
  },
  CreateIncidentSchema,
}));

import { POST } from '@/app/api/incidents/create/route';

describe('POST /api/incidents/create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create incident successfully with all fields', async () => {
    const mockIncident = {
      id: 'test-incident-id',
      number: '2024-0001',
      type: 'Structure Fire',
      severity: 'HIGH',
      address: '123 Main St',
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: null,
      status: 'ACTIVE',
      summary: 'Test summary',
      units: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCreateIncident.mockResolvedValue(mockIncident);

    // Expected data after JSON serialization
    const expectedData = {
      ...mockIncident,
      startTime: mockIncident.startTime.toISOString(),
      createdAt: mockIncident.createdAt.toISOString(),
      updatedAt: mockIncident.updatedAt.toISOString(),
    };

    const request = new NextRequest('http://localhost:3000/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: '2024-0001',
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        startTime: '2024-01-01T10:00:00Z',
        status: 'ACTIVE',
        summary: 'Test summary',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(expectedData);
    expect(mockCreateIncident).toHaveBeenCalledWith({
      number: '2024-0001',
      type: 'Structure Fire',
      severity: 'HIGH',
      address: '123 Main St',
      startTime: '2024-01-01T10:00:00Z',
      status: 'ACTIVE',
      summary: 'Test summary',
    });
  });

  it('should create incident with auto-generated fields', async () => {
    const mockIncident = {
      id: 'test-incident-id',
      number: '2024-0001',
      type: 'Medical Emergency',
      severity: 'CRITICAL',
      address: '456 Oak Ave',
      startTime: new Date(),
      endTime: null,
      status: 'MONITORING',
      summary: null,
      units: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCreateIncident.mockResolvedValue(
      mockIncident
    );

    const request = new NextRequest('http://localhost:3000/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Medical Emergency',
        severity: 'CRITICAL',
        address: '456 Oak Ave',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.number).toBe('2024-0001');
  });

  it('should return 400 when type is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity: 'HIGH',
        address: '123 Main St',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should return 400 when severity is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Structure Fire',
        address: '123 Main St',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should return 400 when address is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Structure Fire',
        severity: 'HIGH',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should return 400 when severity has invalid value', async () => {
    const request = new NextRequest('http://localhost:3000/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Structure Fire',
        severity: 'SUPER_HIGH',
        address: '123 Main St',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should return 400 when status has invalid value', async () => {
    const request = new NextRequest('http://localhost:3000/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        status: 'INVALID_STATUS',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });

  it('should support unit assignment during creation', async () => {
    const mockIncident = {
      id: 'test-incident-id',
      number: '2024-0001',
      type: 'Structure Fire',
      severity: 'HIGH',
      address: '123 Main St',
      startTime: new Date(),
      endTime: null,
      status: 'ACTIVE',
      summary: null,
      units: [{ id: 'unit-1' }, { id: 'unit-2' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCreateIncident.mockResolvedValue(
      mockIncident
    );

    const request = new NextRequest('http://localhost:3000/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
        unitIds: ['unit-1', 'unit-2'],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.units).toHaveLength(2);
    expect(mockCreateIncident).toHaveBeenCalledWith({
      type: 'Structure Fire',
      severity: 'HIGH',
      address: '123 Main St',
      unitIds: ['unit-1', 'unit-2'],
    });
  });

  it('should return 500 when database operation fails', async () => {
    mockCreateIncident.mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new NextRequest('http://localhost:3000/api/incidents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Structure Fire',
        severity: 'HIGH',
        address: '123 Main St',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
  });
});
