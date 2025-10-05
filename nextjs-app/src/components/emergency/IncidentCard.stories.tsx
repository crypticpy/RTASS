import type { Meta, StoryObj } from '@storybook/react';
import { IncidentCard } from './IncidentCard';

const meta: Meta<typeof IncidentCard> = {
  title: 'Emergency/IncidentCard',
  component: IncidentCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    severity: {
      control: 'select',
      options: ['critical', 'high', 'medium', 'low'],
      description: 'Incident severity level',
    },
    status: {
      control: 'select',
      options: ['active', 'resolved', 'pending', 'monitoring'],
      description: 'Current incident status',
    },
    hasMayday: {
      control: 'boolean',
      description: 'Whether a mayday has been declared',
    },
    injuries: {
      control: 'number',
      description: 'Number of reported injuries',
    },
  },
};

export default meta;
type Story = StoryObj<typeof IncidentCard>;

export const Critical: Story = {
  args: {
    id: 'INC-2024-001',
    type: 'Structure Fire',
    address: '123 Main St',
    severity: 'critical',
    status: 'active',
    startTime: '14:32',
    units: ['Engine 1', 'Ladder 2', 'Battalion 1'],
    hasMayday: true,
    injuries: 2,
  },
};

export const HighSeverity: Story = {
  args: {
    id: 'INC-2024-002',
    type: 'Vehicle Accident',
    address: 'I-95 Northbound Mile 42',
    severity: 'high',
    status: 'active',
    startTime: '15:45',
    units: ['Engine 3', 'Rescue 1', 'EMS 2'],
    injuries: 1,
  },
};

export const MediumSeverity: Story = {
  args: {
    id: 'INC-2024-003',
    type: 'Medical Emergency',
    address: 'City Park Recreation Center',
    severity: 'medium',
    status: 'monitoring',
    startTime: '16:20',
    units: ['EMS 3'],
  },
};

export const Resolved: Story = {
  args: {
    id: 'INC-2024-004',
    type: 'Gas Leak',
    address: '456 Oak Avenue',
    severity: 'low',
    status: 'resolved',
    startTime: '13:15',
    units: ['Engine 2', 'Hazmat 1'],
  },
};

export const NoUnits: Story = {
  args: {
    id: 'INC-2024-005',
    type: 'Fire Alarm',
    address: '789 Elm Street, Suite 200',
    severity: 'low',
    status: 'pending',
    startTime: '17:05',
    units: [],
  },
};

export const LongAddress: Story = {
  args: {
    id: 'INC-2024-006',
    type: 'Structure Fire',
    address: '1234 Very Long Street Name with Building Complex Name, Apartment 567B',
    severity: 'high',
    status: 'active',
    startTime: '18:30',
    units: ['Engine 1', 'Engine 2', 'Ladder 1', 'Ladder 2', 'Battalion 1', 'Safety 1'],
    hasMayday: false,
  },
};

export const MaydayWithMultipleInjuries: Story = {
  args: {
    id: 'INC-2024-007',
    type: 'Warehouse Fire',
    address: '2500 Industrial Park Drive',
    severity: 'critical',
    status: 'active',
    startTime: '19:15',
    units: ['Engine 1', 'Engine 2', 'Engine 3', 'Ladder 1', 'Ladder 2', 'Battalion 1', 'RIT 1'],
    hasMayday: true,
    injuries: 4,
  },
};
