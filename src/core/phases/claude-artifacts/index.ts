/**
 * Claude artifacts generation phase (skills and agents)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IProviderClient } from '@/providers/types';
import type { ExtractedRule, PhaseResult, GeneratedGuideline, TechProfile } from '@/types';
import { generateAllSkills, type GeneratedSkill } from './skills';
import { generateAllAgents, type GeneratedAgent } from './agents';
import { validateAllSkills, validateAllAgents, type ArtifactValidationResult } from './validator';
import { generateClaudeMd } from './claude-md';
import { PackageJsonSchema, parseWithSchema } from '@/types';

export interface ClaudeArtifactsResult {
  skills: GeneratedSkill[];
  agents: GeneratedAgent[];
  skillValidation: Map<string, ArtifactValidationResult>;
  agentValidation: Map<string, ArtifactValidationResult>;
}

/**
 * Get max artifacts based on project complexity
 */
function getMaxArtifacts(techProfile: TechProfile): { maxSkills: number; maxAgents: number } {
  const projectCount = techProfile.projects?.length || 1;
  const isMonorepo = techProfile.structure?.isMonorepo || false;

  if (isMonorepo || projectCount >= 3) {
    return { maxSkills: 10, maxAgents: 10 };
  } else if (projectCount === 2) {
    return { maxSkills: 7, maxAgents: 7 };
  } else {
    return { maxSkills: 5, maxAgents: 5 };
  }
}

/**
 * Get package.json scripts
 */
function getPackageJsonScripts(targetPath: string): Record<string, string> | undefined {
  try {
    const packageJsonPath = path.join(targetPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const result = parseWithSchema(PackageJsonSchema, fs.readFileSync(packageJsonPath, 'utf-8'));
      if (result.success) {
        return result.data.scripts;
      }
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Write artifacts to disk
 */
function writeArtifacts(
  targetPath: string,
  projectName: string,
  skills: GeneratedSkill[],
  agents: GeneratedAgent[],
  guidelines: GeneratedGuideline[]
): void {
  // Create directories
  const skillsDir = path.join(targetPath, '.claude', 'skills');
  const agentsDir = path.join(targetPath, '.claude', 'agents');

  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  // Write skills
  for (const skill of skills) {
    const filePath = path.join(skillsDir, skill.fileName);
    fs.writeFileSync(filePath, skill.content, 'utf-8');
  }

  // Write agents
  for (const agent of agents) {
    const filePath = path.join(agentsDir, agent.fileName);
    fs.writeFileSync(filePath, agent.content, 'utf-8');
  }

  // Generate and write CLAUDE.md to root directory
  const packageScripts = getPackageJsonScripts(targetPath);
  const claudeMd = generateClaudeMd(projectName, guidelines, skills, agents, packageScripts);
  const claudeMdPath = path.join(targetPath, 'CLAUDE.md');
  fs.writeFileSync(claudeMdPath, claudeMd.content, 'utf-8');
}

/**
 * Run Claude artifacts generation phase
 */
export async function runClaudeArtifactsPhase(
  client: IProviderClient,
  targetPath: string,
  techProfile: TechProfile,
  rules: ExtractedRule[],
  guidelines: GeneratedGuideline[],
  onProgress?: (message: string) => void
): Promise<PhaseResult<ClaudeArtifactsResult>> {
  try {
    if (onProgress) onProgress('Starting Claude artifacts generation...');

    // Get limits based on project complexity
    const { maxSkills, maxAgents } = getMaxArtifacts(techProfile);

    if (onProgress) {
      onProgress(`Generating up to ${maxSkills} skills and ${maxAgents} agents based on project complexity`);
    }

    // Generate skills
    if (onProgress) onProgress('Generating skills...');
    const skills = await generateAllSkills(
      client,
      rules,
      guidelines,
      maxSkills,
      (current, total, name) => {
        if (onProgress) {
          onProgress(`Generating skill ${current}/${total}: ${name}`);
        }
      }
    );

    // Generate agents
    if (onProgress) onProgress('Generating agents...');
    const agents = await generateAllAgents(
      client,
      rules,
      guidelines,
      techProfile,
      maxAgents,
      (current, total, name) => {
        if (onProgress) {
          onProgress(`Generating agent ${current}/${total}: ${name}`);
        }
      }
    );

    // Validate artifacts
    if (onProgress) onProgress('Validating artifacts...');
    const skillValidation = validateAllSkills(skills, guidelines);
    const agentValidation = validateAllAgents(agents, guidelines);

    // Check for validation errors
    let hasErrors = false;
    const errors: string[] = [];

    for (const [name, result] of skillValidation) {
      if (!result.valid) {
        hasErrors = true;
        errors.push(`Skill ${name}: ${result.errors.join(', ')}`);
      }
    }

    for (const [name, result] of agentValidation) {
      if (!result.valid) {
        hasErrors = true;
        errors.push(`Agent ${name}: ${result.errors.join(', ')}`);
      }
    }

    if (hasErrors) {
      return {
        success: false,
        error: `Validation failed:\n${errors.join('\n')}`,
        humanReviewRequired: false
      };
    }

    // Write artifacts to disk
    if (onProgress) onProgress('Writing artifacts to .claude/ directory...');

    // Extract project name from target path
    const projectName = targetPath.split(/[/\\]/).filter(Boolean).pop() || 'Project';

    writeArtifacts(targetPath, projectName, skills, agents, guidelines);

    if (onProgress) {
      onProgress(`Claude artifacts phase complete: ${skills.length} skills, ${agents.length} agents generated`);
    }

    return {
      success: true,
      data: {
        skills,
        agents,
        skillValidation,
        agentValidation
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      humanReviewRequired: false
    };
  }
}
