# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fire Department Radio Transcription & Compliance Audit System - A Next.js application for transcribing fire department radio communications and performing automated compliance audits against policy templates.

**Tech Stack**: Next.js 15 (App Router), TypeScript 5, Tailwind CSS 4, Prisma (PostgreSQL), OpenAI API (Whisper + GPT-4.1), Shadcn/ui, Storybook 8

## ⚠️ CRITICAL: OpenAI API Requirements

This project has specific OpenAI API requirements that **MUST NOT** be changed:

### Required Model
- **Model**: `gpt-4.1`
- **DO NOT** substitute with `gpt-4o`, `gpt-4-turbo`, `gpt-4o-mini`, or any other model
- This is a hard requirement - changing the model will cause production failures

### Required API Endpoint
- **API**: `client.responses.create()` (Responses API)
- **DO NOT** use `client.chat.completions.create()` (Chat Completions API)
- The Responses API provides specific features required by this system

### Protected Files (DO NOT Modify Model/API)
- `src/lib/openai/template-generation.ts`
- `src/lib/openai/compliance-analysis-modular.ts`
- `src/lib/services/templateGeneration.ts`
- `src/lib/services/complianceService.ts`
- `src/lib/services/utils/openai.ts`

### Why These Requirements Exist
- The `gpt-4.1` model has been specifically validated for fire department compliance auditing
- The Responses API provides the structured outputs and reliability needed for safety-critical applications
- Changing these values will break existing audits and templates in the database
- Historical audit data relies on consistent model behavior

**If you need to modify OpenAI integration, consult the project lead first.**

## Common Commands

### Development
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:policy      # Run policy extraction and template generation tests only
```

### Design System & Documentation
```bash
npm run storybook        # Start Storybook on http://localhost:6006
npm run build-storybook  # Build static Storybook
```

### Database (Prisma)
```bash
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create and apply migrations
npx prisma studio        # Open Prisma Studio GUI
npx prisma db push       # Push schema changes without migrations
```

## Architecture

### Core System Flows

1. **Audio Transcription Flow**
   - Upload audio → `src/app/api/transcription/upload/route.ts`
   - Process with Whisper → `src/lib/services/transcription.ts` → `src/lib/openai/whisper.ts`
   - Store in DB via Prisma → `prisma/schema.prisma` (Transcript model)

2. **Policy-to-Template Conversion Flow** (Multi-turn AI generation)
   - Upload policy docs → `src/app/api/policy/extract/route.ts`
   - Extract text → `src/lib/services/policyExtraction.ts` (PDF/Word/Excel support)
   - Generate template → `src/app/api/policy/generate-template/route.ts`
   - Multi-turn AI processing → `src/lib/services/templateGeneration.ts` (uses GPT-4o with schema enforcement)
   - Save to DB → `prisma/schema.prisma` (Template, PolicyDocument, TemplateGeneration models)

3. **Compliance Auditing Flow**
   - Request audit → `src/app/api/compliance/audit/route.ts`
   - Analyze transcript → `src/lib/services/complianceService.ts` → `src/lib/openai/compliance-analysis.ts`
   - Score against template → Store results in Audit model

### Service Layer Architecture

All business logic is in `src/lib/services/`:
- **complianceService.ts** - Audit execution and scoring
- **templateService.ts** - Template CRUD operations
- **templateGeneration.ts** - AI-powered multi-turn template generation with schema enforcement
- **policyExtraction.ts** - Multi-format document parsing (PDF, Word, Excel, PowerPoint)
- **transcription.ts** - Whisper integration for audio transcription
- **emergencyDetection.ts** - Mayday and emergency keyword detection
- **storage.ts** - File storage abstraction
- **dashboard.ts** - Dashboard statistics aggregation

### OpenAI Integration (`src/lib/openai/`)

Centralized OpenAI API wrapper with retry logic and type safety:
- **whisper.ts** - Audio transcription with automatic chunking for large files
- **compliance-analysis.ts** - GPT-4 compliance auditing
- **template-generation.ts** - GPT-4 policy analysis for template creation
- **client.ts** - Shared OpenAI client with exponential backoff
- **errors.ts** - Custom error types for OpenAI operations
- **utils.ts** - Token counting, content chunking
- **README.md** - Detailed usage examples

**Important**: Current OpenAI API version is 1.82.0 (supports gpt-4.1 and client.responses.create()). Check `~/.claude/openai_response_endpoint.md` for the latest API changes.

### Database Schema (Prisma)

See `prisma/schema.prisma` for the full schema. Key models:
- **Incident** - Fire department emergency events
- **Transcript** - Audio transcriptions with segments and emergency detections
- **Template** - Compliance audit templates (including AI-generated ones)
- **Audit** - Compliance evaluation results
- **PolicyDocument** - Uploaded policy files (PDF, DOCX, XLSX, etc.)
- **TemplateGeneration** - AI generation metadata and confidence scores
- **Unit** - Fire apparatus (engines, ladders, etc.)

Many-to-many relationships:
- Incidents ↔ Units (incident assignments)
- Templates ↔ PolicyDocuments (template sources)
- TemplateGeneration ↔ PolicyDocuments (generation tracking)

### Frontend Architecture

**App Router Structure** (`src/app/`):
- `/` - Home/landing page
- `/incidents` - Incident dashboard
- `/policy` - Policy document upload and template generation
- `/api/*` - API routes (transcription, compliance, policy, dashboard)

**Component Organization** (`src/components/`):
- `ui/` - 20+ Shadcn/ui base components (Button, Input, Card, etc.)
- `emergency/` - Fire-specific components (IncidentCard, MaydayAlert, etc.)
- `layouts/` - Layout templates (DashboardLayout)
- `dashboard/` - Dashboard-specific components
- `incidents/` - Incident management components
- `policy/` - Policy and template components

**Design System**: See `DESIGN_SYSTEM.md` for complete documentation on:
- Fire department color palette (NFPA-inspired)
- Emergency typography and spacing
- Touch targets (44px standard, 56px for critical actions)
- WCAG 2.2 AA accessibility compliance
- Responsive breakpoints

### Type Definitions

- `src/types/incident.ts` - Incident, transcript, and audit types
- `src/types/policy.ts` - Policy document and template types
- Prisma auto-generates types from schema

## Key Implementation Details

### Multi-turn Template Generation

The template generation system (`src/lib/services/templateGeneration.ts`) uses a sophisticated multi-turn approach:
1. Sends full document context in each turn (not incremental)
2. Enforces JSON schema validation on each turn
3. Supports multi-document analysis
4. Tracks jobId across turns for state management
5. Returns structured `GeneratedTemplate` with confidence scores

### Policy Document Support

`policyExtraction.ts` supports multiple formats:
- **PDF** - Using pdf-parse
- **Word (.docx)** - Using mammoth
- **Excel (.xlsx)** - Using xlsx
- **PowerPoint (.pptx)** - Using officeparser
- **Text (.txt)** - Direct reading

### OpenAI Integration Patterns

Always use the centralized client from `src/lib/openai/client.ts` for:
- Automatic retry with exponential backoff
- Error handling with custom error types
- Shared configuration (API key, org ID)

Example:
```typescript
import { getClient } from '@/lib/openai/client';

const client = await getClient();
const response = await client.chat.completions.create({...});
```

### Emergency Detection

`emergencyDetection.ts` scans transcripts for:
- Mayday calls
- Emergency terminology (firefighter down, collapse, trapped, etc.)
- Returns structured detections with timestamps and confidence

### Testing Strategy

- Jest + ts-jest for unit tests
- Tests in `__tests__/services/`
- Coverage thresholds: 80% lines, 75% functions, 70% branches
- Path alias `@/` maps to `src/`
- Mock OpenAI client in tests

## Design System

All components follow fire department emergency service design principles:
- **Mission-critical speed** - Information in seconds
- **Stress-reduced interface** - Clear hierarchy under pressure
- **Emergency-ready visuals** - High contrast for outdoor visibility
- **Touch-friendly** - 44px minimum touch targets (56px for critical actions)
- **WCAG 2.2 AA compliant** - Verified color contrast ratios

Use Storybook to preview all components interactively. All emergency-specific components have `.stories.tsx` files with multiple variants.

## ⚠️ CRITICAL: OpenAI API Requirements

This project has specific OpenAI API requirements that MUST NOT be changed:

### Required Model
- **Model**: `gpt-4.1`
- **DO NOT** substitute with `gpt-4o`, `gpt-4-turbo`, `gpt-4o-mini`, or any other model
- This is a hard requirement - changing the model will cause production failures

### Required API Endpoint
- **API**: `client.responses.create()` (Responses API)
- **DO NOT** use `client.chat.completions.create()` (Chat Completions API)
- The Responses API provides specific features required by this system

### Why These Requirements Exist
- The `gpt-4.1` model has been specifically validated for fire department compliance auditing
- The Responses API provides the structured outputs and reliability needed for safety-critical applications
- Changing these values will break existing audits and templates in the database

### Files with Model Requirements
All OpenAI integration files include warning comments. DO NOT modify these:
- `src/lib/openai/template-generation.ts`
- `src/lib/openai/compliance-analysis-modular.ts`
- `src/lib/services/templateGeneration.ts`
- `src/lib/services/complianceService.ts`
- `src/lib/services/utils/openai.ts`
- `src/lib/types/index.ts`

**If you need to modify OpenAI integration, consult the project lead first.**

## Important Notes

- **OpenAI API Key**: Required in `.env.local` as `OPENAI_API_KEY`
- **Database**: PostgreSQL required (connection string in `DATABASE_URL`)
- **File Uploads**: Currently in-memory (production requires cloud storage integration)
- **Path Aliases**: `@/` maps to `src/` (configured in tsconfig.json)
- **Multi-turn AI**: Template generation uses full-context per turn, not incremental
- **Schema Enforcement**: All AI-generated templates validated against JSON schema
