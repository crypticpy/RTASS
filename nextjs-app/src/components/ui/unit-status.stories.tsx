import type { Meta, StoryObj } from '@storybook/react'
import { UnitStatus, type Unit } from './unit-status'

const meta = {
  title: 'Emergency/UnitStatus',
  component: UnitStatus,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'light',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    layout: {
      control: 'select',
      options: ['grid', 'list'],
    },
    variant: {
      control: 'select',
      options: ['compact', 'detailed'],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UnitStatus>

export default meta
type Story = StoryObj<typeof meta>

// Sample unit data
const sampleUnits: Unit[] = [
  {
    id: 'eng-1',
    name: 'Engine 1',
    type: 'engine',
    status: 'on-scene',
    personnel: 4,
    lastUpdate: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    location: '123 Main Street',
  },
  {
    id: 'eng-2',
    name: 'Engine 2',
    type: 'engine',
    status: 'on-scene',
    personnel: 4,
    lastUpdate: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
    location: '123 Main Street',
  },
  {
    id: 'lad-2',
    name: 'Ladder 2',
    type: 'ladder',
    status: 'dispatched',
    personnel: 5,
    lastUpdate: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
    location: 'En route',
  },
  {
    id: 'res-3',
    name: 'Rescue 3',
    type: 'rescue',
    status: 'available',
    personnel: 2,
    lastUpdate: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
  },
  {
    id: 'bat-1',
    name: 'Battalion 1',
    type: 'chief',
    status: 'on-scene',
    personnel: 2,
    lastUpdate: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
    location: '123 Main Street',
  },
  {
    id: 'ems-1',
    name: 'Medic 1',
    type: 'ems',
    status: 'returning',
    personnel: 2,
    lastUpdate: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
  },
  {
    id: 'eng-5',
    name: 'Engine 5',
    type: 'engine',
    status: 'out-of-service',
    personnel: 0,
    lastUpdate: new Date(Date.now() - 120 * 60 * 1000), // 2 hours ago
  },
]

const largeFleet: Unit[] = [
  ...sampleUnits,
  {
    id: 'eng-3',
    name: 'Engine 3',
    type: 'engine',
    status: 'available',
    personnel: 4,
    lastUpdate: new Date(Date.now() - 1 * 60 * 1000),
  },
  {
    id: 'eng-4',
    name: 'Engine 4',
    type: 'engine',
    status: 'dispatched',
    personnel: 4,
    lastUpdate: new Date(Date.now() - 7 * 60 * 1000),
    location: 'En route to scene',
  },
  {
    id: 'lad-1',
    name: 'Ladder 1',
    type: 'ladder',
    status: 'available',
    personnel: 5,
    lastUpdate: new Date(Date.now() - 3 * 60 * 1000),
  },
  {
    id: 'res-1',
    name: 'Rescue 1',
    type: 'rescue',
    status: 'on-scene',
    personnel: 3,
    lastUpdate: new Date(Date.now() - 10 * 60 * 1000),
    location: '456 Oak Avenue',
  },
  {
    id: 'bat-2',
    name: 'Battalion 2',
    type: 'chief',
    status: 'available',
    personnel: 2,
    lastUpdate: new Date(Date.now() - 1 * 60 * 1000),
  },
]

const activeIncident: Unit[] = [
  {
    id: 'eng-1',
    name: 'Engine 1',
    type: 'engine',
    status: 'on-scene',
    personnel: 4,
    lastUpdate: new Date(Date.now() - 2 * 60 * 1000),
    location: '789 Fire Lane - Structure Fire',
  },
  {
    id: 'eng-2',
    name: 'Engine 2',
    type: 'engine',
    status: 'on-scene',
    personnel: 4,
    lastUpdate: new Date(Date.now() - 4 * 60 * 1000),
    location: '789 Fire Lane - Structure Fire',
  },
  {
    id: 'lad-1',
    name: 'Ladder 1',
    type: 'ladder',
    status: 'on-scene',
    personnel: 5,
    lastUpdate: new Date(Date.now() - 3 * 60 * 1000),
    location: '789 Fire Lane - Structure Fire',
  },
  {
    id: 'bat-1',
    name: 'Battalion 1',
    type: 'chief',
    status: 'on-scene',
    personnel: 2,
    lastUpdate: new Date(Date.now() - 5 * 60 * 1000),
    location: '789 Fire Lane - Incident Command',
  },
  {
    id: 'ems-1',
    name: 'Medic 1',
    type: 'ems',
    status: 'on-scene',
    personnel: 2,
    lastUpdate: new Date(Date.now() - 1 * 60 * 1000),
    location: '789 Fire Lane - Staging',
  },
]

/**
 * Default grid layout with mixed statuses
 */
export const GridLayout: Story = {
  args: {
    units: sampleUnits,
    layout: 'grid',
    variant: 'detailed',
  },
}

/**
 * List layout - vertical stacking
 */
export const ListLayout: Story = {
  args: {
    units: sampleUnits,
    layout: 'list',
    variant: 'detailed',
  },
}

/**
 * Large fleet of apparatus
 */
export const LargeFleet: Story = {
  args: {
    units: largeFleet,
    layout: 'grid',
    variant: 'detailed',
  },
}

/**
 * Active incident - all units on scene
 */
export const ActiveIncident: Story = {
  args: {
    units: activeIncident,
    layout: 'grid',
    variant: 'detailed',
  },
}

/**
 * All units available - quiet shift
 */
export const AllAvailable: Story = {
  args: {
    units: [
      {
        id: 'eng-1',
        name: 'Engine 1',
        type: 'engine',
        status: 'available',
        personnel: 4,
        lastUpdate: new Date(Date.now() - 1 * 60 * 1000),
      },
      {
        id: 'eng-2',
        name: 'Engine 2',
        type: 'engine',
        status: 'available',
        personnel: 4,
        lastUpdate: new Date(Date.now() - 2 * 60 * 1000),
      },
      {
        id: 'lad-1',
        name: 'Ladder 1',
        type: 'ladder',
        status: 'available',
        personnel: 5,
        lastUpdate: new Date(Date.now() - 1 * 60 * 1000),
      },
      {
        id: 'res-1',
        name: 'Rescue 1',
        type: 'rescue',
        status: 'available',
        personnel: 3,
        lastUpdate: new Date(Date.now() - 3 * 60 * 1000),
      },
    ],
    layout: 'grid',
    variant: 'detailed',
  },
}

/**
 * Compact variant - minimal information
 */
export const CompactView: Story = {
  args: {
    units: sampleUnits,
    layout: 'grid',
    variant: 'compact',
  },
}

/**
 * Compact list view
 */
export const CompactListView: Story = {
  args: {
    units: sampleUnits,
    layout: 'list',
    variant: 'compact',
  },
}

/**
 * Empty state - no units
 */
export const NoUnits: Story = {
  args: {
    units: [],
    layout: 'grid',
    variant: 'detailed',
  },
}

/**
 * Single unit display
 */
export const SingleUnit: Story = {
  args: {
    units: [
      {
        id: 'eng-1',
        name: 'Engine 1',
        type: 'engine',
        status: 'on-scene',
        personnel: 4,
        lastUpdate: new Date(Date.now() - 5 * 60 * 1000),
        location: '123 Main Street - Working Fire',
      },
    ],
    layout: 'grid',
    variant: 'detailed',
  },
}

/**
 * Units in transit - dispatched status
 */
export const UnitsDispatched: Story = {
  args: {
    units: [
      {
        id: 'eng-1',
        name: 'Engine 1',
        type: 'engine',
        status: 'dispatched',
        personnel: 4,
        lastUpdate: new Date(Date.now() - 2 * 60 * 1000),
        location: 'En route to 555 Emergency Blvd',
      },
      {
        id: 'eng-2',
        name: 'Engine 2',
        type: 'engine',
        status: 'dispatched',
        personnel: 4,
        lastUpdate: new Date(Date.now() - 3 * 60 * 1000),
        location: 'En route to 555 Emergency Blvd',
      },
      {
        id: 'lad-1',
        name: 'Ladder 1',
        type: 'ladder',
        status: 'dispatched',
        personnel: 5,
        lastUpdate: new Date(Date.now() - 1 * 60 * 1000),
        location: 'En route to 555 Emergency Blvd',
      },
    ],
    layout: 'grid',
    variant: 'detailed',
  },
}

/**
 * Units returning to station
 */
export const UnitsReturning: Story = {
  args: {
    units: [
      {
        id: 'eng-1',
        name: 'Engine 1',
        type: 'engine',
        status: 'returning',
        personnel: 4,
        lastUpdate: new Date(Date.now() - 8 * 60 * 1000),
      },
      {
        id: 'ems-1',
        name: 'Medic 1',
        type: 'ems',
        status: 'returning',
        personnel: 2,
        lastUpdate: new Date(Date.now() - 10 * 60 * 1000),
      },
    ],
    layout: 'grid',
    variant: 'detailed',
  },
}

/**
 * Units out of service
 */
export const OutOfService: Story = {
  args: {
    units: [
      {
        id: 'eng-5',
        name: 'Engine 5',
        type: 'engine',
        status: 'out-of-service',
        personnel: 0,
        lastUpdate: new Date(Date.now() - 180 * 60 * 1000),
      },
      {
        id: 'lad-3',
        name: 'Ladder 3',
        type: 'ladder',
        status: 'out-of-service',
        personnel: 0,
        lastUpdate: new Date(Date.now() - 240 * 60 * 1000),
      },
    ],
    layout: 'grid',
    variant: 'detailed',
  },
}

/**
 * With click handlers (interactive)
 */
export const Interactive: Story = {
  args: {
    units: sampleUnits,
    layout: 'grid',
    variant: 'detailed',
    onUnitClick: (unitId: string) => {
      alert(`Unit clicked: ${unitId}`)
    },
  },
}

/**
 * Mixed apparatus types
 */
export const MixedApparatusTypes: Story = {
  args: {
    units: [
      {
        id: 'eng-1',
        name: 'Engine 1',
        type: 'engine',
        status: 'on-scene',
        personnel: 4,
        lastUpdate: new Date(),
        location: 'Fire Scene',
      },
      {
        id: 'lad-1',
        name: 'Ladder 1',
        type: 'ladder',
        status: 'on-scene',
        personnel: 5,
        lastUpdate: new Date(),
        location: 'Fire Scene',
      },
      {
        id: 'res-1',
        name: 'Rescue 1',
        type: 'rescue',
        status: 'available',
        personnel: 3,
        lastUpdate: new Date(),
      },
      {
        id: 'bat-1',
        name: 'Battalion 1',
        type: 'chief',
        status: 'on-scene',
        personnel: 2,
        lastUpdate: new Date(),
        location: 'Command Post',
      },
      {
        id: 'ems-1',
        name: 'Medic 1',
        type: 'ems',
        status: 'dispatched',
        personnel: 2,
        lastUpdate: new Date(),
        location: 'En route',
      },
    ],
    layout: 'grid',
    variant: 'detailed',
  },
}

/**
 * Real-time update simulation
 */
export const RecentUpdates: Story = {
  args: {
    units: [
      {
        id: 'eng-1',
        name: 'Engine 1',
        type: 'engine',
        status: 'on-scene',
        personnel: 4,
        lastUpdate: new Date(Date.now() - 10 * 1000), // 10 seconds ago
        location: 'Active Fire Scene',
      },
      {
        id: 'eng-2',
        name: 'Engine 2',
        type: 'engine',
        status: 'on-scene',
        personnel: 4,
        lastUpdate: new Date(Date.now() - 30 * 1000), // 30 seconds ago
        location: 'Active Fire Scene',
      },
      {
        id: 'bat-1',
        name: 'Battalion 1',
        type: 'chief',
        status: 'on-scene',
        personnel: 2,
        lastUpdate: new Date(), // Just now
        location: 'Incident Command',
      },
    ],
    layout: 'grid',
    variant: 'detailed',
  },
}
