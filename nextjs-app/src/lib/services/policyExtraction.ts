/**
 * Policy Document Extraction Service
 * Fire Department Radio Transcription System
 *
 * Extracts text and structure from policy documents in multiple formats:
 * - PDF files (using pdf-parse)
 * - Word documents (using mammoth)
 * - Excel spreadsheets (using xlsx)
 * - PowerPoint presentations (using officeparser)
 *
 * Preserves document structure (headings, sections, tables) and metadata.
 */

import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as officeParser from 'officeparser';
import { Errors } from './utils/errorHandlers';
import type {
  DocumentFormat,
  DocumentSection,
  ExtractedContent,
  DocumentMetadata,
} from '@/lib/types';

// Memory management constants
const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB - threshold for in-memory processing
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB - absolute maximum

/**
 * Check if file size is within safe processing limits
 *
 * Logs warnings for large files and throws errors for files exceeding maximum size.
 * This prevents out-of-memory errors in production environments.
 *
 * @param {Buffer} buffer - File buffer to validate
 * @throws {ServiceError} If file is too large
 *
 * @example
 * ```typescript
 * validateFileSize(buffer); // Throws if buffer > 50MB
 * ```
 */
function validateFileSize(buffer: Buffer): void {
  if (buffer.length > MAX_FILE_SIZE) {
    throw Errors.fileTooLarge(MAX_FILE_SIZE, buffer.length);
  }

  if (buffer.length > MAX_BUFFER_SIZE) {
    console.warn(
      `[MEMORY_WARNING] Processing large file (${(buffer.length / 1024 / 1024).toFixed(2)}MB). ` +
        `Consider implementing streaming for files >10MB.`
    );
  }
}

/**
 * PDF extraction options
 */
interface PDFExtractionOptions {
  detectHeadings?: boolean;
  preserveFormatting?: boolean;
}

/**
 * DOCX extraction options
 */
interface DOCXExtractionOptions {
  includeStyles?: boolean;
  preserveTables?: boolean;
}

/**
 * XLSX extraction options
 */
interface XLSXExtractionOptions {
  detectScorecard?: boolean;
  includeAllSheets?: boolean;
}

/**
 * PPTX extraction options
 */
interface PPTXExtractionOptions {
  preserveSlideStructure?: boolean;
  includeNotes?: boolean;
}

/**
 * Policy Document Extraction Service
 *
 * Provides multi-format document extraction with structure preservation
 * and metadata extraction.
 *
 * @example
 * ```typescript
 * const extractionService = new PolicyExtractionService();
 *
 * // Extract from PDF
 * const pdfContent = await extractionService.extractFromPDF(
 *   pdfBuffer,
 *   { detectHeadings: true }
 * );
 *
 * // Extract from any format
 * const content = await extractionService.extractContent(
 *   buffer,
 *   'application/pdf',
 *   'policy-manual.pdf'
 * );
 * ```
 */
export class PolicyExtractionService {
  /**
   * Extract content from document buffer based on MIME type
   *
   * Automatically detects document format and uses appropriate extraction method.
   *
   * @param {Buffer} buffer - Document file buffer
   * @param {string} mimeType - MIME type of the document
   * @param {string} fileName - Original filename
   * @returns {Promise<ExtractedContent>} Extracted content with structure
   * @throws {ServiceError} If extraction fails or format is unsupported
   *
   * @example
   * ```typescript
   * const content = await service.extractContent(
   *   fileBuffer,
   *   'application/pdf',
   *   'policy.pdf'
   * );
   * ```
   */
  async extractContent(
    buffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<ExtractedContent> {
    const format = this.detectFileFormat(mimeType, fileName);

    switch (format) {
      case 'pdf':
        return await this.extractFromPDF(buffer);
      case 'docx':
        return await this.extractFromDOCX(buffer);
      case 'xlsx':
        return await this.extractFromXLSX(buffer);
      case 'pptx':
        return await this.extractFromPPTX(buffer);
      case 'txt':
        return await this.extractFromText(buffer);
      case 'md':
        return await this.extractFromText(buffer, true);
      default:
        throw Errors.unsupportedFormat(format, [
          'pdf',
          'docx',
          'xlsx',
          'pptx',
          'txt',
          'md',
        ]);
    }
  }

  /**
   * Extract text and structure from PDF file
   *
   * Uses pdf-parse to extract raw text and implements heading detection
   * based on font size and formatting heuristics.
   *
   * @param {Buffer} buffer - PDF file buffer
   * @param {PDFExtractionOptions} options - Extraction options
   * @returns {Promise<ExtractedContent>} Extracted PDF content
   * @throws {ServiceError} If PDF parsing fails
   *
   * @example
   * ```typescript
   * const content = await service.extractFromPDF(pdfBuffer, {
   *   detectHeadings: true,
   *   preserveFormatting: true
   * });
   * ```
   */
  async extractFromPDF(
    buffer: Buffer,
    options: PDFExtractionOptions = {}
  ): Promise<ExtractedContent> {
    try {
      // Validate buffer size for memory safety
      validateFileSize(buffer);

      // Dynamic import of pdf-parse (only works server-side)
      // pdf-parse exports a named 'pdf' function, not a default export
      const { pdf: pdfParse } = await import('pdf-parse');
      const data = await pdfParse(buffer);

      // Extract basic text
      const fullText = data.text;

      // Detect sections from text structure
      const sections = options.detectHeadings
        ? this.detectPDFSections(fullText)
        : [this.createDefaultSection(fullText)];

      // Build metadata
      const metadata: DocumentMetadata = {
        pages: data.total,
        format: 'pdf' as DocumentFormat,
        extractedAt: new Date().toISOString(),
        characterCount: fullText.length,
        sectionCount: sections.length,
      };

      return {
        text: fullText,
        sections,
        metadata,
      };
    } catch (error) {
      throw Errors.processingFailed(
        'PDF extraction',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Extract text and structure from DOCX file
   *
   * Uses mammoth to convert DOCX to HTML/text while preserving paragraph styles.
   * Maps Word heading styles (Heading 1-6) to document section hierarchy.
   *
   * @param {Buffer} buffer - DOCX file buffer
   * @param {DOCXExtractionOptions} options - Extraction options
   * @returns {Promise<ExtractedContent>} Extracted DOCX content
   * @throws {ServiceError} If DOCX parsing fails
   *
   * @example
   * ```typescript
   * const content = await service.extractFromDOCX(docxBuffer, {
   *   includeStyles: true,
   *   preserveTables: true
   * });
   * ```
   */
  async extractFromDOCX(
    buffer: Buffer,
    options: DOCXExtractionOptions = {}
  ): Promise<ExtractedContent> {
    try {
      // Validate buffer size for memory safety
      validateFileSize(buffer);

      // Extract raw text
      const textResult = await mammoth.extractRawText({ buffer });
      const fullText = textResult.value;

      // Extract HTML to preserve structure
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const html = htmlResult.value;

      // Parse HTML to extract sections
      const sections = this.parseHTMLSections(html);

      // Build metadata
      const metadata: DocumentMetadata = {
        format: 'docx' as DocumentFormat,
        extractedAt: new Date().toISOString(),
        characterCount: fullText.length,
        sectionCount: sections.length,
      };

      return {
        text: fullText,
        sections: sections.length > 0 ? sections : [this.createDefaultSection(fullText)],
        metadata,
      };
    } catch (error) {
      throw Errors.processingFailed(
        'DOCX extraction',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Extract text and data from XLSX file
   *
   * Uses xlsx library to read workbook and detect scorecard format.
   * Handles both regular data sheets and compliance scorecard formats.
   *
   * @param {Buffer} buffer - XLSX file buffer
   * @param {XLSXExtractionOptions} options - Extraction options
   * @returns {Promise<ExtractedContent>} Extracted XLSX content
   * @throws {ServiceError} If XLSX parsing fails
   *
   * @example
   * ```typescript
   * const content = await service.extractFromXLSX(xlsxBuffer, {
   *   detectScorecard: true,
   *   includeAllSheets: true
   * });
   * ```
   */
  async extractFromXLSX(
    buffer: Buffer,
    options: XLSXExtractionOptions = {}
  ): Promise<ExtractedContent> {
    try {
      // Validate buffer size for memory safety
      validateFileSize(buffer);

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sections: DocumentSection[] = [];
      let fullText = '';

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Check if this is a scorecard format
        const isScorecard =
          options.detectScorecard !== false && this.isScorecardFormat(jsonData);

        if (isScorecard) {
          const scorecardSection = this.parseScorecardSheet(jsonData, sheetName);
          sections.push(scorecardSection);
          fullText += scorecardSection.content + '\n\n';
        } else {
          const regularSection = this.parseRegularSheet(jsonData, sheetName);
          sections.push(regularSection);
          fullText += regularSection.content + '\n\n';
        }
      }

      // Build metadata
      const metadata: DocumentMetadata = {
        format: 'xlsx' as DocumentFormat,
        extractedAt: new Date().toISOString(),
        characterCount: fullText.length,
        sectionCount: sections.length,
        isScorecard: sections.some((s) => s.title.includes('Scorecard')),
      };

      return {
        text: fullText.trim(),
        sections,
        metadata,
      };
    } catch (error) {
      throw Errors.processingFailed(
        'XLSX extraction',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Extract text and structure from PPTX file
   *
   * Uses officeparser to extract slide content. Treats each slide as a section
   * with the slide title as the section heading.
   *
   * @param {Buffer} buffer - PPTX file buffer
   * @param {PPTXExtractionOptions} options - Extraction options
   * @returns {Promise<ExtractedContent>} Extracted PPTX content
   * @throws {ServiceError} If PPTX parsing fails
   *
   * @example
   * ```typescript
   * const content = await service.extractFromPPTX(pptxBuffer, {
   *   preserveSlideStructure: true,
   *   includeNotes: false
   * });
   * ```
   */
  async extractFromPPTX(
    buffer: Buffer,
    options: PPTXExtractionOptions = {}
  ): Promise<ExtractedContent> {
    try {
      // Validate buffer size for memory safety
      validateFileSize(buffer);

      // Use officeparser for PPTX extraction
      const text = await new Promise<string>((resolve, reject) => {
        officeParser.parseOffice(buffer, (data: string, err: Error) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      // Split into slides (officeparser doesn't preserve structure well)
      // We'll create a single section for now, or split by slide markers
      const slides = this.detectPPTXSlides(text);
      const sections = slides.map((slideText, index) =>
        this.createSlideSection(slideText, index + 1)
      );

      // Build metadata
      const metadata: DocumentMetadata = {
        format: 'pptx' as DocumentFormat,
        extractedAt: new Date().toISOString(),
        characterCount: text.length,
        sectionCount: sections.length,
      };

      return {
        text,
        sections: sections.length > 0 ? sections : [this.createDefaultSection(text)],
        metadata,
      };
    } catch (error) {
      throw Errors.processingFailed(
        'PPTX extraction',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Extract text from plain text file
   *
   * @param {Buffer} buffer - Text file buffer
   * @param {boolean} isMarkdown - Whether to parse as Markdown
   * @returns {Promise<ExtractedContent>} Extracted text content
   *
   * @example
   * ```typescript
   * const content = await service.extractFromText(txtBuffer);
   * ```
   */
  async extractFromText(
    buffer: Buffer,
    isMarkdown: boolean = false
  ): Promise<ExtractedContent> {
    // Validate buffer size for memory safety
    validateFileSize(buffer);

    const text = buffer.toString('utf-8');

    // Detect sections based on markdown headers or blank lines
    const sections = isMarkdown
      ? this.parseMarkdownSections(text)
      : this.detectTextSections(text);

    const metadata: DocumentMetadata = {
      format: (isMarkdown ? 'md' : 'txt') as DocumentFormat,
      extractedAt: new Date().toISOString(),
      characterCount: text.length,
      sectionCount: sections.length,
    };

    return {
      text,
      sections: sections.length > 0 ? sections : [this.createDefaultSection(text)],
      metadata,
    };
  }

  /**
   * Detect file format from MIME type and filename
   *
   * @private
   * @param {string} mimeType - MIME type
   * @param {string} fileName - Filename
   * @returns {DocumentFormat} Detected format
   */
  private detectFileFormat(mimeType: string, fileName: string): DocumentFormat {
    // Check MIME type first
    const mimeMap: Record<string, DocumentFormat> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'text/plain': 'txt',
      'text/markdown': 'md',
    };

    if (mimeMap[mimeType]) {
      return mimeMap[mimeType];
    }

    // Fallback to file extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    const extMap: Record<string, DocumentFormat> = {
      pdf: 'pdf',
      docx: 'docx',
      xlsx: 'xlsx',
      pptx: 'pptx',
      txt: 'txt',
      md: 'md',
    };

    return extMap[extension || ''] || 'txt';
  }

  /**
   * Detect sections in PDF text using heuristics
   *
   * Looks for lines that appear to be headings based on:
   * - ALL CAPS text
   * - Short lines followed by blank lines
   * - Numbered sections (1., 2., etc.)
   *
   * @private
   * @param {string} text - Full PDF text
   * @returns {DocumentSection[]} Detected sections
   */
  private detectPDFSections(text: string): DocumentSection[] {
    const lines = text.split('\n');
    const sections: DocumentSection[] = [];
    let currentSection: DocumentSection | null = null;
    let sectionIdCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';

      // Check if this line is a heading
      const isHeading =
        // ALL CAPS line
        (line.length > 3 && line === line.toUpperCase() && /^[A-Z\s]+$/.test(line)) ||
        // Numbered section (1. , 2. , etc.)
        /^\d+\.\s+[A-Z]/.test(line) ||
        // Short line followed by blank line
        (line.length < 50 && nextLine === '' && line.length > 0);

      if (isHeading) {
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          id: `section-${++sectionIdCounter}`,
          title: line,
          level: this.determineHeadingLevel(line),
          content: '',
        };
      } else if (currentSection && line) {
        currentSection.content += line + '\n';
      }
    }

    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : [this.createDefaultSection(text)];
  }

  /**
   * Parse HTML from mammoth to extract sections
   *
   * @private
   * @param {string} html - HTML from mammoth
   * @returns {DocumentSection[]} Extracted sections
   */
  private parseHTMLSections(html: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    let sectionIdCounter = 0;

    // Simple HTML parsing (production should use proper HTML parser like cheerio)
    const headingRegex = /<h([1-6])>(.*?)<\/h\1>/gi;
    const matches = [...html.matchAll(headingRegex)];

    if (matches.length === 0) {
      return [];
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const level = parseInt(match[1]);
      const title = match[2].replace(/<[^>]*>/g, ''); // Strip HTML tags

      // Extract content until next heading
      const startIdx = match.index! + match[0].length;
      const endIdx = i < matches.length - 1 ? matches[i + 1].index! : html.length;
      const contentHtml = html.substring(startIdx, endIdx);
      const content = contentHtml.replace(/<[^>]*>/g, '').trim();

      sections.push({
        id: `section-${++sectionIdCounter}`,
        title,
        level,
        content,
      });
    }

    return sections;
  }

  /**
   * Check if Excel sheet is in scorecard format
   *
   * @private
   * @param {any[][]} data - Sheet data as 2D array
   * @returns {boolean} True if scorecard format detected
   */
  private isScorecardFormat(data: any[][]): boolean {
    if (data.length < 2) return false;

    const headerRow = data[0] || [];
    const scorecardKeywords = [
      'criteria',
      'criterion',
      'compliance',
      'score',
      'rating',
      'weight',
      'points',
      'requirement',
    ];

    return headerRow.some(
      (cell: any) =>
        typeof cell === 'string' &&
        scorecardKeywords.some((keyword) => cell.toLowerCase().includes(keyword))
    );
  }

  /**
   * Parse Excel sheet as scorecard
   *
   * @private
   * @param {any[][]} data - Sheet data
   * @param {string} sheetName - Sheet name
   * @returns {DocumentSection} Scorecard section
   */
  private parseScorecardSheet(data: any[][], sheetName: string): DocumentSection {
    const headers = data[0] || [];
    const rows = data.slice(1);

    let content = `Scorecard: ${sheetName}\n\n`;

    // Format as table-like text
    content += headers.join(' | ') + '\n';
    content += headers.map(() => '---').join(' | ') + '\n';

    for (const row of rows) {
      if (row.length > 0) {
        content += row.map((cell) => cell || '').join(' | ') + '\n';
      }
    }

    return {
      id: `scorecard-${sheetName.toLowerCase().replace(/\s+/g, '-')}`,
      title: `Scorecard: ${sheetName}`,
      level: 1,
      content,
    };
  }

  /**
   * Parse regular Excel sheet
   *
   * @private
   * @param {any[][]} data - Sheet data
   * @param {string} sheetName - Sheet name
   * @returns {DocumentSection} Regular section
   */
  private parseRegularSheet(data: any[][], sheetName: string): DocumentSection {
    let content = '';

    for (const row of data) {
      if (row.length > 0) {
        content += row.map((cell) => cell || '').join(', ') + '\n';
      }
    }

    return {
      id: `sheet-${sheetName.toLowerCase().replace(/\s+/g, '-')}`,
      title: sheetName,
      level: 1,
      content,
    };
  }

  /**
   * Detect slides in PPTX text
   *
   * Since officeparser doesn't preserve structure well, we'll try to detect
   * slide boundaries using common patterns.
   *
   * @private
   * @param {string} text - Full PPTX text
   * @returns {string[]} Slide texts
   */
  private detectPPTXSlides(text: string): string[] {
    // Split by double newlines or slide numbers
    const slides = text.split(/\n\n+/).filter((s) => s.trim().length > 0);

    return slides.length > 0 ? slides : [text];
  }

  /**
   * Create section from slide text
   *
   * @private
   * @param {string} slideText - Slide content
   * @param {number} slideNumber - Slide number
   * @returns {DocumentSection} Slide section
   */
  private createSlideSection(slideText: string, slideNumber: number): DocumentSection {
    // Try to extract title (first line)
    const lines = slideText.split('\n').filter((l) => l.trim());
    const title = lines[0] || `Slide ${slideNumber}`;
    const content = lines.slice(1).join('\n').trim();

    return {
      id: `slide-${slideNumber}`,
      title,
      level: 1,
      content,
    };
  }

  /**
   * Parse Markdown sections
   *
   * @private
   * @param {string} text - Markdown text
   * @returns {DocumentSection[]} Sections
   */
  private parseMarkdownSections(text: string): DocumentSection[] {
    const sections: DocumentSection[] = [];
    const lines = text.split('\n');
    let currentSection: DocumentSection | null = null;
    let sectionIdCounter = 0;

    for (const line of lines) {
      // Check for Markdown headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }

        const level = headingMatch[1].length;
        const title = headingMatch[2];

        currentSection = {
          id: `section-${++sectionIdCounter}`,
          title,
          level,
          content: '',
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Detect sections in plain text
   *
   * @private
   * @param {string} text - Plain text
   * @returns {DocumentSection[]} Sections
   */
  private detectTextSections(text: string): DocumentSection[] {
    // Simple split by blank lines
    const paragraphs = text
      .split(/\n\s*\n/)
      .filter((p) => p.trim().length > 0);

    if (paragraphs.length <= 1) {
      return [];
    }

    return paragraphs.map((paragraph, index) => ({
      id: `paragraph-${index + 1}`,
      title: `Section ${index + 1}`,
      level: 1,
      content: paragraph.trim(),
    }));
  }

  /**
   * Create default section for unstructured text
   *
   * @private
   * @param {string} text - Full text
   * @returns {DocumentSection} Default section
   */
  private createDefaultSection(text: string): DocumentSection {
    return {
      id: 'section-1',
      title: 'Document Content',
      level: 1,
      content: text.trim(),
    };
  }

  /**
   * Determine heading level from text characteristics
   *
   * @private
   * @param {string} text - Heading text
   * @returns {number} Heading level (1-6)
   */
  private determineHeadingLevel(text: string): number {
    // ALL CAPS = level 1
    if (text === text.toUpperCase()) {
      return 1;
    }

    // Numbered with single digit = level 2
    if (/^\d\.\s/.test(text)) {
      return 2;
    }

    // Numbered with multiple digits = level 3
    if (/^\d+\.\d+\s/.test(text)) {
      return 3;
    }

    // Default to level 2
    return 2;
  }
}

/**
 * Singleton policy extraction service instance
 */
export const policyExtractionService = new PolicyExtractionService();
