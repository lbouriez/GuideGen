/**
 * Improved Guideline Validator
 * Uses validation framework with structured rules
 */

import type { GeneratedGuideline } from '../../types';
import {
  RuleBasedValidator,
  ValidationSeverity,
  ValidationRule,
  createRule,
  type ValidationResult
} from './framework';
import { MarkdownParser } from './markdown-parser';

export class GuidelineValidator extends RuleBasedValidator<GeneratedGuideline> {
  name = 'GuidelineValidator';
  protected rules: ValidationRule<GeneratedGuideline>[];

  constructor() {
    super();
    this.rules = [
      // Required fields
      createRule(
        'required-domain',
        ValidationSeverity.ERROR,
        (g) => !!g.domain,
        'Guideline must have a domain',
        'Add a domain field (backend, frontend, shared, or all)'
      ),
      createRule(
        'required-type',
        ValidationSeverity.ERROR,
        (g) => !!g.type,
        'Guideline must have a type',
        'Add a type field describing the guideline topic'
      ),
      createRule(
        'required-filename',
        ValidationSeverity.ERROR,
        (g) => !!g.fileName && g.fileName.endsWith('.md'),
        'Guideline must have a .md filename',
        'Ensure fileName ends with .md extension'
      ),
      createRule(
        'required-content',
        ValidationSeverity.ERROR,
        (g) => !!g.content && g.content.length > 0,
        'Guideline must have content',
        'Add markdown content to the guideline'
      ),

      // Content structure rules
      createRule(
        'has-title',
        ValidationSeverity.ERROR,
        (g) => {
          const parser = new MarkdownParser(g.content);
          return parser.hasHeading(1);
        },
        'Guideline must have a markdown title (# Title)',
        'Add a level-1 heading at the top of the guideline'
      ),
      createRule(
        'has-do-section',
        ValidationSeverity.WARNING,
        (g) => g.content.includes('## ✅ DO') || g.content.includes('### ✅ DO'),
        'Guideline should have a DO section showing good practices',
        'Add a "## ✅ DO" section with examples of recommended patterns'
      ),
      createRule(
        'has-never-section',
        ValidationSeverity.WARNING,
        (g) => g.content.includes('## ❌ NEVER') || g.content.includes('### ❌ NEVER'),
        'Guideline should have a NEVER section showing anti-patterns',
        'Add a "## ❌ NEVER" section with examples of patterns to avoid'
      ),
      createRule(
        'has-code-examples',
        ValidationSeverity.WARNING,
        (g) => {
          const parser = new MarkdownParser(g.content);
          return parser.getCodeBlocks().length > 0;
        },
        'Guideline should include code examples',
        'Add code blocks using ```language syntax to show practical examples'
      ),

      // Quality rules
      createRule(
        'sufficient-length',
        ValidationSeverity.WARNING,
        (g) => g.content.length >= 500,
        'Guideline content is too short (< 500 characters)',
        'Add more detailed explanations and examples'
      ),
      createRule(
        'has-multiple-sections',
        ValidationSeverity.INFO,
        (g) => {
          const parser = new MarkdownParser(g.content);
          return parser.getHeadings(2).length >= 2;
        },
        'Guideline could benefit from more sections',
        'Consider organizing content into multiple sections with level-2 headings'
      ),
      createRule(
        'balanced-content',
        ValidationSeverity.INFO,
        (g) => {
          const parser = new MarkdownParser(g.content);
          const codeBlocks = parser.getCodeBlocks();
          const textLength = g.content.replace(/```[\s\S]*?```/g, '').length;
          const codeLength = codeBlocks.join('').length;
          // Code should be 20-60% of total content
          const ratio = codeLength / (textLength + codeLength);
          return ratio >= 0.2 && ratio <= 0.6;
        },
        'Guideline could have a better balance of text and code',
        'Aim for 20-60% code examples with explanatory text'
      ),
    ];
  }
}

// Note: validateAllGuidelines() and checkDuplicates() have been moved to
// src/core/phases/guidelines/validator.ts to avoid duplication
// Use the legacy validator wrapper for phase-level validation
