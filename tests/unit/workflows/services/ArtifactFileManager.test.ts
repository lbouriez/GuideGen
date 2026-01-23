/**
 * ArtifactFileManager Service Tests
 * Tests for artifact file I/O operations and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'reflect-metadata';
import { ArtifactFileManager } from '../../../../src/workflows/claude-artifacts/services/ArtifactFileManager.js';
import type { GeneratedSkill } from '../../../../src/core/phases/claude-artifacts/skills.js';
import type { GeneratedAgent } from '../../../../src/core/phases/claude-artifacts/agents.js';

// Mock filesystem
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  rmSync: vi.fn(),
  unlinkSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

describe('ArtifactFileManager', () => {
  let manager: ArtifactFileManager;
  let mockLogger: any;
  let mockFs: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetAllMocks();

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const fs = await import('fs');
    mockFs = vi.mocked(fs);

    // Reset all fs mocks to default (no-op) implementations
    mockFs.existsSync.mockReset();
    mockFs.writeFileSync.mockReset();
    mockFs.readFileSync.mockReset();
    mockFs.mkdirSync.mockReset();

    manager = new ArtifactFileManager(mockLogger);
  });

  describe('artifactsExist', () => {
    it('should return true when .claude directory and skills exist', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('.claude') || path.includes('skills');
      });

      const result = manager.artifactsExist('/test/project');

      expect(result).toBe(true);
    });

    it('should return true when .claude directory and agents exist', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('.claude') || path.includes('agents');
      });

      const result = manager.artifactsExist('/test/project');

      expect(result).toBe(true);
    });

    it('should return true when CLAUDE.md exists', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('.claude') || path.includes('CLAUDE.md');
      });

      const result = manager.artifactsExist('/test/project');

      expect(result).toBe(true);
    });

    it('should return false when no artifacts exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = manager.artifactsExist('/test/project');

      expect(result).toBe(false);
    });

    it('should return false when .claude directory exists but is empty', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('.claude') && !path.includes('skills') && !path.includes('agents');
      });

      const result = manager.artifactsExist('/test/project');

      expect(result).toBe(false);
    });
  });

  describe('deleteArtifacts', () => {
    it('should delete .claude directory and CLAUDE.md when they exist', () => {
      mockFs.existsSync.mockReturnValue(true);

      manager.deleteArtifacts('/test/project');

      expect(mockFs.rmSync).toHaveBeenCalledWith('/test/project/.claude', {
        recursive: true,
        force: true,
      });
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/test/project/CLAUDE.md');
      expect(mockLogger.debug).toHaveBeenCalledWith('Deleted .claude directory');
      expect(mockLogger.debug).toHaveBeenCalledWith('Deleted CLAUDE.md');
    });

    it('should skip deletion when .claude directory does not exist', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('CLAUDE.md');
      });

      manager.deleteArtifacts('/test/project');

      expect(mockFs.rmSync).not.toHaveBeenCalled();
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should skip deletion when CLAUDE.md does not exist', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('.claude');
      });

      manager.deleteArtifacts('/test/project');

      expect(mockFs.rmSync).toHaveBeenCalled();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle deletion when nothing exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      manager.deleteArtifacts('/test/project');

      expect(mockFs.rmSync).not.toHaveBeenCalled();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('readExistingArtifacts', () => {
    it('should read skills, agents, and CLAUDE.md when all exist', () => {
      mockFs.existsSync.mockReturnValue(true);

      mockFs.readdirSync.mockImplementation((path: string) => {
        if (path.includes('skills')) {
          return ['skill1.md', 'skill2.md', 'README.txt'];
        }
        if (path.includes('agents')) {
          return ['agent1.md', 'agent2.md'];
        }
        return [];
      });

      mockFs.readFileSync.mockImplementation((path: string) => {
        if (path.includes('skill1.md')) return '# Skill 1';
        if (path.includes('skill2.md')) return '# Skill 2';
        if (path.includes('agent1.md')) return '# Agent 1';
        if (path.includes('agent2.md')) return '# Agent 2';
        if (path.includes('CLAUDE.md')) return '# CLAUDE.md Content';
        return '';
      });

      const result = manager.readExistingArtifacts('/test/project');

      expect(result.skills.size).toBe(2);
      expect(result.skills.get('skill1.md')).toBe('# Skill 1');
      expect(result.skills.get('skill2.md')).toBe('# Skill 2');

      expect(result.agents.size).toBe(2);
      expect(result.agents.get('agent1.md')).toBe('# Agent 1');
      expect(result.agents.get('agent2.md')).toBe('# Agent 2');

      expect(result.claudeMd).toBe('# CLAUDE.md Content');

      expect(mockLogger.debug).toHaveBeenCalledWith('Read 2 existing skills');
      expect(mockLogger.debug).toHaveBeenCalledWith('Read 2 existing agents');
      expect(mockLogger.debug).toHaveBeenCalledWith('Read existing CLAUDE.md');
    });

    it('should return empty collections when no artifacts exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = manager.readExistingArtifacts('/test/project');

      expect(result.skills.size).toBe(0);
      expect(result.agents.size).toBe(0);
      expect(result.claudeMd).toBeNull();
    });

    it('should filter out non-markdown files', () => {
      mockFs.existsSync.mockReturnValue(true);

      mockFs.readdirSync.mockImplementation((path: string) => {
        if (path.includes('skills')) {
          return ['skill1.md', 'README.txt', 'skill2.md', '.DS_Store'];
        }
        return [];
      });

      mockFs.readFileSync.mockReturnValue('# Content');

      const result = manager.readExistingArtifacts('/test/project');

      expect(result.skills.size).toBe(2);
      expect(result.skills.has('skill1.md')).toBe(true);
      expect(result.skills.has('skill2.md')).toBe(true);
      expect(result.skills.has('README.txt')).toBe(false);
    });

    it('should handle partially existing artifacts', () => {
      mockFs.existsSync.mockImplementation((path: string) => {
        return path.includes('skills') || path.includes('CLAUDE.md');
      });

      mockFs.readdirSync.mockImplementation((path: string) => {
        if (path.includes('skills')) return ['skill1.md'];
        return [];
      });

      mockFs.readFileSync.mockReturnValue('# Content');

      const result = manager.readExistingArtifacts('/test/project');

      expect(result.skills.size).toBe(1);
      expect(result.agents.size).toBe(0);
      expect(result.claudeMd).toBe('# Content');
    });

    it('should handle file read errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['skill1.md']);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      expect(() => manager.readExistingArtifacts('/test/project')).toThrow('permission denied');
    });
  });

  describe('writeArtifacts', () => {
    it('should write skills, agents, and CLAUDE.md', () => {
      mockFs.existsSync.mockReturnValue(false);

      const skills: GeneratedSkill[] = [
        { fileName: 'skill1.md', name: 'Skill 1', content: '# Skill 1 Content' },
        { fileName: 'skill2.md', name: 'Skill 2', content: '# Skill 2 Content' },
      ];

      const agents: GeneratedAgent[] = [
        { fileName: 'agent1.md', name: 'Agent 1', content: '# Agent 1 Content' },
      ];

      const claudeMdContent = '# CLAUDE.md Content';

      manager.writeArtifacts('/test/project', skills, agents, claudeMdContent);

      // Verify directories were created
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/project/.claude/skills', {
        recursive: true,
      });
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/project/.claude/agents', {
        recursive: true,
      });

      // Verify skills were written
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/project/.claude/skills/skill1.md',
        '# Skill 1 Content',
        'utf-8'
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/project/.claude/skills/skill2.md',
        '# Skill 2 Content',
        'utf-8'
      );

      // Verify agent was written
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/project/.claude/agents/agent1.md',
        '# Agent 1 Content',
        'utf-8'
      );

      // Verify CLAUDE.md was written
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/project/CLAUDE.md',
        '# CLAUDE.md Content',
        'utf-8'
      );

      expect(mockLogger.debug).toHaveBeenCalledWith('Wrote 2 skills');
      expect(mockLogger.debug).toHaveBeenCalledWith('Wrote 1 agents');
      expect(mockLogger.debug).toHaveBeenCalledWith('Wrote CLAUDE.md');
    });

    it('should use merged content when provided', () => {
      mockFs.existsSync.mockReturnValue(false);

      const skills: GeneratedSkill[] = [
        { fileName: 'skill1.md', name: 'Skill 1', content: '# Original Skill 1' },
      ];

      const agents: GeneratedAgent[] = [
        { fileName: 'agent1.md', name: 'Agent 1', content: '# Original Agent 1' },
      ];

      const claudeMdContent = '# Original CLAUDE.md';

      const mergedContent = {
        skills: new Map([['skill1.md', '# Merged Skill 1']]),
        agents: new Map([['agent1.md', '# Merged Agent 1']]),
        claudeMd: '# Merged CLAUDE.md',
      };

      manager.writeArtifacts('/test/project', skills, agents, claudeMdContent, mergedContent);

      // Verify merged content was used
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/project/.claude/skills/skill1.md',
        '# Merged Skill 1',
        'utf-8'
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/project/.claude/agents/agent1.md',
        '# Merged Agent 1',
        'utf-8'
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/project/CLAUDE.md',
        '# Merged CLAUDE.md',
        'utf-8'
      );
    });

    it('should create directories when they do not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      manager.writeArtifacts('/test/project', [], [], '# CLAUDE.md');

      expect(mockFs.mkdirSync).toHaveBeenCalledTimes(2);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/project/.claude/skills', {
        recursive: true,
      });
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/test/project/.claude/agents', {
        recursive: true,
      });
    });

    it('should not create directories when they already exist', () => {
      mockFs.existsSync.mockReturnValue(true);

      manager.writeArtifacts('/test/project', [], [], '# CLAUDE.md');

      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should handle write errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('ENOSPC: no space left on device');
      });

      const skills: GeneratedSkill[] = [
        { fileName: 'skill1.md', name: 'Skill 1', content: '# Skill 1' },
      ];

      expect(() =>
        manager.writeArtifacts('/test/project', skills, [], '# CLAUDE.md')
      ).toThrow('no space left on device');
    });

    it('should handle empty arrays gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);

      manager.writeArtifacts('/test/project', [], [], '# CLAUDE.md Only');

      // Should still write CLAUDE.md
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/project/CLAUDE.md',
        '# CLAUDE.md Only',
        'utf-8'
      );

      expect(mockLogger.debug).toHaveBeenCalledWith('Wrote 0 skills');
      expect(mockLogger.debug).toHaveBeenCalledWith('Wrote 0 agents');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow: delete, read, write', () => {
      // Delete existing
      mockFs.existsSync.mockReturnValue(true);
      manager.deleteArtifacts('/test/project');

      expect(mockFs.rmSync).toHaveBeenCalled();
      expect(mockFs.unlinkSync).toHaveBeenCalled();

      // Read should find nothing after delete
      mockFs.existsSync.mockReturnValue(false);
      const artifacts = manager.readExistingArtifacts('/test/project');

      expect(artifacts.skills.size).toBe(0);
      expect(artifacts.agents.size).toBe(0);
      expect(artifacts.claudeMd).toBeNull();

      // Write new artifacts
      const skills: GeneratedSkill[] = [
        { fileName: 'new-skill.md', name: 'New Skill', content: '# New Skill' },
      ];

      manager.writeArtifacts('/test/project', skills, [], '# New CLAUDE.md');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle update workflow with merging', () => {
      // Read existing artifacts
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockImplementation((path: string) => {
        if (path.includes('skills')) return ['existing-skill.md'];
        return [];
      });
      mockFs.readFileSync.mockReturnValue('# Existing Content');

      const existing = manager.readExistingArtifacts('/test/project');

      expect(existing.skills.get('existing-skill.md')).toBe('# Existing Content');

      // Write with merged content
      const skills: GeneratedSkill[] = [
        { fileName: 'existing-skill.md', name: 'Existing Skill', content: '# New Content' },
      ];

      const mergedContent = {
        skills: new Map([['existing-skill.md', '# Merged Content']]),
        agents: new Map(),
        claudeMd: '# Merged CLAUDE.md',
      };

      manager.writeArtifacts('/test/project', skills, [], '# Original', mergedContent);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/test/project/.claude/skills/existing-skill.md',
        '# Merged Content',
        'utf-8'
      );
    });
  });
});
