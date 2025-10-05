import type { Meta, StoryObj } from '@storybook/react'
import { ComplianceScore, type ComplianceCategory } from './compliance-score'

const meta = {
  title: 'Emergency/ComplianceScore',
  component: ComplianceScore,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    overallStatus: {
      control: 'select',
      options: ['PASS', 'NEEDS_IMPROVEMENT', 'FAIL'],
    },
    variant: {
      control: 'select',
      options: ['compact', 'detailed'],
    },
    showCategories: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ComplianceScore>

export default meta
type Story = StoryObj<typeof meta>

// Sample category data
const excellentCategories: ComplianceCategory[] = [
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
    id: 'command-structure',
    name: 'Command Structure',
    score: 88,
    status: 'PASS',
    weight: 0.30,
    criteriaCount: 5,
    passCount: 5,
  },
  {
    id: 'safety-officer',
    name: 'Safety Officer Procedures',
    score: 85,
    status: 'PASS',
    weight: 0.20,
    criteriaCount: 4,
    passCount: 4,
  },
  {
    id: 'resource-management',
    name: 'Resource Management',
    score: 90,
    status: 'PASS',
    weight: 0.15,
    criteriaCount: 3,
    passCount: 3,
  },
  {
    id: 'documentation',
    name: 'Documentation Standards',
    score: 95,
    status: 'PASS',
    weight: 0.10,
    criteriaCount: 2,
    passCount: 2,
  },
]

const mixedCategories: ComplianceCategory[] = [
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
    id: 'command-structure',
    name: 'Command Structure',
    score: 75,
    status: 'NEEDS_IMPROVEMENT',
    weight: 0.30,
    criteriaCount: 4,
    passCount: 3,
  },
  {
    id: 'safety-officer',
    name: 'Safety Officer Procedures',
    score: 68,
    status: 'NEEDS_IMPROVEMENT',
    weight: 0.20,
    criteriaCount: 5,
    passCount: 3,
  },
  {
    id: 'mayday-procedures',
    name: 'Mayday Procedures',
    score: 55,
    status: 'FAIL',
    weight: 0.15,
    criteriaCount: 4,
    passCount: 2,
  },
  {
    id: 'resource-management',
    name: 'Resource Management',
    score: 82,
    status: 'PASS',
    weight: 0.10,
    criteriaCount: 3,
    passCount: 3,
  },
]

const failingCategories: ComplianceCategory[] = [
  {
    id: 'radio-report',
    name: 'Initial Radio Report',
    score: 45,
    status: 'FAIL',
    weight: 0.25,
    criteriaCount: 5,
    passCount: 2,
  },
  {
    id: 'command-structure',
    name: 'Command Structure',
    score: 38,
    status: 'FAIL',
    weight: 0.30,
    criteriaCount: 6,
    passCount: 2,
  },
  {
    id: 'safety-officer',
    name: 'Safety Officer Procedures',
    score: 52,
    status: 'FAIL',
    weight: 0.20,
    criteriaCount: 4,
    passCount: 2,
  },
  {
    id: 'mayday-procedures',
    name: 'Mayday Procedures',
    score: 33,
    status: 'FAIL',
    weight: 0.15,
    criteriaCount: 4,
    passCount: 1,
  },
  {
    id: 'resource-management',
    name: 'Resource Management',
    score: 60,
    status: 'NEEDS_IMPROVEMENT',
    weight: 0.10,
    criteriaCount: 3,
    passCount: 2,
  },
]

/**
 * Excellent compliance - all categories passing
 */
export const ExcellentCompliance: Story = {
  args: {
    overallScore: 90,
    overallStatus: 'PASS',
    totalCitations: 18,
    categories: excellentCategories,
    variant: 'detailed',
    showCategories: true,
  },
}

/**
 * Good compliance with some improvement areas
 */
export const NeedsImprovement: Story = {
  args: {
    overallScore: 72,
    overallStatus: 'NEEDS_IMPROVEMENT',
    totalCitations: 15,
    categories: mixedCategories,
    variant: 'detailed',
    showCategories: true,
  },
}

/**
 * Poor compliance - multiple critical issues
 */
export const FailingCompliance: Story = {
  args: {
    overallScore: 45,
    overallStatus: 'FAIL',
    totalCitations: 9,
    categories: failingCategories,
    variant: 'detailed',
    showCategories: true,
  },
}

/**
 * Compact variant - minimal display
 */
export const CompactView: Story = {
  args: {
    overallScore: 87,
    overallStatus: 'PASS',
    totalCitations: 12,
    categories: excellentCategories,
    variant: 'compact',
  },
}

/**
 * Compact variant - needs improvement
 */
export const CompactNeedsImprovement: Story = {
  args: {
    overallScore: 68,
    overallStatus: 'NEEDS_IMPROVEMENT',
    totalCitations: 8,
    categories: mixedCategories,
    variant: 'compact',
  },
}

/**
 * Compact variant - failing
 */
export const CompactFailing: Story = {
  args: {
    overallScore: 42,
    overallStatus: 'FAIL',
    totalCitations: 5,
    categories: failingCategories,
    variant: 'compact',
  },
}

/**
 * Detailed view without categories
 */
export const WithoutCategories: Story = {
  args: {
    overallScore: 85,
    overallStatus: 'PASS',
    totalCitations: 16,
    categories: excellentCategories,
    variant: 'detailed',
    showCategories: false,
  },
}

/**
 * Perfect score
 */
export const PerfectScore: Story = {
  args: {
    overallScore: 100,
    overallStatus: 'PASS',
    totalCitations: 25,
    categories: [
      {
        id: 'radio-report',
        name: 'Initial Radio Report',
        score: 100,
        status: 'PASS',
        weight: 0.25,
        criteriaCount: 4,
        passCount: 4,
      },
      {
        id: 'command-structure',
        name: 'Command Structure',
        score: 100,
        status: 'PASS',
        weight: 0.30,
        criteriaCount: 5,
        passCount: 5,
      },
      {
        id: 'safety-officer',
        name: 'Safety Officer Procedures',
        score: 100,
        status: 'PASS',
        weight: 0.20,
        criteriaCount: 4,
        passCount: 4,
      },
      {
        id: 'mayday-procedures',
        name: 'Mayday Procedures',
        score: 100,
        status: 'PASS',
        weight: 0.15,
        criteriaCount: 3,
        passCount: 3,
      },
      {
        id: 'resource-management',
        name: 'Resource Management',
        score: 100,
        status: 'PASS',
        weight: 0.10,
        criteriaCount: 2,
        passCount: 2,
      },
    ],
    variant: 'detailed',
    showCategories: true,
  },
}

/**
 * Minimal passing score
 */
export const BarelyPassing: Story = {
  args: {
    overallScore: 75,
    overallStatus: 'PASS',
    totalCitations: 6,
    categories: [
      {
        id: 'radio-report',
        name: 'Initial Radio Report',
        score: 75,
        status: 'PASS',
        weight: 0.40,
        criteriaCount: 4,
        passCount: 3,
      },
      {
        id: 'command-structure',
        name: 'Command Structure',
        score: 74,
        status: 'NEEDS_IMPROVEMENT',
        weight: 0.30,
        criteriaCount: 5,
        passCount: 4,
      },
      {
        id: 'safety-officer',
        name: 'Safety Officer Procedures',
        score: 76,
        status: 'PASS',
        weight: 0.30,
        criteriaCount: 3,
        passCount: 3,
      },
    ],
    variant: 'detailed',
    showCategories: true,
  },
}

/**
 * Many categories - testing scroll
 */
export const ManyCategoriesExpanded: Story = {
  args: {
    overallScore: 82,
    overallStatus: 'PASS',
    totalCitations: 45,
    categories: [
      ...excellentCategories,
      {
        id: 'accountability',
        name: 'Personnel Accountability',
        score: 79,
        status: 'NEEDS_IMPROVEMENT',
        weight: 0.12,
        criteriaCount: 6,
        passCount: 5,
      },
      {
        id: 'communication',
        name: 'Communication Protocols',
        score: 88,
        status: 'PASS',
        weight: 0.18,
        criteriaCount: 5,
        passCount: 5,
      },
      {
        id: 'ppe',
        name: 'PPE Compliance',
        score: 92,
        status: 'PASS',
        weight: 0.15,
        criteriaCount: 3,
        passCount: 3,
      },
    ],
    variant: 'detailed',
    showCategories: true,
  },
}

/**
 * Empty categories array
 */
export const NoCategories: Story = {
  args: {
    overallScore: 85,
    overallStatus: 'PASS',
    totalCitations: 10,
    categories: [],
    variant: 'detailed',
    showCategories: true,
  },
}
