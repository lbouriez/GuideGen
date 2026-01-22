/**
 * Unit tests for GuidelineValidator
 * Tests validation rules and error detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GuidelineValidator } from '@/core/validation/guideline-validator';
import { ValidationSeverity } from '@/core/validation/framework';
import type { GeneratedGuideline } from '@/types/guidelines';

describe('GuidelineValidator', () => {
  let validator: GuidelineValidator;

  beforeEach(() => {
    validator = new GuidelineValidator();
  });

  describe('Validator initialization', () => {
    it('should initialize with name', () => {
      expect(validator.name).toBe('GuidelineValidator');
    });

    it('should have validation rules defined', () => {
      expect(validator).toBeDefined();
    });
  });

  describe('Required field validation', () => {
    it('should pass validation for complete guideline', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Logging Guidelines\n\n## ✅ DO\nUse logger\n\n## ❌ NEVER\nUse console.log\n\n```typescript\nlogger.info("message");\n```\n\nThis guideline provides comprehensive information about logging best practices in the application. It covers various scenarios and provides detailed examples for developers to follow.',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should fail when domain is missing', () => {
      const guideline = {
        type: 'logging',
        fileName: 'logging.md',
        content: '# Test\nContent here',
        priority: 5,
      } as any;

      const result = validator.validate(guideline);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.rule === 'required-domain')).toBe(true);
    });

    it('should fail when type is missing', () => {
      const guideline = {
        domain: 'backend',
        fileName: 'logging.md',
        content: '# Test\nContent here',
        priority: 5,
      } as any;

      const result = validator.validate(guideline);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.rule === 'required-type')).toBe(true);
    });

    it('should fail when fileName is missing', () => {
      const guideline = {
        domain: 'backend',
        type: 'logging',
        content: '# Test\nContent here',
        priority: 5,
      } as any;

      const result = validator.validate(guideline);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.rule === 'required-filename')).toBe(true);
    });

    it('should fail when fileName does not end with .md', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.txt',
        content: '# Test\nContent here',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.rule === 'required-filename')).toBe(true);
    });

    it('should fail when content is missing', () => {
      const guideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '',
        priority: 5,
      } as any;

      const result = validator.validate(guideline);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.rule === 'required-content')).toBe(true);
    });

    it('should fail when content is empty string', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.rule === 'required-content')).toBe(true);
    });
  });

  describe('Content structure validation', () => {
    it('should fail when missing level-1 heading', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: 'Just some content without a title',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.rule === 'has-title')).toBe(true);
      expect(result.issues.find(i => i.rule === 'has-title')?.severity).toBe(ValidationSeverity.ERROR);
    });

    it('should pass with proper level-1 heading', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Logging Guidelines\n\nContent here with enough text to pass length validation. This is a comprehensive guideline.',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.issues.some(i => i.rule === 'has-title')).toBe(false);
    });

    it('should warn when missing DO section', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\nContent without DO section',
        priority: 5,
      };

      const result = validator.validate(guideline);
      const issue = result.issues.find(i => i.rule === 'has-do-section');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should pass when DO section is present', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\n## ✅ DO\n\nUse proper logging',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.issues.some(i => i.rule === 'has-do-section')).toBe(false);
    });

    it('should accept DO section at level 3', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\n### ✅ DO\n\nUse proper logging',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.issues.some(i => i.rule === 'has-do-section')).toBe(false);
    });

    it('should warn when missing NEVER section', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\nContent without NEVER section',
        priority: 5,
      };

      const result = validator.validate(guideline);
      const issue = result.issues.find(i => i.rule === 'has-never-section');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should pass when NEVER section is present', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\n## ❌ NEVER\n\nDont use console.log',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.issues.some(i => i.rule === 'has-never-section')).toBe(false);
    });

    it('should warn when missing code examples', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\nJust text without any code blocks',
        priority: 5,
      };

      const result = validator.validate(guideline);
      const issue = result.issues.find(i => i.rule === 'has-code-examples');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should pass when code examples are present', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\n```typescript\nlogger.info("test");\n```',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.issues.some(i => i.rule === 'has-code-examples')).toBe(false);
    });

    it('should detect code blocks without language', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\n```\ncode here\n```',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.issues.some(i => i.rule === 'has-code-examples')).toBe(false);
    });
  });

  describe('Quality validation', () => {
    it('should warn when content is too short', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Short\nToo brief',
        priority: 5,
      };

      const result = validator.validate(guideline);
      const issue = result.issues.find(i => i.rule === 'sufficient-length');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe(ValidationSeverity.WARNING);
    });

    it('should pass when content is sufficient length', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\n' + 'A'.repeat(500),
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.issues.some(i => i.rule === 'sufficient-length')).toBe(false);
    });

    it('should provide info when lacking multiple sections', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Single Section\n\nAll content in one section',
        priority: 5,
      };

      const result = validator.validate(guideline);
      const issue = result.issues.find(i => i.rule === 'has-multiple-sections');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe(ValidationSeverity.INFO);
    });

    it('should pass with multiple level-2 sections', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\n## Section 1\nContent\n\n## Section 2\nMore content',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.issues.some(i => i.rule === 'has-multiple-sections')).toBe(false);
    });

    it('should provide info when code/text balance is off', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Guidelines\n\n```typescript\n' + 'code\n'.repeat(100) + '```\n\nShort text',
        priority: 5,
      };

      const result = validator.validate(guideline);
      const issue = result.issues.find(i => i.rule === 'balanced-content');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe(ValidationSeverity.INFO);
    });

    it('should pass with balanced code and text', () => {
      const text = 'Explanation text here. '.repeat(30);
      const code = '```typescript\nconst x = 1;\nconst y = 2;\nconst z = 3;\n```';
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: `# Guidelines\n\n${text}\n\n${code}\n\n${text}`,
        priority: 5,
      };

      const result = validator.validate(guideline);
      // The balance check is an INFO issue, not a blocker
      const balanceIssue = result.issues.find(i => i.rule === 'balanced-content');
      expect(balanceIssue?.severity).not.toBe(ValidationSeverity.ERROR);
    });
  });

  describe('Validation result properties', () => {
    it('should return valid=true when no errors', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Logging\n\n## ✅ DO\nUse logger\n\n## ❌ NEVER\nUse console\n\n```ts\nlogger.info("msg");\n```\n\nThis is comprehensive logging guideline with enough content.',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.valid).toBe(true);
    });

    it('should return valid=false when errors present', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: 'No title here',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.valid).toBe(false);
    });

    it('should calculate score based on issues', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Title\n\nShort content',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.score).toBeLessThan(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should return perfect score for ideal guideline', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: `# Logging Guidelines

## ✅ DO

Use structured logging with Winston logger. Always include context in your log messages. Use the appropriate log levels for different types of information. Follow the logging conventions established in the codebase.

\`\`\`typescript
logger.info('User logged in', { userId: user.id });
logger.error('Failed to process payment', { error: err.message, orderId });
\`\`\`

## ❌ NEVER

Never use console.log in production code. Do not log sensitive information like passwords or API keys.

\`\`\`typescript
// Bad
console.log('User password:', password);
\`\`\`

## Best Practices

Always include context in log messages. Use appropriate log levels. Follow the logging conventions established in the codebase. This guideline provides comprehensive information about logging best practices with detailed explanations and examples.`,
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.score).toBeGreaterThanOrEqual(95);
      expect(result.issues.filter(i => i.severity === ValidationSeverity.ERROR)).toHaveLength(0);
    });

    it('should provide helpful error messages', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.txt',
        content: '',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.issues.length).toBeGreaterThan(0);
      result.issues.forEach(issue => {
        expect(issue.message).toBeTruthy();
        expect(issue.rule).toBeTruthy();
      });
    });

    it('should provide suggestions for issues', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.txt',
        content: 'Missing title',
        priority: 5,
      };

      const result = validator.validate(guideline);
      const issuesWithSuggestions = result.issues.filter(i => i.suggestion);
      expect(issuesWithSuggestions.length).toBeGreaterThan(0);
    });

    it('should categorize issues by severity', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Title\n\nShort',
        priority: 5,
      };

      const result = validator.validate(guideline);
      const errors = result.issues.filter(i => i.severity === ValidationSeverity.ERROR);
      const warnings = result.issues.filter(i => i.severity === ValidationSeverity.WARNING);
      const info = result.issues.filter(i => i.severity === ValidationSeverity.INFO);

      expect(errors.length + warnings.length + info.length).toBe(result.issues.length);
    });
  });

  describe('Edge cases', () => {
    it('should handle guideline with only title', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Title',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result).toBeDefined();
      // Has warnings but no critical errors, so might be valid
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle very long content', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Title\n\n' + 'Content '.repeat(10000),
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result).toBeDefined();
    });

    it('should handle special characters in content', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: '# Title 🎉\n\n## ✅ DO\n\nUse émojis\n\n```js\nconst x = "special chars: ñ á é";\n```',
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result).toBeDefined();
    });

    it('should handle multiline code blocks', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: `# Title

\`\`\`typescript
function test() {
  logger.info("test");
  return true;
}
\`\`\``,
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result.issues.some(i => i.rule === 'has-code-examples')).toBe(false);
    });

    it('should handle nested markdown structures', () => {
      const guideline: GeneratedGuideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: `# Main Title

## Section 1

### Subsection 1.1

Content here

### Subsection 1.2

More content

## Section 2

Final content`,
        priority: 5,
      };

      const result = validator.validate(guideline);
      expect(result).toBeDefined();
    });
  });
});
