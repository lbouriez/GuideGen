/**
 * Artifact File Manager
 * Handles file operations for Claude artifacts (skills, agents, CLAUDE.md)
 */

import { injectable, inject } from 'inversify';
import * as fs from 'fs';
import * as path from 'path';
import { TYPES } from '../../../di/identifiers.js';
import type { ILogger } from '../../../interfaces/services/ILogger.js';
import type { GeneratedSkill } from '../../../core/phases/claude-artifacts/skills.js';
import type { GeneratedAgent } from '../../../core/phases/claude-artifacts/agents.js';

export interface ExistingArtifacts {
  skills: Map<string, string>;
  agents: Map<string, string>;
  claudeMd: string | null;
}

export interface MergedContent {
  skills: Map<string, string>;
  agents: Map<string, string>;
  claudeMd: string | null;
}

@injectable()
export class ArtifactFileManager {
  constructor(
    @inject(TYPES.ILogger) private logger: ILogger
  ) {}

  /**
   * Check if claude artifacts exist at the target path
   */
  artifactsExist(targetPath: string): boolean {
    const claudePath = path.join(targetPath, '.claude');
    const claudeMdPath = path.join(targetPath, 'CLAUDE.md');
    return fs.existsSync(claudePath) &&
           (fs.existsSync(path.join(claudePath, 'skills')) ||
            fs.existsSync(path.join(claudePath, 'agents')) ||
            fs.existsSync(claudeMdPath));
  }

  /**
   * Delete all claude artifacts (for override mode)
   */
  deleteArtifacts(targetPath: string): void {
    const claudePath = path.join(targetPath, '.claude');
    if (fs.existsSync(claudePath)) {
      fs.rmSync(claudePath, { recursive: true, force: true });
      this.logger.debug('Deleted .claude directory');
    }

    // Delete CLAUDE.md from root
    const claudeMdPath = path.join(targetPath, 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      fs.unlinkSync(claudeMdPath);
      this.logger.debug('Deleted CLAUDE.md from root');
    }

    // Also delete from old location (.claude/) for backwards compatibility
    const oldClaudeMdPath = path.join(targetPath, '.claude', 'CLAUDE.md');
    if (fs.existsSync(oldClaudeMdPath)) {
      fs.unlinkSync(oldClaudeMdPath);
      this.logger.debug('Deleted old CLAUDE.md from .claude/');
    }
  }

  /**
   * Read existing claude artifacts from disk
   */
  readExistingArtifacts(targetPath: string): ExistingArtifacts {
    const skills = new Map<string, string>();
    const agents = new Map<string, string>();
    let claudeMd: string | null = null;

    // Read skills
    const skillsPath = path.join(targetPath, '.claude', 'skills');
    if (fs.existsSync(skillsPath)) {
      const files = fs.readdirSync(skillsPath).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(skillsPath, file), 'utf-8');
        skills.set(file, content);
      }
      this.logger.debug(`Read ${skills.size} existing skills`);
    }

    // Read agents
    const agentsPath = path.join(targetPath, '.claude', 'agents');
    if (fs.existsSync(agentsPath)) {
      const files = fs.readdirSync(agentsPath).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(agentsPath, file), 'utf-8');
        agents.set(file, content);
      }
      this.logger.debug(`Read ${agents.size} existing agents`);
    }

    // Read CLAUDE.md (check root first, then .claude/ for backwards compatibility)
    const claudeMdPath = path.join(targetPath, 'CLAUDE.md');
    const oldClaudeMdPath = path.join(targetPath, '.claude', 'CLAUDE.md');

    if (fs.existsSync(claudeMdPath)) {
      claudeMd = fs.readFileSync(claudeMdPath, 'utf-8');
      this.logger.debug('Read existing CLAUDE.md from root');
    } else if (fs.existsSync(oldClaudeMdPath)) {
      claudeMd = fs.readFileSync(oldClaudeMdPath, 'utf-8');
      this.logger.debug('Read existing CLAUDE.md from .claude/ (old location)');
    }

    return { skills, agents, claudeMd };
  }

  /**
   * Write artifacts to disk
   */
  writeArtifacts(
    targetPath: string,
    skills: GeneratedSkill[],
    agents: GeneratedAgent[],
    claudeMdContent: string,
    mergedContent?: MergedContent
  ): void {
    // Create directories
    const skillsDir = path.join(targetPath, '.claude', 'skills');
    const agentsDir = path.join(targetPath, '.claude', 'agents');

    this.ensureDirectory(skillsDir);
    this.ensureDirectory(agentsDir);

    // Write skills
    for (const skill of skills) {
      const content = mergedContent?.skills.get(skill.fileName) || skill.content;
      fs.writeFileSync(path.join(skillsDir, skill.fileName), content, 'utf-8');
    }
    this.logger.debug(`Wrote ${skills.length} skills`);

    // Write agents
    for (const agent of agents) {
      const content = mergedContent?.agents.get(agent.fileName) || agent.content;
      fs.writeFileSync(path.join(agentsDir, agent.fileName), content, 'utf-8');
    }
    this.logger.debug(`Wrote ${agents.length} agents`);

    // Write CLAUDE.md to root directory
    const finalClaudeMd = mergedContent?.claudeMd || claudeMdContent;
    fs.writeFileSync(path.join(targetPath, 'CLAUDE.md'), finalClaudeMd, 'utf-8');
    this.logger.debug('Wrote CLAUDE.md to root');
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
