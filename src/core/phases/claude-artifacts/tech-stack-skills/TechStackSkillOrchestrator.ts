/**
 * Tech Stack Skill Orchestrator
 *
 * Coordinates generation of all tech-stack-specific skills by:
 * 1. Running all registered skill generators
 * 2. Determining which skills are applicable
 * 3. Generating content for applicable skills
 * 4. Returning skills for inclusion in Claude artifacts
 */

import type { IProviderClient } from '../../../../providers/types';
import type { ILogger } from '../../../../interfaces/services/ILogger';
import type { TechProfile, GeneratedGuideline } from '../../../../types';
import { TechStackSkillRegistry } from './types';
import type { TechStackSkillMetadata } from './types';

export interface GeneratedTechStackSkill {
  metadata: TechStackSkillMetadata;
  content: string;
  filename: string;
}

export class TechStackSkillOrchestrator {
  constructor(
    private readonly registry: TechStackSkillRegistry,
    private readonly logger: ILogger
  ) {}

  /**
   * Generate all applicable tech-stack skills for the project
   *
   * @param client - AI provider client
   * @param techProfile - Project's technology profile
   * @param guidelines - Existing project guidelines
   * @param packageJson - Project's package.json (optional)
   * @returns Array of generated skills
   */
  async generateApplicableSkills(
    client: IProviderClient,
    techProfile: TechProfile,
    guidelines: GeneratedGuideline[],
    packageJson?: Record<string, any>
  ): Promise<GeneratedTechStackSkill[]> {
    const generators = this.registry.getAll();

    if (generators.length === 0) {
      this.logger.debug(
        'No tech-stack skill generators registered, skipping tech-stack skills'
      );
      return [];
    }

    this.logger.info(
      `Checking applicability of ${generators.length} tech-stack skill types...`
    );

    // Phase 1: Check applicability for all generators
    const applicabilityChecks = await Promise.all(
      generators.map(async (generator) => {
        try {
          this.logger.debug(
            `Checking applicability: ${generator.category} skill`
          );
          const metadata = await generator.checkApplicability(
            client,
            techProfile,
            packageJson
          );
          return { generator, metadata };
        } catch (error) {
          this.logger.error(
            `Failed to check applicability for ${generator.category} skill:`,
            error
          );
          return null;
        }
      })
    );

    // Filter to only applicable skills
    const applicableSkills = applicabilityChecks.filter(
      (result): result is NonNullable<typeof result> =>
        result !== null && result.metadata.isApplicable
    );

    if (applicableSkills.length === 0) {
      this.logger.info(
        'No tech-stack skills are applicable to this project'
      );
      return [];
    }

    this.logger.info(
      `${applicableSkills.length} tech-stack skill(s) applicable to this project:`
    );
    applicableSkills.forEach((skill) => {
      this.logger.info(
        `  - ${skill.metadata.name} (${skill.metadata.priority} priority): ${skill.metadata.applicabilityReason}`
      );
    });

    // Phase 2: Generate content for applicable skills
    this.logger.info('Generating tech-stack skill content...');

    const generatedSkills = await Promise.all(
      applicableSkills.map(async ({ generator, metadata }) => {
        try {
          this.logger.debug(`Generating ${metadata.name}...`);

          const content = await generator.generateSkill(
            client,
            metadata,
            techProfile,
            guidelines,
            packageJson
          );

          const filename = this.generateFilename(metadata);

          this.logger.info(`✓ Generated: ${metadata.name}`);

          return {
            metadata,
            content,
            filename,
          };
        } catch (error) {
          this.logger.error(
            `Failed to generate ${metadata.name}:`,
            error
          );
          return null;
        }
      })
    );

    // Filter out failed generations
    const successfulSkills = generatedSkills.filter(
      (skill): skill is GeneratedTechStackSkill => skill !== null
    );

    this.logger.info(
      `Successfully generated ${successfulSkills.length} tech-stack skill(s)`
    );

    return successfulSkills;
  }

  /**
   * Generate a filename for the skill based on metadata
   */
  private generateFilename(metadata: TechStackSkillMetadata): string {
    // Convert "Security Review for Express" → "security-review-express.md"
    const sanitized = metadata.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50); // Limit length

    return `${sanitized}.md`;
  }
}
