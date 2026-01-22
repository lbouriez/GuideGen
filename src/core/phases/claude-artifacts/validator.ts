/**
 * Validator for Claude artifacts - ensures guideline references are valid
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GeneratedSkill } from './skills';
import type { GeneratedAgent } from './agents';
import type { GeneratedGuideline } from '@/types';

export interface ArtifactValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Extract all markdown links from content
 */
function extractLinks(content: string): string[] {
  const links: string[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[2]); // The URL part
  }

  return links;
}

/**
 * Validate skill references
 */
export function validateSkill(
  skill: GeneratedSkill,
  guidelines: GeneratedGuideline[]
): ArtifactValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!skill.name) errors.push('Missing skill name');
  if (!skill.fileName) errors.push('Missing fileName');
  if (!skill.content) errors.push('Missing content');

  // Check for frontmatter
  if (!skill.content.match(/^---\n[\s\S]*?\n---/)) {
    errors.push('Missing frontmatter (---...---)');
  }

  // Extract and validate guideline references
  const links = extractLinks(skill.content);
  const guidelineLinks = links.filter(l => l.includes('.guidelines'));

  if (guidelineLinks.length === 0) {
    warnings.push('No guideline references found - skills should reference guidelines');
  }

  // Validate each guideline link
  const validGuidelinePaths = new Set<string>();
  for (const guideline of guidelines) {
    validGuidelinePaths.add(`.guidelines/${guideline.domain}/${guideline.fileName}`);
    validGuidelinePaths.add(`../../.guidelines/${guideline.domain}/${guideline.fileName}`);
  }

  for (const link of guidelineLinks) {
    // Normalize path
    const normalized = link.replace(/\\/g, '/');

    if (!validGuidelinePaths.has(normalized)) {
      // Check if it's a relative path that resolves correctly
      const possiblePaths = [
        normalized,
        normalized.replace('../..', '.'),
        normalized.replace('../../', '')
      ];

      const found = possiblePaths.some(p => validGuidelinePaths.has(p));

      if (!found) {
        warnings.push(`Guideline reference may be broken: ${link}`);
      }
    }
  }

  // Check for workflow structure
  if (!skill.content.includes('## Workflow') && !skill.content.includes('## Steps')) {
    warnings.push('Missing workflow/steps section - skills should define clear steps');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate agent references
 */
export function validateAgent(
  agent: GeneratedAgent,
  guidelines: GeneratedGuideline[]
): ArtifactValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!agent.name) errors.push('Missing agent name');
  if (!agent.fileName) errors.push('Missing fileName');
  if (!agent.content) errors.push('Missing content');
  if (!agent.referencedGuideline) errors.push('Missing guideline reference');

  // Check for frontmatter
  if (!agent.content.match(/^---\n[\s\S]*?\n---/)) {
    errors.push('Missing frontmatter (---...---)');
  }

  // Validate guideline reference
  const validGuidelinePaths = new Set<string>();
  for (const guideline of guidelines) {
    validGuidelinePaths.add(`.guidelines/${guideline.domain}/${guideline.fileName}`);
    validGuidelinePaths.add(`../../.guidelines/${guideline.domain}/${guideline.fileName}`);
  }

  // Also allow root index.md references
  validGuidelinePaths.add('.guidelines/index.md');
  validGuidelinePaths.add('../../.guidelines/index.md');

  const normalized = agent.referencedGuideline.replace(/\\/g, '/');
  if (!validGuidelinePaths.has(normalized)) {
    const possiblePaths = [
      normalized,
      normalized.replace('../..', '.'),
      normalized.replace('../../', '')
    ];

    const found = possiblePaths.some(p => validGuidelinePaths.has(p));

    if (!found) {
      errors.push(`Invalid guideline reference: ${agent.referencedGuideline}`);
    }
  }

  // Check for verification steps
  if (!agent.content.includes('## Verification') && !agent.content.includes('## Check')) {
    warnings.push('Missing verification section - agents should define how to check the rule');
  }

  // Check for examples
  if (!agent.content.includes('```')) {
    warnings.push('Missing code examples - agents should show good and bad patterns');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate all skills
 */
export function validateAllSkills(
  skills: GeneratedSkill[],
  guidelines: GeneratedGuideline[]
): Map<string, ArtifactValidationResult> {
  const results = new Map<string, ArtifactValidationResult>();

  for (const skill of skills) {
    const result = validateSkill(skill, guidelines);
    results.set(skill.fileName, result);
  }

  return results;
}

/**
 * Validate all agents
 */
export function validateAllAgents(
  agents: GeneratedAgent[],
  guidelines: GeneratedGuideline[]
): Map<string, ArtifactValidationResult> {
  const results = new Map<string, ArtifactValidationResult>();

  for (const agent of agents) {
    const result = validateAgent(agent, guidelines);
    results.set(agent.fileName, result);
  }

  return results;
}
