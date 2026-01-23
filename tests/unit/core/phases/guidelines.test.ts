/**
 * Guidelines Phase Tests
 * Tests for guideline generation, validation, and merging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'reflect-metadata';
import { runGuidelinesPhase } from '../../../../src/core/phases/guidelines/index.js';
import type { PatternReport, FolderStructure, TechProfile, GeneratedGuideline } from '../../../../src/types/index.js';

// Mock modules
const mockGenerateAllGuidelines = vi.fn();
const mockValidateAllGuidelines = vi.fn();
const mockCheckDuplicates = vi.fn();
const mockMergeAllGuidelines = vi.fn();

vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
  generateAllGuidelines: (...args: any[]) => mockGenerateAllGuidelines(...args),
}));

vi.mock('../../../../src/core/phases/guidelines/validator.js', () => ({
  validateAllGuidelines: (...args: any[]) => mockValidateAllGuidelines(...args),
  checkDuplicates: (...args: any[]) => mockCheckDuplicates(...args),
}));

vi.mock('../../../../src/core/phases/guidelines/merger.js', () => ({
  mergeAllGuidelines: (...args: any[]) => mockMergeAllGuidelines(...args),
}));

describe('Guidelines Phase', () => {
  let mockProviderClient: any;
  let mockPatternReport: PatternReport;
  let mockStructure: FolderStructure;
  let mockTechProfile: TechProfile;
  let mockGuidelines: GeneratedGuideline[];

  beforeEach(() => {
    mockProviderClient = {
      completeWithJson: vi.fn(),
      sendMessage: vi.fn(),
      setDepth: vi.fn(),
      getModelType: vi.fn(() => 'test-model'),
      complete: vi.fn(),
    };

    mockStructure = {
      root: '/test/project',
      directories: ['src', 'tests'],
      keyFiles: ['index.ts', 'config.ts'],
      configFiles: ['package.json', 'tsconfig.json'],
    };

    mockTechProfile = {
      stack: {
        languages: ['TypeScript'],
        frameworks: ['React'],
        buildTools: ['Vite'],
        testingFrameworks: ['Vitest'],
        packageManager: 'npm',
      },
      isMonorepo: false,
      structure: mockStructure,
    };

    mockPatternReport = {
      importPatterns: [
        { name: 'ES6 imports', frequency: 'common' as const, examples: [] },
      ],
      namingConventions: [
        { name: 'camelCase', frequency: 'common' as const, examples: [] },
      ],
      architecturePatterns: [],
      stateManagement: [],
      errorHandling: [],
      loggingPatterns: [],
    };

    mockGuidelines = [
      {
        domain: 'shared',
        type: 'naming',
        fileName: 'naming.md',
        content: '# Naming Conventions\n\nUse camelCase',
        priority: 1,
      },
      {
        domain: 'shared',
        type: 'organization',
        fileName: 'organization.md',
        content: '# Code Organization\n\nUse barrel exports',
        priority: 1,
      },
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('runGuidelinesPhase', () => {
    describe('success cases', () => {
      it('should successfully generate guidelines', async () => {
        mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
        mockValidateAllGuidelines.mockReturnValue({
          valid: true,
          results: new Map(),
        });
        mockCheckDuplicates.mockReturnValue([]);
        mockMergeAllGuidelines.mockReturnValue(
          new Map([
            ['naming.md', { action: 'created', content: mockGuidelines[0].content }],
            ['organization.md', { action: 'created', content: mockGuidelines[1].content }],
          ])
        );

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.guidelines).toHaveLength(2);
      });

      it('should track progress when callback provided', async () => {
        mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
        mockValidateAllGuidelines.mockReturnValue({
          valid: true,
          results: new Map(),
        });
        mockCheckDuplicates.mockReturnValue([]);
        mockMergeAllGuidelines.mockReturnValue(new Map());

        const onProgress = vi.fn();

        await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile,
          onProgress
        );

        expect(onProgress).toHaveBeenCalled();
        expect(onProgress).toHaveBeenCalledWith('Starting guidelines generation...');
      });

      it('should handle merge results correctly', async () => {
        mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
        mockValidateAllGuidelines.mockReturnValue({
          valid: true,
          results: new Map(),
        });
        mockCheckDuplicates.mockReturnValue([]);
        mockMergeAllGuidelines.mockReturnValue(
          new Map([
            ['naming.md', { action: 'created', content: 'content' }],
            ['organization.md', { action: 'updated', content: 'updated', previous: 'old' }],
          ])
        );

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(true);
        expect(result.data?.mergeResults.size).toBe(2);
      });

      it('should handle conflicts in merge results', async () => {
        mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
        mockValidateAllGuidelines.mockReturnValue({
          valid: true,
          results: new Map(),
        });
        mockCheckDuplicates.mockReturnValue([]);
        mockMergeAllGuidelines.mockReturnValue(
          new Map([
            [
              'naming.md',
              {
                action: 'updated',
                content: 'content',
                conflicts: [
                  { line: 5, generated: 'new', existing: 'old' },
                ],
              },
            ],
          ])
        );

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(true);
        // Conflicts are tracked but don't fail the phase
      });

      it('should generate different guideline types', async () => {
        const mixedGuidelines: GeneratedGuideline[] = [
          {
            domain: 'backend',
            type: 'api-design',
            fileName: 'api-design.md',
            content: '# API Design',
            priority: 1,
          },
          {
            domain: 'frontend',
            type: 'components',
            fileName: 'components.md',
            content: '# Components',
            priority: 1,
          },
          {
            domain: 'shared',
            type: 'types',
            fileName: 'types.md',
            content: '# Types',
            priority: 1,
          },
        ];

        mockGenerateAllGuidelines.mockResolvedValue(mixedGuidelines);
        mockValidateAllGuidelines.mockReturnValue({
          valid: true,
          results: new Map(),
        });
        mockCheckDuplicates.mockReturnValue([]);
        mockMergeAllGuidelines.mockReturnValue(new Map());

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(true);
        expect(result.data?.guidelines).toHaveLength(3);
        expect(result.data?.guidelines.map(g => g.domain)).toContain('backend');
        expect(result.data?.guidelines.map(g => g.domain)).toContain('frontend');
        expect(result.data?.guidelines.map(g => g.domain)).toContain('shared');
      });

      it('should handle empty guidelines list', async () => {
        mockGenerateAllGuidelines.mockResolvedValue([]);
        mockValidateAllGuidelines.mockReturnValue({
          valid: true,
          results: new Map(),
        });
        mockCheckDuplicates.mockReturnValue([]);
        mockMergeAllGuidelines.mockReturnValue(new Map());

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(true);
        expect(result.data?.guidelines).toHaveLength(0);
      });
    });

    describe('validation errors', () => {
      it('should fail on validation errors', async () => {
        mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
        mockValidateAllGuidelines.mockReturnValue({
          valid: false,
          results: new Map([
            [
              'naming.md',
              {
                valid: false,
                errors: ['Missing required section', 'Invalid format'],
              },
            ],
          ]),
        });

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Validation failed');
        expect(result.error).toContain('naming.md');
        expect(result.humanReviewRequired).toBe(false);
      });

      it('should report all validation errors', async () => {
        mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
        mockValidateAllGuidelines.mockReturnValue({
          valid: false,
          results: new Map([
            ['naming.md', { valid: false, errors: ['Error 1'] }],
            ['organization.md', { valid: false, errors: ['Error 2', 'Error 3'] }],
          ]),
        });

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('naming.md: Error 1');
        expect(result.error).toContain('organization.md: Error 2, Error 3');
      });
    });

    describe('duplicate detection', () => {
      it('should fail on duplicate guidelines', async () => {
        mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
        mockValidateAllGuidelines.mockReturnValue({
          valid: true,
          results: new Map(),
        });
        mockCheckDuplicates.mockReturnValue(['naming.md', 'organization.md']);

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Duplicate guidelines detected');
        expect(result.error).toContain('naming.md');
        expect(result.error).toContain('organization.md');
        expect(result.humanReviewRequired).toBe(false);
      });

      it('should pass when no duplicates found', async () => {
        mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
        mockValidateAllGuidelines.mockReturnValue({
          valid: true,
          results: new Map(),
        });
        mockCheckDuplicates.mockReturnValue([]);
        mockMergeAllGuidelines.mockReturnValue(new Map());

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle generation errors', async () => {
        mockGenerateAllGuidelines.mockRejectedValue(new Error('Generation failed'));

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Generation failed');
        expect(result.humanReviewRequired).toBe(false);
      });

      it('should handle validation errors', async () => {
        mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
        mockValidateAllGuidelines.mockImplementation(() => {
          throw new Error('Validation crashed');
        });

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Validation crashed');
      });

      it('should handle merge errors', async () => {
        mockGenerateAllGuidelines.mockResolvedValue(mockGuidelines);
        mockValidateAllGuidelines.mockReturnValue({
          valid: true,
          results: new Map(),
        });
        mockCheckDuplicates.mockReturnValue([]);
        mockMergeAllGuidelines.mockImplementation(() => {
          throw new Error('Merge failed');
        });

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('Merge failed');
      });

      it('should handle unknown errors gracefully', async () => {
        mockGenerateAllGuidelines.mockRejectedValue('String error');

        const result = await runGuidelinesPhase(
          mockProviderClient,
          '/test/project',
          mockPatternReport,
          mockStructure,
          mockTechProfile
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('String error');
      });
    });
  });
});
