# Fire Department Radio Transcription & Training Analysis System
## UI/UX Design Specification v2.0
**Post-Incident Analysis & Training Platform**

### **Executive Summary**
This document outlines the UI/UX design for a **post-incident analysis and training platform** for fire departments. The system enables fire crews and training officers to upload radio traffic recordings, automatically transcribe and analyze them against department policies and procedures, and generate comprehensive performance reports with visualizations for training and continuous improvement.

**Key Paradigm Shift**: This is **NOT** a live incident monitoring tool. It is a **retrospective analysis platform** for training, performance review, and continuous improvement.

---

## **1. System Overview**

### **Core Purpose**
Enable fire departments to:
1. **Upload department policies** → AI generates audit templates
2. **Customize templates** → Refine AI-generated scorecards
3. **Upload radio traffic** → Transcribe and analyze incidents
4. **Review insights** → Timeline visualization, scoring, narratives
5. **Train & improve** → Use reports for training materials

### **User Personas**
1. **Training Officer** (Primary) - Uploads incidents, reviews performance, creates training materials
2. **Fire Chief/Administration** - Reviews department-wide trends, compliance patterns
3. **Company Officers** - Reviews their crew's performance on specific incidents
4. **Firefighters** - Self-review and learning from incident playback

---

## **2. Design Philosophy**

### **Training-Focused UX Principles**
1. **Clarity Over Speed** - Deep analysis, not real-time pressure
2. **Learning-Oriented** - Constructive feedback, improvement focus
3. **Visual Storytelling** - Timeline helps crews "replay" the incident
4. **Data-Driven Insights** - AI identifies patterns humans might miss
5. **Customizable Standards** - Each department's policies drive scoring

### **Visual Design Direction**

#### **Color Palette**
- **Primary**: Professional Blue (#0066CC) - Trust, authority, analysis
- **Secondary**: Training Orange (#FF8C42) - Attention, learning opportunities
- **Success**: Achievement Green (#00A859) - Passing scores, compliance
- **Neutral**: Slate Gray (#475569) - Backgrounds, secondary content
- **Warning**: Caution Yellow (#F59E0B) - Areas needing improvement
- **Critical**: Alert Red (#DC2626) - Safety violations, critical findings

#### **Typography**
- **Headings**: Inter Display (professional, readable)
- **Body**: Inter Text (excellent readability for long-form content)
- **Data/Code**: JetBrains Mono (timestamps, transcripts, technical data)
- **Emphasis**: Bold for key findings, italic for context

#### **Iconography**
- Professional, business-like icons
- Fire service symbolism (helmets, radios, incidents)
- Analysis-focused icons (charts, reports, timelines)
- Learning-focused icons (graduation caps, targets, improvement)

---

## **3. Information Architecture**

### **Primary Navigation Structure**
```
🏠 Dashboard (Overview)
📚 Policy & Templates (AI Template Generation)
📻 Incidents (Upload & Analyze)
📊 Reports (Performance Reviews)
⚙️ Settings
```

### **Core Workflows**

#### **Workflow 1: Policy Upload → Template Generation**
```
1. Upload department policies (PDFs, DOCX)
   ↓
2. AI extracts criteria and generates audit template
   ↓
3. Review AI-generated template
   ↓
4. Edit/refine template (add/remove criteria, adjust weights)
   ↓
5. Save template for future use
```

#### **Workflow 2: Incident Analysis**
```
1. Upload radio traffic audio file
   ↓
2. AI transcribes audio with timestamps
   ↓
3. Select audit template(s) to apply
   ↓
4. AI analyzes transcript against template criteria
   ↓
5. Review results: scores, timeline, narrative, findings
   ↓
6. Export reports for training use
```

---

## **4. Detailed Interface Design**

### **🏠 Dashboard (Landing Page)**

#### **Layout Structure**
```
┌─────────────────────────────────────────────────────────┐
│ 🔥 Fire Department Training Analysis Platform            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│ │  INCIDENTS  │ │  TEMPLATES  │ │   AVG SCORE │         │
│ │   ANALYZED  │ │   ACTIVE    │ │             │         │
│ │     127     │ │      8      │ │     87%     │         │
│ │   ↗️ +12    │ │   ↗️ +2     │ │   ↗️ +3%    │         │
│ └─────────────┘ └─────────────┘ └─────────────┘         │
│                                                         │
│ Quick Actions                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [📄 Upload Policy & Generate Template]              │ │
│ │ [📻 Upload Radio Traffic & Analyze]                 │ │
│ │ [📋 View Recent Reports]                            │ │
│ │ [📊 Department Performance Trends]                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Recent Incidents                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Structure Fire - 123 Main St                        │ │
│ │ Dec 15, 2024 • Score: 78% • Mayday: Yes             │ │
│ │ [View Report] [View Timeline] [Export PDF]          │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Vehicle Accident - I-95 Northbound                  │ │
│ │ Dec 14, 2024 • Score: 92% • Mayday: No              │ │
│ │ [View Report] [View Timeline] [Export PDF]          │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Medical Emergency - City Park                       │ │
│ │ Dec 13, 2024 • Score: 95% • Mayday: No              │ │
│ │ [View Report] [View Timeline] [Export PDF]          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Performance Trends (Last 30 Days)                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ┌─Chart: Compliance Score Over Time─────────────┐   │ │
│ │ │                                  ╱─╲           │   │ │
│ │ │                          ╱─╲   ╱   ╲          │   │ │
│ │ │                  ╱─╲   ╱   ╲─╱     ╲         │   │ │
│ │ │          ╱─╲   ╱   ╲─╱               ╲       │   │ │
│ │ │  ╱─╲   ╱   ╲─╱                         ╲     │   │ │
│ │ │─╱   ╲─╱                                 ╲─   │   │ │
│ │ │ Week1  Week2  Week3  Week4  [This Week]      │   │ │
│ │ │ 82%    85%    88%    86%    87%              │   │ │
│ │ └──────────────────────────────────────────────┘   │ │
│ │                                                     │ │
│ │ Top Improvement Areas:                              │ │
│ │ • Communication clarity: +8%                       │ │
│ │ • Safety officer procedures: +12%                  │ │
│ │ • Resource management: +5%                         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### **📚 Policy & Templates (AI Template Generation)**

#### **Template Library View**
```
┌─────────────────────────────────────────────────────────┐
│ 📚 Audit Templates & Policy Documents                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [📄 Upload Policy Document & Generate Template]         │
│                                                         │
│ Active Templates                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ NFPA 1561: Incident Command System                  │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│ │ Type: Standard Template • Status: Active             │ │
│ │ Created: Nov 2024 • Used: 45 times                   │ │
│ │                                                      │ │
│ │ 📊 Statistics:                                       │ │
│ │ • 8 categories • 42 criteria                        │ │
│ │ • Avg Score: 92% • Most Recent: 87%                 │ │
│ │                                                      │ │
│ │ [Edit Template] [View Details] [Duplicate] [Archive]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🤖 AI: Incident Safety Protocol                     │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│ │ Type: AI-Generated • Status: Active                  │ │
│ │ Generated: Dec 15, 2024 • Used: 8 times              │ │
│ │                                                      │ │
│ │ 📄 Source Documents:                                 │ │
│ │ • Engine Operations Manual.pdf (45 pages)           │ │
│ │ • Mayday Protocol.docx (12 pages)                   │ │
│ │ • Safety SOP v2.1.pdf (23 pages)                    │ │
│ │                                                      │ │
│ │ 📊 Template Details:                                 │ │
│ │ • 6 categories • 38 criteria                        │ │
│ │ • AI Confidence: 94%                                │ │
│ │ • Avg Score: 85% • Most Recent: 78%                 │ │
│ │                                                      │ │
│ │ ⚠️ Needs Review: AI detected policy updates in      │ │
│ │    source document (Safety SOP v2.2 uploaded)       │ │
│ │                                                      │ │
│ │ [Review Changes] [Edit Template] [View Sources]      │ │
│ │ [Regenerate] [View Analysis History]                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🤖 AI: Multi-Agency Operations                      │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│ │ Type: AI-Generated • Status: Draft                   │ │
│ │ Generated: Dec 10, 2024 • Used: 0 times              │ │
│ │                                                      │ │
│ │ 📄 Source Documents:                                 │ │
│ │ • ICS Manual.pdf (67 pages)                         │ │
│ │ • Multi-Agency SOP.docx (34 pages)                  │ │
│ │                                                      │ │
│ │ 📊 Template Details:                                 │ │
│ │ • 5 categories • 29 criteria                        │ │
│ │ • AI Confidence: 89%                                │ │
│ │                                                      │ │
│ │ ⚠️ Action Required: Review and approve template     │ │
│ │                                                      │ │
│ │ [Review & Approve] [Edit] [Discard]                 │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### **Policy Upload & Template Generation Flow**
```
┌─────────────────────────────────────────────────────────┐
│ 📄 Upload Policy & Generate Audit Template              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Step 1: Upload Department Policy Documents              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │   📄 Drop policy documents here                     │ │
│ │      or click to browse                             │ │
│ │                                                     │ │
│ │   Supported formats: PDF, DOCX, TXT, MD             │ │
│ │   Max size: 50MB per file • Multiple files allowed  │ │
│ │                                                     │ │
│ │   [Browse Files] [Upload from URL]                  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Uploaded Documents:                                     │
│ ✅ Engine Operations Manual.pdf (45 pages, 2.3 MB)     │
│ ✅ Mayday Protocol.docx (12 pages, 456 KB)             │
│ ✅ Safety SOP v2.1.pdf (23 pages, 1.1 MB)              │
│ [Remove] [Add More]                                     │
│                                                         │
│ Step 2: Template Configuration                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Template Name:                                      │ │
│ │ [Incident Safety Protocol_______________________]   │ │
│ │                                                     │ │
│ │ Description (optional):                             │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Safety procedures for engine operations,        │ │ │
│ │ │ mayday protocols, and general incident safety   │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ AI Configuration:                                   │ │
│ │ ☑ Extract compliance criteria automatically        │ │
│ │ ☑ Identify scoring weights from policy emphasis    │ │
│ │ ☑ Generate example citations for each criterion    │ │
│ │ ☑ Create audit narrative prompts                   │ │
│ │                                                     │ │
│ │ Focus Areas (optional - AI will detect if blank):  │ │
│ │ ☑ Communication protocols                          │ │
│ │ ☑ Safety officer procedures                        │ │
│ │ ☑ Mayday and emergency response                    │ │
│ │ ☑ Personnel accountability                         │ │
│ │ ☐ Resource management                              │ │
│ │ ☐ Command structure                                │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│              [Cancel] [Generate Template (AI)]          │
└─────────────────────────────────────────────────────────┘
```

#### **AI Template Generation Progress**
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 AI Template Generation in Progress                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Analyzing 3 policy documents (80 pages total)...        │
│                                                         │
│ ✅ Document parsing complete                            │
│ ✅ Policy sections identified (12 sections)             │
│ ✅ Compliance criteria extracted (38 criteria)          │
│ 🔄 Generating scoring rubrics...                        │
│ ⏳ Creating audit prompts...                            │
│                                                         │
│ ████████████████████░░░░ 75% Complete                   │
│                                                         │
│ Estimated time remaining: 45 seconds                    │
│                                                         │
│ Current Task:                                           │
│ Generating AI prompts for "Mayday Protocol Compliance"  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### **Template Review & Edit Interface**
```
┌─────────────────────────────────────────────────────────┐
│ 📋 Review AI-Generated Template: Incident Safety         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Template Summary                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Name: Incident Safety Protocol                      │ │
│ │ Generated from: 3 documents (80 pages)              │ │
│ │ AI Confidence: 94%                                  │ │
│ │ Categories: 6 • Criteria: 38 • Prompts: 6           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Categories & Criteria  [Expand All] [Collapse All]      │
│                                                         │
│ ▼ 1. Communication Protocols (Weight: 25%) ✏️ [Edit]    │
│   ┌─────────────────────────────────────────────────┐   │
│   │ ✅ Clear radio discipline maintained             │   │
│   │    Source: Engine Ops Manual p.12               │   │
│   │    [Edit] [Remove] [View Source]                │   │
│   │                                                  │   │
│   │ ✅ Proper unit identification used               │   │
│   │    Source: Engine Ops Manual p.14               │   │
│   │    [Edit] [Remove] [View Source]                │   │
│   │                                                  │   │
│   │ ✅ Concise message transmission                  │   │
│   │    Source: Engine Ops Manual p.15               │   │
│   │    [Edit] [Remove] [View Source]                │   │
│   │                                                  │   │
│   │ [+ Add Criterion]                                │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│ ▼ 2. Mayday Procedures (Weight: 20%) ✏️ [Edit]          │
│   ┌─────────────────────────────────────────────────┐   │
│   │ ✅ Mayday transmitted using proper format        │   │
│   │    Source: Mayday Protocol.docx p.3             │   │
│   │    Format: "MAYDAY MAYDAY MAYDAY" (3x)          │   │
│   │    [Edit] [Remove] [View Source]                │   │
│   │                                                  │   │
│   │ ⚠️ LUNAR information provided (Low confidence)  │   │
│   │    Source: Mayday Protocol.docx p.4             │   │
│   │    AI Note: Acronym detected, verify correct    │   │
│   │    [Edit] [Remove] [View Source] [Verify]       │   │
│   │                                                  │   │
│   │ ✅ Command acknowledged mayday immediately       │   │
│   │    Source: Mayday Protocol.docx p.6             │   │
│   │    [Edit] [Remove] [View Source]                │   │
│   │                                                  │   │
│   │ [+ Add Criterion]                                │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│ ▶ 3. Safety Officer Procedures (Weight: 15%)            │
│ ▶ 4. Personnel Accountability (Weight: 20%)             │
│ ▶ 5. Resource Management (Weight: 10%)                  │
│ ▶ 6. Incident Command Structure (Weight: 10%)           │
│                                                         │
│ [+ Add Category]                                        │
│                                                         │
│ AI Analysis Prompts (Used during incident scoring)      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Category: Communication Protocols                   │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│ │ Prompt for AI:                                      │ │
│ │ "Analyze the radio transcript for adherence to     │ │
│ │ communication protocols as defined in Engine Ops   │ │
│ │ Manual sections 2.1-2.3. Score each criterion on   │ │
│ │ a PASS/FAIL/NOT_APPLICABLE basis. Provide specific │ │
│ │ timestamp citations for violations and compliant   │ │
│ │ examples. Focus on: radio discipline, unit         │ │
│ │ identification, and message clarity."              │ │
│ │                                                     │ │
│ │ [Edit Prompt] [Test Prompt] [Reset to Default]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Actions                                                 │
│ [Save Template] [Save as Draft] [Discard] [Test with Example] │
└─────────────────────────────────────────────────────────┘
```

---

### **📻 Incidents (Upload & Analyze)**

#### **Incident Upload Interface**
```
┌─────────────────────────────────────────────────────────┐
│ 📻 Upload & Analyze Radio Traffic                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Step 1: Upload Radio Traffic Audio                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │   🎤 Drop radio recording here                      │ │
│ │      or click to browse                             │ │
│ │                                                     │ │
│ │   Supported: MP3, WAV, M4A, MP4, WEBM              │ │
│ │   Max size: 500MB • Max duration: 4 hours          │ │
│ │                                                     │ │
│ │   [Browse Files]                                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Uploaded File:                                          │
│ ✅ structure-fire-radio-traffic-2024-12-15.mp3          │
│    Duration: 45:32 • Size: 23 MB • Quality: Good       │
│    [Remove] [Replace]                                   │
│                                                         │
│ Step 2: Incident Information (Optional)                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Incident Name/Description:                          │ │
│ │ [Structure Fire - 123 Main Street_______________]   │ │
│ │                                                     │ │
│ │ Incident Date & Time:                               │ │
│ │ [2024-12-15] [14:32] (If different from upload)    │ │
│ │                                                     │ │
│ │ Incident Type:                                      │ │
│ │ [Structure Fire ▼]                                  │ │
│ │   Options: Structure Fire, Vehicle Fire, Wildfire, │ │
│ │   Medical, Rescue, Hazmat, Other                    │ │
│ │                                                     │ │
│ │ Units Involved (comma-separated):                   │ │
│ │ [Engine 1, Engine 2, Ladder 2, Battalion 1______]  │ │
│ │                                                     │ │
│ │ Notes/Context (will help AI analysis):              │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Multi-company response. Mayday called due to    │ │ │
│ │ │ floor collapse. 2 firefighters injured.         │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Step 3: Select Audit Templates to Apply                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Select which templates to use for analysis:         │ │
│ │                                                     │ │
│ │ ☑ NFPA 1561: Incident Command System               │ │
│ │   (8 categories, 42 criteria)                      │ │
│ │                                                     │ │
│ │ ☑ Incident Safety Protocol (AI-Generated)          │ │
│ │   (6 categories, 38 criteria)                      │ │
│ │                                                     │ │
│ │ ☐ Multi-Agency Operations                          │ │
│ │   (5 categories, 29 criteria)                      │ │
│ │                                                     │ │
│ │ ☐ Mayday & Firefighter Safety                      │ │
│ │   (6 categories, 31 criteria)                      │ │
│ │                                                     │ │
│ │ [Select All] [Deselect All]                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Transcription & Analysis Options                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑ Include precise timestamps                        │ │
│ │ ☑ Detect emergency keywords (Mayday, evacuate, etc.)│ │
│ │ ☑ Generate visual timeline                          │ │
│ │ ☑ Identify speakers/units (if possible)             │ │
│ │ ☑ Extract incident metrics (response times, etc.)   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                       [Cancel] [Start Analysis]         │
└─────────────────────────────────────────────────────────┘
```

#### **Transcription & Analysis Progress**
```
┌─────────────────────────────────────────────────────────┐
│ 🎤 Analyzing: Structure Fire - 123 Main Street           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Overall Progress: 67% • ETA: 2:15                       │
│ ████████████████████████░░░░░░░░░░ 67%                 │
│                                                         │
│ Current Task: Running compliance audit (Template 2/2)   │
│                                                         │
│ Progress Details:                                       │
│ ✅ Audio uploaded (23 MB)                               │
│ ✅ Audio transcribed (45:32 duration → 8,234 words)     │
│ ✅ Emergency keywords detected (4 maydays, 2 evacuations)│
│ ✅ Timeline generated (47 key events)                   │
│ ✅ NFPA 1561 audit complete (Score: 82%)                │
│ 🔄 Incident Safety Protocol audit in progress (45%)     │
│ ⏳ Generating narrative report...                       │
│                                                         │
│ Live Transcript Preview (last 3 messages):              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [14:32:15] Battalion 1: "All units, we have a       │ │
│ │            working structure fire at 123 Main..."   │ │
│ │                                                     │ │
│ │ [14:32:45] Engine 2: "MAYDAY MAYDAY MAYDAY!        │ │
│ │            Engine 2, second floor collapse..."      │ │
│ │                                                     │ │
│ │ [14:32:48] Battalion 1: "Command copies mayday,    │ │
│ │            all units standby for emergency traffic" │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Emergency Detections:                                   │
│ 🔴 4 Mayday calls detected (14:32, 14:45, 15:12, 15:28)│
│ ⚠️ 2 Evacuation orders detected (15:45, 16:02)         │
│ 📍 47 timeline events extracted                        │
│                                                         │
│                                      [Cancel Analysis]  │
└─────────────────────────────────────────────────────────┘
```

---

### **📊 Incident Report & Timeline Viewer**

#### **Report Overview Tab**
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Incident Report: Structure Fire - 123 Main Street    │
│ Dec 15, 2024 14:32 • Duration: 45:32 • 2 Templates      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [📋 Overview] [📈 Timeline] [📝 Transcript] [📄 Export] │
│                                                         │
│ Overall Performance Summary                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │       Combined Score: 80%                           │ │
│ │       ████████████████████░░ 80%                    │ │
│ │                                                     │ │
│ │       Status: NEEDS IMPROVEMENT                     │ │
│ │                                                     │ │
│ │  NFPA 1561: 82%  ████████████████████░░            │ │
│ │  Safety Protocol: 78%  ███████████████████░░░       │ │
│ │                                                     │ │
│ │  🔴 Critical Issues: 2                              │ │
│ │  ⚠️ Warnings: 5                                     │ │
│ │  ✅ Strengths: 8                                    │ │
│ │  📋 Total Criteria Scored: 80                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Critical Findings 🔴                                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 1. Mayday Protocol Violation (14:32:45)             │ │
│ │    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│ │    Template: Incident Safety Protocol               │ │
│ │    Category: Mayday Procedures (Weight: 20%)        │ │
│ │                                                     │ │
│ │    Issue: Mayday not transmitted in proper format   │ │
│ │                                                     │ │
│ │    Expected: "MAYDAY MAYDAY MAYDAY" followed by     │ │
│ │    LUNAR (Location, Unit, Name, Assignment, Resources)│ │
│ │                                                     │ │
│ │    Actual: "MAYDAY MAYDAY MAYDAY! Engine 2,         │ │
│ │    second floor collapse, need help now!"           │ │
│ │                                                     │ │
│ │    Impact: Incomplete LUNAR information delayed     │ │
│ │    rescue response by ~90 seconds                   │ │
│ │                                                     │ │
│ │    Recommendation: Refresher training on mayday     │ │
│ │    protocol. Review LUNAR acronym with all crews.   │ │
│ │                                                     │ │
│ │    [View in Timeline] [View Transcript] [Mark Reviewed]│ │
│ │                                                     │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 2. Communication Breakdown (14:35:12)               │ │
│ │    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│ │    Template: NFPA 1561                              │ │
│ │    Category: Communication Protocols (Weight: 25%)  │ │
│ │                                                     │ │
│ │    Issue: Multiple units transmitting simultaneously│ │
│ │    causing radio interference                       │ │
│ │                                                     │ │
│ │    Evidence: 3 overlapping transmissions detected   │ │
│ │    between 14:35:12 - 14:35:28 (16 seconds)        │ │
│ │                                                     │ │
│ │    Impact: Command unable to establish clear comm  │ │
│ │    during critical mayday response period           │ │
│ │                                                     │ │
│ │    Recommendation: Radio discipline refresher.      │ │
│ │    Review "emergency traffic" protocol.             │ │
│ │                                                     │ │
│ │    [View in Timeline] [View Transcript] [Mark Reviewed]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Strengths & Commendations ✅                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ • Rapid accountability report (PAR) completed in    │ │
│ │   2:15 after mayday (expected: <3:00) ✅            │ │
│ │                                                     │ │
│ │ • Safety officer assigned within 5 minutes of       │ │
│ │   incident start (NFPA requirement met) ✅          │ │
│ │                                                     │ │
│ │ • Clear unit identification maintained throughout   │ │
│ │   95% of transmissions ✅                           │ │
│ │                                                     │ │
│ │ • Incident command transfer properly executed with  │ │
│   proper notification (14:52) ✅                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Category Scores                                         │
│ ┌──────────────────────────────────┬──────────────────┐ │
│ │ NFPA 1561 Template               │ Score: 82%       │ │
│ ├──────────────────────────────────┼──────────────────┤ │
│ │ Communication Protocols          │ 75% ⚠️          │ │
│ │ Incident Command System          │ 90% ✅          │ │
│ │ Safety Officer Procedures        │ 95% ✅          │ │
│ │ Mayday & Emergency Procedures    │ 65% 🔴          │ │
│ │ Resource Management              │ 88% ✅          │ │
│ │ Personnel Accountability         │ 92% ✅          │ │
│ │ Documentation                    │ 85% ✅          │ │
│ │ Training Requirements            │ N/A             │ │
│ └──────────────────────────────────┴──────────────────┘ │
│                                                         │
│ ┌──────────────────────────────────┬──────────────────┐ │
│ │ Incident Safety Protocol         │ Score: 78%       │ │
│ ├──────────────────────────────────┼──────────────────┤ │
│ │ Communication Protocols          │ 70% ⚠️          │ │
│ │ Mayday Procedures                │ 60% 🔴          │ │
│ │ Safety Officer Procedures        │ 92% ✅          │ │
│ │ Personnel Accountability         │ 90% ✅          │ │
│ │ Resource Management              │ 85% ✅          │ │
│ │ Incident Command Structure       │ 88% ✅          │ │
│ └──────────────────────────────────┴──────────────────┘ │
│                                                         │
│ AI-Generated Narrative Summary                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ This incident demonstrates strong overall incident  │ │
│ │ command and safety officer performance, with notable│ │
│ │ strengths in personnel accountability and resource  │ │
│ │ management. However, critical deficiencies were     │ │
│ │ identified in mayday protocol execution and         │ │
│ │ communication discipline during emergency traffic.  │ │
│ │                                                     │ │
│ │ The mayday call at 14:32:45 lacked proper LUNAR    │ │
│ │ format, specifically missing clear assignment and   │ │
│ │ resource needs. While the distress was communicated,│ │
│ │ the incomplete information required additional      │ │
│ │ radio traffic to clarify the situation, delaying    │ │
│ │ rescue operations by approximately 90 seconds.      │ │
│ │                                                     │ │
│ │ Communication breakdown occurred at 14:35:12 when   │ │
│ │ multiple units transmitted simultaneously. This     │ │
│ │ violation of emergency traffic protocol created     │ │
│ │ confusion and delayed tactical decision-making      │ │
│ │ during a critical phase of the incident.            │ │
│ │                                                     │ │
│ │ Positive aspects include rapid PAR completion       │ │
│ │ (2:15 vs. 3:00 standard), timely safety officer     │ │
│ │ assignment, and excellent unit identification.      │ │
│ │ Incident command transfer was executed properly.    │ │
│ │                                                     │ │
│ │ Recommendations:                                    │ │
│ │ 1. Mandatory mayday protocol refresher for all crews│ │
│ │ 2. Radio discipline training focusing on emergency  │ │
│ │    traffic procedures                               │ │
│ │ 3. Table-top exercise simulating mayday scenarios   │ │
│ │ 4. Review of LUNAR acronym and proper format        │ │
│ │                                                     │ │
│ │ [Edit Narrative] [Regenerate with AI]               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Actions                                                 │
│ [💾 Save Report] [📄 Export PDF] [📧 Email] [🖨️ Print] │
│ [🗂️ Add to Training Library] [📅 Schedule Review Meeting]│
└─────────────────────────────────────────────────────────┘
```

#### **Timeline Explorer Tab** (Using existing EmergencyTimeline component)
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Incident Report: Structure Fire - 123 Main Street    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [📋 Overview] [📈 Timeline] [📝 Transcript] [📄 Export] │
│                                                         │
│ Interactive Timeline (45:32 total duration)              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [🔍 Filter] [📍 Jump to Event] [▶️ Play Audio]       │ │
│ │                                                     │ │
│ │ Show: [All ▼] [🔴 Mayday] [⚠️ Warning] [✅ Good]     │ │
│ │                                                     │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│ │                                                     │ │
│ │ 00:00 ━ Incident Dispatch                           │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ "Dispatch to Engine 1, Engine 2, Ladder 2:      │ │ │
│ │ │  Structure fire, 123 Main Street..."            │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ 06:15 ━ First Unit On Scene                         │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Engine 1: "Engine 1 on scene, 2-story wood      │ │ │
│ │ │  frame, heavy smoke showing..."                 │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ 14:32 🔴 MAYDAY CALLED                              │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ 🚨 CRITICAL EVENT                                │ │ │
│ │ │                                                  │ │ │
│ │ │ Engine 2: "MAYDAY MAYDAY MAYDAY! Engine 2,      │ │ │
│ │ │  second floor collapse, need help now!"         │ │ │
│ │ │                                                  │ │ │
│ │ │ Compliance Issue: ❌ Incomplete LUNAR format     │ │ │
│ │ │ - Missing: Assignment, Resources needed         │ │ │
│ │ │ - Impact: 90 second delay in rescue response    │ │ │
│ │ │                                                  │ │ │
│ │ │ [View Full Analysis] [Listen to Audio]           │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ 14:35 ⚠️ Communication Breakdown                    │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Multiple overlapping transmissions              │ │ │
│ │ │ Compliance Issue: ❌ Radio discipline violation  │ │ │
│ │ │ Duration: 16 seconds of interference            │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ 16:47 ✅ PAR Complete                               │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Safety Officer: "PAR complete, all personnel    │ │ │
│ │ │  accounted for, 2 firefighters to EMS"          │ │ │
│ │ │                                                  │ │ │
│ │ │ ✅ Completed in 2:15 (under 3:00 requirement)    │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ ... [View all 47 events] ...                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Timeline Statistics                                     │
│ • Total Events: 47                                      │
│ • Mayday Calls: 4                                       │
│ • Emergency Keywords: 12                                │
│ • Compliance Issues: 7                                  │
│ • Commendations: 8                                      │
└─────────────────────────────────────────────────────────┘
```

#### **Full Transcript Tab**
```
┌─────────────────────────────────────────────────────────┐
│ 📊 Incident Report: Structure Fire - 123 Main Street    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [📋 Overview] [📈 Timeline] [📝 Transcript] [📄 Export] │
│                                                         │
│ Full Radio Transcript (45:32)                           │
│ [🔍 Search] [📍 Jump to Timestamp] [🎧 Play Audio]      │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [00:00:00] Dispatch                                 │ │
│ │ "Dispatch to Engine 1, Engine 2, Ladder 2, and      │ │
│ │  Battalion 1: Respond to structure fire, 123 Main   │ │
│ │  Street. Reports of smoke and flames visible."      │ │
│ │                                                     │ │
│ │ [00:00:15] Engine 1                                 │ │
│ │ "Engine 1 copies, en route from Station 1."         │ │
│ │                                                     │ │
│ │ [00:06:15] Engine 1 ✅ Compliant                    │ │
│ │ "Engine 1 on scene, 2-story wood frame residential, │ │
│ │  heavy smoke showing from second floor windows.     │ │
│ │  Engine 1 establishing command."                    │ │
│ │                                                     │ │
│ │ [00:14:32] Engine 2 🔴 MAYDAY - Violation           │ │
│ │ "MAYDAY MAYDAY MAYDAY! Engine 2, second floor       │ │
│ │  collapse, need help now!"                          │ │
│ │                                                     │ │
│ │ 📋 Compliance Issue:                                │ │
│ │ ❌ Incomplete LUNAR format                          │ │
│ │ Expected: Location, Unit, Name, Assignment, Resources│ │
│ │ Provided: Location (partial), Unit only             │ │
│ │                                                     │ │
│ │ [00:14:35] Battalion 1 ⚠️ Emergency Traffic         │ │
│ │ "Command copies mayday, all units stand by for     │ │
│ │  emergency traffic..."                              │ │
│ │ [Multiple overlapping transmissions - 16 seconds]   │ │
│ │                                                     │ │
│ │ 📋 Compliance Issue:                                │ │
│ │ ❌ Radio discipline violation (simultaneous transmissions)│ │
│ │                                                     │ │
│ │ ... [View full transcript] ...                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Transcript Statistics                                   │
│ • Total Words: 8,234                                    │
│ • Total Transmissions: 127                              │
│ • Speakers Identified: 8                                │
│ • Emergency Keywords: 12 instances                      │
│ • Compliance Annotations: 19                            │
│                                                         │
│ [📄 Download TXT] [📄 Download PDF] [📄 Download SRT]   │
└─────────────────────────────────────────────────────────┘
```

---

## **5. Key User Flows**

### **Flow 1: First-Time Setup (Policy Upload)**
```
1. User lands on Dashboard
   ↓
2. Clicks "Upload Policy & Generate Template"
   ↓
3. Uploads department SOPs (PDFs, DOCX)
   ↓
4. AI analyzes documents and generates audit template
   ↓
5. User reviews AI-generated criteria
   ↓
6. User edits/refines criteria and weights
   ↓
7. User saves template
   ↓
8. Template is now available for incident analysis
```

### **Flow 2: Incident Analysis (Primary Use Case)**
```
1. User clicks "Upload Radio Traffic & Analyze"
   ↓
2. Uploads audio file (MP3, WAV, etc.)
   ↓
3. Fills in optional incident details
   ↓
4. Selects which audit templates to apply
   ↓
5. System transcribes audio (AI)
   ↓
6. System analyzes transcript against each template (AI)
   ↓
7. User views comprehensive report with:
   - Overall scores
   - Critical findings
   - Category breakdowns
   - AI narrative
   - Interactive timeline
   - Full transcript
   ↓
8. User exports PDF report for training
   ↓
9. User adds report to training library
```

### **Flow 3: Training Review Session**
```
1. Training officer opens incident report
   ↓
2. Reviews overall scores and critical findings
   ↓
3. Uses timeline explorer to identify key moments
   ↓
4. Listens to audio at specific timestamps
   ↓
5. Reviews AI narrative and recommendations
   ↓
6. Exports report for crew training session
   ↓
7. Crew discusses findings and improvement strategies
```

---

## **6. Design Principles Summary**

### **What Changed from V1**
| V1 (Live Monitoring) | V2 (Post-Incident Analysis) |
|---------------------|----------------------------|
| Real-time incident tracking | Historical incident review |
| Live transcription progress | Batch transcription & analysis |
| Emergency mode UI | Analysis-focused UI |
| Stress-reduced design | Learning-oriented design |
| Quick action buttons | Deep dive exploration |
| Mobile-first for field use | Desktop-first for training sessions |

### **Core UX Principles**
1. **Clarity** - Information is organized for understanding, not urgency
2. **Learning** - Every finding includes context and recommendations
3. **Transparency** - AI shows its reasoning and confidence levels
4. **Customization** - Departments control their own standards
5. **Improvement** - Focus on growth, not blame

---

## **7. Technical Considerations**

### **Performance Requirements**
- **Transcription**: 45-minute audio should complete in < 5 minutes
- **AI Analysis**: Each template audit should complete in < 2 minutes
- **Report Generation**: Full report ready in < 10 minutes total
- **Page Load**: < 2 seconds for report viewing
- **Export**: PDF generation < 5 seconds

### **AI Integration Points**
1. **Policy → Template**: GPT-4 extracts criteria from documents
2. **Transcription**: OpenAI Whisper with timestamps
3. **Analysis**: GPT-4 scores each criterion with citations
4. **Narrative**: GPT-4 generates summary and recommendations
5. **Timeline**: AI identifies key events and emergency keywords

### **Data Storage**
- Audio files: Cloud storage (S3/Azure Blob)
- Transcripts: PostgreSQL database
- Audit results: PostgreSQL with JSON fields
- Templates: PostgreSQL with versioning
- Reports: Generated on-demand, cached for quick access

---

## **8. Success Metrics**

### **Adoption Metrics**
- **Template Creation**: Avg 2 templates created per department in first month
- **Incident Analysis**: Avg 4 incidents analyzed per week
- **User Engagement**: 80% of users return within 7 days

### **Quality Metrics**
- **AI Accuracy**: >90% agreement with manual expert review
- **Template Quality**: <10% of AI criteria require significant editing
- **User Satisfaction**: >4.0/5.0 rating

### **Training Impact** (Measured after 6 months)
- **Compliance Improvement**: 15% increase in procedure adherence
- **Training Effectiveness**: 25% improvement in post-training assessments
- **Time Savings**: 80% reduction in manual report creation time

---

## **9. Implementation Phases**

### **Phase 1: MVP (4 weeks)**
**Goal**: Basic upload → analyze → review workflow

**Features**:
- Dashboard with recent incidents list
- Policy upload → AI template generation (basic)
- Template editor (CRUD operations)
- Audio upload → transcription
- Single template audit analysis
- Basic report view (scores + findings)

**Components Used**:
- ✅ TranscriptionProgress (already built)
- ✅ ComplianceScore (already built)
- Custom: Policy upload, Template editor, Report viewer

### **Phase 2: Enhanced Analysis (3 weeks)**
**Goal**: Rich analysis and visualization

**Features**:
- Multi-template analysis
- Interactive timeline explorer
- Full transcript viewer with annotations
- AI narrative generation
- PDF export functionality

**Components Used**:
- ✅ EmergencyTimeline (already built)
- ✅ ComplianceScore (already built)
- Custom: Transcript viewer, Export engine

### **Phase 3: Training Tools (2 weeks)**
**Goal**: Training library and collaboration

**Features**:
- Training library
- Trend analysis dashboard
- Department-wide statistics
- Crew performance tracking
- Scheduled review meetings

**Components Used**:
- ✅ UnitStatus (adapted for crew tracking)
- Custom: Analytics dashboard, Library system

### **Phase 4: Polish & Optimization (2 weeks)**
**Goal**: Production-ready platform

**Features**:
- Performance optimization
- Mobile responsiveness
- Advanced search/filtering
- Batch operations
- Admin controls

---

## **10. Component Reuse Strategy**

### **Existing Components (From Phase 1)**

1. **TranscriptionProgress** ✅
   - **Use**: Show upload and transcription progress
   - **Location**: Audio upload page
   - **Modification**: None needed

2. **ComplianceScore** ✅
   - **Use**: Display overall and category scores
   - **Location**: Report overview tab
   - **Modification**: None needed

3. **EmergencyTimeline** ✅
   - **Use**: Interactive incident timeline
   - **Location**: Timeline explorer tab
   - **Modification**: Add audio playback integration

4. **UnitStatus** ✅
   - **Use**: Adapt for crew/department performance tracking
   - **Location**: Analytics dashboard
   - **Modification**: Change from "units" to "crews" context

### **New Components Needed**

1. **PolicyUploader**
   - Drag-and-drop file upload
   - Document parsing status
   - AI generation progress

2. **TemplateEditor**
   - Category/criterion CRUD
   - Weight adjustment
   - AI prompt editing

3. **TemplateLibrary**
   - Grid view of templates
   - Filter/search
   - Usage statistics

4. **IncidentUploader**
   - Audio file upload
   - Incident metadata form
   - Template selection

5. **ReportViewer**
   - Tabbed interface (Overview, Timeline, Transcript)
   - Finding cards
   - Export controls

6. **TranscriptViewer**
   - Timestamped transcript
   - Compliance annotations
   - Audio sync playback

---

## **Conclusion**

This revised design transforms the system from a **live incident monitoring tool** into a **post-incident training and analysis platform**. The key changes:

1. **AI-Powered Template Generation** - Departments upload policies, AI creates audit templates
2. **Batch Analysis** - Upload audio → transcribe → analyze → review (not real-time)
3. **Training Focus** - Reports designed for learning and improvement
4. **Visual Storytelling** - Timeline helps crews "replay" incidents
5. **Customizable Standards** - Each department's policies drive scoring

**Next Steps**: Build MVP (Phase 1) focusing on the core workflow: Policy → Template → Audio → Analysis → Report.

---

*Document Version: 2.0*
*Last Updated: January 2025*
*Replaces: UIUX_DESIGN_PLAN.md v1.0*
