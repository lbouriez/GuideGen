/**
 * CLAUDE.md Generator Service
 * Generates the main CLAUDE.md file for Claude Code
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/identifiers.js';
import type { ILogger } from '../../../interfaces/services/ILogger.js';
import type { GeneratedGuideline } from '../../../types/index.js';
import type { GeneratedSkill } from '../../../core/phases/claude-artifacts/skills.js';
import type { GeneratedAgent } from '../../../core/phases/claude-artifacts/agents.js';
import { generateClaudeMd, type GeneratedClaudeMd } from '../../../core/phases/claude-artifacts/claude-md.js';

@injectable()
export class ClaudeMdGeneratorService {
  constructor(
    @inject(TYPES.ILogger) private logger: ILogger
  ) {}

  /**
   * Generate CLAUDE.md content
   */
  generate(
    projectName: string,
    guidelines: GeneratedGuideline[],
    skills: GeneratedSkill[],
    agents: GeneratedAgent[],
    packageScripts?: Record<string, string>
  ): GeneratedClaudeMd {
    this.logger.info('Generating CLAUDE.md');

    const result = generateClaudeMd(
      projectName,
      guidelines,
      skills,
      agents,
      packageScripts
    );

    this.logger.debug('CLAUDE.md generation complete', {
      contentLength: result.content.length
    });

    return result;
  }
}
