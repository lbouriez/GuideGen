/**
 * Indexes Workflow Tests
 * Tests for index generation, validation, and cross-reference checking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runIndexesWorkflow } from '../../../../src/core/workflows/indexes-update.js';
import type { TechProfile, GeneratedGuideline, GeneratedIndex } from '../../../../src/types/index.js';

// Mock dependencies
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
}));

vi.mock('../../../../src/core/phases/indexes/generator.js', () => ({
  generateAllIndexes: vi.fn(),
}));

vi.mock('../../../../src/core/phases/indexes/cross-ref.js', () => ({
  validateAllIndexes: vi.fn(),
}));

vi.mock('../../../../src/core/phases/intelligent-merge.js', () => ({
  batchIntelligentMerge: vi.fn(),
}));

vi.mock('../../../../src/utils/interactive.js', () => ({
  promptUpdateMode: vi.fn(),
  confirmChanges: vi.fn(),
}));

vi.mock('../../../../src/utils/display.js', () => ({
  printSuccess: vi.fn(),
}));

describe('Indexes Workflow', () => {
  let mockClient: any;
  let mockTechProfile: TechProfile;
  let mockGenerateAllIndexes: any;
  let mockValidateAllIndexes: any;
  let mockBatchIntelligentMerge: any;
  let mockPromptUpdateMode: any;
  let mockConfirmChanges: any;
  let mockFs: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock client
    mockClient = {
      complete: vi.fn(),
      completeWithJson: vi.fn(),
      setDepth: vi.fn(),
      provider: { name: 'test', apiKey: 'test' },
    };

    // Mock tech profile
    mockTechProfile = {
      stack: {
        languages: ['TypeScript'],
        frameworks: [],
        buildTools: [],
        testingFrameworks: [],
        packageManager: 'npm',
      },
      isMonorepo: false,
      structure: {
        root: '/test/project',
        directories: ['src'],
        keyFiles: [],
        configFiles: [],
      },
    };

    // Import mocked functions
    const fs = await import('fs');
    const generator = await import('../../../../src/core/phases/indexes/generator.js');
    const validator = await import('../../../../src/core/phases/indexes/cross-ref.js');
    const merge = await import('../../../../src/core/phases/intelligent-merge.js');
    const interactive = await import('../../../../src/utils/interactive.js');

    mockFs = vi.mocked(fs);
    mockGenerateAllIndexes = vi.mocked(generator.generateAllIndexes);
    mockValidateAllIndexes = vi.mocked(validator.validateAllIndexes);
    mockBatchIntelligentMerge = vi.mocked(merge.batchIntelligentMerge);
    mockPromptUpdateMode = vi.mocked(interactive.promptUpdateMode);
    mockConfirmChanges = vi.mocked(interactive.confirmChanges);
  });

  describe('error handling - missing prerequisites', () => {
    it('should fail when no guidelines exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No guidelines found');
      expect(result.indexesGenerated).toBe(0);
    });

    it('should fail when guidelines directory exists but is empty', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([]);

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No guidelines found');
    });
  });

  describe('validation failures', () => {
    it('should fail when indexes have broken links', async () => {
      // Setup: Guidelines exist
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string, options?: { withFileTypes?: boolean }) => {
        if (path.includes('.guidelines') && options?.withFileTypes) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        return ['naming.md'];
      });
      mockFs.readFileSync.mockReturnValue('# Naming Guidelines');

      const mockIndexes: GeneratedIndex[] = [
        {
          type: 'root',
          fileName: 'index.md',
          content: '# Index\n[Naming](./shared/naming.md)\n[Missing](./shared/missing.md)',
          domain: null,
        },
      ];

      mockGenerateAllIndexes.mockResolvedValue(mockIndexes);

      mockValidateAllIndexes.mockReturnValue(
        new Map([
          [
            'index.md',
            {
              valid: false,
              brokenLinks: ['./shared/missing.md'],
              missingGuidelines: [],
            },
          ],
        ])
      );

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
      expect(result.error).toContain('Broken link: ./shared/missing.md');
    });

    it('should fail when indexes reference non-existent guidelines', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string, options?: { withFileTypes?: boolean }) => {
        if (path.includes('.guidelines') && options?.withFileTypes) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        return ['naming.md'];
      });
      mockFs.readFileSync.mockReturnValue('# Naming');

      const mockIndexes: GeneratedIndex[] = [
        {
          type: 'domain',
          fileName: 'shared-index.md',
          content: '# Shared Index',
          domain: 'shared',
        },
      ];

      mockGenerateAllIndexes.mockResolvedValue(mockIndexes);

      mockValidateAllIndexes.mockReturnValue(
        new Map([
          [
            'shared/shared-index.md',
            {
              valid: false,
              brokenLinks: [],
              missingGuidelines: ['styling.md', 'testing.md'],
            },
          ],
        ])
      );

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing guideline: styling.md');
      expect(result.error).toContain('Missing guideline: testing.md');
    });
  });

  describe('new generation mode', () => {
    it('should generate indexes when none exist', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string) => {
        if (path.includes('.guidelines') && !path.includes('index')) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        if (path.includes('shared')) {
          return ['naming.md', 'architecture.md'];
        }
        return [];
      });
      mockFs.readFileSync.mockReturnValue('# Guideline Content');

      const mockIndexes: GeneratedIndex[] = [
        {
          type: 'root',
          fileName: 'index.md',
          content: '# Project Index\n[Shared](./shared/shared-index.md)',
          domain: null,
        },
        {
          type: 'domain',
          fileName: 'shared-index.md',
          content: '# Shared Guidelines\n- [Naming](./naming.md)',
          domain: 'shared',
        },
      ];

      mockGenerateAllIndexes.mockResolvedValue(mockIndexes);
      mockValidateAllIndexes.mockReturnValue(
        new Map([
          ['index.md', { valid: true, brokenLinks: [], missingGuidelines: [] }],
          ['shared/shared-index.md', { valid: true, brokenLinks: [], missingGuidelines: [] }],
        ])
      );

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(true);
      expect(result.indexesGenerated).toBe(2);
      expect(result.mode).toBe('new');
      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('should pass progress callbacks during generation', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string, options?: { withFileTypes?: boolean }) => {
        if (options?.withFileTypes) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        return ['naming.md'];
      });
      mockFs.readFileSync.mockReturnValue('# Content');

      mockGenerateAllIndexes.mockResolvedValue([
        {
          type: 'root',
          fileName: 'index.md',
          content: '# Index',
          domain: null,
        },
      ]);

      mockValidateAllIndexes.mockReturnValue(
        new Map([['index.md', { valid: true, brokenLinks: [], missingGuidelines: [] }]])
      );

      const progressMessages: string[] = [];
      const onProgress = (msg: string) => progressMessages.push(msg);

      await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        false,
        onProgress
      );

      expect(progressMessages).toContain('Starting indexes workflow...');
      expect(progressMessages).toContain('Generating indexes...');
      expect(progressMessages).toContain('Validating indexes...');
    });
  });

  describe('update mode with merging', () => {
    it('should merge new indexes with existing content', async () => {
      // Setup: Guidelines and indexes exist
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('.guidelines') || path.includes('index.md');
      });

      mockFs.readdirSync.mockImplementation((path: string) => {
        if (path.includes('.guidelines') && !path.includes('index')) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        if (path.includes('shared')) {
          return ['naming.md'];
        }
        return [];
      });

      mockFs.readFileSync.mockImplementation((path: string) => {
        if (path.includes('index.md')) {
          return '# Old Index Content';
        }
        return '# Guideline';
      });

      mockPromptUpdateMode.mockResolvedValue('update');

      const mockIndexes: GeneratedIndex[] = [
        {
          type: 'root',
          fileName: 'index.md',
          content: '# New Index Content',
          domain: null,
        },
      ];

      mockGenerateAllIndexes.mockResolvedValue(mockIndexes);
      mockValidateAllIndexes.mockReturnValue(
        new Map([['index.md', { valid: true, brokenLinks: [], missingGuidelines: [] }]])
      );

      mockBatchIntelligentMerge.mockResolvedValue(
        new Map([
          [
            'index.md',
            {
              mergedContent: '# Merged Index Content',
              changes: ['Added new section', 'Updated links'],
            },
          ],
        ])
      );

      mockConfirmChanges.mockResolvedValue(true);

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        true
      );

      expect(mockBatchIntelligentMerge).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.mode).toBe('updated');
    });

    it('should handle user cancellation during merge confirmation', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string, options?: { withFileTypes?: boolean }) => {
        if (options?.withFileTypes) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        return ['naming.md'];
      });
      mockFs.readFileSync.mockReturnValue('# Content');

      mockPromptUpdateMode.mockResolvedValue('update');

      mockGenerateAllIndexes.mockResolvedValue([
        {
          type: 'root',
          fileName: 'index.md',
          content: '# Index',
          domain: null,
        },
      ]);

      mockValidateAllIndexes.mockReturnValue(
        new Map([['index.md', { valid: true, brokenLinks: [], missingGuidelines: [] }]])
      );

      mockBatchIntelligentMerge.mockResolvedValue(
        new Map([
          [
            'index.md',
            {
              mergedContent: '# Merged',
              changes: ['Updated'],
            },
          ],
        ])
      );

      mockConfirmChanges.mockResolvedValue(false);

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        true
      );

      expect(result.success).toBe(true);
      expect(result.mode).toBe('cancelled');
      expect(result.indexesGenerated).toBe(0);
    });
  });

  describe('override mode', () => {
    it('should delete existing indexes and create new ones', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string, options?: { withFileTypes?: boolean }) => {
        if (options?.withFileTypes) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        return ['naming.md'];
      });
      mockFs.readFileSync.mockReturnValue('# Content');

      mockPromptUpdateMode.mockResolvedValue('override');

      mockGenerateAllIndexes.mockResolvedValue([
        {
          type: 'root',
          fileName: 'index.md',
          content: '# New Index',
          domain: null,
        },
      ]);

      mockValidateAllIndexes.mockReturnValue(
        new Map([['index.md', { valid: true, brokenLinks: [], missingGuidelines: [] }]])
      );

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        true
      );

      expect(mockFs.unlinkSync).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.mode).toBe('override');
    });
  });

  describe('interactive mode - user cancellation', () => {
    it('should return cancelled when user cancels at update prompt', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string, options?: { withFileTypes?: boolean }) => {
        if (options?.withFileTypes) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        return ['naming.md'];
      });

      mockPromptUpdateMode.mockResolvedValue('cancel');

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        true
      );

      expect(result.success).toBe(true);
      expect(result.mode).toBe('cancelled');
      expect(result.indexesGenerated).toBe(0);
      expect(mockGenerateAllIndexes).not.toHaveBeenCalled();
    });
  });

  describe('error recovery', () => {
    it('should handle generation errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string, options?: { withFileTypes?: boolean }) => {
        if (options?.withFileTypes) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        return ['naming.md'];
      });
      mockFs.readFileSync.mockReturnValue('# Content');

      mockGenerateAllIndexes.mockRejectedValue(new Error('AI service timeout'));

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service timeout');
    });

    it('should handle file system errors during write', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string, options?: { withFileTypes?: boolean }) => {
        if (options?.withFileTypes) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        return ['naming.md'];
      });
      mockFs.readFileSync.mockReturnValue('# Content');

      mockGenerateAllIndexes.mockResolvedValue([
        {
          type: 'root',
          fileName: 'index.md',
          content: '# Index',
          domain: null,
        },
      ]);

      mockValidateAllIndexes.mockReturnValue(
        new Map([['index.md', { valid: true, brokenLinks: [], missingGuidelines: [] }]])
      );

      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device');
      });

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('no space left on device');
    });

    it('should handle merge errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string, options?: { withFileTypes?: boolean }) => {
        if (options?.withFileTypes) {
          return [{ name: 'shared', isDirectory: () => true }] as any;
        }
        return ['naming.md'];
      });
      mockFs.readFileSync.mockReturnValue('# Content');

      mockPromptUpdateMode.mockResolvedValue('update');

      mockGenerateAllIndexes.mockResolvedValue([
        {
          type: 'root',
          fileName: 'index.md',
          content: '# Index',
          domain: null,
        },
      ]);

      mockValidateAllIndexes.mockReturnValue(
        new Map([['index.md', { valid: true, brokenLinks: [], missingGuidelines: [] }]])
      );

      mockBatchIntelligentMerge.mockRejectedValue(new Error('Merge conflict: too many changes'));

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        true
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('too many changes');
    });
  });

  describe('complex validation scenarios', () => {
    it('should detect multiple validation errors across different indexes', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string, options?: { withFileTypes?: boolean }) => {
        if (options?.withFileTypes) {
          return [
            { name: 'shared', isDirectory: () => true },
            { name: 'backend', isDirectory: () => true },
          ] as any;
        }
        return ['naming.md', 'security.md'];
      });
      mockFs.readFileSync.mockReturnValue('# Content');

      const mockIndexes: GeneratedIndex[] = [
        {
          type: 'root',
          fileName: 'index.md',
          content: '# Index',
          domain: null,
        },
        {
          type: 'domain',
          fileName: 'shared-index.md',
          content: '# Shared',
          domain: 'shared',
        },
        {
          type: 'domain',
          fileName: 'backend-index.md',
          content: '# Backend',
          domain: 'backend',
        },
      ];

      mockGenerateAllIndexes.mockResolvedValue(mockIndexes);

      mockValidateAllIndexes.mockReturnValue(
        new Map([
          [
            'index.md',
            {
              valid: false,
              brokenLinks: ['./missing.md'],
              missingGuidelines: [],
            },
          ],
          [
            'shared/shared-index.md',
            {
              valid: false,
              brokenLinks: [],
              missingGuidelines: ['missing-guideline.md'],
            },
          ],
          [
            'backend/backend-index.md',
            {
              valid: true,
              brokenLinks: [],
              missingGuidelines: [],
            },
          ],
        ])
      );

      const result = await runIndexesWorkflow(
        mockClient,
        '/test/project',
        'TestProject',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Broken link: ./missing.md');
      expect(result.error).toContain('Missing guideline: missing-guideline.md');
      expect(result.error).toContain('index.md');
      expect(result.error).toContain('shared/shared-index.md');
    });
  });
});
