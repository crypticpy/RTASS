import type { Meta, StoryObj } from '@storybook/react'
import { EmergencyTimeline, type EmergencyEvent } from './emergency-timeline'

const meta = {
  title: 'Emergency/EmergencyTimeline',
  component: EmergencyTimeline,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    maxHeight: {
      control: { type: 'range', min: 200, max: 800, step: 50 },
    },
    showConfidence: {
      control: 'boolean',
    },
    variant: {
      control: 'select',
      options: ['compact', 'detailed'],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '700px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmergencyTimeline>

export default meta
type Story = StoryObj<typeof meta>

// Sample event data
const sampleMaydayEvents: EmergencyEvent[] = [
  {
    id: '1',
    timestamp: 45,
    type: 'mayday',
    confidence: 0.98,
    severity: 'critical',
    text: 'Mayday mayday mayday, firefighter down on second floor rear',
    context: 'Engine 2 reporting emergency situation with 2 firefighters trapped',
  },
  {
    id: '2',
    timestamp: 83,
    type: 'emergency',
    confidence: 0.87,
    severity: 'high',
    text: 'Emergency traffic, partial roof collapse in sector charlie',
    context: 'Ladder 2 requesting immediate evacuation of all personnel',
  },
  {
    id: '3',
    timestamp: 135,
    type: 'evacuation',
    confidence: 0.92,
    severity: 'critical',
    text: 'All units evacuate the structure immediately, evacuate evacuate',
    context: 'Incident command ordering full evacuation due to structural instability',
  },
  {
    id: '4',
    timestamp: 195,
    type: 'all_clear',
    confidence: 0.95,
    severity: 'medium',
    text: 'All units accounted for, PAR complete, all clear',
    context: 'Safety officer confirming all personnel are accounted for',
  },
]

const multipleMaydays: EmergencyEvent[] = [
  {
    id: '1',
    timestamp: 28,
    type: 'mayday',
    confidence: 0.96,
    severity: 'critical',
    text: 'Mayday mayday, Engine 3 we have a firefighter missing on the second floor',
  },
  {
    id: '2',
    timestamp: 52,
    type: 'mayday',
    confidence: 0.94,
    severity: 'critical',
    text: 'Mayday mayday mayday, Engine 3 still missing one firefighter, last known location bedroom two',
    context: 'Engine 3 officer reporting missing crew member during search',
  },
  {
    id: '3',
    timestamp: 89,
    type: 'emergency',
    confidence: 0.89,
    severity: 'high',
    text: 'RIT team deploying to second floor for firefighter rescue',
    context: 'Rapid Intervention Team responding to mayday call',
  },
  {
    id: '4',
    timestamp: 142,
    type: 'info',
    confidence: 0.78,
    severity: 'medium',
    text: 'RIT has located missing firefighter, preparing for extraction',
  },
  {
    id: '5',
    timestamp: 198,
    type: 'all_clear',
    confidence: 0.91,
    severity: 'low',
    text: 'Firefighter rescued and out of the building, all personnel accounted for',
    context: 'Incident command confirming successful rescue operation',
  },
]

const routineIncident: EmergencyEvent[] = [
  {
    id: '1',
    timestamp: 15,
    type: 'info',
    confidence: 0.72,
    severity: 'low',
    text: 'Engine 1 on scene, light smoke showing from alpha side',
  },
  {
    id: '2',
    timestamp: 45,
    type: 'info',
    confidence: 0.68,
    severity: 'low',
    text: 'Fire knocked down, checking for extension',
  },
  {
    id: '3',
    timestamp: 98,
    type: 'all_clear',
    confidence: 0.85,
    severity: 'low',
    text: 'Fire under control, all clear for overhaul operations',
  },
]

const escalatingIncident: EmergencyEvent[] = [
  {
    id: '1',
    timestamp: 22,
    type: 'info',
    confidence: 0.75,
    severity: 'low',
    text: 'Smoke investigation, checking all floors',
  },
  {
    id: '2',
    timestamp: 67,
    type: 'emergency',
    confidence: 0.82,
    severity: 'medium',
    text: 'We have fire in the walls, requesting additional units',
    context: 'Engine 1 reporting extension beyond initial fire area',
  },
  {
    id: '3',
    timestamp: 123,
    type: 'emergency',
    confidence: 0.88,
    severity: 'high',
    text: 'Fire through the roof, transitioning to defensive operations',
    context: 'Incident command changing strategy due to fire spread',
  },
  {
    id: '4',
    timestamp: 156,
    type: 'evacuation',
    confidence: 0.93,
    severity: 'critical',
    text: 'All personnel exit the structure, accountability report requested',
  },
  {
    id: '5',
    timestamp: 189,
    type: 'info',
    confidence: 0.79,
    severity: 'medium',
    text: 'All units operating from the exterior, master streams in service',
  },
  {
    id: '6',
    timestamp: 245,
    type: 'all_clear',
    confidence: 0.87,
    severity: 'low',
    text: 'Fire knocked down, all personnel accounted for',
  },
]

/**
 * Default state with multiple emergency events
 */
export const Default: Story = {
  args: {
    events: sampleMaydayEvents,
    maxHeight: 500,
    showConfidence: true,
    variant: 'detailed',
  },
}

/**
 * Multiple mayday calls during incident
 */
export const MultipleMaydays: Story = {
  args: {
    events: multipleMaydays,
    maxHeight: 600,
    showConfidence: true,
    variant: 'detailed',
  },
}

/**
 * No emergency events - successful operation
 */
export const NoEmergencies: Story = {
  args: {
    events: [],
    maxHeight: 400,
    showConfidence: true,
    variant: 'detailed',
  },
}

/**
 * Routine incident with informational events only
 */
export const RoutineIncident: Story = {
  args: {
    events: routineIncident,
    maxHeight: 400,
    showConfidence: true,
    variant: 'detailed',
  },
}

/**
 * Escalating incident scenario
 */
export const EscalatingIncident: Story = {
  args: {
    events: escalatingIncident,
    maxHeight: 600,
    showConfidence: true,
    variant: 'detailed',
  },
}

/**
 * Compact variant - minimal display
 */
export const CompactView: Story = {
  args: {
    events: sampleMaydayEvents,
    maxHeight: 400,
    showConfidence: false,
    variant: 'compact',
  },
}

/**
 * Without confidence indicators
 */
export const WithoutConfidence: Story = {
  args: {
    events: sampleMaydayEvents,
    maxHeight: 500,
    showConfidence: false,
    variant: 'detailed',
  },
}

/**
 * Single critical mayday event
 */
export const SingleMayday: Story = {
  args: {
    events: [
      {
        id: '1',
        timestamp: 127,
        type: 'mayday',
        confidence: 0.99,
        severity: 'critical',
        text: 'Mayday mayday mayday, Engine 5 firefighter trapped in basement, flashover conditions',
        context: 'Engine 5 officer declaring mayday for trapped crew member in deteriorating conditions',
      },
    ],
    maxHeight: 400,
    showConfidence: true,
    variant: 'detailed',
  },
}

/**
 * Long incident with many events (scrollable)
 */
export const LongIncident: Story = {
  args: {
    events: [
      ...escalatingIncident,
      {
        id: '7',
        timestamp: 289,
        type: 'info',
        confidence: 0.71,
        severity: 'low',
        text: 'Checking for hot spots, thermal imaging in use',
      },
      {
        id: '8',
        timestamp: 334,
        type: 'info',
        confidence: 0.69,
        severity: 'low',
        text: 'Overhaul operations in progress',
      },
      {
        id: '9',
        timestamp: 412,
        type: 'all_clear',
        confidence: 0.88,
        severity: 'low',
        text: 'Scene secure, releasing units back to service',
      },
    ],
    maxHeight: 400,
    showConfidence: true,
    variant: 'detailed',
  },
}

/**
 * High confidence detections only
 */
export const HighConfidence: Story = {
  args: {
    events: [
      {
        id: '1',
        timestamp: 34,
        type: 'mayday',
        confidence: 0.99,
        severity: 'critical',
        text: 'Mayday mayday mayday, clear distress call from Ladder 4',
      },
      {
        id: '2',
        timestamp: 78,
        type: 'emergency',
        confidence: 0.97,
        severity: 'high',
        text: 'Emergency traffic, immediate assistance requested',
      },
      {
        id: '3',
        timestamp: 145,
        type: 'all_clear',
        confidence: 0.96,
        severity: 'medium',
        text: 'All units accounted for, situation resolved',
      },
    ],
    maxHeight: 500,
    showConfidence: true,
    variant: 'detailed',
  },
}

/**
 * Mixed confidence levels
 */
export const MixedConfidence: Story = {
  args: {
    events: [
      {
        id: '1',
        timestamp: 23,
        type: 'emergency',
        confidence: 0.55,
        severity: 'medium',
        text: 'Possible emergency traffic, unclear audio quality',
      },
      {
        id: '2',
        timestamp: 67,
        type: 'mayday',
        confidence: 0.98,
        severity: 'critical',
        text: 'Mayday mayday mayday, confirmed emergency situation',
      },
      {
        id: '3',
        timestamp: 112,
        type: 'info',
        confidence: 0.72,
        severity: 'low',
        text: 'Status update from command',
      },
    ],
    maxHeight: 500,
    showConfidence: true,
    variant: 'detailed',
  },
}

/**
 * Early incident timeline
 */
export const EarlyIncident: Story = {
  args: {
    events: [
      {
        id: '1',
        timestamp: 8,
        type: 'info',
        confidence: 0.76,
        severity: 'low',
        text: 'Units responding to alarm activation',
      },
      {
        id: '2',
        timestamp: 15,
        type: 'emergency',
        confidence: 0.84,
        severity: 'high',
        text: 'Upgrade to working fire, visible flames from exterior',
      },
    ],
    maxHeight: 400,
    showConfidence: true,
    variant: 'detailed',
  },
}
