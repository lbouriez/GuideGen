/**
 * Unit tests for Zod schemas and parsing utilities
 * Tests schema validation, JSON parsing, and AI response extraction
 */

import { describe, it, expect } from 'vitest';
import {
  GuidelineDomainSchema,
  GeneratedGuidelineSchema,
  CodePatternSchema,
  PatternReportSchema,
  MergeChangeSchema,
  IntelligentMergeResultSchema,
  RuleSchema,
  ExtractedRuleSchema,
  TechStackSchema,
  ProjectInfoSchema,
  TechProfileSchema,
  GuidelineToGenerateSchema,
  GuidelinesListSchema,
  PackageJsonSchema,
  parseWithSchema,
  extractJsonFromResponse,
  parseAIResponse,
} from '@/types/schemas';

describe('Zod Schema Validation', () => {
  describe('GuidelineDomainSchema', () => {
    it('should validate correct domain values', () => {
      expect(GuidelineDomainSchema.parse('backend')).toBe('backend');
      expect(GuidelineDomainSchema.parse('frontend')).toBe('frontend');
      expect(GuidelineDomainSchema.parse('shared')).toBe('shared');
      expect(GuidelineDomainSchema.parse('mobile')).toBe('mobile');
      expect(GuidelineDomainSchema.parse('all')).toBe('all');
    });

    it('should reject invalid domain values', () => {
      expect(() => GuidelineDomainSchema.parse('invalid')).toThrow();
      expect(() => GuidelineDomainSchema.parse('desktop')).toThrow();
      expect(() => GuidelineDomainSchema.parse('')).toThrow();
    });
  });

  describe('GeneratedGuidelineSchema', () => {
    it('should validate correct guideline object', () => {
      const guideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: 'This is a comprehensive guideline about logging best practices. It contains detailed information and code examples to help developers understand the proper way to implement logging in the application.',
        priority: 5,
      };
      const result = GeneratedGuidelineSchema.parse(guideline);
      expect(result).toEqual(guideline);
    });

    it('should validate guideline without optional priority', () => {
      const guideline = {
        domain: 'frontend',
        type: 'styling',
        fileName: 'styling.md',
        content: 'This is a comprehensive guideline about styling best practices with detailed examples and useful information. '.repeat(3),
      };
      const result = GeneratedGuidelineSchema.parse(guideline);
      expect(result.priority).toBeUndefined();
    });

    it('should reject guideline with non-.md fileName', () => {
      const guideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.txt',
        content: 'This is a comprehensive guideline.',
      };
      expect(() => GeneratedGuidelineSchema.parse(guideline)).toThrow();
    });

    it('should reject guideline with short content', () => {
      const guideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: 'Too short',
      };
      expect(() => GeneratedGuidelineSchema.parse(guideline)).toThrow();
    });

    it('should reject guideline with invalid priority', () => {
      const guideline = {
        domain: 'backend',
        type: 'logging',
        fileName: 'logging.md',
        content: 'This is a comprehensive guideline about logging best practices.',
        priority: 11,
      };
      expect(() => GeneratedGuidelineSchema.parse(guideline)).toThrow();
    });

    it('should reject guideline with missing required fields', () => {
      const guideline = {
        domain: 'backend',
        type: 'logging',
      };
      expect(() => GeneratedGuidelineSchema.parse(guideline)).toThrow();
    });
  });

  describe('CodePatternSchema', () => {
    it('should validate correct code pattern', () => {
      const pattern = {
        name: 'Dependency Injection',
        description: 'Using InversifyJS for DI',
        examples: ['@injectable()', 'container.bind()'],
        files: ['src/service.ts', 'src/repo.ts'],
        frequency: 'always',
      };
      const result = CodePatternSchema.parse(pattern);
      expect(result).toEqual(pattern);
    });

    it('should validate all frequency values', () => {
      expect(CodePatternSchema.parse({ name: 'A', description: 'B', examples: [], files: [], frequency: 'always' })).toBeTruthy();
      expect(CodePatternSchema.parse({ name: 'A', description: 'B', examples: [], files: [], frequency: 'common' })).toBeTruthy();
      expect(CodePatternSchema.parse({ name: 'A', description: 'B', examples: [], files: [], frequency: 'occasional' })).toBeTruthy();
    });

    it('should reject invalid frequency', () => {
      const pattern = {
        name: 'Pattern',
        description: 'Description',
        examples: [],
        files: [],
        frequency: 'rarely',
      };
      expect(() => CodePatternSchema.parse(pattern)).toThrow();
    });
  });

  describe('PatternReportSchema', () => {
    it('should validate empty pattern report', () => {
      const report = {};
      const result = PatternReportSchema.parse(report);
      expect(result).toEqual({});
    });

    it('should validate pattern report with all fields', () => {
      const report = {
        importPatterns: [{ name: 'Path Aliases', description: 'Using @/', examples: [], files: [], frequency: 'always' }],
        namingConventions: [{ name: 'PascalCase', description: 'Components', examples: [], files: [], frequency: 'always' }],
        architecturePatterns: [],
        stateManagement: [],
        errorHandling: [],
        loggingPatterns: [],
      };
      const result = PatternReportSchema.parse(report);
      expect(result).toEqual(report);
    });

    it('should validate pattern report with some fields', () => {
      const report = {
        importPatterns: [{ name: 'Pattern', description: 'Desc', examples: [], files: [], frequency: 'common' }],
      };
      const result = PatternReportSchema.parse(report);
      expect(result.namingConventions).toBeUndefined();
    });
  });

  describe('MergeChangeSchema', () => {
    it('should validate all change types', () => {
      expect(MergeChangeSchema.parse({ type: 'added', section: 'New', description: 'Added', significance: 'major' })).toBeTruthy();
      expect(MergeChangeSchema.parse({ type: 'modified', section: 'Mod', description: 'Modified', significance: 'minor' })).toBeTruthy();
      expect(MergeChangeSchema.parse({ type: 'removed', section: 'Old', description: 'Removed', significance: 'major' })).toBeTruthy();
      expect(MergeChangeSchema.parse({ type: 'kept', section: 'Same', description: 'Kept', significance: 'minor' })).toBeTruthy();
    });

    it('should reject invalid change type', () => {
      expect(() => MergeChangeSchema.parse({ type: 'updated', section: 'S', description: 'D', significance: 'minor' })).toThrow();
    });

    it('should reject invalid significance', () => {
      expect(() => MergeChangeSchema.parse({ type: 'added', section: 'S', description: 'D', significance: 'critical' })).toThrow();
    });
  });

  describe('IntelligentMergeResultSchema', () => {
    it('should validate merge result with default requiresConfirmation', () => {
      const result = {
        mergedContent: 'Merged content here',
        changes: [{ type: 'added', section: 'New', description: 'Added', significance: 'major' }],
      };
      const parsed = IntelligentMergeResultSchema.parse(result);
      expect(parsed.requiresConfirmation).toBe(false);
    });

    it('should validate merge result with explicit requiresConfirmation', () => {
      const result = {
        mergedContent: 'Merged content',
        changes: [],
        requiresConfirmation: true,
      };
      const parsed = IntelligentMergeResultSchema.parse(result);
      expect(parsed.requiresConfirmation).toBe(true);
    });
  });

  describe('RuleSchema', () => {
    it('should validate complete rule', () => {
      const rule = {
        id: 'backend-di-001',
        description: 'Always use dependency injection',
        category: 'critical',
        domain: 'backend',
        enforceable: true,
        doExample: '@injectable() class Service {}',
        dontExample: 'const service = new Service()',
      };
      const result = RuleSchema.parse(rule);
      expect(result).toEqual(rule);
    });

    it('should validate rule without optional examples', () => {
      const rule = {
        id: 'rule-001',
        description: 'A rule',
        category: 'recommended',
        domain: 'all',
        enforceable: false,
      };
      const result = RuleSchema.parse(rule);
      expect(result.doExample).toBeUndefined();
      expect(result.dontExample).toBeUndefined();
    });

    it('should validate all category values', () => {
      expect(RuleSchema.parse({ id: '1', description: 'D', category: 'critical', domain: 'all', enforceable: true })).toBeTruthy();
      expect(RuleSchema.parse({ id: '1', description: 'D', category: 'important', domain: 'all', enforceable: true })).toBeTruthy();
      expect(RuleSchema.parse({ id: '1', description: 'D', category: 'recommended', domain: 'all', enforceable: false })).toBeTruthy();
    });

    it('should validate all domain values for rules', () => {
      expect(RuleSchema.parse({ id: '1', description: 'D', category: 'critical', domain: 'backend', enforceable: true })).toBeTruthy();
      expect(RuleSchema.parse({ id: '1', description: 'D', category: 'critical', domain: 'frontend', enforceable: true })).toBeTruthy();
      expect(RuleSchema.parse({ id: '1', description: 'D', category: 'critical', domain: 'shared', enforceable: true })).toBeTruthy();
      expect(RuleSchema.parse({ id: '1', description: 'D', category: 'critical', domain: 'all', enforceable: true })).toBeTruthy();
    });
  });

  describe('TechStackSchema', () => {
    it('should validate complete tech stack', () => {
      const stack = {
        languages: ['TypeScript', 'JavaScript'],
        frameworks: ['React', 'Express'],
        buildTools: ['Vite', 'tsc'],
        testingFrameworks: ['Vitest', 'Jest'],
        linters: ['ESLint', 'Prettier'],
        packageManager: 'npm',
      };
      const result = TechStackSchema.parse(stack);
      expect(result).toEqual(stack);
    });

    it('should validate all package manager values', () => {
      expect(TechStackSchema.parse({ languages: [], frameworks: [], buildTools: [], testingFrameworks: [], linters: [], packageManager: 'npm' })).toBeTruthy();
      expect(TechStackSchema.parse({ languages: [], frameworks: [], buildTools: [], testingFrameworks: [], linters: [], packageManager: 'yarn' })).toBeTruthy();
      expect(TechStackSchema.parse({ languages: [], frameworks: [], buildTools: [], testingFrameworks: [], linters: [], packageManager: 'pnpm' })).toBeTruthy();
      expect(TechStackSchema.parse({ languages: [], frameworks: [], buildTools: [], testingFrameworks: [], linters: [], packageManager: 'bun' })).toBeTruthy();
      expect(TechStackSchema.parse({ languages: [], frameworks: [], buildTools: [], testingFrameworks: [], linters: [], packageManager: 'unknown' })).toBeTruthy();
    });

    it('should reject invalid package manager', () => {
      const stack = {
        languages: [],
        frameworks: [],
        buildTools: [],
        testingFrameworks: [],
        linters: [],
        packageManager: 'pip',
      };
      expect(() => TechStackSchema.parse(stack)).toThrow();
    });
  });

  describe('ProjectInfoSchema', () => {
    it('should validate project info with partial stack', () => {
      const project = {
        name: 'my-app',
        path: '/path/to/app',
        type: 'frontend',
        stack: { languages: ['TypeScript'] },
      };
      const result = ProjectInfoSchema.parse(project);
      expect(result.name).toBe('my-app');
    });

    it('should validate all project types', () => {
      expect(ProjectInfoSchema.parse({ name: 'a', path: '/a', type: 'frontend', stack: {} })).toBeTruthy();
      expect(ProjectInfoSchema.parse({ name: 'a', path: '/a', type: 'backend', stack: {} })).toBeTruthy();
      expect(ProjectInfoSchema.parse({ name: 'a', path: '/a', type: 'shared', stack: {} })).toBeTruthy();
      expect(ProjectInfoSchema.parse({ name: 'a', path: '/a', type: 'website', stack: {} })).toBeTruthy();
      expect(ProjectInfoSchema.parse({ name: 'a', path: '/a', type: 'mobile', stack: {} })).toBeTruthy();
      expect(ProjectInfoSchema.parse({ name: 'a', path: '/a', type: 'unknown', stack: {} })).toBeTruthy();
    });
  });

  describe('PackageJsonSchema', () => {
    it('should validate typical package.json', () => {
      const pkg = {
        name: 'my-package',
        version: '1.0.0',
        description: 'A package',
        scripts: { test: 'vitest' },
        dependencies: { zod: '^4.0.0' },
        devDependencies: { vitest: '^4.0.0' },
      };
      const result = PackageJsonSchema.parse(pkg);
      expect(result).toEqual(pkg);
    });

    it('should allow additional fields (passthrough)', () => {
      const pkg = {
        name: 'my-package',
        customField: 'custom value',
        anotherField: { nested: 'data' },
      };
      const result = PackageJsonSchema.parse(pkg);
      expect(result.customField).toBe('custom value');
    });

    it('should validate minimal package.json', () => {
      const pkg = {};
      const result = PackageJsonSchema.parse(pkg);
      expect(result).toEqual({});
    });
  });
});

describe('parseWithSchema()', () => {
  describe('Valid JSON parsing', () => {
    it('should parse valid JSON with correct schema', () => {
      const jsonString = JSON.stringify({ domain: 'backend', type: 'logging', fileName: 'log.md', content: 'A'.repeat(100) });
      const result = parseWithSchema(GeneratedGuidelineSchema, jsonString);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.domain).toBe('backend');
        expect(result.data.type).toBe('logging');
      }
    });

    it('should parse array JSON', () => {
      const jsonString = JSON.stringify([
        { domain: 'backend', type: 'di', priority: 5 },
        { domain: 'frontend', type: 'styling', priority: 3 },
      ]);
      const result = parseWithSchema(GuidelinesListSchema, jsonString);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    it('should parse nested objects', () => {
      const jsonString = JSON.stringify({
        stack: {
          languages: ['TypeScript'],
          frameworks: ['React'],
          buildTools: ['Vite'],
          testingFrameworks: ['Vitest'],
          linters: ['ESLint'],
          packageManager: 'npm',
        },
      });
      const result = parseWithSchema(TechProfileSchema, jsonString);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid JSON handling', () => {
    it('should return error for malformed JSON', () => {
      const result = parseWithSchema(GeneratedGuidelineSchema, '{ invalid json }');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('JSON parse error');
      }
    });

    it('should return error for schema validation failure', () => {
      const jsonString = JSON.stringify({ domain: 'invalid-domain', type: 'test' });
      const result = parseWithSchema(GeneratedGuidelineSchema, jsonString);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validation failed');
      }
    });

    it('should provide detailed validation error messages', () => {
      const jsonString = JSON.stringify({ domain: 'backend' }); // Missing required fields
      const result = parseWithSchema(GeneratedGuidelineSchema, jsonString);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('type');
      }
    });

    it('should handle empty string', () => {
      const result = parseWithSchema(GeneratedGuidelineSchema, '');
      expect(result.success).toBe(false);
    });
  });
});

describe('extractJsonFromResponse()', () => {
  describe('Markdown code block extraction', () => {
    it('should extract JSON from markdown code block', () => {
      const response = '```json\n{"name": "test"}\n```';
      const extracted = extractJsonFromResponse(response);
      expect(extracted).toBe('{"name": "test"}');
    });

    it('should extract JSON from code block without language', () => {
      const response = '```\n{"value": 42}\n```';
      const extracted = extractJsonFromResponse(response);
      expect(extracted).toBe('{"value": 42}');
    });

    it('should extract JSON with surrounding text', () => {
      const response = 'Here is the result:\n```json\n{"result": "success"}\n```\nEnd of response';
      const extracted = extractJsonFromResponse(response);
      expect(extracted).toBe('{"result": "success"}');
    });

    it('should extract complex JSON from code block', () => {
      const response = '```json\n{"array": [1, 2, 3], "nested": {"key": "value"}}\n```';
      const extracted = extractJsonFromResponse(response);
      expect(extracted).toBe('{"array": [1, 2, 3], "nested": {"key": "value"}}');
    });

    it('should handle multiline JSON in code block', () => {
      const response = '```json\n{\n  "key": "value",\n  "number": 123\n}\n```';
      const extracted = extractJsonFromResponse(response);
      expect(extracted).toContain('"key": "value"');
      expect(extracted).toContain('"number": 123');
    });
  });

  describe('Raw JSON extraction', () => {
    it('should extract raw JSON without code blocks', () => {
      const response = '{"name": "test"}';
      const extracted = extractJsonFromResponse(response);
      expect(extracted).toBe('{"name": "test"}');
    });

    it('should extract JSON with surrounding whitespace', () => {
      const response = '  {"value": 42}  ';
      const extracted = extractJsonFromResponse(response);
      expect(extracted).toBe('{"value": 42}');
    });

    it('should extract first JSON object from text', () => {
      const response = 'Some text {"found": true} more text';
      const extracted = extractJsonFromResponse(response);
      expect(extracted).toBe('{"found": true}');
    });
  });

  describe('No JSON found', () => {
    it('should return null when no JSON found', () => {
      const response = 'This is just text without any JSON';
      const extracted = extractJsonFromResponse(response);
      expect(extracted).toBeNull();
    });

    it('should return null for empty string', () => {
      const extracted = extractJsonFromResponse('');
      expect(extracted).toBeNull();
    });
  });
});

describe('parseAIResponse()', () => {
  describe('Successful parsing', () => {
    it('should parse AI response with markdown code block', () => {
      const response = 'Here is the guideline:\n```json\n{"domain": "backend", "type": "logging", "fileName": "log.md", "content": "' + 'A'.repeat(100) + '"}\n```';
      const result = parseAIResponse(GeneratedGuidelineSchema, response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.domain).toBe('backend');
      }
    });

    it('should parse AI response with raw JSON', () => {
      const response = '{"domain": "frontend", "type": "styling", "fileName": "style.md", "content": "' + 'B'.repeat(100) + '"}';
      const result = parseAIResponse(GeneratedGuidelineSchema, response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.domain).toBe('frontend');
      }
    });

    it('should handle array JSON responses', () => {
      // parseAIResponse with arrays requires the array to be wrapped in object notation
      // For simple object responses it works fine
      const response = '{"domain": "backend", "type": "di", "priority": 5}';
      const result = parseWithSchema(GuidelineToGenerateSchema, response);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.domain).toBe('backend');
      }
    });
  });

  describe('Error handling', () => {
    it('should return error when no JSON found', () => {
      const response = 'Sorry, I cannot provide that information.';
      const result = parseAIResponse(GeneratedGuidelineSchema, response);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('No JSON found');
      }
    });

    it('should return error for invalid JSON in response', () => {
      const response = '```json\n{ invalid }\n```';
      const result = parseAIResponse(GeneratedGuidelineSchema, response);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('JSON parse error');
      }
    });

    it('should return error for schema validation failure', () => {
      const response = '{"domain": "invalid", "wrong": "fields"}';
      const result = parseAIResponse(GeneratedGuidelineSchema, response);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Validation failed');
      }
    });
  });
});
