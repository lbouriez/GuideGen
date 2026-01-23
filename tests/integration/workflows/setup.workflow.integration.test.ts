/**
 * Setup Workflow Integration Tests
 * End-to-end integration tests for the complete setup workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';

// Mock modules BEFORE any imports that depend on them
vi.mock('../../../src/core/phases/discovery/index.js', () => ({
  runDiscoveryPhase: vi.fn(),
}));

vi.mock('../../../src/core/phases/analysis/analysis.js', () => ({
  runAnalysisPhase: vi.fn(),
}));

vi.mock('../../../src/core/workflows/guidelines-update.js', () => ({
  runGuidelinesWorkflow: vi.fn(),
}));

vi.mock('../../../src/core/workflows/indexes-update.js', () => ({
  runIndexesWorkflow: vi.fn(),
}));

vi.mock('../../../src/core/workflows/claude-update.js', () => ({
  runClaudeArtifactsWorkflow: vi.fn(),
}));

vi.mock('../../../src/utils/display.js', () => ({
  printInfo: vi.fn(),
  printSuccess: vi.fn(),
  printError: vi.fn(),
  printWarning: vi.fn(),
  createSpinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
    text: '',
  })),
}));

// Mock fs to prevent checking for existing guidelines
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
}));

// Mock provider client creation
vi.mock('../../../src/providers/client.js', () => ({
  createProviderClient: vi.fn(() => Promise.resolve({
    complete: vi.fn(),
    completeWithJson: vi.fn(),
    setDepth: vi.fn(),
    getModelType: vi.fn(() => 'test-model'),
    sendMessage: vi.fn(),
    provider: { name: 'test', apiKey: 'test' },
  })),
}));

// Now import the module under test AFTER mocks are set up
import { runSetupWorkflow } from '../../../src/core/workflows/setup.js';
import type { AnalysisDepth } from '../../../src/types/index.js';

describe('Setup Workflow Integration', () => {
  let mockRunDiscoveryPhase: any;
  let mockRunAnalysisPhase: any;
  let mockRunGuidelinesWorkflow: any;
  let mockRunIndexesWorkflow: any;
  let mockRunClaudeArtifactsWorkflow: any;
  let mockClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a mock client
    mockClient = {
      complete: vi.fn(),
      completeWithJson: vi.fn(),
      setDepth: vi.fn(),
      getModelType: vi.fn(() => 'test-model'),
      sendMessage: vi.fn(),
      provider: { name: 'test', apiKey: 'test' },
    };

    // Import mocked modules
    const discovery = await import('../../../src/core/phases/discovery/index.js');
    const analysis = await import('../../../src/core/phases/analysis/analysis.js');
    const guidelines = await import('../../../src/core/workflows/guidelines-update.js');
    const indexes = await import('../../../src/core/workflows/indexes-update.js');
    const claude = await import('../../../src/core/workflows/claude-update.js');

    mockRunDiscoveryPhase = vi.mocked(discovery.runDiscoveryPhase);
    mockRunAnalysisPhase = vi.mocked(analysis.runAnalysisPhase);
    mockRunGuidelinesWorkflow = vi.mocked(guidelines.runGuidelinesWorkflow);
    mockRunIndexesWorkflow = vi.mocked(indexes.runIndexesWorkflow);
    mockRunClaudeArtifactsWorkflow = vi.mocked(claude.runClaudeArtifactsWorkflow);
  });

  describe('successful workflow execution', () => {
    it('should complete all phases successfully', async () => {
      // Mock successful responses
      mockRunDiscoveryPhase.mockResolvedValue({
        success: true,
        data: {
          stack: {
            languages: ['TypeScript'],
            frameworks: ['React'],
            buildTools: ['Vite'],
            testingFrameworks: ['Vitest'],
            packageManager: 'npm',
          },
          isMonorepo: false,
          structure: {
            root: '/test/project',
            directories: ['src', 'tests'],
            keyFiles: ['package.json'],
            configFiles: ['package.json', 'tsconfig.json'],
          },
        },
      });

      mockRunAnalysisPhase.mockResolvedValue({
        success: true,
        data: {
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
        },
      });

      mockRunGuidelinesWorkflow.mockResolvedValue({
        success: true,
        guidelinesGenerated: 5,
      });

      mockRunIndexesWorkflow.mockResolvedValue({
        success: true,
        indexesGenerated: 3,
      });

      mockRunClaudeArtifactsWorkflow.mockResolvedValue({
        success: true,
        skillsGenerated: 3,
        agentsGenerated: 2,
      });

      const result = await runSetupWorkflow(
        mockClient,
        '/test/project',
        'standard' as AnalysisDepth
      );

      if (!result.success) {
        console.log('Test failed with error:', result.error);
        console.log('Phases completed:', result.phasesCompleted);
        console.log('mockRunDiscoveryPhase called:', mockRunDiscoveryPhase.mock.calls.length, 'times');
        console.log('mockRunAnalysisPhase called:', mockRunAnalysisPhase.mock.calls.length, 'times');
      }

      expect(result.success).toBe(true);
      expect(result.phasesCompleted.length).toBeGreaterThan(0);
      expect(result.summary.guidelinesGenerated).toBe(5);
      expect(result.summary.indexesGenerated).toBe(3);
      expect(result.summary.skillsGenerated).toBe(3);
      expect(result.summary.agentsGenerated).toBe(2);

      // Verify all phases were called
      expect(mockRunDiscoveryPhase).toHaveBeenCalled();
      expect(mockRunAnalysisPhase).toHaveBeenCalled();
      expect(mockRunGuidelinesWorkflow).toHaveBeenCalled();
      expect(mockRunIndexesWorkflow).toHaveBeenCalled();
      expect(mockRunClaudeArtifactsWorkflow).toHaveBeenCalled();
    });

    it('should pass data between phases correctly', async () => {
      const mockTechProfile = {
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

      mockRunDiscoveryPhase.mockResolvedValue({
        success: true,
        data: mockTechProfile,
      });

      mockRunAnalysisPhase.mockResolvedValue({
        success: true,
        data: {
          importPatterns: [],
          namingConventions: [],
          architecturePatterns: [],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        },
      });

      mockRunGuidelinesWorkflow.mockResolvedValue({
        success: true,
        guidelinesGenerated: 1,
      });

      mockRunIndexesWorkflow.mockResolvedValue({
        success: true,
        indexesGenerated: 1,
      });

      mockRunClaudeArtifactsWorkflow.mockResolvedValue({
        success: true,
        skillsGenerated: 1,
        agentsGenerated: 1,
      });

      await runSetupWorkflow(mockClient, '/test/project', 'standard' as AnalysisDepth);

      // Verify analysis phase received tech profile from discovery
      expect(mockRunAnalysisPhase).toHaveBeenCalledWith(
        '/test/project',
        mockTechProfile,
        'standard'
      );
    });

    it('should handle monorepo projects', async () => {
      mockRunDiscoveryPhase.mockResolvedValue({
        success: true,
        data: {
          stack: {
            languages: ['TypeScript'],
            frameworks: [],
            buildTools: [],
            testingFrameworks: [],
            packageManager: 'npm',
          },
          isMonorepo: true,
          projects: [
            { name: 'app1', type: 'frontend', path: 'packages/app1' },
            { name: 'app2', type: 'backend', path: 'packages/app2' },
          ],
          structure: {
            root: '/test/monorepo',
            directories: ['packages/app1', 'packages/app2'],
            keyFiles: [],
            configFiles: [],
          },
        },
      });

      mockRunAnalysisPhase.mockResolvedValue({
        success: true,
        data: {
          importPatterns: [],
          namingConventions: [],
          architecturePatterns: [],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        },
      });

      mockRunGuidelinesWorkflow.mockResolvedValue({
        success: true,
        guidelinesGenerated: 1,
      });

      mockRunIndexesWorkflow.mockResolvedValue({
        success: true,
        indexesGenerated: 1,
      });

      mockRunClaudeArtifactsWorkflow.mockResolvedValue({
        success: true,
        skillsGenerated: 1,
        agentsGenerated: 1,
      });

      const result = await runSetupWorkflow(mockClient, '/test/monorepo', 'standard' as AnalysisDepth);

      expect(result.success).toBe(true);
      expect(result.phasesCompleted).toContain('discovery');
    });
  });

  describe('error handling', () => {
    it('should fail if path validation fails', async () => {
      const result = await runSetupWorkflow(
        mockClient,
        '../../../etc/passwd',
        'standard' as AnalysisDepth
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path');
    });

    it('should fail if discovery phase fails', async () => {
      mockRunDiscoveryPhase.mockResolvedValue({
        success: false,
        error: 'Discovery failed: Cannot read directory',
      });

      const result = await runSetupWorkflow(mockClient, '/test/project', 'standard' as AnalysisDepth);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Discovery failed');
      expect(result.phasesCompleted).toEqual([]);
    });

    it('should fail if analysis phase fails', async () => {
      mockRunDiscoveryPhase.mockResolvedValue({
        success: true,
        data: {
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
            directories: [],
            keyFiles: [],
            configFiles: [],
          },
        },
      });

      mockRunAnalysisPhase.mockResolvedValue({
        success: false,
        error: 'Analysis failed: No files found',
      });

      const result = await runSetupWorkflow(mockClient, '/test/project', 'standard' as AnalysisDepth);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Pattern Analysis failed');
      expect(result.phasesCompleted).toEqual(['discovery']);
    });

    it('should fail if guidelines workflow fails', async () => {
      mockRunDiscoveryPhase.mockResolvedValue({
        success: true,
        data: {
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
            directories: [],
            keyFiles: [],
            configFiles: [],
          },
        },
      });

      mockRunAnalysisPhase.mockResolvedValue({
        success: true,
        data: {
          importPatterns: [],
          namingConventions: [],
          architecturePatterns: [],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        },
      });

      mockRunGuidelinesWorkflow.mockResolvedValue({
        success: false,
        error: 'Guidelines generation failed',
        guidelinesGenerated: 0,
      });

      const result = await runSetupWorkflow(mockClient, '/test/project', 'standard' as AnalysisDepth);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Guidelines Generation failed');
      expect(result.phasesCompleted).toContain('discovery');
      expect(result.phasesCompleted).toContain('analysis');
    });
  });

  describe('progress reporting', () => {
    it('should report progress through callback', async () => {
      const progressMessages: string[] = [];
      const onProgress = (msg: string) => progressMessages.push(msg);

      mockRunDiscoveryPhase.mockResolvedValue({
        success: true,
        data: {
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
            directories: [],
            keyFiles: [],
            configFiles: [],
          },
        },
      });

      mockRunAnalysisPhase.mockResolvedValue({
        success: true,
        data: {
          importPatterns: [],
          namingConventions: [],
          architecturePatterns: [],
          stateManagement: [],
          errorHandling: [],
          loggingPatterns: [],
        },
      });

      mockRunGuidelinesWorkflow.mockResolvedValue({
        success: true,
        guidelinesGenerated: 1,
      });

      mockRunIndexesWorkflow.mockResolvedValue({
        success: true,
        indexesGenerated: 1,
      });

      mockRunClaudeArtifactsWorkflow.mockResolvedValue({
        success: true,
        skillsGenerated: 1,
        agentsGenerated: 1,
      });

      await runSetupWorkflow(mockClient, '/test/project', 'standard' as AnalysisDepth, onProgress);

      expect(progressMessages.length).toBeGreaterThan(0);
    });
  });

  describe('different analysis depths', () => {
    const depths: AnalysisDepth[] = ['quick', 'standard', 'thorough'];

    depths.forEach((depth) => {
      it(`should work with ${depth} depth`, async () => {
        mockRunDiscoveryPhase.mockResolvedValue({
          success: true,
          data: {
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
              directories: [],
              keyFiles: [],
              configFiles: [],
            },
          },
        });

        mockRunAnalysisPhase.mockResolvedValue({
          success: true,
          data: {
            importPatterns: [],
            namingConventions: [],
            architecturePatterns: [],
            stateManagement: [],
            errorHandling: [],
            loggingPatterns: [],
          },
        });

        mockRunGuidelinesWorkflow.mockResolvedValue({
          success: true,
          guidelinesGenerated: 1,
        });

        mockRunIndexesWorkflow.mockResolvedValue({
          success: true,
          indexesGenerated: 1,
        });

        mockRunClaudeArtifactsWorkflow.mockResolvedValue({
          success: true,
          skillsGenerated: 1,
          agentsGenerated: 1,
        });

        const result = await runSetupWorkflow(mockClient, '/test/project', depth);

        expect(result.success).toBe(true);
        expect(mockRunDiscoveryPhase).toHaveBeenCalledWith('/test/project', depth);
        expect(mockRunAnalysisPhase).toHaveBeenCalledWith(
          '/test/project',
          expect.any(Object),
          depth
        );
      });
    });
  });
});
