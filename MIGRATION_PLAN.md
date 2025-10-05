# Fire Department Radio Transcription System - Migration Plan

## **1. Application Overview**

### **1.1 Introduction**
The Fire Department Radio Transcription System is a specialized emergency operations platform designed to transcribe fire department radio communications and audit them for compliance with NFPA standards and department SOPs. The system processes audio recordings from fireground operations, identifies critical communications (especially mayday calls), and generates compliance scorecards to help improve operational effectiveness and firefighter safety.

### **1.2 Core Functionality**

#### **Radio Transcription**
- **Audio Processing**: Upload and optimize fire radio recordings (MP3, MP4, M4A, WAV, WEBM)
- **Real-time Transcription**: Convert speech to text with precise timestamps
- **Emergency Detection**: Automatically identify and prioritize mayday calls and emergency communications
- **Speaker Identification**: Distinguish between incident command, unit officers, and firefighters
- **Context Extraction**: Identify locations, times, units, and critical operational details

#### **Compliance Auditing**
- **Template Management**: NFPA standard-based compliance templates
- **Automated Scoring**: AI-powered evaluation against fire service protocols
- **Findings Generation**: Timestamped citations with specific compliance issues
- **Recommendations**: Actionable improvement suggestions
- **Trend Analysis**: Track compliance patterns over time

#### **Operational Intelligence**
- **Incident Tracking**: Live dashboard of active incidents
- **Performance Metrics**: Compliance rates, response times, training effectiveness
- **Analytics Dashboard**: Trend analysis and operational insights
- **Report Generation**: Shift reports, incident reviews, training matrices

### **1.3 Current State**
- **Technology**: Streamlit-based Python application
- **Database**: File-based storage with JSON structures
- **Deployment**: Local/hosted Streamlit server
- **Limitations**: Generic UI, limited scalability, no mobile optimization

### **1.4 Target State**
- **Technology**: Next.js 15 with TypeScript, Azure Container Apps
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Scalable Azure infrastructure with CI/CD
- **Features**: Mobile-responsive, real-time updates, enterprise security

---

## **2. Migration Strategy Overview**

### **2.1 Migration Goals**
1. **Modern Technology Stack**: Replace Streamlit with Next.js for better performance and scalability
2. **Enhanced UI/UX**: Fire department-specific interface optimized for emergency operations
3. **Improved Data Management**: Move from file-based to relational database storage
4. **Mobile Optimization**: Enable field use on tablets and rugged devices
5. **Enterprise Deployment**: Azure Container Apps with auto-scaling and monitoring
6. **Real-time Features**: Live transcription progress and incident updates

### **2.2 Migration Approach**
- **Incremental Migration**: Phase-by-phase approach to minimize disruption
- **Parallel Development**: Build new system while maintaining current functionality
- **Data Preservation**: Migrate existing transcripts, templates, and audit results
- **Testing-First**: Comprehensive testing at each phase before proceeding
- **User Validation**: Fire department input throughout the process

---

## **3. Detailed Refactoring Plan**

### **Phase 1: Foundation Setup (Week 1-2)**

#### **3.1.1 Project Initialization**
```bash
# Create new Next.js project
npx create-next-app@15 fire-department-transcriber --typescript --tailwind --eslint --app
cd fire-department-transcriber

# Install core dependencies
npm install @prisma/client prisma
npm install openai @types/node
npm install @radix-ui/react-dialog @radix-ui/react-select
npm install @headlessui/react lucide-react
npm install framer-motion react-hook-form @hookform/resolvers
npm install @tanstack/react-query zustand
npm install ioredis bcryptjs jsonwebtoken
npm install wavesurfer.js mic-recorder-to-mp3

# Install dev dependencies
npm install -D @types/bcryptjs @types/jsonwebtoken
npm install -D prettier prettier-plugin-tailwindcss
npm install -D jest @testing-library/react @testing-library/jest-dom
```

#### **3.1.2 Database Schema Design**
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Incident {
  id            String   @id @default(cuid())
  number        String   @unique
  type          String
  severity      String   // CRITICAL, HIGH, MEDIUM, LOW
  address       String
  startTime     DateTime
  endTime       DateTime?
  status        String   // ACTIVE, RESOLVED, MONITORING
  summary       String?
  units         Unit[]
  transcripts   Transcript[]
  audits        Audit[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("incidents")
}

model Transcript {
  id            String   @id @default(cuid())
  incidentId    String
  audioUrl      String   // Azure Blob Storage URL
  originalName  String
  duration      Int      // seconds
  fileSize      Int      // bytes
  format        String   // mp3, mp4, etc.
  text          String
  segments      Json     // Array of timed segments
  metadata      Json     // processing info, quality metrics
  detections    Json?    // mayday calls, emergency terms
  incident      Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("transcripts")
}

model Template {
  id            String   @id @default(cuid())
  name          String
  description   String?
  version       String   @default("1.0")
  categories    Json     // Compliance categories and criteria
  isActive      Boolean  @default(true)
  source        String?  // NFPA 1561, Custom SOP, etc.
  lastUpdated   DateTime @updatedAt
  createdAt     DateTime @default(now())
  audits        Audit[]

  @@map("templates")
}

model Audit {
  id              String   @id @default(cuid())
  incidentId      String
  templateId      String
  overallScore    Float?
  overallStatus   String   // PASS, FAIL, NEEDS_IMPROVEMENT
  summary         String
  findings        Json     // Detailed compliance findings
  recommendations Json     // Action items
  metadata        Json     // scoring details, timing
  incident        Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  template        Template @relation(fields: [templateId], references: [id])
  createdAt       DateTime @default(now())

  @@map("audits")
}

model Unit {
  id          String   @id @default(cuid())
  number      String   // Engine 1, Ladder 2, Battalion 1
  type        String   // ENGINE, LADDER, BATTALION, EMS, RESCUE
  personnel   Int      // Number of personnel
  captain     String?  // Unit captain name
  station     String?  // Home station
  incidents   Incident[]
  createdAt   DateTime @default(now())

  @@map("units")
}

model SystemMetrics {
  id            String   @id @default(cuid())
  metricName    String
  metricValue   Float
  metadata      Json?
  recordedAt    DateTime @default(now())

  @@map("system_metrics")
}
```

#### **3.1.3 Project Structure Setup**
```
src/
├── app/
│   ├── (auth)/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx
│   │   ├── incidents/
│   │   ├── transcription/
│   │   ├── compliance/
│   │   └── analytics/
│   ├── api/
│   │   ├── transcription/
│   │   ├── compliance/
│   │   ├── incidents/
│   │   └── upload/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── forms/
│   ├── emergency/
│   └── charts/
├── lib/
│   ├── db.ts
│   ├── utils.ts
│   ├── hooks/
│   ├── services/
│   └── constants/
├── types/
└── public/
```

#### **3.1.4 Azure Infrastructure Setup**
```bash
# Create resource group
az group create --name fire-department-rg --location eastus

# Create container app environment
az containerapp env create --name fire-department-env --resource-group fire-department-rg

# Create Azure PostgreSQL
az postgres flexible-server create \
  --name fire-department-db \
  --resource-group fire-department-rg \
  --location eastus \
  --admin-user fireadmin \
  --admin-password FIRE_ADMIN_PASSWORD \
  --sku-name Standard_D2s_v3 \
  --version 15

# Create Azure Storage Account
az storage account create \
  --name firedeptstorage \
  --resource-group fire-department-rg \
  --location eastus \
  --sku Standard_LRS

# Create Container Registry
az acr create \
  --name firedepartment \
  --resource-group fire-department-rg \
  --sku Basic
```

### **Phase 2: Core Features Development (Week 3-4)**

#### **3.2.1 Audio Transcription Service**
```typescript
// src/lib/services/transcription.ts
import OpenAI from 'openai';
import { BlobServiceClient } from '@azure/storage-blob';

export class TranscriptionService {
  private openai: OpenAI;
  private blobClient: BlobServiceClient;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.blobClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING!
    );
  }

  async processAudio(audioFile: File): Promise<TranscriptionResult> {
    // 1. Upload to Azure Blob Storage
    const audioUrl = await this.uploadAudio(audioFile);
    
    // 2. Process with OpenAI Whisper
    const transcription = await this.transcribeAudio(audioFile);
    
    // 3. Extract segments and metadata
    const segments = this.extractSegments(transcription);
    
    // 4. Detect emergency communications
    const detections = await this.detectEmergencies(transcription.text);
    
    return {
      audioUrl,
      text: transcription.text,
      segments,
      detections,
      metadata: {
        duration: transcription.duration,
        originalName: audioFile.name,
        format: audioFile.type,
        processedAt: new Date().toISOString()
      }
    };
  }

  private async uploadAudio(file: File): Promise<string> {
    const containerName = 'audio-files';
    const blobName = `${Date.now()}-${file.name}`;
    const containerClient = this.blobClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file);
    return blockBlobClient.url;
  }

  private async transcribeAudio(file: File) {
    const transcription = await this.openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment']
    });

    return transcription;
  }

  private detectEmergencies(text: string): EmergencyDetection[] {
    const maydayPatterns = [
      /\b(mayday|may day|may-day)\b/gi,
      /\b(emergency|emergency emergency)\b/gi,
      /\b(firefighter down|ff down|down firefighter)\b/gi,
      /\b(trapped|stuck|can't get out)\b/gi,
      /\b(collapse|structural collapse)\b/gi
    ];

    const detections: EmergencyDetection[] = [];
    
    maydayPatterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const context = this.extractContext(text, match);
          detections.push({
            type: 'MAYDAY',
            severity: 'CRITICAL',
            keyword: match,
            context,
            timestamp: this.extractTimestamp(text, match)
          });
        });
      }
    });

    return detections;
  }
}
```

#### **3.2.2 Compliance Scoring Engine**
```typescript
// src/lib/services/compliance.ts
import OpenAI from 'openai';
import { prisma } from '@/lib/db';

export class ComplianceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async auditTranscript(
    transcriptId: string,
    templateId: string,
    additionalNotes?: string
  ): Promise<AuditResult> {
    // 1. Get transcript and template
    const transcript = await prisma.transcript.findUnique({
      where: { id: transcriptId },
      include: { incident: true }
    });

    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });

    if (!transcript || !template) {
      throw new Error('Transcript or template not found');
    }

    // 2. Build scoring prompt
    const prompt = this.buildScoringPrompt(transcript, template, additionalNotes);

    // 3. Process with OpenAI
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a fire department compliance auditor with 20+ years of experience. 
          Analyze radio transcripts for strict adherence to NFPA standards and department SOPs. 
          Be thorough, objective, and provide specific timestamped examples for all findings.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_object',
        schema: this.getComplianceSchema()
      }
    });

    const auditResult = JSON.parse(response.choices[0].message.content!);

    // 4. Save audit result
    const savedAudit = await prisma.audit.create({
      data: {
        incidentId: transcript.incidentId,
        templateId: templateId,
        overallScore: auditResult.overall_score,
        overallStatus: auditResult.overall_status,
        summary: auditResult.summary,
        findings: auditResult.categories,
        recommendations: auditResult.recommendations,
        metadata: {
          processedAt: new Date().toISOString(),
          model: 'gpt-4o',
          additionalNotes
        }
      }
    });

    return {
      ...auditResult,
      auditId: savedAudit.id,
      processedAt: savedAudit.createdAt
    };
  }

  private buildScoringPrompt(
    transcript: any,
    template: any,
    additionalNotes?: string
  ): string {
    return `
FIREGROUND COMPLIANCE AUDIT

Incident Details:
- Number: ${transcript.incident.number}
- Type: ${transcript.incident.type}
- Severity: ${transcript.incident.severity}
- Duration: ${this.formatDuration(transcript.duration)}
- Date: ${transcript.incident.startTime}

Radio Transcript:
${transcript.text}

Compliance Framework:
${JSON.stringify(template.categories, null, 2)}

${additionalNotes ? `Additional Context: ${additionalNotes}` : ''}

ANALYSIS REQUIREMENTS:
1. Evaluate each criterion against the transcript
2. Provide specific timestamped examples for all findings
3. Assign scores (0-100) with clear justification
4. Identify critical safety violations immediately
5. Generate actionable recommendations
6. Cite exact radio communications for evidence

Return detailed scoring with findings and recommendations.
    `.trim();
  }

  private getComplianceSchema() {
    return {
      type: "json_object",
      schema: {
        type: "object",
        properties: {
          overall_status: { type: "string" },
          overall_score: { type: "number" },
          summary: { type: "string" },
          categories: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                status: { type: "string" },
                score: { type: "number" },
                rationale: { type: "string" },
                criteria: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      status: { type: "string" },
                      score: { type: "number" },
                      rationale: { type: "string" },
                      findings: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            timestamp: { type: "string" },
                            quote: { type: "string" },
                            severity: { type: "string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["overall_status", "overall_score", "summary", "categories"]
      }
    };
  }
}
```

#### **3.2.3 Core UI Components**
```typescript
// src/components/emergency/IncidentCard.tsx
import React from 'react';
import { AlertTriangle, Users, Clock, MapPin } from 'lucide-react';

interface IncidentCardProps {
  incident: {
    id: string;
    number: string;
    type: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    address: string;
    startTime: Date;
    status: string;
    units: Array<{
      number: string;
      type: string;
    }>;
  };
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const severityColors = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-yellow-500',
    LOW: 'bg-green-500'
  };

  const statusColors = {
    ACTIVE: 'text-red-600',
    RESOLVED: 'text-green-600',
    MONITORING: 'text-yellow-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${severityColors[incident.severity]}`} />
            <h3 className="text-lg font-semibold">{incident.number}</h3>
            <span className={`text-sm font-medium ${statusColors[incident.status]}`}>
              {incident.status}
            </span>
          </div>
          
          <p className="text-gray-600 mb-2">{incident.type}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {incident.address}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {incident.startTime.toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {incident.units.length} units
            </div>
          </div>
          
          <div className="mt-3 flex flex-wrap gap-2">
            {incident.units.map((unit) => (
              <span
                key={unit.number}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
              >
                {unit.number}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
            View Details
          </button>
          <button className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">
            Start Audit
          </button>
        </div>
      </div>
    </div>
  );
}
```

### **Phase 3: Advanced Features (Week 5-6)**

#### **3.3.1 Real-time WebSocket Service**
```typescript
// src/lib/websocket.ts
import { Server } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';

export default function SocketHandler(req: NextApiRequest, res: NextApiResponse) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const httpServer = res.socket.server as any;
    const io = new Server(httpServer, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-transcription', (jobId) => {
        socket.join(`transcription-${jobId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
  res.end();
}

// Progress broadcasting service
export class ProgressService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  broadcastTranscriptionProgress(jobId: string, progress: any) {
    this.io.to(`transcription-${jobId}`).emit('transcription-progress', {
      jobId,
      ...progress
    });
  }

  broadcastIncidentUpdate(incidentId: string, update: any) {
    this.io.emit('incident-update', {
      incidentId,
      ...update
    });
  }
}
```

#### **3.3.2 Analytics Dashboard**
```typescript
// src/components/charts/ComplianceChart.tsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ComplianceChartProps {
  data: Array<{
    date: string;
    score: number;
    incidents: number;
  }>;
}

export function ComplianceChart({ data }: ComplianceChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Compliance Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#dc2626"
            strokeWidth={2}
            name="Compliance Score"
          />
          <Line
            type="monotone"
            dataKey="incidents"
            stroke="#059669"
            strokeWidth={2}
            name="Incident Count"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### **Phase 4: Data Migration & Testing (Week 7)**

#### **3.4.1 Data Migration Script**
```typescript
// scripts/migrate-data.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function migrateTranscripts() {
  const transcriptsDir = path.join(__dirname, '../transcripts');
  
  // Read existing transcript files
  const transcriptFiles = fs.readdirSync(transcriptsDir)
    .filter(file => file.endsWith('.json'));

  for (const file of transcriptFiles) {
    try {
      const filePath = path.join(transcriptsDir, file);
      const transcriptData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Create or find incident
      const incident = await prisma.incident.upsert({
        where: { number: transcriptData.incident_number || `MIGRATED-${Date.now()}` },
        update: {},
        create: {
          number: transcriptData.incident_number || `MIGRATED-${Date.now()}`,
          type: transcriptData.incident_type || 'MIGRATED',
          severity: 'MEDIUM',
          address: transcriptData.address || 'Migrated Data',
          startTime: new Date(transcriptData.created_at || Date.now()),
          status: 'RESOLVED'
        }
      });

      // Create transcript record
      await prisma.transcript.create({
        data: {
          incidentId: incident.id,
          audioUrl: transcriptData.audio_url || '',
          originalName: file,
          duration: transcriptData.duration || 0,
          fileSize: transcriptData.file_size || 0,
          format: transcriptData.format || 'json',
          text: transcriptData.text || '',
          segments: transcriptData.segments || {},
          metadata: {
            migrated: true,
            originalFile: file,
            migratedAt: new Date().toISOString()
          }
        }
      });

      console.log(`Migrated: ${file}`);
    } catch (error) {
      console.error(`Failed to migrate ${file}:`, error);
    }
  }
}

async function migrateTemplates() {
  const policiesDir = path.join(__dirname, '../transcripts/policies');
  
  if (!fs.existsSync(policiesDir)) {
    console.log('No policies directory found');
    return;
  }

  const templateFiles = fs.readdirSync(policiesDir)
    .filter(file => file.endsWith('.json'));

  for (const file of templateFiles) {
    try {
      const filePath = path.join(policiesDir, file);
      const templateData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      await prisma.template.create({
        data: {
          name: templateData.template_name || file.replace('.json', ''),
          description: 'Migrated from original system',
          version: '1.0',
          categories: templateData.categories || {},
          source: 'MIGRATED',
          isActive: true
        }
      });

      console.log(`Migrated template: ${file}`);
    } catch (error) {
      console.error(`Failed to migrate template ${file}:`, error);
    }
  }
}

async function main() {
  console.log('Starting data migration...');
  
  await migrateTranscripts();
  await migrateTemplates();
  
  console.log('Migration completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

#### **3.4.2 Test Suite Development**
```typescript
// tests/transcription.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TranscriptionUpload } from '@/components/transcription/TranscriptionUpload';

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({
          text: 'Test transcription',
          duration: 120,
          segments: []
        })
      }
    }
  }))
}));

// Mock Azure Storage
jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: jest.fn().mockImplementation(() => ({
    getContainerClient: jest.fn().mockReturnValue({
      getBlockBlobClient: jest.fn().mockReturnValue({
        uploadData: jest.fn().mockResolvedValue({ url: 'test-url' })
      })
    })
  }))
}));

describe('TranscriptionUpload', () => {
  it('should upload and process audio file', async () => {
    render(<TranscriptionUpload />);
    
    const fileInput = screen.getByLabelText('Upload audio file');
    const file = new File(['test audio'], 'test.mp3', { type: 'audio/mpeg' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    fireEvent.click(screen.getByText('Start Transcription'));
    
    await waitFor(() => {
      expect(screen.getByText('Transcription completed')).toBeInTheDocument();
    });
  });

  it('should detect mayday calls', async () => {
    const mockTranscription = {
      text: 'Engine 1 to Command. Mayday mayday mayday! We have a firefighter down.',
      segments: []
    };

    // Test mayday detection logic
    const detection = new TranscriptionService();
    const emergencies = detection.detectEmergencies(mockTranscription.text);
    
    expect(emergencies).toHaveLength(1);
    expect(emergencies[0].type).toBe('MAYDAY');
    expect(emergencies[0].severity).toBe('CRITICAL');
  });
});
```

### **Phase 5: Deployment & Launch (Week 8)**

#### **3.5.1 Docker Configuration**
```dockerfile
# Dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["next", "start"]
```

#### **3.5.2 Azure Container App Deployment**
```yaml
# azure-container-app.yml
name: fire-department-transcriber
resourceGroup: fire-department-rg
location: eastus
type: Microsoft.App/containerApps

properties:
  managedEnvironment: fire-department-env
  configuration:
    ingress:
      external: true
      targetPort: 3000
      allowInsecure: false
      traffic:
        - latestRevision: true
          weight: 100
    secrets:
      - name: database-url
        value: $DATABASE_URL
      - name: openai-api-key
        value: $OPENAI_API_KEY
      - name: azure-storage-connection-string
        value: $AZURE_STORAGE_CONNECTION_STRING
  template:
    containers:
      - image: firedepartment.azurecr.io/transcriber:latest
        name: transcriber
        resources:
          cpu: 2.0
          memory: 4Gi
        env:
          - name: DATABASE_URL
            secretRef: database-url
          - name: OPENAI_API_KEY
            secretRef: openai-api-key
          - name: AZURE_STORAGE_CONNECTION_STRING
            secretRef: azure-storage-connection-string
          - name: NODE_ENV
            value: production
    scale:
      minReplicas: 2
      maxReplicas: 10
      rules:
        - name: cpu-scaling
          custom:
            type: cpu
            metadata:
              value: '70'
```

#### **3.5.3 CI/CD Pipeline**
```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Azure Container Registry
        uses: azure/docker-login@v1
        with:
          login-server: firedepartment.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}
      
      - name: Build and push
        run: |
          docker build -t firedepartment.azurecr.io/transcriber:${{ github.sha }} .
          docker push firedepartment.azurecr.io/transcriber:${{ github.sha }}
          docker tag firedepartment.azurecr.io/transcriber:${{ github.sha }} firedepartment.azurecr.io/transcriber:latest
          docker push firedepartment.azurecr.io/transcriber:latest
      
      - name: Deploy to Container Apps
        uses: azure/container-apps-deploy@v1
        with:
          containerAppName: fire-department-transcriber
          imageToDeploy: firedepartment.azurecr.io/transcriber:latest
          resourceGroup: fire-department-rg
```

---

## **4. Migration Timeline**

### **Week 1: Foundation**
- [ ] Project setup and dependencies installation
- [ ] Database schema design and migration
- [ ] Azure infrastructure provisioning
- [ ] Basic UI components and layout

### **Week 2: Core Services**
- [ ] Audio transcription service
- [ ] Azure blob storage integration
- [ ] OpenAI API integration
- [ ] Basic transcription UI

### **Week 3: Compliance System**
- [ ] Compliance scoring engine
- [ ] Template management system
- [ ] Audit workflow implementation
- [ ] Compliance results display

### **Week 4: Advanced Features**
- [ ] Real-time WebSocket connections
- [ ] Mayday detection system
- [ ] Emergency alert components
- [ ] Incident tracking dashboard

### **Week 5: Analytics & Reporting**
- [ ] Analytics dashboard
- [ ] Compliance trend charts
- [ ] Report generation system
- [ ] Data visualization components

### **Week 6: Mobile Optimization**
- [ ] Responsive design implementation
- [ ] Mobile-specific components
- [ ] Touch-friendly interfaces
- [ ] PWA configuration

### **Week 7: Data Migration & Testing**
- [ ] Data migration script execution
- [ ] Comprehensive testing suite
- [ ] Performance optimization
- [ ] Security implementation

### **Week 8: Deployment & Launch**
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] User training materials
- [ ] Go-live preparation

---

## **5. Risk Management & Mitigation**

### **5.1 Technical Risks**
- **Data Loss**: Implement comprehensive backup strategies before migration
- **Downtime**: Use blue-green deployment to minimize service interruption
- **Performance Issues**: Load testing and optimization before production
- **Security Vulnerabilities**: Security audit and penetration testing

### **5.2 Operational Risks**
- **User Adoption**: Comprehensive training and change management
- **Process Disruption**: Parallel operation during transition period
- **Resource Allocation**: Ensure adequate development and testing resources
- **Vendor Dependencies**: Verify Azure and OpenAI service availability

### **5.3 Mitigation Strategies**
- **Rollback Plan**: Maintain ability to revert to Streamlit version if needed
- **Phased Rollout**: Feature flags for gradual feature introduction
- **User Testing**: Fire department personnel involvement throughout development
- **Documentation**: Comprehensive technical and user documentation

---

## **6. Success Criteria**

### **6.1 Technical Metrics**
- [ ] Application loads in < 3 seconds
- [ ] Audio processing completes in real-time
- [ ] 99.9% uptime availability
- [ ] Support for 100+ concurrent users

### **6.2 Functional Requirements**
- [ ] All existing features successfully migrated
- [ ] Mayday detection with 95% accuracy
- [ ] Compliance scoring completes in < 2 minutes
- [ ] Mobile responsiveness on all devices

### **6.3 User Acceptance**
- [ ] 80% user satisfaction rating
- [ ] < 30 minutes training time for users
- [ ] 50% reduction in compliance documentation time
- [ ] Improved incident commander situational awareness

---

## **7. Post-Migration Support**

### **7.1 Monitoring & Maintenance**
- Application performance monitoring with Azure Monitor
- Error tracking and alerting systems
- Regular security updates and patches
- Database performance optimization

### **7.2 User Support**
- Comprehensive user documentation and training materials
- Technical support hotline and ticketing system
- Regular user feedback collection and system improvements
- Feature enhancement roadmap based on user needs

### **7.3 Continuous Improvement**
- Monthly performance reviews and optimizations
- Quarterly feature updates and enhancements
- Annual technology stack reviews and updates
- Ongoing security assessments and improvements

---

## **8. Conclusion**

This migration plan provides a comprehensive roadmap for transforming the Fire Department Radio Transcription System from a Streamlit prototype to an enterprise-ready Next.js application. The phased approach minimizes risk while delivering immediate value through modern technology, improved user experience, and enhanced capabilities for fire department operations.

The new system will provide firefighters and incident commanders with a powerful tool for improving operational effectiveness, ensuring compliance with safety protocols, and ultimately enhancing firefighter safety through better communication analysis and training.

---

*Document Version: 1.0*  
*Last Updated: December 2024*  
*Migration Timeline: 8 weeks*  
*Go-Live Target: Q1 2025*