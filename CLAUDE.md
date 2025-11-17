# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fire Department Radio Transcription & Compliance Audit System** - A dual-stack application for transcribing fire department radio communications and performing automated compliance audits against policy templates.

### Tech Stack

**Streamlit App** (Legacy Python prototype):
- Streamlit, OpenAI API (Whisper + GPT), pydub, pypdf, python-docx

**Next.js App** (Primary production application):
- Next.js 15 (App Router), TypeScript 5, React 19, Tailwind CSS 4
- Prisma ORM, PostgreSQL 16, Redis 7
- OpenAI API 1.82.0 (Whisper, GPT-4.1), Shadcn/ui, Storybook 8
- Docker Compose for infrastructure

## ⚠️ CRITICAL: OpenAI API Requirements

This project uses **specific OpenAI API configurations that MUST NOT be changed**:

### Required Configuration
- **Model**: `gpt-4.1` (DO NOT use gpt-4o, gpt-4-turbo, gpt-4o-mini, or other models)
- **API Endpoint**: `client.responses.create()` (Responses API, NOT Chat Completions API)

### Why This Matters
- GPT-4.1 has been specifically validated for fire department compliance auditing
- The Responses API provides structured outputs required for safety-critical applications
- Changing these will break existing audits and templates in the database
- Historical audit data relies on consistent model behavior

### Protected Files (DO NOT Modify Model/API)
- `nextjs-app/src/lib/openai/template-generation.ts`
- `nextjs-app/src/lib/openai/compliance-analysis-modular.ts`
- `nextjs-app/src/lib/services/templateGeneration.ts`
- `nextjs-app/src/lib/services/complianceService.ts`
- `nextjs-app/src/lib/services/utils/openai.ts`

**Important**: Current OpenAI API version is 1.82.0. Check `~/.claude/openai_response_endpoint.md` for latest API changes.

## Common Commands

### Streamlit App (Python)

#### Development
```bash
# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows

# Run app
streamlit run app.py       # Starts on http://localhost:8501
```

#### Testing
```bash
python -m pytest tests/                        # All tests
python -m pytest tests/test_utils.py -v        # Single test file
python -m pytest -k "test_ffmpeg"              # Specific test by name
```

#### Code Quality
```bash
python -m flake8 src/
python -m black src/
python -m mypy src/
```

### Next.js App (Primary)

#### Development
```bash
cd nextjs-app
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

#### Testing
```bash
npm test                 # Run all tests with Jest
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report (80% lines, 75% functions, 70% branches)
npm run test:policy      # Run policy extraction and template generation tests only
```

#### Design System & Storybook
```bash
npm run storybook        # Start Storybook on http://localhost:6006
npm run build-storybook  # Build static Storybook for deployment
```

#### Database (Prisma)
```bash
npx prisma generate      # Generate Prisma client from schema
npx prisma migrate dev   # Create and apply migrations (dev only)
npx prisma db push       # Push schema changes without migrations
npx prisma studio        # Open Prisma Studio GUI on http://localhost:5555
```

### Docker Infrastructure

#### Quick Start
```bash
# Automated setup (recommended)
./scripts/docker-start.sh

# Manual setup
docker compose up -d              # Start PostgreSQL, Redis, pgAdmin
docker compose ps                 # Check service health
docker compose logs -f [service]  # View logs
docker compose down               # Stop all services
docker compose down -v            # Stop and remove all data volumes
```

#### Service Access
- Next.js App: http://localhost:3000
- PostgreSQL: localhost:5433 (user: transcriber, pass: transcriber_password)
- Redis: localhost:6379
- pgAdmin: http://localhost:5050 (admin@transcriber.local / admin)

## Architecture

### Dual-Stack Structure

This repository contains TWO applications:

1. **Streamlit App** (`src/transcriber/`) - Python prototype for rapid audio transcription testing
2. **Next.js App** (`nextjs-app/`) - Production application with full feature set

### Next.js App Architecture

#### Core System Flows

**1. Audio Transcription Flow**
- Upload audio → `src/app/api/transcription/upload/route.ts`
- Process with Whisper → `src/lib/services/transcription.ts` → `src/lib/openai/whisper.ts`
- Store in DB via Prisma → `prisma/schema.prisma` (Transcript model)

**2. Policy-to-Template Conversion Flow** (Multi-turn AI generation)
- Upload policy docs → `src/app/api/policy/extract/route.ts`
- Extract text → `src/lib/services/policyExtraction.ts` (PDF/DOCX/XLSX/PPTX/TXT support)
- Generate template → `src/app/api/policy/generate-template/route.ts`
- Multi-turn AI processing → `src/lib/services/templateGeneration.ts` (uses GPT-4.1 with schema enforcement)
- Save to DB → Template, PolicyDocument, TemplateGeneration models

**3. Compliance Auditing Flow**
- Request audit → `src/app/api/compliance/audit/route.ts`
- Analyze transcript → `src/lib/services/complianceService.ts` → `src/lib/openai/compliance-analysis-modular.ts`
- Score against template → Store results in Audit model

#### Service Layer (`nextjs-app/src/lib/services/`)

All business logic is centralized in services:

- **complianceService.ts** - Audit execution and scoring against templates
- **templateService.ts** - Template CRUD operations
- **templateGeneration.ts** - AI-powered multi-turn template generation with schema enforcement
- **policyExtraction.ts** - Multi-format document parsing (PDF, Word, Excel, PowerPoint)
- **transcription.ts** - Whisper integration for audio transcription
- **emergencyDetection.ts** - Mayday and emergency keyword detection
- **storage.ts** - File storage abstraction (local/cloud)
- **dashboard.ts** - Dashboard statistics aggregation

#### OpenAI Integration (`nextjs-app/src/lib/openai/`)

Centralized OpenAI API wrappers with retry logic and type safety:

- **whisper.ts** - Audio transcription with automatic chunking for large files
- **compliance-analysis-modular.ts** - Category-by-category GPT-4.1 compliance auditing
- **template-generation.ts** - GPT-4.1 policy analysis for template creation
- **client.ts** - Shared OpenAI client with exponential backoff
- **errors.ts** - Custom error types for OpenAI operations
- **utils.ts** - Token counting, content chunking utilities
- **README.md** - Detailed usage examples and API documentation

**Important**: Always use the centralized client from `src/lib/openai/client.ts` for automatic retry logic and error handling.

#### Database Schema (Prisma)

Key models in `nextjs-app/prisma/schema.prisma`:

- **Incident** - Fire department emergency events
- **Transcript** - Audio transcriptions with segments and emergency detections
- **Template** - Compliance audit templates (including AI-generated ones)
- **Audit** - Compliance evaluation results
- **PolicyDocument** - Uploaded policy files (PDF, DOCX, XLSX, PPTX, TXT)
- **TemplateGeneration** - AI generation metadata and confidence scores
- **Unit** - Fire apparatus (engines, ladders, etc.)

Many-to-many relationships:
- Incidents ↔ Units (incident assignments)
- Templates ↔ PolicyDocuments (template sources)
- TemplateGeneration ↔ PolicyDocuments (generation tracking)

#### Frontend Structure (`nextjs-app/src/`)

**App Router** (`src/app/`):
- `/` - Home/landing page
- `/incidents` - Incident dashboard
- `/policy` - Policy document upload and template generation
- `/api/*` - API routes (transcription, compliance, policy, dashboard)

**Component Organization** (`src/components/`):
- `ui/` - 20+ Shadcn/ui base components (Button, Input, Card, Dialog, etc.)
- `emergency/` - Fire-specific components (IncidentCard, MaydayAlert, EmergencyBadge)
- `layouts/` - Layout templates (DashboardLayout)
- `dashboard/` - Dashboard-specific components
- `incidents/` - Incident management components
- `policy/` - Policy and template components

**Type Definitions**:
- `src/types/incident.ts` - Incident, transcript, and audit types
- `src/types/policy.ts` - Policy document and template types
- Prisma auto-generates database types from schema

### Streamlit App Architecture

Simple modular structure in `src/transcriber/`:

- **app.py** - Main Streamlit UI and application logic
- **transcription.py** - Core transcription service (OpenAI Whisper integration)
- **audio_processor.py** - Audio processing pipeline (ffmpeg, pydub)
- **file_manager.py** - Transcript storage and retrieval
- **policy_ingestion.py** - Policy document parsing and template building
- **scoring.py** - Compliance scoring engine
- **ui.py** - UI components (sidebar, controls, progress indicators)
- **constants.py** - Application constants and configuration

## Key Implementation Details

### Multi-turn Template Generation

The template generation system (`nextjs-app/src/lib/services/templateGeneration.ts`) uses a sophisticated approach:
- Sends full document context in each turn (not incremental)
- Enforces JSON schema validation on each turn via Zod
- Supports multi-document analysis
- Tracks jobId across turns for state management
- Returns structured `GeneratedTemplate` with confidence scores
- Uses GPT-4.1 with Responses API for structured outputs

### Policy Document Support

`policyExtraction.ts` supports multiple formats:
- **PDF** - Using pdf-parse library
- **Word (.docx)** - Using mammoth library
- **Excel (.xlsx)** - Using xlsx library
- **PowerPoint (.pptx)** - Using officeparser library
- **Text (.txt)** - Direct reading

### Emergency Detection

`emergencyDetection.ts` scans transcripts for critical keywords:
- Mayday calls
- Emergency terminology (firefighter down, collapse, trapped, etc.)
- Returns structured detections with timestamps and confidence scores

### Audio Processing (Streamlit App)

`audio_processor.py` handles complex audio preprocessing:
- Supports multiple formats (MP3, MP4, M4A, WAV, WEBM)
- Optimized for Microsoft Teams recordings (special codec handling)
- Automatic re-encoding and chunking to stay within API limits (25MB)
- Uses ffmpeg and pydub for audio manipulation
- Silence-based intelligent splitting for long recordings

## Design System

All Next.js components follow fire department emergency service design principles:

- **Mission-critical speed** - Information accessible in seconds
- **Stress-reduced interface** - Clear hierarchy under pressure
- **Emergency-ready visuals** - High contrast for outdoor/low-light visibility
- **Touch-friendly** - 44px minimum touch targets (56px for critical actions)
- **WCAG 2.2 AA compliant** - Verified color contrast ratios

See `nextjs-app/DESIGN_SYSTEM.md` for complete documentation on:
- Fire department color palette (NFPA-inspired)
- Emergency typography and spacing scales
- Responsive breakpoints
- Component variants and states

Use Storybook to preview all components interactively. All emergency-specific components have `.stories.tsx` files.

## Testing Strategy

### Next.js App Testing
- Jest + ts-jest for unit tests
- Tests in `nextjs-app/__tests__/services/`
- Coverage thresholds: 80% lines, 75% functions, 70% branches
- Path alias `@/` maps to `nextjs-app/src/`
- Mock OpenAI client in tests to avoid API costs

### Streamlit App Testing
- pytest for unit tests
- Tests in `tests/` directory
- Mock OpenAI API calls using fixtures in `conftest.py`
- Test audio processing with sample files

## Environment Configuration

### Next.js App
Create `nextjs-app/.env.local`:
```env
OPENAI_API_KEY=sk-proj-...
DATABASE_URL="postgresql://transcriber:transcriber_password@localhost:5433/transcriber_db?schema=public"
```

### Streamlit App
Create `.env` in project root:
```env
OPENAI_API_KEY=sk-proj-...
```

### Docker Infrastructure
Uses `.env` for database credentials (see `.env.example` or `.env.docker.example`)

## Important Notes

- **Path Aliases**: `@/` in Next.js app maps to `src/` (configured in tsconfig.json)
- **OpenAI API Key**: Required in environment variables for both apps
- **Database**: PostgreSQL required for Next.js app (use Docker Compose)
- **ffmpeg**: Required for Streamlit app audio processing (`brew install ffmpeg` on macOS)
- **File Uploads**: Next.js app currently uses in-memory storage (production requires Azure Blob/AWS S3)
- **Multi-turn AI**: Template generation uses full-context per turn, not incremental streaming
- **Schema Enforcement**: All AI-generated templates validated against JSON schema via Zod
- **Docker Ports**: PostgreSQL on 5433 (not 5432) to avoid conflicts with existing installations

## Documentation References

See these files for detailed information:
- `README.md` - Streamlit app setup and usage
- `nextjs-app/CLAUDE.md` - Next.js app specific guidance (already exists, comprehensive)
- `PRODUCT_SPECIFICATION.md` - Product requirements and user stories
- `TECHNICAL_ARCHITECTURE.md` - Detailed technical architecture
- `DOCKER_QUICKSTART.md` - Quick Docker setup guide
- `DOCKER_SETUP.md` - Comprehensive Docker documentation
- `nextjs-app/src/lib/openai/README.md` - OpenAI integration usage examples
