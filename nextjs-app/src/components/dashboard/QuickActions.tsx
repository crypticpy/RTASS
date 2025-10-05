'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, List, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface QuickActionsProps {
  className?: string;
}

/**
 * QuickActions Component
 *
 * Display quick action buttons for common tasks.
 * Provides easy access to upload incidents, create templates, and view reports.
 */
export function QuickActions({ className }: QuickActionsProps) {
  const actions = [
    {
      title: 'Upload Incident',
      description: 'Upload and transcribe new radio traffic',
      href: '/incidents/upload',
      icon: Upload,
      variant: 'default' as const,
    },
    {
      title: 'Create Template',
      description: 'Upload a new compliance template',
      href: '/policy/upload',
      icon: FileText,
      variant: 'outline' as const,
    },
    {
      title: 'View All Incidents',
      description: 'Browse incident reports',
      href: '/incidents',
      icon: List,
      variant: 'outline' as const,
    },
    {
      title: 'Manage Templates',
      description: 'View and edit templates',
      href: '/policy',
      icon: Zap,
      variant: 'outline' as const,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} className="block">
                <Button
                  variant={action.variant}
                  className={cn(
                    'w-full h-auto py-4 px-4 flex flex-col items-start gap-2 text-left',
                    action.variant === 'default' && 'hover:scale-[1.02] transition-transform'
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-5 w-5" />
                    <span className="font-semibold">{action.title}</span>
                  </div>
                  <p className="text-xs opacity-80 font-normal">
                    {action.description}
                  </p>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
