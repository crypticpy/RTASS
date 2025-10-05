/**
 * DashboardLayout Component
 *
 * Main dashboard layout for fire department operations center.
 * Includes navigation, header, and responsive sidebar for mobile/tablet/desktop.
 */

import React from 'react';
import { Flame, Radio, FileCheck, BarChart3, Settings, Menu, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  activeIncidents?: number;
  className?: string;
}

const navItems = [
  { icon: Flame, label: 'Incident Dashboard', href: '/', badge: null },
  { icon: Radio, label: 'Radio Transcripts', href: '/transcripts', badge: null },
  { icon: FileCheck, label: 'Compliance Audits', href: '/compliance', badge: null },
  { icon: BarChart3, label: 'Analytics & Reports', href: '/analytics', badge: null },
  { icon: Settings, label: 'Settings', href: '/settings', badge: null },
];

export function DashboardLayout({ children, activeIncidents = 0, className }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden touch-target"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-6 w-6" />
          </Button>

          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-fire-red text-primary-foreground">
              <Flame className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold">Fireground Operations Center</h1>
              <p className="text-xs text-sidebar-foreground/70">Radio Transcription & Compliance</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Active incidents indicator */}
          {activeIncidents > 0 && (
            <Button
              variant="ghost"
              className="gap-2 touch-target"
              aria-label={`${activeIncidents} active incidents`}
            >
              <Flame className="h-5 w-5 text-critical" />
              <span className="hidden sm:inline font-bold text-critical">
                {activeIncidents} Active
              </span>
              <Badge className="bg-critical text-primary-foreground">
                {activeIncidents}
              </Badge>
            </Button>
          )}

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="touch-target relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-critical" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-sidebar md:text-sidebar-foreground">
          <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="w-full justify-start touch-target gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                  asChild
                >
                  <a href={item.href}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge className="ml-auto" variant="secondary">
                        {item.badge}
                      </Badge>
                    )}
                  </a>
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile sidebar */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          >
            <aside
              className="fixed left-0 top-16 bottom-0 w-64 bg-sidebar text-sidebar-foreground border-r"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="flex-1 space-y-1 p-4" aria-label="Mobile navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className="w-full justify-start touch-target-lg gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
                      asChild
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <a href={item.href}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <Badge className="ml-auto" variant="secondary">
                            {item.badge}
                          </Badge>
                        )}
                      </a>
                    </Button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
