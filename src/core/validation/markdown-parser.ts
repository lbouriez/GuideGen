/**
 * Markdown Parser Utility
 * Provides structural analysis of markdown content
 */

export interface MarkdownHeading {
  level: number;
  text: string;
  line: number;
}

export interface MarkdownCodeBlock {
  language: string;
  code: string;
  line: number;
}

export class MarkdownParser {
  private content: string;
  private lines: string[];

  constructor(content: string) {
    this.content = content;
    this.lines = content.split('\n');
  }

  /**
   * Check if markdown has a heading at specific level
   */
  hasHeading(level: number): boolean {
    const regex = new RegExp(`^${'#'.repeat(level)}\\s+.+`, 'm');
    return regex.test(this.content);
  }

  /**
   * Get all headings at specific level
   */
  getHeadings(level?: number): MarkdownHeading[] {
    const headings: MarkdownHeading[] = [];

    this.lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)/);
      if (match) {
        const headingLevel = match[1].length;
        if (!level || headingLevel === level) {
          headings.push({
            level: headingLevel,
            text: match[2],
            line: index + 1
          });
        }
      }
    });

    return headings;
  }

  /**
   * Get all code blocks with their language
   */
  getCodeBlocks(): string[] {
    const blocks: string[] = [];
    const regex = /```[\s\S]*?```/g;
    let match;

    while ((match = regex.exec(this.content)) !== null) {
      blocks.push(match[0]);
    }

    return blocks;
  }

  /**
   * Get code blocks with metadata
   */
  getCodeBlocksWithMetadata(): MarkdownCodeBlock[] {
    const blocks: MarkdownCodeBlock[] = [];
    let inCodeBlock = false;
    let currentBlock: { language: string; code: string[]; startLine: number } | null = null;

    this.lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Starting code block
          const language = line.substring(3).trim() || 'text';
          currentBlock = { language, code: [], startLine: index + 1 };
          inCodeBlock = true;
        } else {
          // Ending code block
          if (currentBlock) {
            blocks.push({
              language: currentBlock.language,
              code: currentBlock.code.join('\n'),
              line: currentBlock.startLine
            });
          }
          currentBlock = null;
          inCodeBlock = false;
        }
      } else if (inCodeBlock && currentBlock) {
        currentBlock.code.push(line);
      }
    });

    return blocks;
  }

  /**
   * Get all markdown links
   */
  getLinks(): Array<{ text: string; url: string; line: number }> {
    const links: Array<{ text: string; url: string; line: number }> = [];
    const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;

    this.lines.forEach((line, index) => {
      let match;
      while ((match = linkRegex.exec(line)) !== null) {
        links.push({
          text: match[1],
          url: match[2],
          line: index + 1
        });
      }
    });

    return links;
  }

  /**
   * Count words (excluding code blocks)
   */
  getWordCount(): number {
    const contentWithoutCode = this.content.replace(/```[\s\S]*?```/g, '');
    const words = contentWithoutCode.match(/\b\w+\b/g);
    return words ? words.length : 0;
  }

  /**
   * Get sections (content between headings)
   */
  getSections(): Array<{ heading: MarkdownHeading; content: string }> {
    const headings = this.getHeadings();
    const sections: Array<{ heading: MarkdownHeading; content: string }> = [];

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const startLine = heading.line;
      const endLine = i < headings.length - 1 ? headings[i + 1].line - 1 : this.lines.length;

      const content = this.lines.slice(startLine, endLine).join('\n');
      sections.push({ heading, content });
    }

    return sections;
  }

  /**
   * Check if content has specific section
   */
  hasSection(sectionTitle: string, level?: number): boolean {
    const headings = this.getHeadings(level);
    return headings.some(h => h.text.toLowerCase().includes(sectionTitle.toLowerCase()));
  }

  /**
   * Validate markdown structure
   */
  validateStructure(): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for balanced code blocks
    const codeBlockMarkers = this.content.match(/```/g);
    if (codeBlockMarkers && codeBlockMarkers.length % 2 !== 0) {
      issues.push('Unbalanced code block markers (```)');
    }

    // Check for balanced brackets in links
    const openBrackets = (this.content.match(/\[/g) || []).length;
    const closeBrackets = (this.content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      issues.push('Unbalanced link brackets');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
