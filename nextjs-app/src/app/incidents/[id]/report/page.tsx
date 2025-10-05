"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ReportHeader } from "@/components/incidents/ReportHeader"
import { StatsCards } from "@/components/incidents/StatsCards"
import { FindingsList } from "@/components/incidents/FindingsList"
import { TranscriptViewer } from "@/components/incidents/TranscriptViewer"
import { ComplianceScore } from "@/components/ui/compliance-score"
import { EmergencyTimeline } from "@/components/ui/emergency-timeline"
import { cn } from "@/lib/utils"
import type {
  IncidentReport,
  EmergencyEvent,
} from "@/types/incident"
import { toast } from "sonner"

/**
 * Incident Report Page
 *
 * Main report viewing interface with three tabs:
 * - Overview: Narrative, compliance scores, findings, strengths
 * - Timeline: Chronological events from keyword detection and compliance audit
 * - Transcript: Full transcript with search and annotations
 */
export default function IncidentReportPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const incidentId = params.id as string
  const activeTab = searchParams.get('tab') || 'overview'

  // Set active tab (updates URL)
  const setActiveTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('tab', tab)
    router.push(`?${newParams.toString()}`)
  }

  // Mock data - comprehensive incident report
  const mockIncidentReport: IncidentReport = {
    incident: {
      id: incidentId,
      name: 'Structure Fire - 123 Main Street',
      description: 'Multi-story residential structure fire with rescue operations',
      type: 'STRUCTURE_FIRE',
      location: '123 Main Street, Downtown',
      incidentDate: new Date('2024-12-15T14:32:00'),
      incidentTime: '14:32',
      unitsInvolved: ['Engine 1', 'Engine 2', 'Ladder 2', 'Battalion 1', 'Rescue 1'],
      notes: 'Second alarm fire with mayday situation',
      status: 'COMPLETE',
      audioFile: {
        filename: 'incident-123-main-st.mp3',
        url: '/uploads/audio/incident-123-main-st.mp3',
        size: 45678900,
        duration: 2732,
        format: 'audio/mpeg',
      },
      processingStartedAt: new Date('2024-12-15T14:35:00'),
      processingCompletedAt: new Date('2024-12-15T14:45:00'),
      transcriptId: 'trans-001',
      auditIds: ['audit-001', 'audit-002'],
      overallScore: 80,
      maydayDetected: true,
      createdAt: new Date('2024-12-15T14:30:00'),
      updatedAt: new Date('2024-12-15T14:45:00'),
    },
    overallScore: 80,
    overallStatus: 'NEEDS_IMPROVEMENT',
    stats: {
      criticalIssues: 2,
      warnings: 5,
      strengths: 8,
      totalCriteria: 15,
    },
    narrative: `Overall performance during this structure fire response demonstrated solid fireground operations with notable areas for improvement. The initial size-up and radio report were thorough and well-communicated, establishing strong incident command from the outset.

However, a critical mayday situation occurred at 14:32 when a firefighter from Engine 2 became trapped on the second floor due to partial collapse. While the mayday was transmitted immediately, it did not follow complete LUNAR (Location, Unit, Name, Assignment, Resources needed) protocol, which delayed rescue coordination by approximately 90 seconds. This represents a significant training gap that requires immediate attention.

Personnel accountability was excellent throughout the incident, with PARs completed in 2:15 - well ahead of the 3:00 standard. Resource management and tactical decisions were sound, and the evacuation order was clear and decisive when structural integrity became compromised. The incident concluded with all personnel accounted for and the fire successfully extinguished with no serious injuries.

**Recommendations**: Reinforce LUNAR format training for all personnel, particularly under high-stress emergency conditions. Consider additional drills focused on mayday communications and rapid intervention team deployment.`,
    compliance: {
      overallScore: 80,
      overallStatus: 'NEEDS_IMPROVEMENT',
      totalCitations: 12,
      categories: [
        {
          id: 'radio-report',
          name: 'Initial Radio Report',
          score: 92,
          status: 'PASS',
          weight: 0.25,
          criteriaCount: 4,
          passCount: 4,
        },
        {
          id: 'mayday-procedures',
          name: 'Mayday Procedures',
          score: 65,
          status: 'NEEDS_IMPROVEMENT',
          weight: 0.30,
          criteriaCount: 3,
          passCount: 2,
        },
        {
          id: 'resource-management',
          name: 'Resource Management',
          score: 88,
          status: 'PASS',
          weight: 0.20,
          criteriaCount: 5,
          passCount: 5,
        },
        {
          id: 'evacuation-protocol',
          name: 'Evacuation Protocol',
          score: 85,
          status: 'PASS',
          weight: 0.15,
          criteriaCount: 2,
          passCount: 2,
        },
        {
          id: 'communications',
          name: 'Radio Communications',
          score: 78,
          status: 'NEEDS_IMPROVEMENT',
          weight: 0.10,
          criteriaCount: 1,
          passCount: 0,
        },
      ],
    },
    criticalFindings: [
      {
        id: 'finding-001',
        severity: 'CRITICAL',
        category: 'Mayday Procedures',
        criterion: 'Mayday transmitted using proper LUNAR format',
        timestamp: 872,
        evidence: 'MAYDAY MAYDAY MAYDAY! Engine 2, firefighter down on second floor, need immediate assistance!',
        reasoning: 'While mayday was transmitted with appropriate urgency and repetition, it did not include complete LUNAR information. Specifically missing: firefighter Name, specific Assignment, and specific Resources needed beyond "immediate assistance".',
        impact: 'Incomplete LUNAR information delayed rescue coordination by approximately 90 seconds as incident command had to request additional details. In a life-threatening situation, this delay could have serious consequences.',
        recommendation: 'Conduct mandatory LUNAR format refresher training for all personnel within 30 days. Implement monthly high-stress mayday simulation drills to reinforce proper protocol under pressure.',
      },
      {
        id: 'finding-002',
        severity: 'HIGH',
        category: 'Radio Communications',
        criterion: 'Clear and concise radio transmissions without excessive chatter',
        timestamp: 1456,
        evidence: 'Multiple overlapping transmissions during evacuation order, including non-urgent status updates',
        reasoning: 'During the evacuation order at 24:16, several units transmitted simultaneously, creating radio congestion. Two units provided non-urgent equipment status updates while evacuation was in progress.',
        impact: 'Radio congestion during critical evacuation order could have prevented emergency traffic from being heard. All units must maintain radio discipline during high-priority communications.',
        recommendation: 'Review radio discipline protocols with all personnel. Emphasize priority of emergency traffic and the importance of monitoring radio before transmitting during critical incidents.',
      },
    ],
    strengths: [
      {
        id: 'strength-001',
        category: 'Resource Management',
        criterion: 'Personnel Accountability Report (PAR) completed timely',
        timestamp: 1007,
        evidence: 'All units, this is Command. PAR complete. Battalion 1, all personnel accounted for. Engine 1, Engine 2, Ladder 2, Rescue 1 all report PAR complete.',
        note: 'PAR completed in 2:15, exceeding department standard of 3:00. Excellent accountability during high-stress mayday situation demonstrates strong crew discipline and incident command coordination.',
      },
      {
        id: 'strength-002',
        category: 'Initial Radio Report',
        criterion: 'Size-up includes building construction and occupancy',
        timestamp: 145,
        evidence: 'Engine 1 on scene, two-story wood frame residential structure, heavy smoke showing from second floor windows, possible occupants inside, establishing Main Street command.',
        note: 'Comprehensive initial size-up provided critical information for incoming units. Building construction type, fire location, and potential victims identified immediately.',
      },
      {
        id: 'strength-003',
        category: 'Evacuation Protocol',
        criterion: 'Evacuation order clearly transmitted with confirmation',
        timestamp: 1850,
        evidence: 'All units evacuate the building immediately, structural collapse imminent. All units acknowledge. [All units confirmed]',
        note: 'Clear, authoritative evacuation order with mandatory acknowledgment from all units. Excellent command presence during critical safety decision.',
      },
      {
        id: 'strength-004',
        category: 'Resource Management',
        criterion: 'Appropriate mutual aid resources requested',
        timestamp: 420,
        evidence: 'Dispatch, Engine 1. Requesting second alarm, need additional engine company and EMS.',
        note: 'Timely recognition of need for additional resources. Second alarm called early in incident, ensuring adequate personnel for fire attack and rescue operations.',
      },
      {
        id: 'strength-005',
        category: 'Mayday Procedures',
        criterion: 'RIT team activated immediately upon mayday',
        timestamp: 880,
        evidence: 'Rescue 1 acknowledged, RIT team deploying to second floor for firefighter rescue.',
        note: 'Rapid Intervention Team activated within 8 seconds of mayday transmission. Excellent response time demonstrates preparedness and training.',
      },
      {
        id: 'strength-006',
        category: 'Resource Management',
        criterion: 'Water supply established and maintained',
        timestamp: 180,
        evidence: 'Engine 2, water supply established from hydrant at corner of Main and Oak.',
        note: 'Water supply secured quickly and communicated to command. Foundation of effective fire attack operations.',
      },
      {
        id: 'strength-007',
        category: 'Initial Radio Report',
        criterion: 'Command established with clear designation',
        timestamp: 152,
        evidence: 'Engine 1 establishing Main Street command.',
        note: 'Incident command established immediately upon arrival with clear geographic designation. Sets foundation for effective incident management.',
      },
      {
        id: 'strength-008',
        category: 'Evacuation Protocol',
        criterion: 'All-clear signal given after verification',
        timestamp: 2650,
        evidence: 'All units, this is Command. Building has been searched, all clear, fire is under control.',
        note: 'Proper all-clear communication after thorough primary and secondary searches completed. Safety-first approach maintained throughout incident.',
      },
    ],
    timeline: [
      {
        id: 'event-001',
        timestamp: 0,
        type: 'info',
        severity: 'low',
        confidence: 1.0,
        text: 'Incident dispatched',
        context: 'Engine 1, Engine 2, Ladder 2 dispatched to structure fire at 123 Main Street',
        source: 'KEYWORD_DETECTION',
      },
      {
        id: 'event-002',
        timestamp: 145,
        type: 'info',
        severity: 'medium',
        confidence: 0.99,
        text: 'On scene size-up and incident command established',
        context: 'Engine 1 provides comprehensive size-up and establishes command',
        source: 'KEYWORD_DETECTION',
      },
      {
        id: 'event-003',
        timestamp: 145,
        type: 'compliance',
        severity: 'low',
        confidence: 0.95,
        text: 'Strength: Excellent initial size-up',
        context: 'Size-up includes building construction and occupancy',
        source: 'COMPLIANCE_AUDIT',
        criterionId: 'strength-002',
      },
      {
        id: 'event-004',
        timestamp: 420,
        type: 'info',
        severity: 'medium',
        confidence: 0.98,
        text: 'Second alarm requested',
        context: 'Additional resources called for escalating fire conditions',
        source: 'KEYWORD_DETECTION',
      },
      {
        id: 'event-005',
        timestamp: 872,
        type: 'mayday',
        severity: 'critical',
        confidence: 0.98,
        text: 'MAYDAY - Firefighter down on second floor',
        context: 'Engine 2 reporting firefighter trapped due to partial collapse',
        source: 'KEYWORD_DETECTION',
      },
      {
        id: 'event-006',
        timestamp: 872,
        type: 'violation',
        severity: 'critical',
        confidence: 0.95,
        text: 'Mayday protocol violation - Incomplete LUNAR format',
        context: 'Mayday transmitted without complete Location, Unit, Name, Assignment, Resources',
        source: 'COMPLIANCE_AUDIT',
        criterionId: 'finding-001',
      },
      {
        id: 'event-007',
        timestamp: 880,
        type: 'emergency',
        severity: 'critical',
        confidence: 0.99,
        text: 'RIT team activated for firefighter rescue',
        context: 'Rescue 1 deploying rapid intervention team',
        source: 'KEYWORD_DETECTION',
      },
      {
        id: 'event-008',
        timestamp: 880,
        type: 'compliance',
        severity: 'low',
        confidence: 0.97,
        text: 'Strength: Rapid RIT activation',
        context: 'RIT team deployed within 8 seconds of mayday',
        source: 'COMPLIANCE_AUDIT',
        criterionId: 'strength-005',
      },
      {
        id: 'event-009',
        timestamp: 1007,
        type: 'info',
        severity: 'low',
        confidence: 0.99,
        text: 'Personnel Accountability Report (PAR) complete',
        context: 'All units accounted for in 2:15',
        source: 'KEYWORD_DETECTION',
      },
      {
        id: 'event-010',
        timestamp: 1007,
        type: 'compliance',
        severity: 'low',
        confidence: 0.98,
        text: 'Strength: Exceptional PAR completion time',
        context: 'PAR completed in 2:15, exceeding 3:00 standard',
        source: 'COMPLIANCE_AUDIT',
        criterionId: 'strength-001',
      },
      {
        id: 'event-011',
        timestamp: 1456,
        type: 'violation',
        severity: 'high',
        confidence: 0.92,
        text: 'Radio discipline violation during evacuation',
        context: 'Multiple overlapping transmissions and non-urgent traffic',
        source: 'COMPLIANCE_AUDIT',
        criterionId: 'finding-002',
      },
      {
        id: 'event-012',
        timestamp: 1850,
        type: 'evacuation',
        severity: 'critical',
        confidence: 0.99,
        text: 'Evacuation order - structural collapse imminent',
        context: 'All units ordered to evacuate building immediately',
        source: 'KEYWORD_DETECTION',
      },
      {
        id: 'event-013',
        timestamp: 1850,
        type: 'compliance',
        severity: 'low',
        confidence: 0.96,
        text: 'Strength: Clear evacuation order with confirmation',
        context: 'Authoritative command with mandatory acknowledgment',
        source: 'COMPLIANCE_AUDIT',
        criterionId: 'strength-003',
      },
      {
        id: 'event-014',
        timestamp: 2650,
        type: 'all_clear',
        severity: 'low',
        confidence: 0.99,
        text: 'All clear - building searched, fire under control',
        context: 'Primary and secondary searches complete, no victims found',
        source: 'KEYWORD_DETECTION',
      },
      {
        id: 'event-015',
        timestamp: 2650,
        type: 'compliance',
        severity: 'low',
        confidence: 0.97,
        text: 'Strength: Proper all-clear protocol',
        context: 'All-clear given after thorough verification',
        source: 'COMPLIANCE_AUDIT',
        criterionId: 'strength-008',
      },
    ],
    transcript: {
      segments: [
        {
          id: 'seg-001',
          startTime: 0,
          endTime: 8,
          text: 'Dispatch to Engine 1, Engine 2, Ladder 2. Structure fire reported at 123 Main Street. Reports of heavy smoke, possible occupants.',
          speaker: 'Dispatch',
          confidence: 0.98,
        },
        {
          id: 'seg-002',
          startTime: 10,
          endTime: 18,
          text: 'Engine 1 responding. ETA three minutes.',
          speaker: 'Engine 1',
          confidence: 0.99,
        },
        {
          id: 'seg-003',
          startTime: 20,
          endTime: 28,
          text: 'Engine 2 responding. ETA four minutes.',
          speaker: 'Engine 2',
          confidence: 0.99,
        },
        {
          id: 'seg-004',
          startTime: 145,
          endTime: 165,
          text: 'Engine 1 on scene. Two-story wood frame residential structure, heavy smoke showing from second floor windows. Possible occupants inside. Engine 1 establishing Main Street command.',
          speaker: 'Engine 1',
          confidence: 0.97,
        },
        {
          id: 'seg-005',
          startTime: 168,
          endTime: 178,
          text: 'Copy Engine 1, you have Main Street command. Ladder 2 ETA one minute.',
          speaker: 'Dispatch',
          confidence: 0.98,
        },
        {
          id: 'seg-006',
          startTime: 180,
          endTime: 192,
          text: 'Engine 2 on scene. Laying supply line from hydrant at Main and Oak. Preparing for interior attack.',
          speaker: 'Engine 2',
          confidence: 0.96,
        },
        {
          id: 'seg-007',
          startTime: 195,
          endTime: 208,
          text: 'Command to Engine 2, acknowledged. Ladder 2, upon arrival, conduct primary search second floor.',
          speaker: 'Engine 1',
          confidence: 0.97,
        },
        {
          id: 'seg-008',
          startTime: 420,
          endTime: 435,
          text: 'Dispatch, this is Engine 1. Fire extending to attic space. Requesting second alarm. Need additional engine company and EMS to staging.',
          speaker: 'Engine 1',
          confidence: 0.98,
        },
        {
          id: 'seg-009',
          startTime: 438,
          endTime: 448,
          text: 'Copy Engine 1, second alarm transmitted. Rescue 1, Engine 3, Medic 5 responding.',
          speaker: 'Dispatch',
          confidence: 0.99,
        },
        {
          id: 'seg-010',
          startTime: 872,
          endTime: 882,
          text: 'MAYDAY MAYDAY MAYDAY! Engine 2, firefighter down on second floor, partial collapse, need immediate assistance!',
          speaker: 'Engine 2',
          confidence: 0.99,
        },
        {
          id: 'seg-011',
          startTime: 880,
          endTime: 890,
          text: 'Rescue 1 acknowledged. RIT team deploying to second floor for firefighter rescue. All other units maintain positions.',
          speaker: 'Rescue 1',
          confidence: 0.98,
        },
        {
          id: 'seg-012',
          startTime: 892,
          endTime: 905,
          text: 'Engine 2, Command. What is the firefighter\'s name and exact location? How many resources do you need?',
          speaker: 'Engine 1',
          confidence: 0.97,
        },
        {
          id: 'seg-013',
          startTime: 907,
          endTime: 920,
          text: 'Command, Engine 2. Firefighter Jones, northeast bedroom second floor. Trapped by debris. Need saw and additional manpower.',
          speaker: 'Engine 2',
          confidence: 0.96,
        },
        {
          id: 'seg-014',
          startTime: 1007,
          endTime: 1025,
          text: 'All units, this is Command. PAR complete. Battalion 1, all personnel accounted for. Engine 1, Engine 2, Ladder 2, Rescue 1 all report PAR complete. Continue operations.',
          speaker: 'Engine 1',
          confidence: 0.99,
        },
        {
          id: 'seg-015',
          startTime: 1105,
          endTime: 1118,
          text: 'Rescue 1 to Command. Firefighter Jones rescued, being brought to ground level. Minor injuries, alert and oriented.',
          speaker: 'Rescue 1',
          confidence: 0.98,
        },
        {
          id: 'seg-016',
          startTime: 1456,
          endTime: 1465,
          text: 'Engine 3 to Command, we have water supply issues... [overlapping] Ladder 2, need more hose on second floor.',
          speaker: 'Multiple',
          confidence: 0.89,
        },
        {
          id: 'seg-017',
          startTime: 1850,
          endTime: 1865,
          text: 'All units, evacuate the building immediately. Structural collapse imminent. All units acknowledge. Engine 1 acknowledged. Engine 2 acknowledged. Ladder 2 acknowledged. Rescue 1 acknowledged.',
          speaker: 'Engine 1',
          confidence: 0.99,
        },
        {
          id: 'seg-018',
          startTime: 1920,
          endTime: 1935,
          text: 'Command to all units. Everyone accounted for. Defensive operations only. Protect exposures.',
          speaker: 'Engine 1',
          confidence: 0.98,
        },
        {
          id: 'seg-019',
          startTime: 2650,
          endTime: 2668,
          text: 'All units, this is Command. Building has been searched, all clear. Fire is under control. Beginning overhaul operations.',
          speaker: 'Engine 1',
          confidence: 0.99,
        },
        {
          id: 'seg-020',
          startTime: 2670,
          endTime: 2680,
          text: 'Copy Command. Excellent work everyone. Dispatch, all units available.',
          speaker: 'Battalion 1',
          confidence: 0.98,
        },
      ],
      emergencyKeywords: {
        mayday: { count: 1, timestamps: [872] },
        evacuation: { count: 1, timestamps: [1850] },
        'all clear': { count: 1, timestamps: [2650] },
      },
      duration: 2732,
      wordCount: 1547,
      language: 'English',
    },
  };

  // Handle export PDF
  const handleExportPDF = async () => {
    // Mock implementation - simulates PDF generation
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // In production, this would call /api/incidents/[id]/export-pdf
        const link = document.createElement('a');
        link.href = '#'; // Mock URL
        const date = mockIncidentReport.incident.incidentDate
          ? mockIncidentReport.incident.incidentDate.toISOString().split('T')[0]
          : 'report';
        link.download = `Incident-Report-${mockIncidentReport.incident.name.replace(/[^a-z0-9]/gi, '-')}-${date}.pdf`;
        // Don't actually trigger download for mock
        resolve();
      }, 2000);
    });
  };

  // Handle timestamp click - jump to relevant tab
  const handleTimestampClick = (timestamp: number) => {
    // Jump to transcript tab and scroll to timestamp
    setActiveTab('transcript');
    toast.info(`Jumping to ${formatTimestamp(timestamp)}`);
  };

  // Format timestamp
  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert timeline events to EmergencyEvent format for EmergencyTimeline component
  const emergencyTimelineEvents: EmergencyEvent[] = mockIncidentReport.timeline
    .filter(event => ['mayday', 'emergency', 'evacuation', 'all_clear', 'info'].includes(event.type))
    .map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type as 'mayday' | 'emergency' | 'evacuation' | 'all_clear' | 'info',
      confidence: event.confidence,
      severity: event.severity,
      text: event.text,
      context: event.context,
    }));

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Report Header */}
      <ReportHeader
        incidentId={incidentId}
        incidentName={mockIncidentReport.incident.name}
        incidentDate={mockIncidentReport.incident.incidentDate}
        overallScore={mockIncidentReport.overallScore}
        overallStatus={mockIncidentReport.overallStatus}
        onBack={() => router.push('/incidents')}
        onExportPDF={handleExportPDF}
      />

      {/* Stats Cards */}
      <StatsCards
        stats={mockIncidentReport.stats}
        overallScore={mockIncidentReport.overallScore}
      />

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Narrative Summary */}
          {mockIncidentReport.narrative && (
            <Card>
              <CardHeader>
                <CardTitle>Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {mockIncidentReport.narrative.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-sm leading-relaxed mb-4 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Compliance Score Breakdown */}
          <ComplianceScore
            overallScore={mockIncidentReport.compliance.overallScore}
            overallStatus={mockIncidentReport.compliance.overallStatus}
            totalCitations={mockIncidentReport.compliance.totalCitations}
            categories={mockIncidentReport.compliance.categories}
            variant="detailed"
            showCategories={true}
          />

          <Separator />

          {/* Critical Findings */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Critical Findings</h2>
            <FindingsList
              findings={mockIncidentReport.criticalFindings}
              variant="critical"
              onTimestampClick={handleTimestampClick}
            />
          </div>

          <Separator />

          {/* Strengths & Commendations */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Strengths & Commendations</h2>
            <FindingsList
              findings={mockIncidentReport.strengths}
              variant="strengths"
              onTimestampClick={handleTimestampClick}
            />
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-6">
          <EmergencyTimeline
            events={emergencyTimelineEvents}
            maxHeight={700}
            showConfidence={true}
            variant="detailed"
          />

          {/* All Events Timeline (includes violations and compliance) */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Complete Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockIncidentReport.timeline.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "p-4 rounded-lg border-l-4",
                      event.severity === 'critical' && "border-red-500 bg-red-50/50 dark:bg-red-950/20",
                      event.severity === 'high' && "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
                      event.severity === 'medium' && "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
                      event.severity === 'low' && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono font-medium text-muted-foreground">
                            {formatTimestamp(event.timestamp)}
                          </span>
                          <span className="text-xs uppercase font-semibold">
                            {event.type.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(event.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{event.text}</p>
                        {event.context && (
                          <p className="text-xs text-muted-foreground italic">
                            {event.context}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="mt-6">
          <TranscriptViewer
            segments={mockIncidentReport.transcript.segments}
            emergencyKeywords={mockIncidentReport.transcript.emergencyKeywords}
            violations={mockIncidentReport.criticalFindings}
            strengths={mockIncidentReport.strengths}
            duration={mockIncidentReport.transcript.duration}
            wordCount={mockIncidentReport.transcript.wordCount}
            onTimestampClick={handleTimestampClick}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
