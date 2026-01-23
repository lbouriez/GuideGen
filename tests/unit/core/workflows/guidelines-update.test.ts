/**
 * Guidelines Workflow Tests
 * Tests for critical workflow orchestration logic and error paths
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runGuidelinesWorkflow } from '../../../../src/core/workflows/guidelines-update.js';
import type { TechProfile, PatternReport, GeneratedGuideline } from '../../../../src/types/index.js';

// Mock dependencies
vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
  generateAllGuidelines: vi.fn(),
}));

vi.mock('../../../../src/core/phases/guidelines/validator.js', () => ({
  validateAllGuidelines: vi.fn(),
  checkDuplicates: vi.fn(),
}));

vi.mock('../../../../src/core/phases/intelligent-merge.js', () => ({
  batchIntelligentMerge: vi.fn(),
  formatChanges: vi.fn((changes) => changes.join('\n')),
}));

vi.mock('../../../../src/utils/interactive.js', () => ({
  promptUpdateMode: vi.fn(),
  confirmChanges: vi.fn(),
}));

vi.mock('../../../../src/utils/display.js', () => ({
  printSuccess: vi.fn(),
}));

vi.mock('../../../../src/core/phases/guidelines/transformer.js', () => ({
  transformPatterns: vi.fn((patterns) => patterns),
}));

vi.mock('../../../../src/core/workflows/services/index.js', () => ({
  GuidelineFileService: vi.fn().mockImplementation(() => ({
    exists: vi.fn(),
    deleteAll: vi.fn(),
    readAll: vi.fn(),
    writeAll: vi.fn(),
  })),
}));

describe('Guidelines Workflow', () => {
  let mockClient: any;
  let mockTechProfile: TechProfile;
  let mockPatterns: PatternReport;
  let mockGenerateAllGuidelines: any;
  let mockValidateAllGuidelines: any;
  let mockCheckDuplicates: any;
  let mockBatchIntelligentMerge: any;
  let mockPromptUpdateMode: any;
  let mockConfirmChanges: any;
  let mockFileService: any;

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

    // Mock patterns
    mockPatterns = {
      importPatterns: [{ name: 'ES6', frequency: 'common' as const, examples: [] }],
      namingConventions: [{ name: 'camelCase', frequency: 'common' as const, examples: [] }],
      architecturePatterns: [],
      stateManagement: [],
      errorHandling: [],
      loggingPatterns: [],
    };

    // Import mocked functions
    const generator = await import('../../../../src/core/phases/guidelines/generator.js');
    const validator = await import('../../../../src/core/phases/guidelines/validator.js');
    const merge = await import('../../../../src/core/phases/intelligent-merge.js');
    const interactive = await import('../../../../src/utils/interactive.js');
    const { GuidelineFileService } = await import('../../../../src/core/workflows/services/index.js');

    mockGenerateAllGuidelines = vi.mocked(generator.generateAllGuidelines);
    mockValidateAllGuidelines = vi.mocked(validator.validateAllGuidelines);
    mockCheckDuplicates = vi.mocked(validator.checkDuplicates);
    mockBatchIntelligentMerge = vi.mocked(merge.batchIntelligentMerge);
    mockPromptUpdateMode = vi.mocked(interactive.promptUpdateMode);
    mockConfirmChanges = vi.mocked(interactive.confirmChanges);

    // Mock file service
    mockFileService = new (vi.mocked(GuidelineFileService))();
  });

  describe('error handling - validation failures', () => {
    it('should fail when project structure is missing', async () => {
      const invalidProfile = { ...mockTechProfile, structure: undefined };

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        invalidProfile,
        mockPatterns,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project structure not found');
      expect(result.guidelinesGenerated).toBe(0);
    });

    it('should fail when validation detects invalid guidelines', async () => {
      mockFileService.exists.mockReturnValue(false);

      mockGenerateAllGuidelines.mockResolvedValue([
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: 'invalid content',
          priority: 1,
        },
      ]);

      mockValidateAllGuidelines.mockReturnValue({
        valid: false,
        results: new Map([
          [
            'shared/naming.md',
            {
              valid: false,
              errors: ['Missing required section', 'Invalid format'],
            },
          ],
        ]),
      });

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
      expect(result.error).toContain('Missing required section');
      expect(result.error).toContain('Invalid format');
    });

    it('should fail when duplicate guidelines are detected', async () => {
      mockFileService.exists.mockReturnValue(false);

      mockGenerateAllGuidelines.mockResolvedValue([
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming',
          priority: 1,
        },
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming-duplicate.md',
          content: '# Naming',
          priority: 1,
        },
      ]);

      mockValidateAllGuidelines.mockReturnValue({ valid: true, results: new Map() });
      mockCheckDuplicates.mockReturnValue(['shared/naming.md', 'shared/naming-duplicate.md']);

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Duplicate guidelines detected');
    });
  });

  describe('new generation mode', () => {
    it('should generate and write guidelines when none exist', async () => {
      mockFileService.exists.mockReturnValue(false);

      const mockGuidelines: GeneratedGuideline[] = [
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming\n- Use camelCase',
          priority: 1,
        },
        {
          type: 'architecture',
          domain: 'backend',
          fileName: 'architecture.md',
          content: '# Architecture\n- Use layered architecture',
          priority: 1,
        },
      ];

      mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
      mockValidateAllGuidelines.mockReturnValue({ valid: true, results: new Map() });
      mockCheckDuplicates.mockReturnValue([]);

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        false
      );

      expect(result.success).toBe(true);
      expect(result.guidelinesGenerated).toBe(2);
      expect(result.mode).toBe('created');
      expect(mockFileService.writeAll).toHaveBeenCalledWith(
        '/test/project',
        mockGuidelines,
        undefined
      );
    });

    it('should report progress during generation', async () => {
      mockFileService.exists.mockReturnValue(false);

      mockGenerateAllGuidelines.mockResolvedValue([
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming',
          priority: 1,
        },
      ]);

      mockValidateAllGuidelines.mockReturnValue({ valid: true, results: new Map() });
      mockCheckDuplicates.mockReturnValue([]);

      const progressMessages: string[] = [];
      const onProgress = (msg: string) => progressMessages.push(msg);

      await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        false,
        onProgress
      );

      expect(progressMessages).toContain('Starting guidelines workflow...');
      expect(progressMessages).toContain('Transforming patterns...');
      expect(progressMessages).toContain('Generating guidelines from codebase patterns...');
      expect(progressMessages).toContain('Validating generated guidelines...');
      expect(progressMessages).toContain('Writing guidelines...');
    });
  });

  describe('override mode', () => {
    it('should delete existing guidelines and create new ones', async () => {
      mockFileService.exists.mockReturnValue(true);
      mockPromptUpdateMode.mockResolvedValue('override');

      const mockGuidelines: GeneratedGuideline[] = [
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# New Naming',
          priority: 1,
        },
      ];

      mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
      mockValidateAllGuidelines.mockReturnValue({ valid: true, results: new Map() });
      mockCheckDuplicates.mockReturnValue([]);

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        true
      );

      expect(mockFileService.deleteAll).toHaveBeenCalledWith('/test/project');
      expect(result.success).toBe(true);
      expect(result.mode).toBe('created');
      expect(mockFileService.writeAll).toHaveBeenCalled();
    });
  });

  describe('update mode with intelligent merging', () => {
    it('should merge new guidelines with existing content', async () => {
      mockFileService.exists.mockReturnValue(true);
      mockPromptUpdateMode.mockResolvedValue('update');

      const newGuidelines: GeneratedGuideline[] = [
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# New Naming Rules',
          priority: 1,
        },
      ];

      const existingContent = new Map([['shared/naming.md', '# Old Naming Rules']]);

      mockGenerateAllGuidelines.mockResolvedValue(newGuidelines);
      mockValidateAllGuidelines.mockReturnValue({ valid: true, results: new Map() });
      mockCheckDuplicates.mockReturnValue([]);
      mockFileService.readAll.mockReturnValue(existingContent);

      mockBatchIntelligentMerge.mockResolvedValue(
        new Map([
          [
            'shared/naming.md',
            {
              mergedContent: '# Merged Naming Rules',
              changes: ['Added new section', 'Updated formatting'],
            },
          ],
        ])
      );

      mockConfirmChanges.mockResolvedValue(true);

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        true
      );

      expect(mockBatchIntelligentMerge).toHaveBeenCalled();
      expect(mockFileService.writeAll).toHaveBeenCalledWith(
        '/test/project',
        newGuidelines,
        expect.any(Map)
      );
      expect(result.success).toBe(true);
      expect(result.mode).toBe('updated');
    });

    it('should handle user cancellation during merge confirmation', async () => {
      mockFileService.exists.mockReturnValue(true);
      mockPromptUpdateMode.mockResolvedValue('update');

      mockGenerateAllGuidelines.mockResolvedValue([
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming',
          priority: 1,
        },
      ]);

      mockValidateAllGuidelines.mockReturnValue({ valid: true, results: new Map() });
      mockCheckDuplicates.mockReturnValue([]);
      mockFileService.readAll.mockReturnValue(new Map());

      mockBatchIntelligentMerge.mockResolvedValue(
        new Map([
          [
            'shared/naming.md',
            {
              mergedContent: '# Merged',
              changes: ['Added section'],
            },
          ],
        ])
      );

      mockConfirmChanges.mockResolvedValue(false);

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        true
      );

      expect(result.success).toBe(true);
      expect(result.mode).toBe('cancelled');
      expect(result.guidelinesGenerated).toBe(0);
      expect(mockFileService.writeAll).not.toHaveBeenCalled();
    });

    it('should use update mode by default in non-interactive mode', async () => {
      mockFileService.exists.mockReturnValue(true);

      mockGenerateAllGuidelines.mockResolvedValue([
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming',
          priority: 1,
        },
      ]);

      mockValidateAllGuidelines.mockReturnValue({ valid: true, results: new Map() });
      mockCheckDuplicates.mockReturnValue([]);
      mockFileService.readAll.mockReturnValue(new Map());
      mockBatchIntelligentMerge.mockResolvedValue(new Map());

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        false
      );

      expect(mockPromptUpdateMode).not.toHaveBeenCalled();
      expect(mockBatchIntelligentMerge).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('interactive mode - user cancellation', () => {
    it('should return cancelled when user cancels at update prompt', async () => {
      mockFileService.exists.mockReturnValue(true);
      mockPromptUpdateMode.mockResolvedValue('cancel');

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        true
      );

      expect(result.success).toBe(true);
      expect(result.mode).toBe('cancelled');
      expect(result.guidelinesGenerated).toBe(0);
      expect(mockGenerateAllGuidelines).not.toHaveBeenCalled();
    });
  });

  describe('error recovery', () => {
    it('should handle generation errors gracefully', async () => {
      mockFileService.exists.mockReturnValue(false);

      mockGenerateAllGuidelines.mockRejectedValue(new Error('AI service unavailable'));

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('AI service unavailable');
      expect(result.guidelinesGenerated).toBe(0);
    });

    it('should handle file system errors during write', async () => {
      mockFileService.exists.mockReturnValue(false);

      mockGenerateAllGuidelines.mockResolvedValue([
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming',
          priority: 1,
        },
      ]);

      mockValidateAllGuidelines.mockReturnValue({ valid: true, results: new Map() });
      mockCheckDuplicates.mockReturnValue([]);

      mockFileService.writeAll.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission denied');
    });

    it('should handle merge errors gracefully', async () => {
      mockFileService.exists.mockReturnValue(true);
      mockPromptUpdateMode.mockResolvedValue('update');

      mockGenerateAllGuidelines.mockResolvedValue([
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming',
          priority: 1,
        },
      ]);

      mockValidateAllGuidelines.mockReturnValue({ valid: true, results: new Map() });
      mockCheckDuplicates.mockReturnValue([]);
      mockFileService.readAll.mockReturnValue(new Map());

      mockBatchIntelligentMerge.mockRejectedValue(new Error('Merge conflict unresolvable'));

      const result = await runGuidelinesWorkflow(
        mockClient,
        '/test/project',
        mockTechProfile,
        mockPatterns,
        true
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Merge conflict unresolvable');
    });
  });

  describe('path validation', () => {
    it('should validate and reject path traversal attempts', async () => {
      const result = await runGuidelinesWorkflow(
        mockClient,
        '../../../etc/passwd',
        mockTechProfile,
        mockPatterns,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path');
    });
  });
});
