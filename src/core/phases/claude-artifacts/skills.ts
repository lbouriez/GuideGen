/**
 * Skills generation logic
 */

import type { IProviderClient } from '@/providers/types';
import type { ExtractedRule, GeneratedGuideline } from '@/types';
import { SKILL_SYSTEM_PROMPT, SKILL_USER_PROMPT } from './prompts';

export interface GeneratedSkill {
  name: string;
  fileName: string;
  content: string;
  referencedGuidelines: string[];
}

/**
 * Identify skills to generate from rules
 */
export function identifySkills(
  rules: ExtractedRule[],
  guidelines: GeneratedGuideline[]
): Array<{ name: string; workflow: string; guidelines: string[] }> {
  const skills: Array<{ name: string; workflow: string; guidelines: string[] }> = [];

  // ALWAYS generate a default /guidelines skill
  const allGuidelinesPaths = guidelines.map(g => `.guidelines/${g.domain}/${g.fileName}`);
  skills.push({
    name: 'guidelines',
    workflow: 'Browse and search project guidelines. Use when you need to find specific documentation, understand project conventions, or explore available guidelines.',
    guidelines: allGuidelinesPaths
  });

  // Look for workflows (multi-step processes)
  const workflows = rules.filter(r => r.type === 'workflow' || r.steps);

  for (const workflow of workflows) {
    // Only create skills for important workflows (3+ steps)
    if (!workflow.steps || workflow.steps.length < 3) {
      continue;
    }

    // Find related guidelines
    const relatedGuidelines: string[] = [];
    const domain = workflow.domain || 'shared';

    // Match guidelines by domain
    const domainGuidelines = guidelines.filter(g => g.domain === domain);
    relatedGuidelines.push(...domainGuidelines.map(g => `.guidelines/${g.domain}/${g.fileName}`));

    skills.push({
      name: workflow.id,
      workflow: workflow.description || workflow.id,
      guidelines: relatedGuidelines.slice(0, 5) // Top 5 most relevant
    });
  }

  return skills;
}

/**
 * Generate a single skill
 */
export async function generateSkill(
  client: IProviderClient,
  skillName: string,
  workflow: string,
  relatedGuidelines: string[]
): Promise<GeneratedSkill> {
  const response = await client.sendMessage(
    SKILL_SYSTEM_PROMPT,
    SKILL_USER_PROMPT(skillName, workflow, relatedGuidelines)
  );

  // Extract skill name from content (frontmatter)
  const nameMatch = response.content.match(/name:\s*([^\n]+)/);
  const actualName = nameMatch ? nameMatch[1].trim() : skillName;

  return {
    name: actualName,
    fileName: `${actualName}.md`,
    content: response.content,
    referencedGuidelines: relatedGuidelines
  };
}

/**
 * Generate all skills
 */
export async function generateAllSkills(
  client: IProviderClient,
  rules: ExtractedRule[],
  guidelines: GeneratedGuideline[],
  maxSkills: number = 10,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<GeneratedSkill[]> {
  const skillsToGenerate = identifySkills(rules, guidelines);

  // Apply limit
  const limited = skillsToGenerate.slice(0, maxSkills);

  const results: GeneratedSkill[] = [];

  for (let i = 0; i < limited.length; i++) {
    const skill = limited[i];
    if (onProgress) {
      onProgress(i + 1, limited.length, skill.name);
    }

    const generated = await generateSkill(
      client,
      skill.name,
      skill.workflow,
      skill.guidelines
    );

    results.push(generated);
  }

  return results;
}
