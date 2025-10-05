'use client';

import React from 'react';
import { Search, Grid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TemplateStatus } from '@/types/policy';

interface TemplateFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: TemplateStatus | 'all';
  onStatusFilterChange: (status: TemplateStatus | 'all') => void;
  sortBy: 'name' | 'date' | 'usage';
  onSortChange: (sort: 'name' | 'date' | 'usage') => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function TemplateFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
}: TemplateFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 w-full sm:w-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search templates by name or description..."
          className="pl-9"
        />
      </div>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="DRAFT">Draft</SelectItem>
          <SelectItem value="ARCHIVED">Archived</SelectItem>
        </SelectContent>
      </Select>

      {/* Sort By */}
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Name</SelectItem>
          <SelectItem value="date">Date Created</SelectItem>
          <SelectItem value="usage">Usage Count</SelectItem>
        </SelectContent>
      </Select>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 border rounded-md" role="group" aria-label="View mode">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          className="h-9 w-9 p-0"
          aria-label="Grid view"
          aria-pressed={viewMode === 'grid'}
        >
          <Grid className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className="h-9 w-9 p-0"
          aria-label="List view"
          aria-pressed={viewMode === 'list'}
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
