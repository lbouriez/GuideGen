/**
 * Tech Stack Skills Module
 *
 * Provides extensible framework for generating tech-stack-specific skills
 * (security, code quality, performance, etc.) that differ from workflow skills
 * by being preventive checklists rather than procedural guides.
 *
 * Architecture:
 * - All knowledge is AI-generated (no hardcoded threat databases)
 * - Easy to extend with new skill types
 * - Generators determine applicability and generate content dynamically
 */

export * from './types';
export * from './SecuritySkillGenerator';
export * from './CodeQualitySkillGenerator';
export * from './TechStackSkillOrchestrator';

import { TechStackSkillRegistry } from './types';
import { SecuritySkillGenerator } from './SecuritySkillGenerator';
import { CodeQualitySkillGenerator } from './CodeQualitySkillGenerator';

/**
 * Create and configure the default tech-stack skill registry
 * with all built-in generators
 */
export function createDefaultTechStackSkillRegistry(): TechStackSkillRegistry {
  const registry = new TechStackSkillRegistry();

  // Register built-in generators
  registry.register(new SecuritySkillGenerator());
  registry.register(new CodeQualitySkillGenerator());

  // Future generators can be added here:
  // registry.register(new PerformanceSkillGenerator());
  // registry.register(new AccessibilitySkillGenerator());
  // registry.register(new TestingSkillGenerator());

  return registry;
}
