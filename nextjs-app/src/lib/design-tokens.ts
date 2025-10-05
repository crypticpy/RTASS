/**
 * Fire Department Radio Transcription System - Design Tokens
 *
 * This file contains the complete design token system for the fire department
 * emergency operations platform. All colors, spacing, typography, and other
 * design decisions are centralized here for consistency.
 */

export const designTokens = {
  /**
   * Fire Department Emergency Color Palette
   * Based on NFPA standards and emergency service best practices
   */
  colors: {
    // Primary: Fire Service Red (#C41E3A) - Critical information, emergencies
    fireRed: {
      DEFAULT: 'hsl(350, 76%, 45%)',
      light: 'hsl(350, 76%, 55%)',
      dark: 'hsl(350, 76%, 35%)',
      hex: '#C41E3A',
    },

    // Secondary: Safety Orange (#FF6B35) - Warnings, cautions, important actions
    safetyOrange: {
      DEFAULT: 'hsl(17, 100%, 60%)',
      light: 'hsl(17, 100%, 70%)',
      dark: 'hsl(17, 100%, 50%)',
      hex: '#FF6B35',
    },

    // Success: Emergency Green (#00A859) - All clear, compliant status
    emergencyGreen: {
      DEFAULT: 'hsl(153, 100%, 33%)',
      light: 'hsl(153, 100%, 43%)',
      dark: 'hsl(153, 100%, 23%)',
      hex: '#00A859',
    },

    // Neutral: Tactical Gray (#2C3E50) - Backgrounds, secondary content
    tacticalGray: {
      DEFAULT: 'hsl(210, 29%, 24%)',
      light: 'hsl(210, 29%, 34%)',
      dark: 'hsl(210, 29%, 14%)',
      hex: '#2C3E50',
    },

    // Info: EMS Blue (#0066CC) - Information, guidance, help
    emsBlue: {
      DEFAULT: 'hsl(210, 100%, 40%)',
      light: 'hsl(210, 100%, 50%)',
      dark: 'hsl(210, 100%, 30%)',
      hex: '#0066CC',
    },

    // Alert: Tactical Yellow (#FFC107) - Attention needed, warnings
    tacticalYellow: {
      DEFAULT: 'hsl(45, 100%, 51%)',
      light: 'hsl(45, 100%, 61%)',
      dark: 'hsl(45, 100%, 41%)',
      hex: '#FFC107',
    },
  },

  /**
   * Emergency Severity Levels
   * Used for incident classification and visual indicators
   */
  severity: {
    critical: {
      label: 'Critical',
      color: 'fireRed',
      priority: 1,
      description: 'Immediate life-threatening situation',
    },
    high: {
      label: 'High',
      color: 'safetyOrange',
      priority: 2,
      description: 'Serious incident requiring immediate attention',
    },
    medium: {
      label: 'Medium',
      color: 'tacticalYellow',
      priority: 3,
      description: 'Standard emergency response required',
    },
    low: {
      label: 'Low',
      color: 'emergencyGreen',
      priority: 4,
      description: 'Routine or resolved incident',
    },
  },

  /**
   * Typography Scale
   * Based on Inter font family for excellent readability under stress
   */
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      display: ['Inter Display', 'Inter', 'sans-serif'],
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px - minimum for body text
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
      '5xl': '3rem',     // 48px
      '6xl': '3.75rem',  // 60px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  /**
   * Spacing Scale
   * Based on 4px grid system for consistency
   */
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
    24: '6rem',    // 96px
  },

  /**
   * Touch Targets
   * Minimum sizes for touch interactions (critical for gloved hands)
   */
  touchTargets: {
    minimum: '44px',        // WCAG 2.2 AA minimum
    recommended: '56px',    // Recommended for gloved hands
    large: '72px',          // Large emergency actions
  },

  /**
   * Border Radius
   * Consistent rounding across components
   */
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    DEFAULT: '0.5rem',  // 8px
    md: '0.625rem',  // 10px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',  // Fully rounded
  },

  /**
   * Breakpoints
   * Mobile-first responsive design
   */
  breakpoints: {
    sm: '640px',   // Mobile landscape, small tablets
    md: '768px',   // Tablets
    lg: '1024px',  // Laptops, small desktops
    xl: '1280px',  // Desktops
    '2xl': '1536px', // Large desktops
  },

  /**
   * Shadows
   * Elevation system for UI hierarchy
   */
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    emergency: '0 0 20px 0 rgb(196 30 58 / 0.3)', // Red glow for critical states
  },

  /**
   * Z-Index Scale
   * Layering system for overlays and modals
   */
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    overlay: 1200,
    modal: 1300,
    popover: 1400,
    tooltip: 1500,
    notification: 1600,
  },

  /**
   * Animation Durations
   * Consistent timing for transitions and animations
   */
  animation: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '750ms',
  },

  /**
   * Transition Easing
   * Smooth, natural motion curves
   */
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    emergency: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Attention-grabbing bounce
  },
} as const;

/**
 * TypeScript types for design tokens
 */
export type DesignTokens = typeof designTokens;
export type ColorToken = keyof typeof designTokens.colors;
export type SeverityLevel = keyof typeof designTokens.severity;
export type FontSize = keyof typeof designTokens.typography.fontSize;
export type SpacingSize = keyof typeof designTokens.spacing;

/**
 * Utility function to get CSS variable name
 */
export function getCSSVariable(variable: string): string {
  return `var(--${variable})`;
}

/**
 * Utility function to get color by severity
 */
export function getColorBySeverity(severity: SeverityLevel): string {
  const severityConfig = designTokens.severity[severity];
  const colorKey = severityConfig.color as ColorToken;
  return designTokens.colors[colorKey].DEFAULT;
}

/**
 * Utility function for responsive spacing
 */
export function responsiveSpacing(base: SpacingSize, md?: SpacingSize, lg?: SpacingSize): string {
  const baseValue = designTokens.spacing[base];
  const mdValue = md ? designTokens.spacing[md] : baseValue;
  const lgValue = lg ? designTokens.spacing[lg] : mdValue;

  return `${baseValue} md:${mdValue} lg:${lgValue}`;
}
