# Compliance Analysis Pipeline Integration Plan

## Problem Summary
The compliance analysis API is fully functional but not connected to the upload workflow. After transcription completes, nothing triggers the audit automatically.

## Solution: Auto-trigger Compliance Analysis After Transcription

---

## Implementation Steps

### 1. Store Template Selection with Incident
- Add `selectedTemplateIds` field to Incident model in Prisma schema
- Update incident creation API to accept and store template IDs
- Modify upload page to send template selections when creating incident

### 2. Trigger Compliance Analysis After Transcription
- Update `/api/transcription/process` route to:
  - After transcription completes, fetch incident with template selections
  - Loop through each selected template
  - Call compliance audit endpoint for each template asynchronously
  - Return list of initiated audit IDs along with transcript ID
- Add error handling if compliance analysis fails (still save transcript)

### 3. Update Processing Page with Phase-Based UI
- Replace fake progress bar with phase indicators
- Add polling mechanism to check:
  - Transcription status (from Transcript table)
  - Audit status for each template (from Audit table)
- Show phases:
  - "Transcribing audio..." (check if Transcript exists)
  - "Analyzing compliance against [Template Name]..." (for each template)
  - "Generating findings and recommendations..."
  - "Complete! Preparing your report..."
- Use spinner animation with phase text (not progress percentage)
- Poll every 2-3 seconds until all audits complete

### 4. Database Schema Updates
- Add migration to add `selectedTemplateIds` JSON field to Incident model
- Ensures templates are linked to incidents for future re-audits

### 5. Error Recovery
- If compliance audit fails, mark audit as failed but still show report
- Add "Re-run Analysis" button on report page for failed audits
- Log errors to SystemLog table for debugging

---

## Files to Modify

**Schema Changes:**
- `nextjs-app/prisma/schema.prisma` - Add selectedTemplateIds to Incident

**Backend:**
- `nextjs-app/src/app/api/incidents/create/route.ts` - Accept templateIds
- `nextjs-app/src/app/api/transcription/process/route.ts` - Trigger audits
- `nextjs-app/src/lib/services/incidentService.ts` - Store template selections

**Frontend:**
- `nextjs-app/src/app/incidents/upload/page.tsx` - Send templates to API
- `nextjs-app/src/app/incidents/[id]/processing/page.tsx` - Real polling + phases

**New Endpoints:**
- `GET /api/incidents/[id]/status` - Get incident processing status (transcript + audits)

---

## Flow After Implementation

```
1. User uploads audio + selects templates
   ↓
2. Incident created with selectedTemplateIds stored
   ↓
3. Transcription starts
   ↓
4. Transcription completes → Saves Transcript
   ↓
5. FOR EACH selected template:
     POST /api/compliance/audit (automatic, async)
   ↓
6. Processing page polls for status, shows phases:
   - "Transcribing audio..." ✓
   - "Analyzing compliance against NFPA 1561..." ⏳
   - "Analyzing compliance against Safety Protocol..." ⏳
   ↓
7. All audits complete → Navigate to report
   ↓
8. Report page shows all audit results
```

---

## Benefits
✅ Fully automatic - no manual API calls needed
✅ Multiple templates audited simultaneously
✅ Phase-based UI - honest about what's happening
✅ Template selections preserved for re-audits
✅ Error recovery if compliance fails
✅ Database tracks all processing steps

---

## Estimated Complexity
- Schema update: 10 min
- Backend integration: 30-45 min
- Processing page polling: 30 min
- Testing end-to-end: 20 min
**Total: ~90 minutes**

---

## Implementation Order

1. **Phase 1: Schema & Data Layer** (Sequential)
   - Update Prisma schema
   - Run migration
   - Update incident service

2. **Phase 2: API Layer** (Parallel)
   - Update incident creation endpoint
   - Update transcription process route
   - Create status endpoint

3. **Phase 3: Frontend** (Parallel)
   - Update upload page
   - Update processing page

4. **Phase 4: Testing & Review**
   - Code review after each phase
   - End-to-end testing
   - Error scenario testing
