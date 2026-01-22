/**
 * Phase 1: Discovery
 * Detect tech stack and project structure
 */

import { join } from 'path';
import inquirer from 'inquirer';
import type { TechProfile, PhaseResult, AnalysisDepth } from '@/types';
import { createProviderClient } from '@/providers/manager';
import {
  getFolderStructure,
  readFileSafe,
  findPackageJsonFiles,
} from '../../utils/file-io';
import {
  createSpinner,
  printSuccess,
  printInfo,
  printSummary,
} from '@/utils/display';
import {
  DISCOVERY_SYSTEM_PROMPT,
  DISCOVERY_USER_PROMPT,
} from './prompts';

export async function runDiscoveryPhase(
  targetPath: string,
  depth: AnalysisDepth,
  debug: boolean = false
): Promise<PhaseResult<TechProfile>> {
  const spinner = createSpinner('Analyzing project structure...');
  spinner.start();

  try {
    // Get folder structure
    const structure = await getFolderStructure(targetPath);

    if (debug) {
      printInfo(`[DEBUG] Analyzing directory: ${targetPath}`);
      printInfo(`[DEBUG] Found ${structure.directories.length} directories`);
      printInfo(`[DEBUG] Key files: ${structure.keyFiles.length} (${structure.keyFiles.slice(0, 5).join(', ')}${structure.keyFiles.length > 5 ? '...' : ''})`);
      printInfo(`[DEBUG] Config files: ${structure.configFiles.length} (${structure.configFiles.slice(0, 3).join(', ')}${structure.configFiles.length > 3 ? '...' : ''})`);
    }

    spinner.text = 'Reading configuration files...';

    // Read config files
    const configContents: Array<{ path: string; content: string }> = [];
    for (const configFile of structure.configFiles) {
      const content = await readFileSafe(join(targetPath, configFile));
      if (content) {
        configContents.push({ path: configFile, content });
      }
    }

    // Create folder tree string
    const folderTree = createFolderTree(structure.directories);

    // Get current provider for dynamic messaging
    const { ProviderManager } = await import('@/providers/manager');
    const providerManager = ProviderManager.getInstance();
    const currentProvider = providerManager.getCurrentProvider();
    const providerName = currentProvider === 'anthropic' ? 'Claude' :
                        currentProvider === 'groq' ? 'Groq' : 'AI';

    spinner.text = `Analyzing tech stack with ${providerName}...`;

    // Use AI provider to analyze
    const client = await createProviderClient(depth);
    const techProfile = await client.completeWithJson<TechProfile>(
      DISCOVERY_SYSTEM_PROMPT,
      DISCOVERY_USER_PROMPT(folderTree, configContents)
    );

    // Ensure structure is populated
    techProfile.structure = {
      ...structure,
      root: targetPath,
    };

    spinner.stop();
    printSuccess('Discovery phase complete');

    // Print summary
    printSummary('Tech Stack Detected', {
      Languages: techProfile.stack.languages,
      Frameworks: techProfile.stack.frameworks,
      'Build Tools': techProfile.stack.buildTools,
      Testing: techProfile.stack.testingFrameworks,
      'Package Manager': techProfile.stack.packageManager,
      'Is Monorepo': techProfile.isMonorepo || false,
      Projects: techProfile.projects?.length || 0,
    });

    if (techProfile.projects && techProfile.projects.length > 0) {
      printInfo('Projects found:');
      techProfile.projects.forEach((p) => {
        printInfo(`  - ${p.name} (${p.type}) at ${p.path}`);
      });

      // Handle project exclusions
      const { ProviderManager } = await import('@/providers/manager');
      const providerManager = ProviderManager.getInstance();
      const exclusionsConfigured = providerManager.hasConfiguredExclusions();

      if (!exclusionsConfigured) {
        // First time - ask user to select exclusions
        const { selectedExclusions } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedExclusions',
            message: 'Select any projects to exclude from analysis (use space to select, enter to confirm):',
            choices: (techProfile.projects || []).map((p) => ({
              name: `${p.name} (${p.type}) at ${p.path}`,
              value: p.name,
              checked: false, // Default to including all
            })),
            pageSize: 10,
          },
        ]);

        // Always save the exclusions configuration, even if empty
        await providerManager.updateExcludedProjects(selectedExclusions);
        if (selectedExclusions.length > 0) {
          printSuccess(`Excluded ${selectedExclusions.length} project(s) from analysis`);
        } else {
          printInfo('No projects excluded - all projects will be analyzed');
        }
      } else {
        // Show existing exclusions
        const existingExclusions = providerManager.getExcludedProjects();
        if (existingExclusions.length > 0) {
          printInfo(`Using existing exclusions: ${existingExclusions.join(', ')}`);
        } else {
          printInfo('Using existing configuration (no projects excluded)');
        }
      }

      // Apply exclusions to tech profile
      const finalExclusions = providerManager.getExcludedProjects();
      if (techProfile.projects) {
        techProfile.projects = techProfile.projects.filter(p => !finalExclusions.includes(p.name));

        if (finalExclusions.length > 0) {
          printInfo(`Analyzing ${techProfile.projects.length} project(s) (excluded ${finalExclusions.length})`);
        }
      }
    }

    return {
      success: true,
      data: techProfile,
      humanReviewRequired: true,
      reviewPrompt:
        'Please review the detected tech stack. Is this accurate? (y/n)',
    };
  } catch (error) {
    spinner.stop();
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      humanReviewRequired: false,
    };
  }
}

function createFolderTree(directories: string[]): string {
  // Create a simple tree representation
  const tree: string[] = ['.'];

  // Sort and limit directories for readability, but prioritize project-like directories
  const projectPatterns = ['backend', 'frontend', 'mobile', 'web', 'api', 'server', 'client', 'app', 'apps', 'packages', 'services', 'tools'];
  const isProjectDir = (dir: string) => {
    const parts = dir.split('/');
    const lastPart = parts[parts.length - 1].toLowerCase();
    return projectPatterns.some(pattern => lastPart.includes(pattern));
  };

  // Separate project directories from regular ones
  const projectDirs = directories.filter(isProjectDir);
  const regularDirs = directories.filter(d => !isProjectDir(d) && d.split('/').length <= 4);

  // Combine with project dirs first, then regular dirs
  const sortedDirs = [...projectDirs, ...regularDirs]
    .sort()
    .slice(0, 100); // Increased limit for better coverage

  for (const dir of sortedDirs) {
    const depth = dir.split('/').length;
    const prefix = '  '.repeat(Math.min(depth, 4)); // Cap indentation
    const name = dir.split('/').pop() || dir;
    tree.push(`${prefix}├── ${name}/`);
  }

  return tree.join('\n');
}