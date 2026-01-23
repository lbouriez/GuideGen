/**
 * GuidelineExtractor Service Tests
 * Tests for guideline reading, rule extraction, and package.json parsing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'reflect-metadata';
import { GuidelineExtractor } from '../../../../src/workflows/claude-artifacts/services/GuidelineExtractor.js';
import type { GeneratedGuideline, ExtractedRule } from '../../../../src/types/index.js';

// Mock filesystem
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

vi.mock('../../../../src/types/schemas.js', () => ({
  PackageJsonSchema: {},
  parseWithSchema: vi.fn(),
}));

describe('GuidelineExtractor', () => {
  let extractor: GuidelineExtractor;
  let mockLogger: any;
  let mockFs: any;
  let mockParseWithSchema: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const fs = await import('fs');
    mockFs = vi.mocked(fs);

    const schemas = await import('../../../../src/types/schemas.js');
    mockParseWithSchema = vi.mocked(schemas.parseWithSchema);

    extractor = new GuidelineExtractor(mockLogger);
  });

  describe('readGuidelines', () => {
    it('should return empty array when guidelines directory does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = extractor.readGuidelines('/test/project');

      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith('No guidelines directory found');
    });

    it('should read guidelines from multiple domains', () => {
      mockFs.existsSync.mockReturnValue(true);

      mockFs.readdirSync.mockImplementation((dirPath: string) => {
        if (dirPath === '/test/project/.guidelines') {
          return [
            { name: 'shared', isDirectory: () => true },
            { name: 'backend', isDirectory: () => true },
          ];
        }
        if (dirPath === '/test/project/.guidelines/shared') {
          return ['naming.md', 'architecture.md', 'shared-index.md'];
        }
        if (dirPath === '/test/project/.guidelines/backend') {
          return ['api.md'];
        }
        return [];
      });

      mockFs.readFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('naming.md')) {
          return '# Naming\n- ✅ Use camelCase\n- ❌ No snake_case';
        }
        if (filePath.includes('architecture.md')) {
          return '# Architecture\n- Use layered architecture';
        }
        if (filePath.includes('api.md')) {
          return '# API\n- RESTful design';
        }
        return '';
      });

      const result = extractor.readGuidelines('/test/project');

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        type: 'naming',
        domain: 'shared',
        fileName: 'naming.md',
        priority: 1,
      });
      expect(result[0].content).toContain('Use camelCase');

      expect(result[1]).toMatchObject({
        type: 'architecture',
        domain: 'shared',
        fileName: 'architecture.md',
      });

      expect(result[2]).toMatchObject({
        type: 'api',
        domain: 'backend',
        fileName: 'api.md',
      });
    });

    it('should skip index files when reading guidelines', () => {
      mockFs.existsSync.mockReturnValue(true);

      mockFs.readdirSync.mockImplementation((dirPath: string) => {
        if (dirPath === '/test/project/.guidelines') {
          return [{ name: 'shared', isDirectory: () => true }];
        }
        return ['naming.md', 'shared-index.md', 'architecture-index.md'];
      });

      mockFs.readFileSync.mockReturnValue('# Content');

      const result = extractor.readGuidelines('/test/project');

      expect(result).toHaveLength(1);
      expect(result[0].fileName).toBe('naming.md');
    });

    it('should handle empty domains gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);

      mockFs.readdirSync.mockImplementation((dirPath: string) => {
        if (dirPath === '/test/project/.guidelines') {
          return [{ name: 'shared', isDirectory: () => true }];
        }
        return [];
      });

      const result = extractor.readGuidelines('/test/project');

      expect(result).toEqual([]);
    });

    it('should handle file system errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);

      mockFs.readdirSync.mockImplementation((dirPath: string) => {
        if (dirPath === '/test/project/.guidelines') {
          return [{ name: 'shared', isDirectory: () => true }];
        }
        throw new Error('EACCES: permission denied');
      });

      expect(() => extractor.readGuidelines('/test/project')).toThrow('permission denied');
    });
  });

  describe('extractRules', () => {
    it('should extract critical rules with checkmarks', () => {
      const guidelines: GeneratedGuideline[] = [
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: `# Naming Conventions
- ✅ Use camelCase for variables
- ✅ Use PascalCase for classes
- ❌ Avoid snake_case
- Regular bullet point (not a rule)`,
          priority: 1,
        },
      ];

      const rules = extractor.extractRules(guidelines);

      expect(rules).toHaveLength(3);
      expect(rules[0]).toMatchObject({
        id: 'naming-rule-1',
        category: 'critical',
        description: 'Use camelCase for variables',
        domain: 'shared',
        enforceable: true,
      });
      expect(rules[1].description).toBe('Use PascalCase for classes');
      expect(rules[2].description).toBe('Avoid snake_case');
    });

    it('should handle guidelines with no critical rules', () => {
      const guidelines: GeneratedGuideline[] = [
        {
          type: 'docs',
          domain: 'shared',
          fileName: 'docs.md',
          content: '# Documentation\nWrite good docs.\nNo checkmarks here.',
          priority: 1,
        },
      ];

      const rules = extractor.extractRules(guidelines);

      expect(rules).toEqual([]);
    });

    it('should extract rules from multiple guidelines', () => {
      const guidelines: GeneratedGuideline[] = [
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming\n- ✅ Use camelCase\n- ❌ No abbreviations',
          priority: 1,
        },
        {
          type: 'security',
          domain: 'backend',
          fileName: 'security.md',
          content: '# Security\n- ✅ Validate all inputs\n- ✅ Use parameterized queries',
          priority: 1,
        },
      ];

      const rules = extractor.extractRules(guidelines);

      expect(rules).toHaveLength(4);

      // Check naming rules
      expect(rules[0].id).toBe('naming-rule-1');
      expect(rules[0].domain).toBe('shared');
      expect(rules[1].id).toBe('naming-rule-2');

      // Check security rules
      expect(rules[2].id).toBe('security-rule-1');
      expect(rules[2].domain).toBe('backend');
      expect(rules[2].description).toContain('Validate all inputs');
      expect(rules[3].id).toBe('security-rule-2');
    });

    it('should handle empty guidelines array', () => {
      const rules = extractor.extractRules([]);

      expect(rules).toEqual([]);
    });

    it('should handle guidelines with various unicode checkmarks', () => {
      const guidelines: GeneratedGuideline[] = [
        {
          type: 'style',
          domain: 'frontend',
          fileName: 'style.md',
          content: `# Style
- ✅ Use TypeScript strict mode
- ✅  Extra space after checkmark
- ❌ No inline styles
-✅Missing space before checkmark
- Regular item`,
          priority: 1,
        },
      ];

      const rules = extractor.extractRules(guidelines);

      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].description).toBe('Use TypeScript strict mode');
      expect(rules[0].domain).toBe('frontend');
    });

    it('should log the number of extracted rules', () => {
      const guidelines: GeneratedGuideline[] = [
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming\n- ✅ Rule 1\n- ✅ Rule 2',
          priority: 1,
        },
      ];

      extractor.extractRules(guidelines);

      expect(mockLogger.debug).toHaveBeenCalledWith('Extracted 2 rules from guidelines');
    });
  });

  describe('getPackageJsonScripts', () => {
    it('should return scripts when package.json exists and is valid', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          name: 'test-project',
          scripts: {
            build: 'tsc',
            test: 'vitest',
            lint: 'eslint .',
          },
        })
      );

      mockParseWithSchema.mockReturnValue({
        success: true,
        data: {
          scripts: {
            build: 'tsc',
            test: 'vitest',
            lint: 'eslint .',
          },
        },
      });

      const scripts = extractor.getPackageJsonScripts('/test/project');

      expect(scripts).toEqual({
        build: 'tsc',
        test: 'vitest',
        lint: 'eslint .',
      });
    });

    it('should return undefined when package.json does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const scripts = extractor.getPackageJsonScripts('/test/project');

      expect(scripts).toBeUndefined();
    });

    it('should return undefined when package.json is invalid', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{ invalid json');

      mockParseWithSchema.mockReturnValue({
        success: false,
        error: 'Invalid JSON',
      });

      const scripts = extractor.getPackageJsonScripts('/test/project');

      expect(scripts).toBeUndefined();
      // Note: debug is not called when schema validation fails (only when exceptions occur)
    });

    it('should handle file read errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: file not found');
      });

      const scripts = extractor.getPackageJsonScripts('/test/project');

      expect(scripts).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should return undefined when package.json has no scripts', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      mockParseWithSchema.mockReturnValue({
        success: true,
        data: {
          name: 'test-project',
        },
      });

      const scripts = extractor.getPackageJsonScripts('/test/project');

      expect(scripts).toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow: read guidelines and extract rules', () => {
      mockFs.existsSync.mockReturnValue(true);

      mockFs.readdirSync.mockImplementation((dirPath: string) => {
        if (dirPath === '/test/project/.guidelines') {
          return [{ name: 'shared', isDirectory: () => true }];
        }
        return ['naming.md', 'security.md'];
      });

      mockFs.readFileSync.mockImplementation((filePath: string) => {
        if (filePath.includes('naming.md')) {
          return '# Naming\n- ✅ Use camelCase\n- ❌ No snake_case';
        }
        if (filePath.includes('security.md')) {
          return '# Security\n- ✅ Validate inputs\n- ✅ Sanitize outputs';
        }
        return '';
      });

      const guidelines = extractor.readGuidelines('/test/project');
      const rules = extractor.extractRules(guidelines);

      expect(guidelines).toHaveLength(2);
      expect(rules).toHaveLength(4);
      expect(rules[0].description).toBe('Use camelCase');
      expect(rules[2].description).toBe('Validate inputs');
    });

    it('should handle project with complex directory structure', () => {
      mockFs.existsSync.mockReturnValue(true);

      mockFs.readdirSync.mockImplementation((dirPath: string) => {
        if (dirPath === '/test/project/.guidelines') {
          return [
            { name: 'shared', isDirectory: () => true },
            { name: 'backend', isDirectory: () => true },
            { name: 'frontend', isDirectory: () => true },
            { name: 'README.md', isDirectory: () => false }, // Should be filtered out
          ];
        }
        if (dirPath.includes('shared')) {
          return ['naming.md', 'architecture.md'];
        }
        if (dirPath.includes('backend')) {
          return ['api.md', 'database.md'];
        }
        if (dirPath.includes('frontend')) {
          return ['components.md'];
        }
        return [];
      });

      mockFs.readFileSync.mockReturnValue('# Content\n- ✅ Rule');

      const guidelines = extractor.readGuidelines('/test/project');

      expect(guidelines).toHaveLength(5);
      expect(guidelines.filter(g => g.domain === 'shared')).toHaveLength(2);
      expect(guidelines.filter(g => g.domain === 'backend')).toHaveLength(2);
      expect(guidelines.filter(g => g.domain === 'frontend')).toHaveLength(1);
    });
  });
});
