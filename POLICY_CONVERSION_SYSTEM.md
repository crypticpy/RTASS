# Policy Document Conversion System - Detailed Design

## **1. Feature Overview**

The Policy Document Conversion System allows fire department personnel to upload their existing policy documents, SOPs, scorecards, and compliance materials in various formats (Word, PDF, PowerPoint, Excel) and automatically convert them into structured auditing templates using AI. This bridges the gap between existing department documentation and the digital compliance auditing system.

### **1.1 User Workflow**
1. **Upload**: Training officers or commanders upload existing policy documents
2. **Analysis**: LLM analyzes document structure, content, and compliance requirements
3. **Template Generation**: AI builds structured audit criteria and scoring parameters
4. **Refinement**: Users review and refine generated templates
5. **Deployment**: Templates become available for compliance auditing

### **1.2 Document Formats Supported**
- **PDF**: Policy manuals, SOPs, compliance guides
- **Word (.docx)**: Department policies, procedures, training materials
- **PowerPoint (.pptx)**: Training presentations, protocol briefings
- **Excel (.xlsx)**: Existing scorecards, compliance checklists, audit forms
- **Text (.txt, .md)**: Simple policy documents, meeting notes

---

## **2. User Interface Design**

### **2.1 Policy Upload Interface**

#### **Upload Zone**
```
┌─────────────────────────────────────────────────────────┐
│ 📄 Policy Document Converter                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ Document Upload ─────────────────────────────────┐   │
│ │   📁 Drag & Drop policy documents here            │   │
│ │   [Browse Files] [Batch Upload]                     │   │
│ │                                                     │   │
│ │ Supported Formats:                                  │   │
│ │ 📄 PDF • 📝 Word • 📊 Excel • 🎯 PowerPoint • 📄 Text │   │
│ │                                                     │   │
│ │ Recent Uploads:                                     │   │
│ │ ✓ Engine Operations Manual.pdf (2.3MB)             │   │
│ │ ✓ Mayday Protocol.docx (856KB)                     │   │
│ │ ✓ Safety Compliance.xlsx (1.1MB)                   │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─ Conversion Options ───────────────────────────────┐   │
│ │ Template Name: [Incident Safety Protocol ▼]         │   │
│ │                                                     │   │
│ │ Document Type: [SOP Manual ▼]                       │   │
│ │ ☑ Auto-detect sections and categories               │ │
│ │ ☑ Extract compliance criteria                        │   │
│ │ ☑ Generate scoring rubrics                          │   │
│ │ ☑ Include regulatory references (NFPA, OSHA)        │   │
│ │                                                     │   │
│ │ Additional Instructions:                             │   │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Focus on firefighter safety and mayday protocols│ │ │
│ │ │ Include criteria for PPE usage and accountability│ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘   │
│                                                         │
│                                    [Generate Template] │
└─────────────────────────────────────────────────────────┘
```

#### **Processing Progress**
```
┌─ Converting Documents ─────────────────────────────────┐
│                                                        │
│ Step 1: Extracting text from documents... ✅ Complete   │
│ Step 2: Analyzing document structure... ⏳ In Progress │
│ Step 3: Identifying compliance categories... ⏸️ Pending │
│ Step 4: Generating audit criteria... ⏸️ Pending         │
│ Step 5: Building scoring rubrics... ⏸️ Pending         │
│                                                        │
│ Overall Progress: ██████████░░ 40% • ETA: 2 minutes   │
│                                                        │
│ Current Document: Engine Operations Manual.pdf          │
│ Sections Found: 12 • Pages: 45 • Format: PDF           │
│                                                        │
│ AI Analysis Log:                                       │
│ • Identified 8 compliance categories                    │
│ • Extracted 34 specific criteria                         │
│ • Found 12 regulatory references                        │
│ • Detected 5 emergency procedures                        │
│                                                        │
│ [Pause] [Cancel]                                       │
└────────────────────────────────────────────────────────┘
```

### **2.2 Template Review Interface**

#### **Generated Template Preview**
```
┌─────────────────────────────────────────────────────────┐
│ 🔧 Template Review: Incident Safety Protocol          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📊 Template Summary                                    │
│ Source: Engine Operations Manual.pdf + Mayday Protocol.docx│
│ Categories: 8 • Criteria: 42 • Weight: 100%             │
│ Confidence: 94% • AI Model: GPT-4o                     │
│                                                         │
│ ┌─ Category 1: Personnel Safety ──────────────────────┐ │
│ │ Weight: 25% • Criteria: 8                            │ │
│ │                                                     │ │
│ │ 🔹 Criterion 1.1: PPE Inspection                    │ │
│ │    Description: All personnel shall inspect PPE before │
│ │    entering hazardous environment                     │ │
│ │    Evidence Required: PPE checklist completion         │ │
│ │    Scoring: Pass/Fail • Weight: 15%                  │ │
│ │                                                     │ │
│ │ 🔹 Criterion 1.2: Accountability System              │ │
│ │    Description: Personnel accountability system must be │
│ │    established and maintained throughout incident       │ │
│ │    Evidence Required: PAR completion                  │ │
│ │    Scoring: 0-100 points • Weight: 25%               │ │
│ │                                                     │ │
│ │ [Edit] [Add Criterion] [Remove] [Reorder]             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ Category 2: Emergency Communications ──────────────┐ │
│ │ Weight: 30% • Criteria: 12                           │ │
│ │                                                     │ │
│ │ 🔹 Criterion 2.1: Mayday Protocol                  │ │
│ │    Description: Proper mayday protocol must be followed │
│ │    for emergency situations                           │ │
│ │    Evidence Required: Radio transcript analysis       │ │
│ │    Scoring: Critical/Pass/Fail • Weight: 40%         │ │
│ │                                                     │ │
│ │ 🔹 Criterion 2.2: Communication Discipline          │ │
│ │    Description: Radio communications must follow proper │
│ │    discipline and protocol                           │ │
│ │    Evidence Required: Communication quality           │ │
│ │    Scoring: 0-100 points • Weight: 20%               │ │
│ │                                                     │ │
│ │ [Edit] [Add Criterion] [Remove] [Reorder]             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ More Categories: [Emergency Procedures ▼] [Resource Management ▼] │
│                                                         │
│ Actions:                                               │
│ [📝 Edit Template] [➕ Add Category] [🔄 Regenerate] [💾 Save] │
└─────────────────────────────────────────────────────────┘
```

#### **AI Suggestions Panel**
```
┌─ AI Suggestions ────────────────────────────────────────┐
│                                                        │
│ 🧠 Recommended Improvements                            │
│                                                        │
│ ✅ **Strong Points**                                   │
│ • Clear structure with logical category separation      │
│ • Comprehensive PPE and accountability coverage         │
│ • Good integration of emergency procedures             │
│                                                        │
│ 💡 **Enhancement Opportunities**                        │
│ • Consider adding "Scene Safety" category              │
│ • Include criteria for RIT deployment                 │
│ │ [Apply Suggestion]                                  │ │
│ • Add rehabilitation protocol criteria                  │
│ │ [Apply Suggestion]                                  │ │
│                                                        │
│ ⚠️ **Potential Issues**                                │
│ • Mayday protocol criteria overlap detected            │
│ │ [Review & Fix]                                      │ │
│ • Inconsistent weighting across categories             │
│ │ [Review & Fix]                                      │ │
│                                                        │
│ 📚 **Reference Integration**                           │
│ • NFPA 1500 references identified in 8 criteria        │
│ │ [View Details]                                      │ │
│ • OSHA 1910.134 citations in 4 criteria               │
│ │ [View Details]                                      │ │
│ • Department-specific SOPs in 12 criteria              │
│ │ [View Details]                                      │ │
│                                                        │
│ [Regenerate with Suggestions] [Ignore All]             │
└────────────────────────────────────────────────────────┘
```

### **2.3 Template Management**

#### **Template Library with Conversion Tracking**
```
┌─────────────────────────────────────────────────────────┐
│ 📚 Template Library                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Filter: [All Templates ▼] [Converted from Docs ▼]      │
│ Search: [Safety protocols...]                          │
│                                                         │
│ ┌─ Incident Safety Protocol ─────────────────────────┐ │
│ │ 🔥 AI-Generated from: Engine Ops Manual.pdf         │ │
│ │ 📅 Generated: Dec 15, 2024 • Last Edited: Dec 20,   │ │
│ │ 📊 Categories: 8 • Criteria: 42 • Used: 15 times    │ │
│ │ ✅ Active • 🧠 94% AI Confidence • 👥 5 users       │ │
│ │                                                     │ │
│ │ Source Documents:                                    │
│ │ • Engine Operations Manual.pdf (45 pages)           │ │
│ │ • Mayday Protocol.docx (12 pages)                   │ │
│ │ • Safety Training.pptx (28 slides)                  │ │
│ │                                                     │ │
│ │ Performance:                                         │ │
│ │ Avg Score: 87% • Trend: ↗️ +5% • Time to Audit: 3min │ │
│ │                                                     │ │
│ │ [View] [Edit] [Duplicate] [Download] [Sources] [Analytics] │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─ Multi-Agency Operations ──────────────────────────┐ │
│ │ 🔥 AI-Generated from: ICS Manual.pdf               │ │
│ │ 📅 Generated: Dec 10, 2024 • Last Edited: Dec 18,   │ │
│ │ 📊 Categories: 6 • Criteria: 31 • Used: 8 times     │ │
│ │ ✅ Active • 🧠 89% AI Confidence • 👥 3 users       │ │
│ │                                                     │ │
│ │ [View] [Edit] [Duplicate] [Download] [Sources] [Analytics] │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Quick Actions:                                           │
│ [📄 Convert New Document] [📚 Import Template] [🔄 Bulk Convert] │
│ [📊 Conversion Analytics] [🧠 AI Model Settings]        │
└─────────────────────────────────────────────────────────┘
```

---

## **3. Technical Architecture**

### **3.1 Document Processing Pipeline**

#### **Document Extraction Service**
```typescript
// src/lib/services/documentExtraction.ts
export class DocumentExtractionService {
  async extractContent(file: File): Promise<ExtractedContent> {
    const fileType = this.detectFileType(file);
    
    switch (fileType) {
      case 'pdf':
        return this.extractFromPDF(file);
      case 'docx':
        return this.extractFromWord(file);
      case 'xlsx':
        return this.extractFromExcel(file);
      case 'pptx':
        return this.extractFromPowerPoint(file);
      case 'text':
        return this.extractFromText(file);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private async extractFromPDF(file: File): Promise<ExtractedContent> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const sections: DocumentSection[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
      
      // Detect sections based on formatting and headings
      const pageSections = this.detectSections(pageText, i);
      sections.push(...pageSections);
    }
    
    return {
      text: fullText,
      sections,
      metadata: {
        pages: pdf.numPages,
        format: 'pdf',
        extractedAt: new Date().toISOString()
      }
    };
  }

  private async extractFromExcel(file: File): Promise<ExtractedContent> {
    const workbook = XLSX.read(await file.arrayBuffer());
    const sections: DocumentSection[] = [];
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Detect if this is a scorecard or checklist
      if (this.isScorecardFormat(jsonData)) {
        const scorecardData = this.parseScorecard(jsonData, sheetName);
        sections.push(scorecardData);
      } else {
        const regularSection = this.parseRegularSheet(jsonData, sheetName);
        sections.push(regularSection);
      }
    });
    
    return {
      text: sections.map(s => s.content).join('\n'),
      sections,
      metadata: {
        sheets: workbook.SheetNames.length,
        format: 'xlsx',
        extractedAt: new Date().toISOString()
      }
    };
  }

  private isScorecardFormat(data: any[][]): boolean {
    // Detect if Excel sheet is a scorecard/checklist format
    const headerRow = data[0] || [];
    return headerRow.some(cell => 
      typeof cell === 'string' && 
      (cell.toLowerCase().includes('criteria') || 
       cell.toLowerCase().includes('compliance') ||
       cell.toLowerCase().includes('score'))
    );
  }
}
```

#### **Template Generation Service**
```typescript
// src/lib/services/templateGeneration.ts
export class TemplateGenerationService {
  private openai: OpenAI;
  private documentExtractor: DocumentExtractionService;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.documentExtractor = new DocumentExtractionService();
  }

  async generateTemplate(
    files: File[],
    options: TemplateGenerationOptions
  ): Promise<GeneratedTemplate> {
    // Step 1: Extract content from all documents
    const extractedContents = await Promise.all(
      files.map(file => this.documentExtractor.extractContent(file))
    );

    // Step 2: Analyze document structure and content
    const analysis = await this.analyzeDocuments(extractedContents, options);

    // Step 3: Generate template structure
    const templateStructure = await this.buildTemplateStructure(analysis, options);

    // Step 4: Create detailed criteria for each category
    const detailedTemplate = await this.populateCriteria(templateStructure, analysis);

    // Step 5: Validate and refine template
    const validatedTemplate = await this.validateTemplate(detailedTemplate);

    return {
      template: validatedTemplate,
      confidence: this.calculateConfidence(analysis),
      sourceDocuments: files.map(f => f.name),
      processingLog: this.buildProcessingLog(analysis),
      suggestions: await this.generateSuggestions(validatedTemplate, analysis)
    };
  }

  private async analyzeDocuments(
    contents: ExtractedContent[],
    options: TemplateGenerationOptions
  ): Promise<DocumentAnalysis> {
    const combinedText = contents.map(c => c.text).join('\n\n');
    
    const prompt = `
Analyze the following fire department policy documents and extract structured information:

COMBINED DOCUMENT TEXT:
${combinedText.substring(0, 25000)} // Limit for token count

DOCUMENT METADATA:
${contents.map((c, i) => `
Document ${i + 1}:
- Format: ${c.metadata.format}
- Sections: ${c.sections.length}
- Content length: ${c.text.length} characters
`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Identify compliance categories (minimum 5, maximum 10)
2. Extract specific audit criteria for each category (5-10 per category)
3. Determine scoring methods (Pass/Fail, 0-100, Critical/Pass/Fail)
4. Identify regulatory references (NFPA, OSHA, Department-specific)
5. Detect emergency procedures and safety protocols
6. Assign appropriate weights to categories and criteria

Return structured JSON analysis:
{
  "categories": [
    {
      "name": "Category Name",
      "description": "Category description",
      "weight": 0.25,
      "regulatoryReferences": ["NFPA 1561", "OSHA 1910.134"],
      "criteria": [
        {
          "id": "unique_id",
          "description": "Specific criterion description",
          "evidenceRequired": "What evidence to look for",
          "scoringMethod": "method_type",
          "weight": 0.15,
          "sourceReference": "Document and section reference"
        }
      ]
    }
  ],
  "emergencyProcedures": ["mayday", "par", "rit"],
  "regulatoryFramework": ["NFPA", "OSHA", "Department SOPs"],
  "completeness": 0.95,
  "confidence": 0.92
}
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert fire department policy analyst with deep knowledge of NFPA standards, OSHA regulations, and fire service operational procedures. Analyze policy documents and extract structured compliance frameworks. Return only valid JSON.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_object',
        schema: this.getAnalysisSchema()
      }
    });

    return JSON.parse(response.choices[0].message.content!);
  }

  private async buildTemplateStructure(
    analysis: DocumentAnalysis,
    options: TemplateGenerationOptions
  ): Promise<TemplateStructure> {
    return {
      name: options.templateName || 'Generated Compliance Template',
      description: `AI-generated template from ${analysis.categories.length} categories`,
      version: '1.0',
      categories: analysis.categories,
      metadata: {
        generatedAt: new Date().toISOString(),
        aiModel: 'gpt-4o',
        confidence: analysis.confidence,
        sourceAnalysis: analysis,
        customInstructions: options.additionalInstructions
      }
    };
  }

  private async populateCriteria(
    structure: TemplateStructure,
    analysis: DocumentAnalysis
  ): Promise<DetailedTemplate> {
    // For each category, enhance criteria with detailed evaluation guidelines
    const enhancedCategories = await Promise.all(
      structure.categories.map(async (category) => {
        const enhancedCriteria = await Promise.all(
          category.criteria.map(async (criterion) => {
            const enhancement = await this.enhanceCriterion(criterion, analysis);
            return {
              ...criterion,
              ...enhancement
            };
          })
        );

        return {
          ...category,
          criteria: enhancedCriteria
        };
      })
    );

    return {
      ...structure,
      categories: enhancedCategories
    };
  }

  private async enhanceCriterion(
    criterion: any,
    analysis: DocumentAnalysis
  ): Promise<CriterionEnhancement> {
    const prompt = `
Enhance this fire department compliance criterion with detailed evaluation guidelines:

CRITERION:
${JSON.stringify(criterion, null, 2)}

CONTEXT:
- Category: ${criterion.category}
- Emergency Procedures: ${analysis.emergencyProcedures.join(', ')}
- Regulatory Framework: ${analysis.regulatoryFramework.join(', ')}

ENHANCEMENT REQUIREMENTS:
1. Create detailed scoring rubric
2. Define specific evidence requirements
3. Provide example compliance and non-compliance scenarios
4. Add improvement recommendations for failures
5. Include references to source documents

Return enhanced criterion in JSON format:
{
  "scoringRubric": {
    "excellent": { "description": "...", "range": "90-100" },
    "good": { "description": "...", "range": "80-89" },
    "needsImprovement": { "description": "...", "range": "70-79" },
    "fail": { "description": "...", "range": "0-69" }
  },
  "evidenceRequirements": ["Specific evidence items to look for"],
  "complianceExamples": ["Examples of compliant behavior"],
  "nonComplianceExamples": ["Examples of non-compliant behavior"],
  "improvementRecommendations": ["Specific recommendations for improvement"],
  "sourceReferences": ["Document and page references"]
}
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a fire department training officer specializing in compliance evaluation. Enhance criteria with practical, actionable guidelines.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content!);
  }
}
```

### **3.2 Iterative Auditing Process**

#### **Section-Based Auditing Engine**
```typescript
// src/lib/services/iterativeAuditing.ts
export class IterativeAuditingService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async auditTranscriptIteratively(
    transcript: Transcript,
    template: GeneratedTemplate
  ): Promise<IterativeAuditResult> {
    const auditResults: CategoryAuditResult[] = [];
    
    // Process each category in parallel for efficiency
    const categoryPromises = template.categories.map(async (category) => {
      return this.auditCategory(transcript, category);
    });

    const categoryResults = await Promise.all(categoryPromises);
    
    // Aggregate results
    const overallResult = this.aggregateResults(categoryResults, template);
    
    return {
      overallResult,
      categoryResults,
      processingMetrics: this.calculateMetrics(categoryResults)
    };
  }

  private async auditCategory(
    transcript: Transcript,
    category: TemplateCategory
  ): Promise<CategoryAuditResult> {
    const criteriaResults: CriterionResult[] = [];
    
    // Process criteria within category
    for (const criterion of category.criteria) {
      const result = await this.auditCriterion(transcript, criterion);
      criteriaResults.push(result);
    }

    // Calculate category-level results
    const categoryScore = this.calculateCategoryScore(criteriaResults, category);
    const categoryFindings = this.extractCategoryFindings(criteriaResults, transcript);
    const categoryRecommendations = this.generateCategoryRecommendations(criteriaResults);

    return {
      category: category.name,
      weight: category.weight,
      score: categoryScore,
      criteria: criteriaResults,
      findings: categoryFindings,
      recommendations: categoryRecommendations,
      status: this.determineCategoryStatus(categoryScore)
    };
  }

  private async auditCriterion(
    transcript: Transcript,
    criterion: TemplateCriterion
  ): Promise<CriterionResult> {
    // Build focused prompt for this specific criterion
    const prompt = this.buildCriterionPrompt(transcript, criterion);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a fire department compliance auditor evaluating radio communications. 
          Be thorough, objective, and provide specific timestamped evidence for all findings.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_object',
        schema: this.getCriterionAuditSchema()
      }
    });

    const result = JSON.parse(response.choices[0].message.content!);
    
    return {
      id: criterion.id,
      description: criterion.description,
      score: result.score,
      status: result.status,
      rationale: result.rationale,
      findings: result.findings,
      recommendations: result.recommendations,
      evidence: result.evidence,
      weight: criterion.weight
    };
  }

  private buildCriterionPrompt(transcript: Transcript, criterion: TemplateCriterion): string {
    // Extract relevant transcript segments for focused analysis
    const relevantText = this.extractRelevantText(transcript, criterion);
    
    return `
Evaluate this fire department radio transcript against the specific compliance criterion:

COMPLIANCE CRITERION:
ID: ${criterion.id}
Description: ${criterion.description}
Evidence Required: ${criterion.evidenceRequired}
Scoring Method: ${criterion.scoringMethod}
Weight: ${criterion.weight}

TRANSCRIPT SEGMENTS:
${relevantText}

EVALUATION REQUIREMENTS:
1. Assess compliance with the specific criterion
2. Find exact timestamped examples from the transcript
3. Provide objective scoring based on the scoring rubric
4. Identify both positive and negative examples
5. Generate specific, actionable recommendations
6. Cite evidence with precise timestamps

Return detailed evaluation in JSON format:
{
  "score": 85.5,
  "status": "PASS",
  "rationale": "Detailed explanation of the evaluation",
  "findings": [
    {
      "timestamp": "14:32:15",
      "quote": "Exact radio communication",
      "compliance": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "significance": "HIGH" | "MEDIUM" | "LOW",
      "explanation": "Why this finding is significant"
    }
  ],
  "recommendations": [
    "Specific improvement recommendations"
  ],
  "evidence": {
    "positiveExamples": ["Examples of compliant behavior"],
    "negativeExamples": ["Examples of non-compliant behavior"],
    "areasForImprovement": ["Specific areas needing attention"]
  }
}
    `.trim();
  }
}
```

---

## **4. Integration with Existing Documentation**

### **4.1 Updates Needed to UI/UX Design Plan**

#### **Add to Section 4.3: Compliance Audit Interface**
Insert the **Policy Upload & Template Generation** interface before the audit configuration:

```
┌─ Policy-Based Template Generation ────────────────────┐
│ 📄 Create Template from Policy Documents              │
│                                                     │
│ [Upload Policy Documents] [Generate Template]         │
│                                                     │
│ Recent Templates:                                    │
│ • Incident Safety Protocol (Generated from Engine Ops Manual) │
│ • Mayday Procedures (Generated from Mayday Protocol.docx)      │
│                                                     │
│ [Manage Templates] [Conversion History]               │
└─────────────────────────────────────────────────────┘
```

#### **Add to Section 4.5: SOP Template Management**
Expand the template management section to include **AI-generated templates** and **conversion tracking**.

### **4.2 Updates Needed to Technical Architecture**

#### **Add to Section 2.3: Audio Processing Pipeline**
Add new section for **Document Processing Pipeline**:

```typescript
// Document Processing Services
src/lib/services/
├── documentExtraction.ts     // PDF, Word, Excel, PowerPoint extraction
├── templateGeneration.ts     // AI-powered template creation
├── iterativeAuditing.ts     // Section-based auditing
└── policyAnalysis.ts        // Document structure analysis
```

#### **Add to Database Schema**
Extend the database schema to support document conversion:

```prisma
model PolicyDocument {
  id            String   @id @default(cuid())
  fileName      String
  originalName  String
  fileType      String   // pdf, docx, xlsx, pptx, txt
  fileSize      Int
  content       String   // Extracted text content
  metadata      Json     // File-specific metadata
  uploadedBy    String
  uploadedAt    DateTime @default(now())
  templates     Template[] // Templates generated from this document

  @@map("policy_documents")
}

model TemplateGeneration {
  id            String   @id @default(cuid())
  templateId    String
  documentIds   String[] // Array of document IDs used
  generationLog Json     // AI processing log
  confidence    Float    // AI confidence score
  suggestions   Json     // AI improvement suggestions
  generatedAt   DateTime @default(now())
  
  template      Template @relation(fields: [templateId], references: [id])
  
  @@map("template_generations")
}

// Extend existing Template model
model Template {
  // ... existing fields ...
  sourceDocuments PolicyDocument[]
  generation      TemplateGeneration?
  isAIGenerated   Boolean  @default(false)
  aiConfidence    Float?
  conversionHistory Json[]  // Track conversion iterations
}
```

### **4.3 Updates Needed to Development Task List**

#### **Add to Phase 3: Backend Services**
New task for **Policy Document Conversion System**:

```markdown
#### **Task 3.7: Policy Document Conversion Service**
**Priority**: 🔴 Critical  
**Estimated Time**: 16 hours  
**Dependencies**: Task 3.1

**Subtasks:**
- [ ] Build document extraction service (PDF, Word, Excel, PowerPoint)
- [ ] Implement AI-powered template generation pipeline
- [ ] Create iterative auditing engine for section-based evaluation
- [ ] Build document analysis and structure detection
- [ ] Implement template validation and refinement system
- [ ] Create conversion tracking and versioning

**Acceptance Criteria:**
- All document formats successfully parsed and extracted
- AI generates compliant templates with >90% accuracy
- Iterative auditing processes each section independently
- Templates can be refined and improved through user feedback
- Conversion process tracked and auditable
- Version control maintained for template iterations

**Services to Build:**
```typescript
src/lib/services/
├── documentExtraction.ts
├── templateGeneration.ts
├── iterativeAuditing.ts
└── policyAnalysis.ts
```
```

#### **Add to Phase 4: Frontend Integration**
New task for **Policy Conversion UI**:

```markdown
#### **Task 4.4: Policy Document Conversion Interface**
**Priority**: 🔴 Critical  
**Estimated Time**: 14 hours  
**Dependencies**: Task 3.7, Task 2.4

**Subtasks:**
- [ ] Build document upload interface with multi-file support
- [ ] Create conversion progress visualization
- [ ] Implement template review and editing interface
- [ ] Build AI suggestions panel with actionable recommendations
- [ ] Create template management with conversion tracking
- [ ] Implement bulk document conversion capabilities

**Acceptance Criteria:**
- Multi-format file upload with drag-and-drop
- Real-time conversion progress and status updates
- Comprehensive template review and editing capabilities
- AI suggestions are actionable and easy to implement
- Template conversion history tracked and searchable
- Bulk conversion processes large document sets efficiently

**Components to Build:**
```typescript
src/components/policyConversion/
├── DocumentUploader.tsx
├── ConversionProgress.tsx
├── TemplateReview.tsx
├── SuggestionsPanel.tsx
├── TemplateLibrary.tsx
└── BulkConverter.tsx
```
```

---

## **5. Implementation Priority**

This Policy Document Conversion System should be implemented as a **high-priority feature** because:

1. **Critical User Need**: Enables fire departments to leverage existing documentation
2. **AI Value**: Showcases powerful AI capabilities for document processing
3. **Competitive Advantage**: Unique feature that differentiates the system
4. **User Adoption**: Removes friction for organizations with existing policies
5. **Scalability**: Allows rapid template creation for different department types

### **Recommended Implementation Order**
1. **Document Extraction** (Week 3) - Foundation for all other features
2. **Template Generation** (Week 4) - Core AI functionality
3. **Conversion Interface** (Week 5) - User-facing components
4. **Iterative Auditing** (Week 5) - Enhanced scoring system
5. **Template Management** (Week 6) - Complete lifecycle management

---

## **6. Success Metrics**

### **Technical Metrics**
- Document extraction accuracy: >95%
- Template generation confidence: >90%
- Conversion processing time: <5 minutes per document
- Iterative audit processing time: <3 minutes per transcript

### **User Experience Metrics**
- Template creation time reduction: 80% vs manual
- User satisfaction with generated templates: >85%
- Template refinement iterations: <3 per template
- End-to-end conversion completion rate: >95%

### **Operational Impact**
- Departments able to convert existing policies: 100%
- Compliance audit coverage improvement: 60%
- Template library growth rate: 200% increase
- User adoption acceleration: 50% faster

---

This comprehensive Policy Document Conversion System design addresses the critical missing feature and provides a complete roadmap for implementation and integration with the existing fire department transcription system.