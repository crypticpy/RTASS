"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  FileText,
} from "lucide-react"
import type {
  TranscriptSegment,
  Finding,
  EmergencyKeywordData,
} from "@/types/incident"

export interface TranscriptViewerProps {
  /** Transcript segments */
  segments: TranscriptSegment[];

  /** Emergency keywords detected */
  emergencyKeywords?: Record<string, EmergencyKeywordData>;

  /** Compliance violations (linked to segments) */
  violations?: Finding[];

  /** Compliance strengths (linked to segments) */
  strengths?: Finding[];

  /** Total duration in seconds */
  duration: number;

  /** Word count */
  wordCount?: number;

  /** Callback when timestamp is clicked */
  onTimestampClick?: (timestamp: number) => void;

  /** Display options */
  className?: string;
}

/**
 * TranscriptViewer Component
 *
 * Full transcript viewer with search, annotations for emergency keywords,
 * violations, and strengths. Includes inline highlighting and navigation.
 *
 * @example
 * ```tsx
 * <TranscriptViewer
 *   segments={transcriptSegments}
 *   emergencyKeywords={{ mayday: { count: 2, timestamps: [45, 120] } }}
 *   violations={violations}
 *   strengths={strengths}
 *   duration={2732}
 * />
 * ```
 */
export function TranscriptViewer({
  segments,
  emergencyKeywords = {},
  violations = [],
  strengths = [],
  duration,
  wordCount,
  onTimestampClick,
  className,
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<number[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = React.useState(-1);
  const [jumpToTime, setJumpToTime] = React.useState('');

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const segmentRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());

  // Format timestamp as MM:SS or HH:MM:SS
  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse time input (MM:SS or HH:MM:SS) to seconds
  const parseTimeInput = (input: string): number | null => {
    const parts = input.split(':').map(p => parseInt(p, 10));
    if (parts.some(isNaN)) return null;

    if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  };

  // Build violation and strength maps by segment ID
  const violationsBySegment = React.useMemo(() => {
    const map = new Map<string, Finding[]>();
    violations.forEach((v) => {
      // Match violations to segments by timestamp
      const segment = segments.find(
        (s) => v.timestamp >= s.startTime && v.timestamp <= s.endTime
      );
      if (segment) {
        if (!map.has(segment.id)) {
          map.set(segment.id, []);
        }
        map.get(segment.id)!.push(v);
      }
    });
    return map;
  }, [violations, segments]);

  const strengthsBySegment = React.useMemo(() => {
    const map = new Map<string, Finding[]>();
    strengths.forEach((s) => {
      const segment = segments.find(
        (seg) => s.timestamp >= seg.startTime && s.timestamp <= seg.endTime
      );
      if (segment) {
        if (!map.has(segment.id)) {
          map.set(segment.id, []);
        }
        map.get(segment.id)!.push(s);
      }
    });
    return map;
  }, [strengths, segments]);

  // Build emergency keyword map by segment
  const keywordsBySegment = React.useMemo(() => {
    const map = new Map<string, string[]>();
    Object.entries(emergencyKeywords).forEach(([keyword, data]) => {
      data.timestamps.forEach((ts) => {
        const segment = segments.find((s) => ts >= s.startTime && ts <= s.endTime);
        if (segment) {
          if (!map.has(segment.id)) {
            map.set(segment.id, []);
          }
          map.get(segment.id)!.push(keyword);
        }
      });
    });
    return map;
  }, [emergencyKeywords, segments]);

  // Search functionality
  const performSearch = React.useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: number[] = [];

    segments.forEach((segment, index) => {
      if (segment.text.toLowerCase().includes(lowerQuery)) {
        results.push(index);
      }
    });

    setSearchResults(results);
    setCurrentResultIndex(results.length > 0 ? 0 : -1);

    // Scroll to first result
    if (results.length > 0) {
      scrollToSegment(results[0]);
    }
  }, [segments]);

  // Navigate search results
  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    scrollToSegment(searchResults[nextIndex]);
  };

  const goToPreviousResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentResultIndex === 0 ? searchResults.length - 1 : currentResultIndex - 1;
    setCurrentResultIndex(prevIndex);
    scrollToSegment(searchResults[prevIndex]);
  };

  // Scroll to specific segment
  const scrollToSegment = (index: number) => {
    const element = segmentRefs.current.get(index);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Jump to timestamp
  const handleJumpToTime = () => {
    const seconds = parseTimeInput(jumpToTime);
    if (seconds === null || seconds < 0 || seconds > duration) {
      return;
    }

    const segmentIndex = segments.findIndex(
      (s) => seconds >= s.startTime && seconds <= s.endTime
    );

    if (segmentIndex !== -1) {
      scrollToSegment(segmentIndex);
      setJumpToTime('');
    }
  };

  // Handle search query change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    performSearch(value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentResultIndex(-1);
  };

  // Highlight text with search query
  const highlightText = (text: string, segmentIndex: number): React.ReactNode => {
    if (!searchQuery.trim() || !searchResults.includes(segmentIndex)) {
      return text;
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    let index = lowerText.indexOf(lowerQuery);
    while (index !== -1) {
      if (index > lastIndex) {
        parts.push(text.substring(lastIndex, index));
      }
      parts.push(
        <mark
          key={`${segmentIndex}-${index}`}
          className="bg-yellow-300 dark:bg-yellow-700 rounded px-0.5"
        >
          {text.substring(index, index + searchQuery.length)}
        </mark>
      );
      lastIndex = index + searchQuery.length;
      index = lowerText.indexOf(lowerQuery, lastIndex);
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // Statistics
  const totalKeywords = Object.values(emergencyKeywords).reduce(
    (sum, data) => sum + data.count,
    0
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search box */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search transcript..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>

              {/* Search results counter */}
              {searchResults.length > 0 && (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {currentResultIndex + 1} of {searchResults.length} results
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPreviousResult}
                      disabled={searchResults.length === 0}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextResult}
                      disabled={searchResults.length === 0}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Jump to timestamp */}
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="MM:SS"
                value={jumpToTime}
                onChange={(e) => setJumpToTime(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJumpToTime()}
                className="w-28 font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleJumpToTime}
                disabled={!jumpToTime}
              >
                <Clock className="h-4 w-4 mr-2" />
                Jump
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-muted/50 rounded-lg p-3 border">
          <p className="text-xs text-muted-foreground mb-1">Duration</p>
          <p className="text-lg font-bold font-mono">{formatTimestamp(duration)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 border">
          <p className="text-xs text-muted-foreground mb-1">Segments</p>
          <p className="text-lg font-bold">{segments.length}</p>
        </div>
        {wordCount !== undefined && (
          <div className="bg-muted/50 rounded-lg p-3 border">
            <p className="text-xs text-muted-foreground mb-1">Words</p>
            <p className="text-lg font-bold">{wordCount.toLocaleString()}</p>
          </div>
        )}
        <div className="bg-muted/50 rounded-lg p-3 border">
          <p className="text-xs text-muted-foreground mb-1">Emergency Keywords</p>
          <p className="text-lg font-bold">{totalKeywords}</p>
        </div>
      </div>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Full Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {segments.map((segment, index) => {
                const hasViolations = violationsBySegment.has(segment.id);
                const hasStrengths = strengthsBySegment.has(segment.id);
                const keywords = keywordsBySegment.get(segment.id) || [];
                const isSearchResult = searchResults.includes(index);

                return (
                  <div
                    key={segment.id}
                    ref={(el) => {
                      if (el) {
                        segmentRefs.current.set(index, el);
                      }
                    }}
                    className={cn(
                      "rounded-lg p-4 border-l-4 transition-all",
                      hasViolations && "border-red-500 bg-red-50/50 dark:bg-red-950/20",
                      hasStrengths && !hasViolations && "border-green-500 bg-green-50/50 dark:bg-green-950/20",
                      !hasViolations && !hasStrengths && "border-muted bg-muted/30",
                      isSearchResult && currentResultIndex === searchResults.indexOf(index) && "ring-2 ring-yellow-500"
                    )}
                  >
                    {/* Timestamp and speaker */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onTimestampClick?.(segment.startTime)}
                          className="text-xs font-mono font-medium text-muted-foreground hover:text-primary hover:underline"
                        >
                          {formatTimestamp(segment.startTime)}
                        </button>
                        {segment.speaker && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium">{segment.speaker}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Annotations */}
                      <div className="flex gap-2 flex-wrap">
                        {keywords.map((keyword, i) => (
                          <Badge
                            key={`${keyword}-${i}`}
                            variant="destructive"
                            className="text-xs uppercase"
                          >
                            {keyword}
                          </Badge>
                        ))}
                        {hasViolations && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Violation
                          </Badge>
                        )}
                        {hasStrengths && (
                          <Badge variant="default" className="text-xs bg-green-600 dark:bg-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Strength
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Transcript text */}
                    <p className="text-sm leading-relaxed break-words">
                      {highlightText(segment.text, index)}
                    </p>

                    {/* Confidence (if available) */}
                    {segment.confidence !== undefined && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Confidence:</span>
                        <div className="flex-1 h-1 bg-background rounded-full overflow-hidden max-w-32">
                          <div
                            className={cn(
                              "h-full transition-all",
                              segment.confidence >= 0.8
                                ? "bg-green-600"
                                : segment.confidence >= 0.6
                                ? "bg-amber-600"
                                : "bg-red-600"
                            )}
                            style={{ width: `${segment.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium tabular-nums">
                          {Math.round(segment.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
