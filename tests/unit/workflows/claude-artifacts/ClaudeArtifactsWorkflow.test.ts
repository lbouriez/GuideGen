/**
 * ClaudeArtifactsWorkflow Unit Tests
 * Comprehensive tests for the refactored workflow orchestration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'reflect-metadata';
import { ClaudeArtifactsWorkflow } from '../../../../src/workflows/claude-artifacts/ClaudeArtifactsWorkflow.js';
import type { TechProfile, GeneratedGuideline } from '../../../../src/types/index.js';

// Mock services
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const mockFileManager = {
  artifactsExist: vi.fn(),
  deleteArtifacts: vi.fn(),
  readExistingArtifacts: vi.fn(),
  writeArtifacts: vi.fn(),
};

const mockSkillGenerator = {
  generate: vi.fn(),
  validate: vi.fn(),
};

const mockAgentGenerator = {
  generate: vi.fn(),
  validate: vi.fn(),
};

const mockClaudeMdGenerator = {
  generate: vi.fn(),
};

const mockMerger = {
  merge: vi.fn(),
};

const mockGuidelineExtractor = {
  readGuidelines: vi.fn(),
  extractRules: vi.fn(),
  getPackageJsonScripts: vi.fn(),
};

const mockProviderClient = {
  complete: vi.fn(),
  completeWithJson: vi.fn(),
  setDepth: vi.fn(),
  getModelType: vi.fn(() => 'test-model'),
  sendMessage: vi.fn(),
};

describe('ClaudeArtifactsWorkflow', () => {
  let workflow: ClaudeArtifactsWorkflow;
  let mockTechProfile: TechProfile;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    workflow = new ClaudeArtifactsWorkflow(
      mockLogger as any,
      mockFileManager as any,
      mockSkillGenerator as any,
      mockAgentGenerator as any,
      mockClaudeMdGenerator as any,
      mockMerger as any,
      mockGuidelineExtractor as any
    );

    mockTechProfile = {
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
        directories: ['src'],
        keyFiles: ['package.json'],
        configFiles: ['package.json'],
      },
    };
  });

  describe('successful execution', () => {
    it('should create new artifacts when none exist', async () => {
      const mockGuidelines: GeneratedGuideline[] = [
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming\n- ✅ Use camelCase',
          priority: 1,
        },
      ];

      mockGuidelineExtractor.readGuidelines.mockReturnValue(mockGuidelines);
      mockGuidelineExtractor.extractRules.mockReturnValue([
        { id: 'rule-1', category: 'critical', description: 'Use camelCase', domain: 'shared', enforceable: true },
      ]);
      mockFileManager.artifactsExist.mockReturnValue(false);

      mockSkillGenerator.generate.mockResolvedValue({
        success: true,
        skills: [{ fileName: 'skill1.md', name: 'Skill 1', content: 'content' }],
      });
      mockSkillGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockAgentGenerator.generate.mockResolvedValue({
        success: true,
        agents: [{ fileName: 'agent1.md', name: 'Agent 1', content: 'content' }],
      });
      mockAgentGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockClaudeMdGenerator.generate.mockReturnValue({
        content: '# CLAUDE.md',
      });

      const result = await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(true);
      expect(result.skillsGenerated).toBe(1);
      expect(result.agentsGenerated).toBe(1);
      expect(result.mode).toBe('created');
      expect(mockFileManager.writeArtifacts).toHaveBeenCalled();
    });

    it('should update existing artifacts in update mode', async () => {
      const mockGuidelines: GeneratedGuideline[] = [
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming\n- ✅ Use camelCase',
          priority: 1,
        },
      ];

      mockGuidelineExtractor.readGuidelines.mockReturnValue(mockGuidelines);
      mockGuidelineExtractor.extractRules.mockReturnValue([]);
      mockFileManager.artifactsExist.mockReturnValue(true);

      mockSkillGenerator.generate.mockResolvedValue({
        success: true,
        skills: [{ fileName: 'skill1.md', name: 'Skill 1', content: 'new content' }],
      });
      mockSkillGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockAgentGenerator.generate.mockResolvedValue({
        success: true,
        agents: [{ fileName: 'agent1.md', name: 'Agent 1', content: 'new content' }],
      });
      mockAgentGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockClaudeMdGenerator.generate.mockReturnValue({
        content: '# CLAUDE.md updated',
      });

      mockFileManager.readExistingArtifacts.mockReturnValue({
        skills: new Map([['skill1.md', 'old content']]),
        agents: new Map([['agent1.md', 'old content']]),
        claudeMd: '# Old CLAUDE.md',
      });

      mockMerger.merge.mockResolvedValue({
        success: true,
        mergedContent: {
          skills: new Map([['skill1.md', 'merged content']]),
          agents: new Map([['agent1.md', 'merged content']]),
          claudeMd: '# Merged CLAUDE.md',
        },
        changesSummary: ['skill1.md: Added new section'],
        filesChanged: 3,
      });

      const result = await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false // non-interactive
      );

      expect(result.success).toBe(true);
      expect(result.mode).toBe('updated');
      expect(mockMerger.merge).toHaveBeenCalled();
      expect(mockFileManager.writeArtifacts).toHaveBeenCalledWith(
        '/test/project',
        expect.any(Array),
        expect.any(Array),
        '# CLAUDE.md updated',
        expect.objectContaining({
          skills: expect.any(Map),
          agents: expect.any(Map),
          claudeMd: '# Merged CLAUDE.md',
        })
      );
    });

    it('should report progress when callback provided', async () => {
      const progressMessages: string[] = [];
      const onProgress = (msg: string) => progressMessages.push(msg);

      mockGuidelineExtractor.readGuidelines.mockReturnValue([
        { type: 'naming', domain: 'shared', fileName: 'naming.md', content: '# Test', priority: 1 },
      ]);
      mockGuidelineExtractor.extractRules.mockReturnValue([]);
      mockFileManager.artifactsExist.mockReturnValue(false);

      mockSkillGenerator.generate.mockResolvedValue({
        success: true,
        skills: [],
      });
      mockSkillGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockAgentGenerator.generate.mockResolvedValue({
        success: true,
        agents: [],
      });
      mockAgentGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockClaudeMdGenerator.generate.mockReturnValue({ content: '# Test' });

      await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false,
        onProgress
      );

      expect(progressMessages.length).toBeGreaterThan(0);
      expect(progressMessages).toContain('Starting Claude artifacts workflow...');
    });
  });

  describe('error handling', () => {
    it('should return error when no guidelines found', async () => {
      mockGuidelineExtractor.readGuidelines.mockReturnValue([]);

      const result = await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No guidelines found');
      expect(result.skillsGenerated).toBe(0);
      expect(result.agentsGenerated).toBe(0);
    });

    it('should return error when skill generation fails', async () => {
      mockGuidelineExtractor.readGuidelines.mockReturnValue([
        { type: 'naming', domain: 'shared', fileName: 'naming.md', content: '# Test', priority: 1 },
      ]);
      mockGuidelineExtractor.extractRules.mockReturnValue([]);
      mockFileManager.artifactsExist.mockReturnValue(false);

      mockSkillGenerator.generate.mockResolvedValue({
        success: false,
        error: 'Skill generation failed',
      });

      const result = await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Skill generation failed');
    });

    it('should return error when skill validation fails', async () => {
      mockGuidelineExtractor.readGuidelines.mockReturnValue([
        { type: 'naming', domain: 'shared', fileName: 'naming.md', content: '# Test', priority: 1 },
      ]);
      mockGuidelineExtractor.extractRules.mockReturnValue([]);
      mockFileManager.artifactsExist.mockReturnValue(false);

      mockSkillGenerator.generate.mockResolvedValue({
        success: true,
        skills: [{ fileName: 'skill1.md', name: 'Skill 1', content: 'invalid' }],
      });
      mockSkillGenerator.validate.mockReturnValue({
        valid: false,
        errors: ['Missing required section'],
      });

      const result = await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Skill validation failed');
    });

    it('should return error when agent validation fails', async () => {
      mockGuidelineExtractor.readGuidelines.mockReturnValue([
        { type: 'naming', domain: 'shared', fileName: 'naming.md', content: '# Test', priority: 1 },
      ]);
      mockGuidelineExtractor.extractRules.mockReturnValue([]);
      mockFileManager.artifactsExist.mockReturnValue(false);

      mockSkillGenerator.generate.mockResolvedValue({
        success: true,
        skills: [],
      });
      mockSkillGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockAgentGenerator.generate.mockResolvedValue({
        success: true,
        agents: [{ fileName: 'agent1.md', name: 'Agent 1', content: 'invalid' }],
      });
      mockAgentGenerator.validate.mockReturnValue({
        valid: false,
        errors: ['Invalid agent format'],
      });

      const result = await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Agent validation failed');
    });

    it('should handle merge failures', async () => {
      mockGuidelineExtractor.readGuidelines.mockReturnValue([
        { type: 'naming', domain: 'shared', fileName: 'naming.md', content: '# Test', priority: 1 },
      ]);
      mockGuidelineExtractor.extractRules.mockReturnValue([]);
      mockFileManager.artifactsExist.mockReturnValue(true);

      mockSkillGenerator.generate.mockResolvedValue({
        success: true,
        skills: [],
      });
      mockSkillGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockAgentGenerator.generate.mockResolvedValue({
        success: true,
        agents: [],
      });
      mockAgentGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockClaudeMdGenerator.generate.mockReturnValue({ content: '# Test' });

      mockFileManager.readExistingArtifacts.mockReturnValue({
        skills: new Map(),
        agents: new Map(),
        claudeMd: null,
      });

      mockMerger.merge.mockResolvedValue({
        success: false,
        error: 'Merge failed due to conflict',
        mergedContent: { skills: new Map(), agents: new Map(), claudeMd: null },
        changesSummary: [],
        filesChanged: 0,
      });

      const result = await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Merge failed');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockGuidelineExtractor.readGuidelines.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Claude artifacts workflow failed',
        expect.objectContaining({ error: 'Unexpected error' })
      );
    });
  });

  describe('integration with services', () => {
    it('should use GuidelineExtractor to read guidelines and extract rules', async () => {
      const mockGuidelines = [
        {
          type: 'naming',
          domain: 'shared',
          fileName: 'naming.md',
          content: '# Naming\n- ✅ Use camelCase\n- ❌ No snake_case',
          priority: 1,
        },
      ];

      mockGuidelineExtractor.readGuidelines.mockReturnValue(mockGuidelines);
      mockGuidelineExtractor.extractRules.mockReturnValue([
        { id: 'rule-1', category: 'critical', description: 'Use camelCase', domain: 'shared', enforceable: true },
      ]);
      mockFileManager.artifactsExist.mockReturnValue(false);

      mockSkillGenerator.generate.mockResolvedValue({ success: true, skills: [] });
      mockSkillGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockAgentGenerator.generate.mockResolvedValue({ success: true, agents: [] });
      mockAgentGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockClaudeMdGenerator.generate.mockReturnValue({ content: '# Test' });

      await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false
      );

      expect(mockGuidelineExtractor.readGuidelines).toHaveBeenCalledWith('/test/project');
      expect(mockGuidelineExtractor.extractRules).toHaveBeenCalledWith(mockGuidelines);
    });

    it('should use SkillGenerator and AgentGenerator correctly', async () => {
      mockGuidelineExtractor.readGuidelines.mockReturnValue([
        { type: 'naming', domain: 'shared', fileName: 'naming.md', content: '# Test', priority: 1 },
      ]);
      const mockRules = [
        { id: 'rule-1', category: 'critical', description: 'Test', domain: 'shared', enforceable: true },
      ];
      mockGuidelineExtractor.extractRules.mockReturnValue(mockRules);
      mockFileManager.artifactsExist.mockReturnValue(false);

      mockSkillGenerator.generate.mockResolvedValue({ success: true, skills: [] });
      mockSkillGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockAgentGenerator.generate.mockResolvedValue({ success: true, agents: [] });
      mockAgentGenerator.validate.mockReturnValue({ valid: true, errors: [] });

      mockClaudeMdGenerator.generate.mockReturnValue({ content: '# Test' });

      await workflow.execute(
        mockProviderClient as any,
        '/test/project',
        mockTechProfile,
        false
      );

      expect(mockSkillGenerator.generate).toHaveBeenCalledWith(
        mockProviderClient,
        mockRules,
        expect.any(Array),
        expect.any(Function)
      );

      expect(mockAgentGenerator.generate).toHaveBeenCalledWith(
        mockProviderClient,
        mockRules,
        expect.any(Array),
        expect.any(Function)
      );
    });
  });
});
