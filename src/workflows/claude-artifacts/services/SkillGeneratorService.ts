/**
 * Skill Generator Service
 * Generates Claude Code skills from guidelines
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/identifiers.js';
import type { ILogger } from '../../../interfaces/services/ILogger.js';
import type { IProviderClient } from '../../../providers/types.js';
import type { GeneratedGuideline, ExtractedRule } from '../../../types/index.js';
import { generateAllSkillsV2, type GeneratedSkill } from '../../../core/phases/claude-artifacts/skills-v2.js';
import { validateAllSkills } from '../../../core/phases/claude-artifacts/validator.js';

export interface SkillGenerationResult {
  success: boolean;
  skills: GeneratedSkill[];
  error?: string;
}

@injectable()
export class SkillGeneratorService {
  private readonly maxSkills = 5;

  constructor(
    @inject(TYPES.ILogger) private logger: ILogger
  ) {}

  /**
   * Generate skills from guidelines using improved V2 approach
   */
  async generate(
    client: IProviderClient,
    rules: ExtractedRule[],
    guidelines: GeneratedGuideline[],
    onProgress?: (current: number, total: number, name: string) => void
  ): Promise<SkillGenerationResult> {
    try {
      this.logger.info('Starting skill generation (V2 - AI-guided selection)');

      const skills = await generateAllSkillsV2(
        client,
        guidelines,
        this.maxSkills,
        onProgress
      );

      this.logger.info(`Generated ${skills.length} skills`);
      return { success: true, skills };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Skill generation failed', { error: message });
      return { success: false, skills: [], error: message };
    }
  }

  /**
   * Validate generated skills
   */
  validate(
    skills: GeneratedSkill[],
    guidelines: GeneratedGuideline[]
  ): { valid: boolean; errors: string[] } {
    const validation = validateAllSkills(skills, guidelines);
    const errors: string[] = [];

    for (const [name, result] of validation) {
      if (!result.valid) {
        errors.push(`Skill "${name}": ${result.errors.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
