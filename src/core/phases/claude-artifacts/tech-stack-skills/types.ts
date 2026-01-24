/**
 * Tech Stack Skill Types
 *
 * Defines interfaces for generating tech-stack-specific skills (security, code quality, etc.)
 * that differ from workflow skills by being preventive checklists rather than procedural guides.
 */

import type { TechProfile, GeneratedGuideline } from '../../../../types';
import type { IProviderClient } from '../../../../providers/types';

/**
 * Metadata for a tech-stack-specific skill
 */
export interface TechStackSkillMetadata {
  /** Unique skill identifier (e.g., "security-review", "code-quality") */
  id: string;

  /** Display name for the skill */
  name: string;

  /** Skill category (security, quality, performance, etc.) */
  category: SkillCategory;

  /** When this skill should be used */
  whenToUse: string;

  /** Priority/importance level */
  priority: 'critical' | 'high' | 'medium' | 'low';

  /** Whether this skill applies to the current tech stack */
  isApplicable: boolean;

  /** Reason why this skill is applicable (or not) */
  applicabilityReason: string;
}

/**
 * Skill category enum
 */
export type SkillCategory =
  | 'security'           // Security vulnerability prevention
  | 'code-quality'       // Code standards and best practices
  | 'performance'        // Performance optimization
  | 'accessibility'      // A11y standards
  | 'testing'           // Testing best practices
  | 'documentation';    // Documentation standards

/**
 * Abstract interface for tech-stack-specific skill generators
 *
 * Implementations use AI to:
 * 1. Determine if skill is applicable to project's tech stack
 * 2. Identify relevant concerns/standards for the tech stack
 * 3. Generate a preventive checklist skill
 */
export interface ITechStackSkillGenerator {
  /**
   * Skill category this generator handles
   */
  readonly category: SkillCategory;

  /**
   * Determine if this skill type is applicable to the project
   * Uses AI to analyze tech stack and decide relevance
   *
   * @param client - AI provider client
   * @param techProfile - Project's technology profile
   * @param packageJson - Project's package.json (optional)
   * @returns Metadata about skill applicability
   */
  checkApplicability(
    client: IProviderClient,
    techProfile: TechProfile,
    packageJson?: Record<string, any>
  ): Promise<TechStackSkillMetadata>;

  /**
   * Generate the skill content using AI
   *
   * @param client - AI provider client
   * @param metadata - Skill metadata from checkApplicability
   * @param techProfile - Project's technology profile
   * @param guidelines - Existing project guidelines to reference
   * @param packageJson - Project's package.json (optional)
   * @returns Generated skill content in markdown format
   */
  generateSkill(
    client: IProviderClient,
    metadata: TechStackSkillMetadata,
    techProfile: TechProfile,
    guidelines: GeneratedGuideline[],
    packageJson?: Record<string, any>
  ): Promise<string>;
}

/**
 * Registry for tech-stack skill generators
 */
export class TechStackSkillRegistry {
  private generators: Map<SkillCategory, ITechStackSkillGenerator> = new Map();

  /**
   * Register a skill generator
   */
  register(generator: ITechStackSkillGenerator): void {
    this.generators.set(generator.category, generator);
  }

  /**
   * Get all registered generators
   */
  getAll(): ITechStackSkillGenerator[] {
    return Array.from(this.generators.values());
  }

  /**
   * Get generator by category
   */
  get(category: SkillCategory): ITechStackSkillGenerator | undefined {
    return this.generators.get(category);
  }
}
