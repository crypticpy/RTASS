'use client';

import React, { useEffect, useState } from 'react';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { RecentIncidents, DashboardIncident } from '@/components/dashboard/RecentIncidents';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import type { DashboardStats } from '@/lib/services/dashboard';

/**
 * Dashboard Home Page
 *
 * Main landing page for the Fire Department Radio Transcription System.
 * Displays:
 * - Statistics overview (incidents, templates, transcriptions, compliance)
 * - Recent incidents list
 * - Quick action buttons
 *
 * Uses API endpoints:
 * - GET /api/dashboard/stats - For statistics overview
 * - GET /api/dashboard/incidents - For recent incidents
 */
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch stats and incidents in parallel
        const [statsResponse, incidentsResponse] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/incidents?limit=5'),
        ]);

        if (!statsResponse.ok) {
          throw new Error('Failed to load dashboard statistics');
        }

        if (!incidentsResponse.ok) {
          throw new Error('Failed to load recent incidents');
        }

        const statsData = await statsResponse.json();
        const incidentsData = await incidentsResponse.json();

        setStats(statsData);
        setIncidents(incidentsData.incidents || []);
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');

        // Set mock data for development when API fails
        setStats({
          incidents: {
            total: 0,
            active: 0,
            resolved: 0,
            withMayday: 0,
          },
          templates: {
            total: 0,
            active: 0,
            aiGenerated: 0,
          },
          transcriptions: {
            total: 0,
            averageDuration: 0,
            totalDuration: 0,
          },
          audits: {
            total: 0,
            averageScore: 0,
            passCount: 0,
            failCount: 0,
            needsImprovementCount: 0,
          },
          recentActivity: {
            lastIncidentDate: null,
            lastTranscriptionDate: null,
            lastAuditDate: null,
          },
        });
        setIncidents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Fire Department Radio Transcription & Compliance Analysis System
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="space-y-6">
          {/* Stats Skeletons */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-3" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>

          {/* Content Skeletons */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-lg border p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="rounded-lg border p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Statistics Overview */}
          {stats && (
            <StatsOverview stats={stats} className="mb-6" />
          )}

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Recent Incidents - 2 columns on large screens */}
            <div className="lg:col-span-2">
              <RecentIncidents incidents={incidents} maxItems={5} />
            </div>

            {/* Quick Actions - 1 column on large screens */}
            <div>
              <QuickActions />
            </div>
          </div>

          {/* Welcome Message for Empty State */}
          {stats && stats.incidents.total === 0 && (
            <div className="mt-8 text-center py-12 border rounded-lg bg-muted/30">
              <h2 className="text-2xl font-semibold mb-2">
                Welcome to the Radio Transcription System
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get started by uploading your first radio traffic recording or creating a compliance template.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
