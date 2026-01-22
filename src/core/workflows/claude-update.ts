/**
 * Claude artifacts workflow with intelligent update mode
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IProviderClient } from '../../providers/types';
import type { TechProfile, GeneratedGuideline, ExtractedRule } from '../../types';
import { toGuidelineDomain } from '../../types';
import { generateAllSkills, type GeneratedSkill } from '../phases/claude-artifacts/skills';
import { generateAllAgents, type GeneratedAgent } from '../phases/claude-artifacts/agents';
import { validateAllSkills, validateAllAgents } from '../phases/claude-artifacts/validator';
import { generateClaudeMd } from '../phases/claude-artifacts/claude-md';
import { batchIntelligentMerge, formatChanges } from '../phases/intelligent-merge';
import { promptUpdateMode, confirmChanges } from '../../utils/interactive';
import { printSuccess } from '../../utils/display';
import { PackageJsonSchema, parseWithSchema } from '../../types/schemas';

export interface ClaudeArtifactsWorkflowResult {
  success: boolean;
  skillsGenerated: number;
  agentsGenerated: number;
  mode?: 'created' | 'updated' | 'cancelled';
  error?: string;
}

/**
 * Check if claude artifacts exist
 */
function claudeArtifactsExist(targetPath: string): boolean {
  const claudePath = path.join(targetPath, '.claude');
  return fs.existsSync(claudePath) &&
         (fs.existsSync(path.join(claudePath, 'skills')) ||
          fs.existsSync(path.join(claudePath, 'agents')) ||
          fs.existsSync(path.join(targetPath, 'CLAUDE.md')));
}

/**
 * Delete all claude artifacts (for override mode)
 */
function deleteClaudeArtifacts(targetPath: string): void {
  const claudePath = path.join(targetPath, '.claude');
  if (fs.existsSync(claudePath)) {
    fs.rmSync(claudePath, { recursive: true, force: true });
  }

  const claudeMdPath = path.join(targetPath, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    fs.unlinkSync(claudeMdPath);
  }
}

/**
 * Read markdown files from a directory into a Map
 */
function readMarkdownFiles(dirPath: string): Map<string, string> {
  const files = new Map<string, string>();

  if (fs.existsSync(dirPath)) {
    const fileNames = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const fileName of fileNames) {
      const content = fs.readFileSync(path.join(dirPath, fileName), 'utf-8');
      files.set(fileName, content);
    }
  }

  return files;
}

/**
 * Read existing claude artifacts from disk
 */
function readExistingArtifacts(targetPath: string): {
  skills: Map<string, string>;
  agents: Map<string, string>;
  claudeMd: string | null;
} {
  const skillsPath = path.join(targetPath, '.claude', 'skills');
  const agentsPath = path.join(targetPath, '.claude', 'agents');
  const claudeMdPath = path.join(targetPath, 'CLAUDE.md');

  return {
    skills: readMarkdownFiles(skillsPath),
    agents: readMarkdownFiles(agentsPath),
    claudeMd: fs.existsSync(claudeMdPath)
      ? fs.readFileSync(claudeMdPath, 'utf-8')
      : null,
  };
}

/**
 * Read existing guidelines
 */
function readExistingGuidelines(targetPath: string): GeneratedGuideline[] {
  const guidelines: GeneratedGuideline[] = [];
  const guidelinesPath = path.join(targetPath, '.guidelines');

  if (!fs.existsSync(guidelinesPath)) {
    return guidelines;
  }

  const domains = fs.readdirSync(guidelinesPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const domainStr of domains) {
    const domain = toGuidelineDomain(domainStr);
    const domainPath = path.join(guidelinesPath, domainStr);
    const files = fs.readdirSync(domainPath)
      .filter(f => f.endsWith('.md') && !f.includes('-index.md'));

    for (const file of files) {
      const filePath = path.join(domainPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      guidelines.push({
        type: file.replace('.md', ''),
        domain,
        fileName: file,
        content,
        priority: 1
      });
    }
  }

  return guidelines;
}

/**
 * Extract rules from guidelines for agent generation
 */
function extractRulesFromGuidelines(guidelines: GeneratedGuideline[]): ExtractedRule[] {
  const rules: ExtractedRule[] = [];

  for (const guideline of guidelines) {
    // Simple extraction - look for critical rules (✅/❌ patterns)
    const criticalRules = guideline.content.match(/- [✅❌][^\n]+/g) || [];

    for (let i = 0; i < criticalRules.length; i++) {
      const domain = guideline.domain as 'backend' | 'frontend' | 'shared' | 'all' | undefined;
      rules.push({
        id: `${guideline.type}-rule-${i + 1}`,
        category: 'critical',
        description: criticalRules[i].replace(/^- [✅❌]\s*/, ''),
        domain,
        enforceable: true
      });
    }
  }

  return rules;
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
    // Ignore
  }
  return undefined;
}

/**
 * Write artifacts to disk
 */
function writeArtifacts(
  targetPath: string,
  skills: GeneratedSkill[],
  agents: GeneratedAgent[],
  claudeMdContent: string,
  mergedContent?: {
    skills: Map<string, string>;
    agents: Map<string, string>;
    claudeMd: string | null;
  }
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
    const content = mergedContent?.skills.get(skill.fileName) || skill.content;
    fs.writeFileSync(path.join(skillsDir, skill.fileName), content, 'utf-8');
  }

  // Write agents
  for (const agent of agents) {
    const content = mergedContent?.agents.get(agent.fileName) || agent.content;
    fs.writeFileSync(path.join(agentsDir, agent.fileName), content, 'utf-8');
  }

  // Write CLAUDE.md
  const finalClaudeMd = mergedContent?.claudeMd || claudeMdContent;
  fs.writeFileSync(path.join(targetPath, 'CLAUDE.md'), finalClaudeMd, 'utf-8');
}

/**
 * Run claude artifacts generation workflow with intelligent update
 */
export async function runClaudeArtifactsWorkflow(
  client: IProviderClient,
  targetPath: string,
  techProfile: TechProfile,
  interactive: boolean = true,
  onProgress?: (message: string) => void
): Promise<ClaudeArtifactsWorkflowResult> {
  try {
    if (onProgress) onProgress('Starting Claude artifacts workflow...');

    // Read existing guidelines
    const guidelines = readExistingGuidelines(targetPath);

    if (guidelines.length === 0) {
      return {
        success: false,
        skillsGenerated: 0,
        agentsGenerated: 0,
        error: 'No guidelines found. Run guidelines generation first.'
      };
    }

    // Extract rules
    const rules = extractRulesFromGuidelines(guidelines);

    // Check if artifacts already exist
    const exists = claudeArtifactsExist(targetPath);
    let updateMode: 'override' | 'update' | 'new' = 'new';

    if (exists && interactive) {
      const choice = await promptUpdateMode(path.join(targetPath, '.claude/'));

      if (choice === 'cancel') {
        return {
          success: true,
          skillsGenerated: 0,
          agentsGenerated: 0,
          mode: 'cancelled'
        };
      }

      if (choice === 'override') {
        deleteClaudeArtifacts(targetPath);
        updateMode = 'override';
      } else {
        updateMode = 'update';
      }
    } else if (exists) {
      updateMode = 'update';
    }

    // Generate artifacts (in memory)
    const maxSkills = 5;
    const maxAgents = 5;

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

    if (onProgress) onProgress('Generating agents...');
    const agents = await generateAllAgents(
      client,
      rules,
      guidelines,
      maxAgents,
      (current, total, name) => {
        if (onProgress) {
          onProgress(`Generating agent ${current}/${total}: ${name}`);
        }
      }
    );

    // Validate
    if (onProgress) onProgress('Validating artifacts...');
    const skillValidation = validateAllSkills(skills, guidelines);
    const agentValidation = validateAllAgents(agents, guidelines);

    for (const [name, result] of skillValidation) {
      if (!result.valid) {
        return {
          success: false,
          skillsGenerated: 0,
          agentsGenerated: 0,
          error: `Skill validation failed for ${name}: ${result.errors.join(', ')}`
        };
      }
    }

    for (const [name, result] of agentValidation) {
      if (!result.valid) {
        return {
          success: false,
          skillsGenerated: 0,
          agentsGenerated: 0,
          error: `Agent validation failed for ${name}: ${result.errors.join(', ')}`
        };
      }
    }

    // Generate CLAUDE.md
    const projectName = path.basename(targetPath);
    const packageScripts = getPackageJsonScripts(targetPath);
    const claudeMd = generateClaudeMd(projectName, guidelines, skills, agents, packageScripts);

    // If update mode, do intelligent merge
    if (updateMode === 'update') {
      if (onProgress) onProgress('Reading existing artifacts...');
      const existing = readExistingArtifacts(targetPath);

      if (onProgress) onProgress('Intelligently merging artifacts...');

      // Merge skills
      const skillsToMerge = skills.map(s => ({
        fileName: s.fileName,
        existing: existing.skills.get(s.fileName) || null,
        generated: s.content,
        type: 'skill' as const
      }));

      // Merge agents
      const agentsToMerge = agents.map(a => ({
        fileName: a.fileName,
        existing: existing.agents.get(a.fileName) || null,
        generated: a.content,
        type: 'agent' as const
      }));

      // Merge CLAUDE.md
      const claudeMdToMerge = [{
        fileName: 'CLAUDE.md',
        existing: existing.claudeMd,
        generated: claudeMd.content,
        type: 'claude-md' as const
      }];

      const allFilesToMerge = [...skillsToMerge, ...agentsToMerge, ...claudeMdToMerge];

      const mergeResults = await batchIntelligentMerge(
        client,
        allFilesToMerge,
        (current, total, fileName) => {
          if (onProgress) {
            onProgress(`Merging ${current}/${total}: ${fileName}`);
          }
        }
      );

      // Build change summary
      const changesSummary: string[] = [];
      for (const [fileName, result] of mergeResults) {
        changesSummary.push(`\n${fileName}:`);
        changesSummary.push(formatChanges(result.changes));
      }

      // Show dry-run preview
      if (interactive) {
        const confirmed = await confirmChanges(
          changesSummary.join('\n'),
          mergeResults.size
        );

        if (!confirmed) {
          return {
            success: true,
            skillsGenerated: 0,
            agentsGenerated: 0,
            mode: 'cancelled'
          };
        }
      }

      // Extract merged content
      const mergedSkills = new Map<string, string>();
      const mergedAgents = new Map<string, string>();
      let mergedClaudeMd: string | null = null;

      for (const [fileName, result] of mergeResults) {
        if (fileName.startsWith('skills/') || skills.some(s => s.fileName === fileName)) {
          mergedSkills.set(fileName, result.mergedContent);
        } else if (fileName.startsWith('agents/') || agents.some(a => a.fileName === fileName)) {
          mergedAgents.set(fileName, result.mergedContent);
        } else if (fileName === 'CLAUDE.md') {
          mergedClaudeMd = result.mergedContent;
        }
      }

      // Write merged content
      if (onProgress) onProgress('Writing updated artifacts...');
      writeArtifacts(targetPath, skills, agents, claudeMd.content, {
        skills: mergedSkills,
        agents: mergedAgents,
        claudeMd: mergedClaudeMd
      });

      printSuccess(`\n✓ Claude artifacts updated: ${skills.length} skills, ${agents.length} agents`);

      return {
        success: true,
        skillsGenerated: skills.length,
        agentsGenerated: agents.length,
        mode: 'updated'
      };
    }

    // New or override mode
    if (onProgress) onProgress('Writing artifacts...');
    writeArtifacts(targetPath, skills, agents, claudeMd.content);

    printSuccess(`\n✓ Claude artifacts created: ${skills.length} skills, ${agents.length} agents`);

    return {
      success: true,
      skillsGenerated: skills.length,
      agentsGenerated: agents.length,
      mode: 'created'
    };
  } catch (error) {
    return {
      success: false,
      skillsGenerated: 0,
      agentsGenerated: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
