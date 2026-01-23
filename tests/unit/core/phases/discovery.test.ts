/**
 * Discovery Phase Tests
 * Tests for tech stack discovery and project analysis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'reflect-metadata';
import { runDiscoveryPhase } from '../../../../src/core/phases/discovery/discovery.js';
import type { TechProfile, FolderStructure, AnalysisDepth } from '../../../../src/types/index.js';
import { container } from '../../../../src/di/container.js';
import { TYPES } from '../../../../src/di/identifiers.js';
import { ProviderManager } from '../../../../src/providers/manager.js';

// Mock modules
const mockGetFolderStructure = vi.fn();
const mockReadFileSafe = vi.fn();
const mockPrintInfo = vi.fn();
const mockPrintSuccess = vi.fn();
const mockPrintSummary = vi.fn();
const mockCreateSpinner = vi.fn(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  text: '',
}));
const mockInquirerPrompt = vi.fn();

vi.mock('@/core/utils/file-io', () => ({
  getFolderStructure: (...args: any[]) => mockGetFolderStructure(...args),
  readFileSafe: (...args: any[]) => mockReadFileSafe(...args),
  findPackageJsonFiles: vi.fn(),
}));

vi.mock('@/utils/display', () => ({
  createSpinner: (...args: any[]) => mockCreateSpinner(...args),
  printSuccess: (...args: any[]) => mockPrintSuccess(...args),
  printInfo: (...args: any[]) => mockPrintInfo(...args),
  printSummary: (...args: any[]) => mockPrintSummary(...args),
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: (...args: any[]) => mockInquirerPrompt(...args),
  },
}));

describe('Discovery Phase', () => {
  let mockProviderManager: any;
  let mockProviderClient: any;

  beforeEach(() => {
    // Mock ProviderClient
    mockProviderClient = {
      completeWithJson: vi.fn(),
      setDepth: vi.fn(),
      getModelType: vi.fn(() => 'test-model'),
      complete: vi.fn(),
      sendMessage: vi.fn(),
    };

    // Mock ProviderManager
    mockProviderManager = {
      getClient: vi.fn().mockResolvedValue(mockProviderClient),
      getCurrentProvider: vi.fn().mockReturnValue('anthropic'),
      hasConfiguredExclusions: vi.fn().mockReturnValue(false),
      updateExcludedProjects: vi.fn().mockResolvedValue(undefined),
      getExcludedProjects: vi.fn().mockReturnValue([]),
      forceSetup: vi.fn(),
    };

    // Bind mock to container
    if (container.isBound(TYPES.IProviderManager)) {
      container.unbind(TYPES.IProviderManager);
    }
    container.bind<ProviderManager>(TYPES.IProviderManager).toConstantValue(mockProviderManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('runDiscoveryPhase', () => {
    describe('success cases', () => {
      it('should successfully discover tech stack', async () => {
        const mockStructure: FolderStructure = {
          root: '/test/project',
          directories: ['src', 'tests', 'node_modules'],
          keyFiles: ['package.json', 'tsconfig.json'],
          configFiles: ['package.json', 'tsconfig.json'],
        };

        const mockTechProfile: TechProfile = {
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

        mockGetFolderStructure.mockResolvedValue(mockStructure);
        mockReadFileSafe.mockResolvedValue('{"name": "test"}');
        mockProviderClient.completeWithJson.mockResolvedValue(mockTechProfile);

        const result = await runDiscoveryPhase('/test/project', 'standard');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.stack.languages).toContain('TypeScript');
        expect(result.humanReviewRequired).toBe(true);
      });

      it('should handle projects without config files', async () => {
        const mockStructure: FolderStructure = {
          root: '/test/project',
          directories: ['src'],
          keyFiles: [],
          configFiles: [],
        };

        const mockTechProfile: TechProfile = {
          stack: {
            languages: ['JavaScript'],
            frameworks: [],
            buildTools: [],
            testingFrameworks: [],
            packageManager: 'npm',
          },
          isMonorepo: false,
          structure: mockStructure,
        };

        mockGetFolderStructure.mockResolvedValue(mockStructure);
        mockReadFileSafe.mockResolvedValue(null);
        mockProviderClient.completeWithJson.mockResolvedValue(mockTechProfile);

        const result = await runDiscoveryPhase('/test/project', 'quick');

        expect(result.success).toBe(true);
        expect(result.data?.stack.languages).toContain('JavaScript');
      });

      it('should populate structure in tech profile', async () => {
        const mockStructure: FolderStructure = {
          root: '/test/project',
          directories: ['src', 'lib'],
          keyFiles: ['index.ts'],
          configFiles: [],
        };

        const mockTechProfile: TechProfile = {
          stack: {
            languages: ['TypeScript'],
            frameworks: [],
            buildTools: [],
            testingFrameworks: [],
            packageManager: 'npm',
          },
          isMonorepo: false,
        };

        mockGetFolderStructure.mockResolvedValue(mockStructure);
        mockProviderClient.completeWithJson.mockResolvedValue(mockTechProfile);

        const result = await runDiscoveryPhase('/test/project', 'standard');

        expect(result.success).toBe(true);
        expect(result.data?.structure).toBeDefined();
        expect(result.data?.structure?.root).toBe('/test/project');
        expect(result.data?.structure?.directories).toEqual(['src', 'lib']);
      });

      it('should handle different analysis depths', async () => {
        const mockStructure: FolderStructure = {
          root: '/test',
          directories: [],
          keyFiles: [],
          configFiles: [],
        };

        const mockTechProfile: TechProfile = {
          stack: {
            languages: ['Python'],
            frameworks: [],
            buildTools: [],
            testingFrameworks: [],
            packageManager: 'pip',
          },
          isMonorepo: false,
        };

        mockGetFolderStructure.mockResolvedValue(mockStructure);
        mockProviderClient.completeWithJson.mockResolvedValue(mockTechProfile);

        const depths: AnalysisDepth[] = ['quick', 'standard', 'thorough'];

        for (const depth of depths) {
          const result = await runDiscoveryPhase('/test', depth);
          expect(result.success).toBe(true);
          expect(mockProviderManager.getClient).toHaveBeenCalledWith(depth);
        }
      });
    });

    describe('error handling', () => {
      it('should handle folder structure errors', async () => {
        mockGetFolderStructure.mockRejectedValue(new Error('Permission denied'));

        const result = await runDiscoveryPhase('/test/project', 'standard');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Permission denied');
        expect(result.humanReviewRequired).toBe(false);
      });

      it('should handle AI provider errors', async () => {
        const mockStructure: FolderStructure = {
          root: '/test',
          directories: [],
          keyFiles: [],
          configFiles: [],
        };

        mockGetFolderStructure.mockResolvedValue(mockStructure);
        mockProviderClient.completeWithJson.mockRejectedValue(new Error('API key invalid'));

        const result = await runDiscoveryPhase('/test', 'standard');

        expect(result.success).toBe(false);
        expect(result.error).toBe('API key invalid');
      });

      it('should handle unknown errors gracefully', async () => {
        mockGetFolderStructure.mockRejectedValue('String error');

        const result = await runDiscoveryPhase('/test', 'standard');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error');
      });
    });

    describe('monorepo handling', () => {
      it('should handle monorepo projects', async () => {
        const mockStructure: FolderStructure = {
          root: '/test/monorepo',
          directories: ['packages/app1', 'packages/app2'],
          keyFiles: [],
          configFiles: [],
        };

        const mockTechProfile: TechProfile = {
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
        };

        mockGetFolderStructure.mockResolvedValue(mockStructure);
        mockProviderClient.completeWithJson.mockResolvedValue(mockTechProfile);
        mockInquirerPrompt.mockResolvedValue({ selectedExclusions: ['app2'] });

        const result = await runDiscoveryPhase('/test/monorepo', 'standard');

        expect(result.success).toBe(true);
        expect(result.data?.isMonorepo).toBe(true);
        expect(mockProviderManager.updateExcludedProjects).toHaveBeenCalledWith(['app2']);
      });

      it('should use existing exclusion configuration', async () => {
        const mockStructure: FolderStructure = {
          root: '/test/monorepo',
          directories: ['packages/app1', 'packages/app2'],
          keyFiles: [],
          configFiles: [],
        };

        const mockTechProfile: TechProfile = {
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
        };

        mockGetFolderStructure.mockResolvedValue(mockStructure);
        mockProviderClient.completeWithJson.mockResolvedValue(mockTechProfile);
        mockProviderManager.hasConfiguredExclusions.mockReturnValue(true);
        mockProviderManager.getExcludedProjects.mockReturnValue(['app2']);

        const result = await runDiscoveryPhase('/test/monorepo', 'standard');

        expect(result.success).toBe(true);
        expect(result.data?.projects).toHaveLength(1);
        expect(result.data?.projects?.[0].name).toBe('app1');
      });

      it('should handle monorepo with no projects to exclude', async () => {
        const mockStructure: FolderStructure = {
          root: '/test/monorepo',
          directories: [],
          keyFiles: [],
          configFiles: [],
        };

        const mockTechProfile: TechProfile = {
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
          ],
        };

        mockGetFolderStructure.mockResolvedValue(mockStructure);
        mockProviderClient.completeWithJson.mockResolvedValue(mockTechProfile);
        mockInquirerPrompt.mockResolvedValue({ selectedExclusions: [] });

        const result = await runDiscoveryPhase('/test/monorepo', 'standard');

        expect(result.success).toBe(true);
        expect(result.data?.projects).toHaveLength(1);
      });
    });

    describe('debug mode', () => {
      it('should print debug info when debug=true', async () => {
        const mockStructure: FolderStructure = {
          root: '/test',
          directories: ['src', 'tests'],
          keyFiles: ['index.ts', 'config.ts'],
          configFiles: ['package.json'],
        };

        const mockTechProfile: TechProfile = {
          stack: {
            languages: ['TypeScript'],
            frameworks: [],
            buildTools: [],
            testingFrameworks: [],
            packageManager: 'npm',
          },
          isMonorepo: false,
        };

        mockGetFolderStructure.mockResolvedValue(mockStructure);
        mockProviderClient.completeWithJson.mockResolvedValue(mockTechProfile);

        await runDiscoveryPhase('/test', 'standard', true);

        expect(mockPrintInfo).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
      });

      it('should not print debug info when debug=false', async () => {
        const mockStructure: FolderStructure = {
          root: '/test',
          directories: [],
          keyFiles: [],
          configFiles: [],
        };

        const mockTechProfile: TechProfile = {
          stack: {
            languages: ['TypeScript'],
            frameworks: [],
            buildTools: [],
            testingFrameworks: [],
            packageManager: 'npm',
          },
          isMonorepo: false,
        };

        mockGetFolderStructure.mockResolvedValue(mockStructure);
        mockProviderClient.completeWithJson.mockResolvedValue(mockTechProfile);

        mockPrintInfo.mockClear();

        await runDiscoveryPhase('/test', 'standard', false);

        const debugCalls = mockPrintInfo.mock.calls.filter(
          (call: any[]) => call[0]?.includes?.('[DEBUG]')
        );
        expect(debugCalls.length).toBe(0);
      });
    });
  });
});
