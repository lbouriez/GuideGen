/**
 * Analysis Phase Tests
 * Tests for code pattern analysis and file selection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'reflect-metadata';
import { runAnalysisPhase } from '../../../../src/core/phases/analysis/analysis.js';
import type { TechProfile, PatternReport, AnalysisDepth, FolderStructure } from '../../../../src/types/index.js';

// Mock modules
const mockCreateSpinner = vi.fn(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  text: '',
}));
const mockPrintSuccess = vi.fn();
const mockPrintSection = vi.fn();
const mockPrintList = vi.fn();
const mockPrintInfo = vi.fn();

const mockProviderClient = {
  completeWithJson: vi.fn(),
  setDepth: vi.fn(),
  getModelType: vi.fn(() => 'test-model'),
  complete: vi.fn(),
  sendMessage: vi.fn(),
};

const mockCreateProviderClient = vi.fn().mockResolvedValue(mockProviderClient);

const mockToolRegistry = {
  executeTool: vi.fn(),
};

const mockToolRegistryGetInstance = vi.fn(() => mockToolRegistry);

vi.mock('@/utils/display', () => ({
  createSpinner: (...args: any[]) => mockCreateSpinner(...args),
  printSuccess: (...args: any[]) => mockPrintSuccess(...args),
  printSection: (...args: any[]) => mockPrintSection(...args),
  printList: (...args: any[]) => mockPrintList(...args),
  printInfo: (...args: any[]) => mockPrintInfo(...args),
}));

vi.mock('@/providers/manager', () => ({
  createProviderClient: (...args: any[]) => mockCreateProviderClient(...args),
}));

vi.mock('../../../../src/core/utils/index.js', () => ({
  ToolRegistry: {
    getInstance: (...args: any[]) => mockToolRegistryGetInstance(...args),
  },
}));

describe('Analysis Phase', () => {
  let mockTechProfile: TechProfile;
  let mockStructure: FolderStructure;

  beforeEach(() => {
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('runAnalysisPhase', () => {
    describe('success cases', () => {
      it('should successfully analyze patterns', async () => {
        const mockSelectedFiles = {
          files: [
            { path: 'src/index.ts', reason: 'Entry point', priority: 'high' as const },
            { path: 'src/utils.ts', reason: 'Utilities', priority: 'medium' as const },
          ],
          totalEstimatedTokens: 1000,
        };

        const mockConcatenatedFiles = {
          content: 'file content here',
          fileCount: 2,
          totalSize: 100,
        };

        const mockPatternReport: PatternReport = {
          importPatterns: [
            { name: 'ES6 imports', frequency: 'common' as const, examples: [] },
          ],
          namingConventions: [
            { name: 'camelCase', frequency: 'common' as const, examples: [] },
          ],
          architecturePatterns: [
            { name: 'Component-based', frequency: 'common' as const, examples: [] },
          ],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        };

        mockToolRegistry.executeTool
          .mockResolvedValueOnce({ success: true, data: mockSelectedFiles }) // file_selection
          .mockResolvedValueOnce({ success: true, data: mockConcatenatedFiles }); // file_reading

        mockProviderClient.completeWithJson.mockResolvedValue(mockPatternReport);

        const result = await runAnalysisPhase('/test/project', mockTechProfile, 'standard');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.importPatterns).toHaveLength(1);
        expect(result.humanReviewRequired).toBe(true);
      });

      it('should handle different analysis depths', async () => {
        const mockSelectedFiles = {
          files: [{ path: 'src/index.ts', reason: 'Test', priority: 'high' as const }],
          totalEstimatedTokens: 500,
        };

        const mockConcatenatedFiles = {
          content: 'content',
          fileCount: 1,
          totalSize: 50,
        };

        const mockPatternReport: PatternReport = {
          importPatterns: [],
          namingConventions: [],
          architecturePatterns: [],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        };

        const depths: AnalysisDepth[] = ['quick', 'standard', 'thorough'];

        for (const depth of depths) {
          // Reset mocks for each iteration
          vi.clearAllMocks();
          mockCreateProviderClient.mockResolvedValue(mockProviderClient);

          mockToolRegistry.executeTool
            .mockResolvedValueOnce({ success: true, data: mockSelectedFiles })
            .mockResolvedValueOnce({ success: true, data: mockConcatenatedFiles });

          mockProviderClient.completeWithJson.mockResolvedValue(mockPatternReport);

          const result = await runAnalysisPhase('/test', mockTechProfile, depth);
          expect(result.success).toBe(true);
          expect(mockCreateProviderClient).toHaveBeenCalledWith(depth);
        }
      });

      it('should print debug info when debug=true', async () => {
        const mockSelectedFiles = {
          files: [
            { path: 'src/test.ts', reason: 'Test file', priority: 'high' as const },
          ],
          totalEstimatedTokens: 500,
        };

        const mockConcatenatedFiles = {
          content: 'test content',
          fileCount: 1,
          totalSize: 50,
        };

        const mockPatternReport: PatternReport = {
          importPatterns: [],
          namingConventions: [],
          architecturePatterns: [],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        };

        mockToolRegistry.executeTool
          .mockResolvedValueOnce({ success: true, data: mockSelectedFiles })
          .mockResolvedValueOnce({ success: true, data: mockConcatenatedFiles });

        mockProviderClient.completeWithJson.mockResolvedValue(mockPatternReport);

        await runAnalysisPhase('/test', mockTechProfile, 'standard', true);

        expect(mockPrintInfo).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
      });

      it('should not print debug info when debug=false', async () => {
        const mockSelectedFiles = {
          files: [{ path: 'src/test.ts', reason: 'Test', priority: 'high' as const }],
          totalEstimatedTokens: 500,
        };

        const mockConcatenatedFiles = {
          content: 'content',
          fileCount: 1,
          totalSize: 50,
        };

        const mockPatternReport: PatternReport = {
          importPatterns: [],
          namingConventions: [],
          architecturePatterns: [],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        };

        mockToolRegistry.executeTool
          .mockResolvedValueOnce({ success: true, data: mockSelectedFiles })
          .mockResolvedValueOnce({ success: true, data: mockConcatenatedFiles });

        mockProviderClient.completeWithJson.mockResolvedValue(mockPatternReport);

        mockPrintInfo.mockClear();

        await runAnalysisPhase('/test', mockTechProfile, 'standard', false);

        const debugCalls = mockPrintInfo.mock.calls.filter(
          (call: any[]) => call[0]?.includes?.('[DEBUG]')
        );
        expect(debugCalls.length).toBe(0);
      });

      it('should handle multiple pattern types', async () => {
        const mockSelectedFiles = {
          files: [{ path: 'src/index.ts', reason: 'Entry', priority: 'high' as const }],
          totalEstimatedTokens: 1000,
        };

        const mockConcatenatedFiles = {
          content: 'content',
          fileCount: 1,
          totalSize: 100,
        };

        const mockPatternReport: PatternReport = {
          importPatterns: [
            { name: 'ES6 imports', frequency: 'common' as const, examples: [] },
          ],
          namingConventions: [
            { name: 'camelCase', frequency: 'common' as const, examples: [] },
          ],
          architecturePatterns: [
            { name: 'MVC', frequency: 'rare' as const, examples: [] },
          ],
          stateManagement: [
            { name: 'Redux', frequency: 'common' as const, examples: [] },
          ],
          errorHandling: [
            { name: 'try-catch', frequency: 'common' as const, examples: [] },
          ],
          loggingPatterns: [
            { name: 'console.log', frequency: 'common' as const, examples: [] },
          ],
        };

        mockToolRegistry.executeTool
          .mockResolvedValueOnce({ success: true, data: mockSelectedFiles })
          .mockResolvedValueOnce({ success: true, data: mockConcatenatedFiles });

        mockProviderClient.completeWithJson.mockResolvedValue(mockPatternReport);

        const result = await runAnalysisPhase('/test', mockTechProfile, 'standard');

        expect(result.success).toBe(true);
        expect(result.data?.importPatterns).toHaveLength(1);
        expect(result.data?.namingConventions).toHaveLength(1);
        expect(result.data?.architecturePatterns).toHaveLength(1);
        expect(result.data?.stateManagement).toHaveLength(1);
        expect(result.data?.errorHandling).toHaveLength(1);
        expect(result.data?.loggingPatterns).toHaveLength(1);
      });
    });

    describe('error handling', () => {
      it('should handle file selection errors', async () => {
        mockToolRegistry.executeTool.mockResolvedValue({
          success: false,
          error: 'File selection failed',
        });

        const result = await runAnalysisPhase('/test', mockTechProfile, 'standard');

        expect(result.success).toBe(false);
        expect(result.error).toContain('File selection failed');
        expect(result.humanReviewRequired).toBe(false);
      });

      it('should handle file reading errors', async () => {
        const mockSelectedFiles = {
          files: [{ path: 'src/test.ts', reason: 'Test', priority: 'high' as const }],
          totalEstimatedTokens: 500,
        };

        mockToolRegistry.executeTool
          .mockResolvedValueOnce({ success: true, data: mockSelectedFiles }) // file_selection succeeds
          .mockResolvedValueOnce({ success: false, error: 'File reading failed' }); // file_reading fails

        const result = await runAnalysisPhase('/test', mockTechProfile, 'standard');

        expect(result.success).toBe(false);
        expect(result.error).toContain('File reading failed');
      });

      it('should handle AI provider errors', async () => {
        const mockSelectedFiles = {
          files: [{ path: 'src/test.ts', reason: 'Test', priority: 'high' as const }],
          totalEstimatedTokens: 500,
        };

        const mockConcatenatedFiles = {
          content: 'content',
          fileCount: 1,
          totalSize: 50,
        };

        mockToolRegistry.executeTool
          .mockResolvedValueOnce({ success: true, data: mockSelectedFiles })
          .mockResolvedValueOnce({ success: true, data: mockConcatenatedFiles });

        mockProviderClient.completeWithJson.mockRejectedValue(new Error('API rate limit exceeded'));

        const result = await runAnalysisPhase('/test', mockTechProfile, 'standard');

        expect(result.success).toBe(false);
        expect(result.error).toBe('API rate limit exceeded');
      });

      it('should handle unknown errors gracefully', async () => {
        mockToolRegistry.executeTool.mockRejectedValue('String error');

        const result = await runAnalysisPhase('/test', mockTechProfile, 'standard');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error');
      });

      it('should handle missing file selection data', async () => {
        mockToolRegistry.executeTool.mockResolvedValue({
          success: true,
          data: null, // Missing data
        });

        const result = await runAnalysisPhase('/test', mockTechProfile, 'standard');

        expect(result.success).toBe(false);
        expect(result.error).toContain('File selection failed');
      });
    });

    describe('project type detection', () => {
      it('should detect CLI projects', async () => {
        const cliProfile: TechProfile = {
          stack: {
            languages: ['TypeScript'],
            frameworks: [],
            buildTools: ['pkg'],
            testingFrameworks: [],
            packageManager: 'npm',
          },
          isMonorepo: false,
          structure: {
            root: '/test',
            directories: ['src'],
            keyFiles: ['cli.ts'],
            configFiles: [],
          },
        };

        const mockSelectedFiles = {
          files: [{ path: 'src/cli.ts', reason: 'CLI', priority: 'high' as const }],
          totalEstimatedTokens: 500,
        };

        const mockConcatenatedFiles = {
          content: 'cli content',
          fileCount: 1,
          totalSize: 50,
        };

        const mockPatternReport: PatternReport = {
          importPatterns: [],
          namingConventions: [],
          architecturePatterns: [],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        };

        mockToolRegistry.executeTool
          .mockResolvedValueOnce({ success: true, data: mockSelectedFiles })
          .mockResolvedValueOnce({ success: true, data: mockConcatenatedFiles });

        mockProviderClient.completeWithJson.mockResolvedValue(mockPatternReport);

        const result = await runAnalysisPhase('/test', cliProfile, 'standard');

        expect(result.success).toBe(true);
        // Project type is determined internally - we can't directly test it
        // but we can verify the analysis completed successfully
      });

      it('should detect web app projects', async () => {
        const webProfile: TechProfile = {
          stack: {
            languages: ['TypeScript'],
            frameworks: ['React', 'Next.js'],
            buildTools: ['Vite'],
            testingFrameworks: [],
            packageManager: 'npm',
          },
          isMonorepo: false,
          structure: mockStructure,
        };

        const mockSelectedFiles = {
          files: [{ path: 'src/App.tsx', reason: 'Component', priority: 'high' as const }],
          totalEstimatedTokens: 500,
        };

        const mockConcatenatedFiles = {
          content: 'react content',
          fileCount: 1,
          totalSize: 50,
        };

        const mockPatternReport: PatternReport = {
          importPatterns: [],
          namingConventions: [],
          architecturePatterns: [],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        };

        mockToolRegistry.executeTool
          .mockResolvedValueOnce({ success: true, data: mockSelectedFiles })
          .mockResolvedValueOnce({ success: true, data: mockConcatenatedFiles });

        mockProviderClient.completeWithJson.mockResolvedValue(mockPatternReport);

        const result = await runAnalysisPhase('/test', webProfile, 'standard');

        expect(result.success).toBe(true);
      });

      it('should detect backend API projects', async () => {
        const backendProfile: TechProfile = {
          stack: {
            languages: ['TypeScript'],
            frameworks: ['Express', 'NestJS'],
            buildTools: ['tsc'],
            testingFrameworks: [],
            packageManager: 'npm',
          },
          isMonorepo: false,
          structure: mockStructure,
        };

        const mockSelectedFiles = {
          files: [{ path: 'src/api.ts', reason: 'API', priority: 'high' as const }],
          totalEstimatedTokens: 500,
        };

        const mockConcatenatedFiles = {
          content: 'api content',
          fileCount: 1,
          totalSize: 50,
        };

        const mockPatternReport: PatternReport = {
          importPatterns: [],
          namingConventions: [],
          architecturePatterns: [],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        };

        mockToolRegistry.executeTool
          .mockResolvedValueOnce({ success: true, data: mockSelectedFiles })
          .mockResolvedValueOnce({ success: true, data: mockConcatenatedFiles });

        mockProviderClient.completeWithJson.mockResolvedValue(mockPatternReport);

        const result = await runAnalysisPhase('/test', backendProfile, 'standard');

        expect(result.success).toBe(true);
      });
    });
  });
});
