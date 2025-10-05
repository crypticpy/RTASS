import type { Meta, StoryObj } from '@storybook/react';
import { MaydayAlert } from './MaydayAlert';

const meta: Meta<typeof MaydayAlert> = {
  title: 'Emergency/MaydayAlert',
  component: MaydayAlert,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    response: {
      control: 'select',
      options: ['pending', 'acknowledged', 'rit-deployed', 'resolved'],
      description: 'Current mayday response status',
    },
    personnel: {
      control: 'number',
      description: 'Number of personnel in danger',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MaydayAlert>;

export const Pending: Story = {
  args: {
    unit: 'Engine 2',
    location: 'Second floor, rear of structure',
    timestamp: '14:32:45',
    personnel: 2,
    situation: 'Partial floor collapse. Two firefighters trapped.',
    response: 'pending',
    onAcknowledge: () => console.log('Acknowledged'),
    onDeployRIT: () => console.log('RIT Deployed'),
  },
};

export const Acknowledged: Story = {
  args: {
    unit: 'Ladder 1',
    location: 'Roof access, north side',
    timestamp: '15:20:12',
    personnel: 1,
    situation: 'Firefighter injured, unable to self-rescue.',
    response: 'acknowledged',
  },
};

export const RITDeployed: Story = {
  args: {
    unit: 'Engine 4',
    location: 'Basement level, equipment room',
    timestamp: '16:45:30',
    personnel: 3,
    situation: 'Lost communication. Heavy smoke conditions.',
    response: 'rit-deployed',
  },
};

export const Resolved: Story = {
  args: {
    unit: 'Engine 2',
    location: 'First floor, living room area',
    timestamp: '14:55:20',
    personnel: 2,
    situation: 'SCBA malfunction. Firefighters safely evacuated.',
    response: 'resolved',
  },
};

export const MinimalInformation: Story = {
  args: {
    unit: 'Battalion 1',
    location: 'Unknown',
    timestamp: '17:10:00',
    response: 'pending',
    onAcknowledge: () => console.log('Acknowledged'),
    onDeployRIT: () => console.log('RIT Deployed'),
  },
};

export const MultiplePersonnel: Story = {
  args: {
    unit: 'Engine 1 & Engine 3',
    location: 'Third floor, apartment 3C',
    timestamp: '18:22:15',
    personnel: 6,
    situation: 'Flashover. Multiple crews evacuating. Two unaccounted for.',
    response: 'rit-deployed',
  },
};
