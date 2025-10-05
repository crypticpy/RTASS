/**
 * PolicyExtractionService Tests
 * Fire Department Radio Transcription System
 *
 * Comprehensive tests for document extraction service.
 */

import { PolicyExtractionService } from '@/lib/services/policyExtraction';
import type { ExtractedContent, DocumentFormat } from '@/lib/types';

describe('PolicyExtractionService', () => {
  let service: PolicyExtractionService;

  beforeEach(() => {
    service = new PolicyExtractionService();
  });

  describe('detectFileFormat', () => {
    it('should detect PDF from MIME type', () => {
      const format = (service as any).detectFileFormat(
        'application/pdf',
        'document.pdf'
      );
      expect(format).toBe('pdf');
    });

    it('should detect DOCX from MIME type', () => {
      const format = (service as any).detectFileFormat(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'document.docx'
      );
      expect(format).toBe('docx');
    });

    it('should detect XLSX from MIME type', () => {
      const format = (service as any).detectFileFormat(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'spreadsheet.xlsx'
      );
      expect(format).toBe('xlsx');
    });

    it('should detect PPTX from MIME type', () => {
      const format = (service as any).detectFileFormat(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'presentation.pptx'
      );
      expect(format).toBe('pptx');
    });

    it('should fallback to extension if MIME type unknown', () => {
      const format = (service as any).detectFileFormat(
        'application/octet-stream',
        'document.pdf'
      );
      expect(format).toBe('pdf');
    });

    it('should handle markdown files', () => {
      const format = (service as any).detectFileFormat(
        'text/markdown',
        'README.md'
      );
      expect(format).toBe('md');
    });
  });

  describe('extractFromText', () => {
    it('should extract plain text content', async () => {
      const text = 'This is a test document.\n\nWith multiple paragraphs.';
      const buffer = Buffer.from(text, 'utf-8');

      const result = await service.extractFromText(buffer);

      expect(result.text).toBe(text);
      expect(result.metadata.format).toBe('txt');
      expect(result.metadata.characterCount).toBe(text.length);
    });

    it('should parse Markdown sections', async () => {
      const markdown = `# Main Heading

Content for main section.

## Subsection

Content for subsection.`;
      const buffer = Buffer.from(markdown, 'utf-8');

      const result = await service.extractFromText(buffer, true);

      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.sections[0].title).toBe('Main Heading');
      expect(result.sections[0].level).toBe(1);
      expect(result.metadata.format).toBe('md');
    });

    it('should handle empty text files', async () => {
      const buffer = Buffer.from('', 'utf-8');

      const result = await service.extractFromText(buffer);

      expect(result.text).toBe('');
      expect(result.sections.length).toBe(1); // Default section
      expect(result.metadata.characterCount).toBe(0);
    });
  });

  describe('detectPDFSections', () => {
    it('should detect ALL CAPS headings', () => {
      const text = `INTRODUCTION

This is the introduction text.

METHODOLOGY

This is the methodology section.`;

      const sections = (service as any).detectPDFSections(text);

      expect(sections.length).toBe(2);
      expect(sections[0].title).toBe('INTRODUCTION');
      expect(sections[0].level).toBe(1);
      expect(sections[1].title).toBe('METHODOLOGY');
    });

    it('should detect numbered sections', () => {
      const text = `1. First Section

Content of first section.

2. Second Section

Content of second section.`;

      const sections = (service as any).detectPDFSections(text);

      expect(sections.length).toBe(2);
      expect(sections[0].title).toContain('First Section');
      expect(sections[1].title).toContain('Second Section');
    });

    it('should handle text with no clear sections', () => {
      const text = 'This is a simple paragraph of text with no headings.';

      const sections = (service as any).detectPDFSections(text);

      expect(sections.length).toBe(1);
      expect(sections[0].title).toBe('Document Content');
    });
  });

  describe('parseHTMLSections', () => {
    it('should parse HTML headings from mammoth', () => {
      const html = `<h1>Main Title</h1>
<p>Some content here.</p>
<h2>Subsection</h2>
<p>More content.</p>
<h1>Second Main Section</h1>
<p>Final content.</p>`;

      const sections = (service as any).parseHTMLSections(html);

      expect(sections.length).toBe(3);
      expect(sections[0].title).toBe('Main Title');
      expect(sections[0].level).toBe(1);
      expect(sections[1].title).toBe('Subsection');
      expect(sections[1].level).toBe(2);
      expect(sections[2].title).toBe('Second Main Section');
      expect(sections[2].level).toBe(1);
    });

    it('should strip HTML tags from content', () => {
      const html = `<h1>Title</h1>
<p>Content with <strong>bold</strong> and <em>italic</em> text.</p>`;

      const sections = (service as any).parseHTMLSections(html);

      expect(sections[0].content).not.toContain('<strong>');
      expect(sections[0].content).not.toContain('<em>');
    });

    it('should handle HTML with no headings', () => {
      const html = '<p>Just a paragraph.</p><p>Another paragraph.</p>';

      const sections = (service as any).parseHTMLSections(html);

      expect(sections.length).toBe(0);
    });
  });

  describe('isScorecardFormat', () => {
    it('should detect scorecard format with criteria column', () => {
      const data = [
        ['Criteria', 'Score', 'Weight', 'Comments'],
        ['Safety compliance', '85', '0.3', 'Good overall'],
      ];

      const isScorecard = (service as any).isScorecardFormat(data);

      expect(isScorecard).toBe(true);
    });

    it('should detect scorecard format with compliance column', () => {
      const data = [
        ['Requirement', 'Compliance Status', 'Rating'],
        ['PPE usage', 'Compliant', '100'],
      ];

      const isScorecard = (service as any).isScorecardFormat(data);

      expect(isScorecard).toBe(true);
    });

    it('should not detect regular data as scorecard', () => {
      const data = [
        ['Date', 'Incident Number', 'Location'],
        ['2024-01-01', '2024-001', '123 Main St'],
      ];

      const isScorecard = (service as any).isScorecardFormat(data);

      expect(isScorecard).toBe(false);
    });

    it('should handle empty data', () => {
      const data: any[][] = [];

      const isScorecard = (service as any).isScorecardFormat(data);

      expect(isScorecard).toBe(false);
    });
  });

  describe('parseScorecardSheet', () => {
    it('should format scorecard as table text', () => {
      const data = [
        ['Criteria', 'Score', 'Weight'],
        ['Safety', '90', '0.4'],
        ['Communication', '85', '0.3'],
      ];

      const section = (service as any).parseScorecardSheet(data, 'Compliance');

      expect(section.title).toContain('Scorecard');
      expect(section.content).toContain('Criteria | Score | Weight');
      expect(section.content).toContain('Safety | 90 | 0.4');
      expect(section.content).toContain('Communication | 85 | 0.3');
    });

    it('should handle empty rows', () => {
      const data = [
        ['Criteria', 'Score'],
        ['Safety', '90'],
        [], // Empty row
        ['Communication', '85'],
      ];

      const section = (service as any).parseScorecardSheet(data, 'Test');

      expect(section.content).toBeTruthy();
    });
  });

  describe('parseMarkdownSections', () => {
    it('should parse Markdown headings with correct levels', () => {
      const text = `# Level 1 Heading

Content for level 1.

## Level 2 Heading

Content for level 2.

### Level 3 Heading

Content for level 3.`;

      const sections = (service as any).parseMarkdownSections(text);

      expect(sections.length).toBe(3);
      expect(sections[0].level).toBe(1);
      expect(sections[1].level).toBe(2);
      expect(sections[2].level).toBe(3);
    });

    it('should extract content between headings', () => {
      const text = `# First Section

This is the first section content.
It has multiple lines.

## Second Section

This is the second section.`;

      const sections = (service as any).parseMarkdownSections(text);

      expect(sections[0].content).toContain('first section content');
      expect(sections[0].content).toContain('multiple lines');
      expect(sections[1].content).toContain('second section');
    });
  });

  describe('determineHeadingLevel', () => {
    it('should assign level 1 to ALL CAPS', () => {
      const level = (service as any).determineHeadingLevel('INTRODUCTION');
      expect(level).toBe(1);
    });

    it('should assign level 2 to numbered sections', () => {
      const level = (service as any).determineHeadingLevel('1. First Section');
      expect(level).toBe(2);
    });

    it('should assign level 3 to multi-level numbered sections', () => {
      const level = (service as any).determineHeadingLevel('1.1 Subsection');
      expect(level).toBe(3);
    });

    it('should default to level 2 for other text', () => {
      const level = (service as any).determineHeadingLevel('Normal Heading');
      expect(level).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported format', async () => {
      const buffer = Buffer.from('test', 'utf-8');

      await expect(
        service.extractContent(buffer, 'application/unknown', 'test.xyz')
      ).rejects.toThrow();
    });

    it('should handle corrupted file gracefully', async () => {
      const corruptedBuffer = Buffer.from('not a valid file', 'utf-8');

      // This should fail but with a proper error message
      await expect(
        service.extractContent(corruptedBuffer, 'application/pdf', 'corrupt.pdf')
      ).rejects.toThrow();
    });
  });

  describe('Integration - Full Extraction Flow', () => {
    it('should extract from text file end-to-end', async () => {
      const content = 'Fire Department Safety Policy\n\nAll personnel must follow safety protocols.';
      const buffer = Buffer.from(content, 'utf-8');

      const result = await service.extractContent(
        buffer,
        'text/plain',
        'safety-policy.txt'
      );

      expect(result.text).toBe(content);
      expect(result.metadata.format).toBe('txt');
      expect(result.metadata.characterCount).toBe(content.length);
      expect(result.sections).toBeDefined();
    });

    it('should extract from Markdown file end-to-end', async () => {
      const markdown = `# Safety Policy

## PPE Requirements

All personnel must wear appropriate PPE.

## Radio Protocols

Follow standard radio procedures.`;
      const buffer = Buffer.from(markdown, 'utf-8');

      const result = await service.extractContent(
        buffer,
        'text/markdown',
        'policy.md'
      );

      expect(result.metadata.format).toBe('md');
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.sections[0].title).toBe('Safety Policy');
    });
  });
});
