/**
 * Index generation logic
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { IProviderClient } from '@/providers/types';
import type { ILogger } from '../../../interfaces/services/ILogger';
import type { GeneratedGuideline, TechProfile } from '@/types';
import { INDEX_SYSTEM_PROMPT, DOMAIN_INDEX_USER_PROMPT, ROOT_INDEX_USER_PROMPT } from './prompts';
import { generateProjectTree } from '../../utils/file-io';
import { PackageJsonSchema, parseWithSchema } from '@/types';

export interface GeneratedIndex {
  type: 'root' | 'domain';
  domain?: string;
  fileName: string;
  content: string;
}

/**
 * Extract critical rules from guidelines for quick reference
 */
function extractCriticalRules(guidelines: GeneratedGuideline[]): string[] {
  const rules: string[] = [];

  for (const guideline of guidelines) {
    // Look for DO/NEVER patterns in content
    const doMatches = guideline.content.match(/- ✅.*$/gm);
    const neverMatches = guideline.content.match(/- ❌.*$/gm);

    if (doMatches) rules.push(...doMatches.slice(0, 2)); // Top 2 DO rules
    if (neverMatches) rules.push(...neverMatches.slice(0, 2)); // Top 2 NEVER rules
  }

  // Return top 10 most important rules
  return rules.slice(0, 10);
}

/**
 * Generate domain index
 */
export async function generateDomainIndex(
  client: IProviderClient,
  domain: string,
  guidelines: GeneratedGuideline[],
  allDomains: string[]
): Promise<GeneratedIndex> {
  const domainGuidelines = guidelines.filter(g => g.domain === domain);

  // Prepare guideline list
  const guidelineList = domainGuidelines.map(g => ({
    fileName: g.fileName,
    type: g.type
  }));

  // Extract critical rules for this domain
  const criticalRules = extractCriticalRules(domainGuidelines);

  // Generate index with list of existing domains
  const response = await client.sendMessage(
    INDEX_SYSTEM_PROMPT,
    DOMAIN_INDEX_USER_PROMPT(domain, guidelineList, criticalRules, allDomains)
  );

  return {
    type: 'domain',
    domain,
    fileName: `${domain}-index.md`,
    content: response.content
  };
}

/**
 * Read package.json to extract project info and commands
 */
async function getProjectInfo(targetPath: string, logger?: ILogger): Promise<{
  description?: string;
  scripts?: Record<string, string>;
  hasReadme: boolean;
  projectTree: string;
}> {
  try {
    // Generate project tree structure
    const projectTree = await generateProjectTree(targetPath, 3, 10);

    const packageJsonPath = join(targetPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      const result = parseWithSchema(PackageJsonSchema, readFileSync(packageJsonPath, 'utf-8'));
      const hasReadme = existsSync(join(targetPath, 'README.md'));

      if (result.success) {
        return {
          description: result.data.description,
          scripts: result.data.scripts || {},
          hasReadme,
          projectTree
        };
      } else {
        // If parsing fails, return minimal info
        if (logger) {
          logger.warn(`Failed to parse package.json at ${packageJsonPath}`, result.error);
        }
        return { hasReadme, projectTree };
      }
    }

    // Check for README even without package.json
    const hasReadme = existsSync(join(targetPath, 'README.md'));
    return { hasReadme, projectTree };
  } catch (error) {
    // If tree generation fails, return a fallback message
    const hasReadme = existsSync(join(targetPath, 'README.md'));
    return {
      hasReadme,
      projectTree: '(Project tree could not be generated)'
    };
  }
}

/**
 * Generate root index
 */
export async function generateRootIndex(
  client: IProviderClient,
  projectName: string,
  techProfile: TechProfile,
  guidelines: GeneratedGuideline[],
  targetPath: string,
  logger?: ILogger
): Promise<GeneratedIndex> {
  // Group guidelines by domain
  const domainMap = new Map<string, number>();
  for (const guideline of guidelines) {
    domainMap.set(guideline.domain, (domainMap.get(guideline.domain) || 0) + 1);
  }

  const domains = Array.from(domainMap.entries()).map(([name, count]) => ({
    name,
    guidelineCount: count
  }));

  // Build tech stack summary
  const techStack = [
    techProfile.languages?.join(', '),
    techProfile.frameworks?.join(', '),
    techProfile.tools?.join(', ')
  ].filter(Boolean).join(' | ');

  // Extract critical rules
  const criticalRules = extractCriticalRules(guidelines);

  // Get project info (description, scripts, README, project tree)
  const projectInfo = await getProjectInfo(targetPath, logger);

  // Build guidelines map by domain
  const guidelinesByDomain = new Map<string, Array<{ type: string; fileName: string }>>();
  for (const guideline of guidelines) {
    if (!guidelinesByDomain.has(guideline.domain)) {
      guidelinesByDomain.set(guideline.domain, []);
    }
    guidelinesByDomain.get(guideline.domain)!.push({
      type: guideline.type,
      fileName: guideline.fileName
    });
  }

  // Build domain index filename map
  const domainIndexes = new Map<string, string>();
  for (const domain of domains.map(d => d.name)) {
    domainIndexes.set(domain, `${domain}-index.md`);
  }

  // Generate root index
  const response = await client.sendMessage(
    INDEX_SYSTEM_PROMPT,
    ROOT_INDEX_USER_PROMPT(projectName, domains, techStack, criticalRules, projectInfo, guidelinesByDomain, domainIndexes)
  );

  return {
    type: 'root',
    fileName: 'index.md',
    content: response.content
  };
}

/**
 * Generate all indexes
 */
export async function generateAllIndexes(
  client: IProviderClient,
  projectName: string,
  techProfile: TechProfile,
  guidelines: GeneratedGuideline[],
  targetPath: string,
  logger?: ILogger,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<GeneratedIndex[]> {
  const indexes: GeneratedIndex[] = [];

  // Get unique domains
  const domains = Array.from(new Set(guidelines.map(g => g.domain)));

  const totalSteps = domains.length + 1; // domain indexes + root index
  let currentStep = 0;

  // Generate domain indexes
  for (const domain of domains) {
    currentStep++;
    if (onProgress) {
      onProgress(currentStep, totalSteps, `${domain} index`);
    }

    const index = await generateDomainIndex(client, domain, guidelines, domains);
    indexes.push(index);
  }

  // Generate root index
  currentStep++;
  if (onProgress) {
    onProgress(currentStep, totalSteps, 'root index');
  }

  const rootIndex = await generateRootIndex(client, projectName, techProfile, guidelines, targetPath, logger);
  indexes.push(rootIndex);

  return indexes;
}
