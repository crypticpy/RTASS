# Implementation Plan: Real-Time Processing Status

## Situation Assessment

### Current State
The processing page (`src/app/incidents/[id]/processing/page.tsx`) currently displays a **fake 2-second simulation** that does not reflect actual processing status:
- Lines 27-85 contain hardcoded timeline simulation
- Progress updates every 1 second with artificial values
- No actual connection to backend processing status
- Automatically navigates to report after 2 seconds

### What Exists
1. **Status API Endpoint**: `/api/incidents/[id]/status` (fully implemented)
   - Returns structured response with phase-based status
   - Provides transcription status and audit progress
   - Includes template-specific progress information
   - Phase values: `'transcribing'`, `'analyzing'`, `'complete'`, `'error'`

2. **ProcessingStatus Component**: Displays progress UI
   - Supports phase-based display
   - Has spinner animations for in-progress states
   - Shows progress bars and stage checklists
   - Handles complete and error states

3. **Type Definitions**: `ProcessingProgress` type in `src/types/incident.ts`
   - Compatible with existing component props

### Problem
The page shows fake progress that misleads users about actual processing status. Users cannot see real-time updates when their audio is being transcribed and analyzed.

## Strategy

### High-Level Approach
Replace the fake simulation with **real-time status polling** that:
1. Fetches actual processing status from the API every 2-3 seconds
2. Maps API response phases to UI display states
3. Shows spinner animation with descriptive phase text (no accurate progress bar)
4. Displays template-specific progress during analysis phase
5. Automatically navigates to report when processing completes

### Technical Decisions

**1. Polling Interval**: 2.5 seconds
- Balance between responsiveness and server load
- Typical transcription takes 2-5 minutes (48-120 polls)
- Typical analysis takes 3-5 minutes per template (72-120 polls)

**2. Phase Mapping**: API phases → UI states
- `transcribing` → Show spinner + "Transcribing audio..."
- `analyzing` → Show spinner + "Analyzing compliance against templates..." + template list
- `complete` → Show success state + auto-navigate to report
- `error` → Show error state with retry option

**3. Progress Display** (per user preference):
- No accurate progress bar (user explicitly requested this)
- Repeating spinner animation
- Phase-based text descriptions
- Template-by-template progress list during analysis

**4. State Management**:
- Use React state for storing latest API response
- Track polling status (active, paused, stopped)
- Handle cleanup on component unmount

**5. Error Handling**:
- Retry failed API calls (max 3 retries)
- Show error state if API consistently fails
- Allow manual refresh/retry

## Detailed Implementation Plan

### Step 1: Create API Response Type
**File**: `src/types/incident.ts`
- Add `ProcessingStatusResponse` interface matching API response structure
- Add `ProcessingPhase` type: `'transcribing' | 'analyzing' | 'complete' | 'error'`
- Add `TranscriptionStatus` type: `'pending' | 'processing' | 'complete' | 'failed'`
- Add `AuditStatus` type: `'pending' | 'processing' | 'complete' | 'failed'`
- Add `AuditProgress` interface for template-specific progress

### Step 2: Create Status Polling Hook
**File**: `src/hooks/useProcessingStatus.ts` (new file)
- Custom hook that encapsulates polling logic
- Parameters: `incidentId: string`, `pollInterval: number = 2500`
- Returns: `{ data, error, isLoading, refetch }`
- Features:
  - Automatic polling with configurable interval
  - Stop polling when phase === 'complete' or 'error'
  - Cleanup on unmount
  - Error retry logic (max 3 attempts)
  - Manual refetch capability

### Step 3: Create Phase Mapping Utility
**File**: `src/lib/utils/processingPhases.ts` (new file)
- Function: `mapPhaseToProgress(response: ProcessingStatusResponse): ProcessingProgress`
- Maps API response to `ProcessingProgress` format expected by ProcessingStatus component
- Phase-specific message generation:
  - `transcribing`: "Transcribing audio with OpenAI Whisper..."
  - `analyzing`: "Analyzing compliance against selected templates..."
  - `complete`: "Complete! Preparing your report..."
  - `error`: Extract error message from response
- Sets `progress` to 0 (no accurate progress tracking per user preference)
- Populates `currentTemplate` and `totalTemplates` during analyzing phase

### Step 4: Update Processing Page
**File**: `src/app/incidents/[id]/processing/page.tsx`
- Remove fake simulation code (lines 27-85)
- Import and use `useProcessingStatus` hook
- Map API response to `ProcessingProgress` using utility function
- Implement auto-navigation when `phase === 'complete'`
- Add error retry handler
- Keep existing UI structure (ProcessingStatus component, info card)

### Step 5: Enhance ProcessingStatus Component (Optional)
**File**: `src/components/incidents/ProcessingStatus.tsx`
- Remove progress bar display for phase-based processing (user preference)
- Emphasize spinner animation during active phases
- Add template progress list during analyzing phase
- Ensure accessibility (ARIA live regions for status updates)

## Step-by-Step Implementation Tasks

1. **Add type definitions** to `src/types/incident.ts`
   - ProcessingStatusResponse interface
   - Processing phase and status types
   - AuditProgress interface

2. **Create useProcessingStatus hook** at `src/hooks/useProcessingStatus.ts`
   - Implement fetch logic
   - Implement polling mechanism
   - Add error handling and retry logic
   - Add cleanup on unmount

3. **Create phase mapping utility** at `src/lib/utils/processingPhases.ts`
   - Implement mapPhaseToProgress function
   - Add phase-specific message generation
   - Handle template progress extraction

4. **Update processing page** at `src/app/incidents/[id]/processing/page.tsx`
   - Remove simulation code
   - Integrate useProcessingStatus hook
   - Implement phase-based rendering
   - Add auto-navigation on complete
   - Add error handling UI

5. **Test the implementation**
   - Verify polling starts on page load
   - Verify status updates in real-time
   - Verify auto-navigation on completion
   - Verify error handling and retry
   - Verify polling stops on unmount

## Risk Mitigation

### Potential Issues

1. **API Rate Limiting**
   - Mitigation: 2.5-second interval is conservative
   - Add exponential backoff on errors
   - Consider server-side rate limit headers

2. **Long Processing Times**
   - Mitigation: Show informative messages
   - Keep info card with expected timeline
   - Allow user to close tab and return later

3. **Network Failures**
   - Mitigation: Retry logic in hook
   - Show clear error messages
   - Provide manual refresh button

4. **State Synchronization**
   - Mitigation: Use API as single source of truth
   - Don't cache status locally beyond polling interval
   - Clear status on navigation

## Testing Strategy

### Unit Tests
- `useProcessingStatus` hook behavior
- Phase mapping utility correctness
- Error handling paths

### Integration Tests
- End-to-end polling flow
- Auto-navigation on completion
- Error recovery scenarios

### Manual Testing
- Upload incident and verify real-time updates
- Check all phase transitions
- Verify template progress display
- Test error states (network disconnect)
- Verify cleanup on navigation away

## Success Criteria

1. Processing page shows real-time status from API
2. Status updates every 2-3 seconds
3. Phase-based UI with spinner animation (no accurate progress bar)
4. Template-specific progress displayed during analysis
5. Auto-navigation to report on completion
6. Error states handled gracefully with retry option
7. Polling stops when phase is complete or error
8. Polling cleanup on component unmount
9. Accessible UI with proper ARIA attributes
10. No console errors or warnings

## Timeline Estimate

- Step 1 (Type definitions): 15 minutes
- Step 2 (Polling hook): 45 minutes
- Step 3 (Phase mapping): 30 minutes
- Step 4 (Update page): 30 minutes
- Step 5 (Component enhancements): 30 minutes
- Testing and refinement: 30 minutes

**Total**: ~3 hours

## Dependencies

- Existing `/api/incidents/[id]/status` endpoint (already implemented)
- ProcessingStatus component (already implemented)
- Type definitions in `src/types/incident.ts` (existing)
- No new external dependencies required
