'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IncidentCard } from '@/components/incidents/IncidentCard';
import { Upload, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import type { Incident, IncidentStatus } from '@/types/incident';

/**
 * Incidents List Page
 *
 * Display recent incidents with search, filter, and sort capabilities.
 * Quick actions for upload and batch operations.
 */
export default function IncidentsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'ALL'>('ALL');

  // Mock incidents data
  const mockIncidents: Incident[] = [
    {
      id: '1',
      name: 'Structure Fire - 123 Main Street',
      type: 'STRUCTURE_FIRE',
      location: '123 Main Street',
      status: 'COMPLETE',
      incidentDate: new Date('2024-12-15'),
      incidentTime: '14:32',
      unitsInvolved: ['Engine 1', 'Engine 2', 'Ladder 2', 'Battalion 1'],
      audioFile: {
        filename: 'structure-fire-2024-12-15.mp3',
        url: '/audio/1.mp3',
        size: 24 * 1024 * 1024,
        duration: 2732, // 45:32
        format: 'audio/mpeg',
      },
      auditIds: ['audit-1', 'audit-2'],
      overallScore: 80,
      maydayDetected: true,
      createdAt: new Date('2024-12-15'),
      updatedAt: new Date('2024-12-15'),
    },
    {
      id: '2',
      name: 'Vehicle Accident - I-95 Northbound',
      type: 'MVA',
      location: 'I-95 Northbound Mile 45',
      status: 'COMPLETE',
      incidentDate: new Date('2024-12-14'),
      incidentTime: '08:15',
      unitsInvolved: ['Engine 3', 'Rescue 1'],
      audioFile: {
        filename: 'mva-2024-12-14.mp3',
        url: '/audio/2.mp3',
        size: 12 * 1024 * 1024,
        duration: 1200, // 20:00
        format: 'audio/mpeg',
      },
      auditIds: ['audit-3'],
      overallScore: 92,
      maydayDetected: false,
      createdAt: new Date('2024-12-14'),
      updatedAt: new Date('2024-12-14'),
    },
    {
      id: '3',
      name: 'Medical Emergency - City Park',
      type: 'MEDICAL',
      location: 'City Park, Pavilion 3',
      status: 'COMPLETE',
      incidentDate: new Date('2024-12-13'),
      incidentTime: '15:45',
      unitsInvolved: ['Engine 2', 'Ambulance 5'],
      audioFile: {
        filename: 'medical-2024-12-13.mp3',
        url: '/audio/3.mp3',
        size: 8 * 1024 * 1024,
        duration: 780, // 13:00
        format: 'audio/mpeg',
      },
      auditIds: ['audit-4'],
      overallScore: 95,
      maydayDetected: false,
      createdAt: new Date('2024-12-13'),
      updatedAt: new Date('2024-12-13'),
    },
    {
      id: '4',
      name: 'Incident - Dec 16, 2024',
      type: 'WILDFIRE',
      status: 'ANALYZING',
      audioFile: {
        filename: 'wildfire-2024-12-16.mp3',
        url: '/audio/4.mp3',
        size: 45 * 1024 * 1024,
        duration: 5400, // 1:30:00
        format: 'audio/mpeg',
      },
      auditIds: [],
      maydayDetected: false,
      createdAt: new Date('2024-12-16'),
      updatedAt: new Date('2024-12-16'),
    },
    {
      id: '5',
      name: 'Hazmat Incident - Industrial Area',
      type: 'HAZMAT',
      location: 'Industrial District',
      status: 'TRANSCRIBING',
      audioFile: {
        filename: 'hazmat-2024-12-16.mp3',
        url: '/audio/5.mp3',
        size: 28 * 1024 * 1024,
        duration: 3200, // 53:20
        format: 'audio/mpeg',
      },
      auditIds: [],
      maydayDetected: false,
      createdAt: new Date('2024-12-16'),
      updatedAt: new Date('2024-12-16'),
    },
  ];

  // Filter incidents
  const filteredIncidents = mockIncidents.filter((incident) => {
    const matchesSearch =
      searchQuery === '' ||
      incident.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.location?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || incident.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle view incident
  const handleViewIncident = (id: string) => {
    const incident = mockIncidents.find((i) => i.id === id);
    if (!incident) return;

    if (incident.status === 'COMPLETE') {
      router.push(`/incidents/${id}/report`);
    } else if (incident.status === 'TRANSCRIBING' || incident.status === 'ANALYZING') {
      router.push(`/incidents/${id}/processing`);
    } else {
      router.push(`/incidents/${id}/details`);
    }
  };

  // Handle delete incident
  const handleDeleteIncident = (id: string) => {
    // In production, this would call an API endpoint
    console.log('Delete incident:', id);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Incidents</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              View and manage radio traffic incidents and compliance reports
            </p>
          </div>
          <Link href="/incidents/upload">
            <Button variant="success" size="lg" className="w-full sm:w-auto">
              <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
              Upload New Incident
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search incidents by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as IncidentStatus | 'ALL')}
          >
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="COMPLETE">Complete</SelectItem>
              <SelectItem value="ANALYZING">Analyzing</SelectItem>
              <SelectItem value="TRANSCRIBING">Transcribing</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''} found
        </p>
        {statusFilter !== 'ALL' && (
          <Badge variant="secondary">
            Filtered by: {statusFilter}
          </Badge>
        )}
      </div>

      {/* Incidents List */}
      {filteredIncidents.length === 0 ? (
        <div className="text-center py-12">
          <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">
            {searchQuery || statusFilter !== 'ALL' ? 'No incidents found' : 'No incidents yet'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your filters or search query'
              : 'Upload your first radio traffic recording to get started'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <Link href="/incidents/upload">
              <Button variant="success">
                <Upload className="h-4 w-4 mr-2" />
                Upload New Incident
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onView={handleViewIncident}
              onDelete={handleDeleteIncident}
            />
          ))}
        </div>
      )}
    </div>
  );
}
