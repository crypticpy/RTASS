'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
      variant: 'action' as const,
    },
    {
      title: 'Create Template',
      description: 'Upload a new compliance template',
      href: '/policy/upload',
      icon: FileText,
      variant: 'success' as const,
    },
    {
      title: 'View All Incidents',
      description: 'Browse incident reports',
      href: '/incidents',
      icon: List,
      variant: 'secondary' as const,
    },
    {
      title: 'Manage Templates',
      description: 'View and edit templates',
      href: '/policy/templates',
      icon: Zap,
      variant: 'secondary' as const,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid gap-3 sm:grid-cols-2">
            {actions.map((action) => {
              return (
                <Tooltip key={action.href} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link href={action.href} className="block">
                      <Button
                        variant={action.variant}
                        className={cn(
                          'w-full h-auto py-3 px-4 text-center justify-center',
                          (action.variant === 'action' || action.variant === 'success') && 'hover:scale-[1.02] transition-transform'
                        )}
                      >
                        <span className="font-semibold">{action.title}</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{action.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
