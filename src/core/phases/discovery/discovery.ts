/**
 * Phase 1: Discovery
 * Detect tech stack and project structure
 */

import { join } from 'path';
import inquirer from 'inquirer';
import type { TechProfile, PhaseResult, AnalysisDepth, FolderStructure } from '@/types';
import type { ILogger } from '../../../interfaces/services/ILogger';
import { createProviderClient, ProviderManager } from '@/providers/manager';
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

/**
 * Read and parse configuration files from the project
 */
async function readConfigFiles(
  targetPath: string,
  configFiles: string[]
): Promise<Array<{ path: string; content: string }>> {
  const configContents: Array<{ path: string; content: string }> = [];
  for (const configFile of configFiles) {
    const content = await readFileSafe(join(targetPath, configFile));
    if (content) {
      configContents.push({ path: configFile, content });
    }
  }
  return configContents;
}

/**
 * Detect test-related patterns in the codebase
 * This helps the AI identify testing frameworks without hardcoding specific tools
 */
function detectTestPatterns(
  structure: FolderStructure,
  configContents: Array<{ path: string; content: string }>
): {
  testFolders: string[];
  testFiles: string[];
  testScripts: Record<string, string>;
  testDependencies: string[];
} {
  const testFolders: string[] = [];
  const testFiles: string[] = [];
  const testScripts: Record<string, string> = {};
  const testDependencies: string[] = [];

  // Detect test folders using common patterns
  // Normalize paths to use forward slashes for cross-platform compatibility
  const testFolderPatterns = [
    /^tests?\//,           // tests/ or test/
    /__tests__\//,         // __tests__/
    /\/tests?\//,          // any/path/tests/
    /\/__tests__\//,       // any/path/__tests__/
    /\.test\//,            // .test/
    /e2e\//,               // e2e/
    /integration\//,       // integration/
    /^tests?$/,            // tests or test (root level)
    /^__tests__$/,         // __tests__ (root level)
  ];

  for (const dir of structure.directories) {
    const normalizedDir = dir.replace(/\\/g, '/');
    if (testFolderPatterns.some(pattern => pattern.test(normalizedDir))) {
      testFolders.push(dir);
    }
  }

  // Detect test files using common patterns
  const testFilePatterns = [
    /\.test\.(ts|js|tsx|jsx)$/,
    /\.spec\.(ts|js|tsx|jsx)$/,
    /_test\.(ts|js|tsx|jsx)$/,
    /\.e2e\.(ts|js|tsx|jsx)$/,
  ];

  const allFiles = [...structure.keyFiles, ...structure.configFiles];
  for (const file of allFiles) {
    const normalizedFile = file.replace(/\\/g, '/');
    if (testFilePatterns.some(pattern => pattern.test(normalizedFile))) {
      testFiles.push(file);
    }
  }

  // Extract test-related scripts and dependencies from package.json
  const packageJson = configContents.find(f => f.path === 'package.json');
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content);

      // Extract test-related scripts
      if (pkg.scripts) {
        for (const [key, value] of Object.entries(pkg.scripts)) {
          if (key.includes('test') || key.includes('spec') ||
              key.includes('coverage') || key.includes('e2e')) {
            testScripts[key] = value as string;
          }
        }
      }

      // Extract test-related dependencies (both dev and regular)
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      };

      // Common testing framework patterns
      const testDepPatterns = [
        /vitest/i,
        /jest/i,
        /mocha/i,
        /jasmine/i,
        /karma/i,
        /playwright/i,
        /cypress/i,
        /puppeteer/i,
        /@testing-library/i,
        /test/i,
        /spec/i,
        /chai/i,
        /sinon/i,
        /ava/i,
      ];

      for (const [dep, version] of Object.entries(allDeps)) {
        if (testDepPatterns.some(pattern => pattern.test(dep))) {
          testDependencies.push(`${dep}@${version}`);
        }
      }
    } catch (error) {
      // Ignore JSON parse errors
    }
  }

  return {
    testFolders,
    testFiles: testFiles.slice(0, 10), // Limit to first 10 to avoid clutter
    testScripts,
    testDependencies
  };
}

/**
 * Get the display name for the current AI provider
 */
function getProviderDisplayName(providerManager: ProviderManager): string {
  const currentProvider = providerManager.getCurrentProvider();
  return currentProvider === 'anthropic' ? 'Claude' :
         currentProvider === 'groq' ? 'Groq' : 'AI';
}

/**
 * Analyze project with AI to get tech profile
 */
async function analyzeWithAI(
  depth: AnalysisDepth,
  folderTree: string,
  configContents: Array<{ path: string; content: string }>,
  structure: FolderStructure
): Promise<TechProfile> {
  const client = await createProviderClient(depth);

  // Detect test patterns to highlight in the prompt
  const testPatterns = detectTestPatterns(structure, configContents);

  return client.completeWithJson<TechProfile>(
    DISCOVERY_SYSTEM_PROMPT,
    DISCOVERY_USER_PROMPT(folderTree, configContents, testPatterns)
  );
}

/**
 * Print discovery summary
 */
function printDiscoverySummary(techProfile: TechProfile): void {
  printSummary('Tech Stack Detected', {
    Languages: techProfile.stack.languages,
    Frameworks: techProfile.stack.frameworks,
    'Build Tools': techProfile.stack.buildTools,
    Testing: techProfile.stack.testingFrameworks,
    'Package Manager': techProfile.stack.packageManager,
    'Is Monorepo': techProfile.isMonorepo || false,
    Projects: techProfile.projects?.length || 0,
  });
}

/**
 * Handle project exclusions for monorepos
 */
async function handleProjectExclusions(techProfile: TechProfile, providerManager: ProviderManager): Promise<void> {
  if (!techProfile.projects || techProfile.projects.length === 0) {
    return;
  }

  printInfo('Projects found:');
  techProfile.projects.forEach((p) => {
    printInfo(`  - ${p.name} (${p.type}) at ${p.path}`);
  });

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
          checked: false,
        })),
        pageSize: 10,
      },
    ]);

    await providerManager.updateExcludedProjects(selectedExclusions);
    if (selectedExclusions.length > 0) {
      printSuccess(`Excluded ${selectedExclusions.length} project(s) from analysis`);
    } else {
      printInfo('No projects excluded - all projects will be analyzed');
    }
  } else {
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

export async function runDiscoveryPhase(
  targetPath: string,
  depth: AnalysisDepth,
  providerManager: ProviderManager,
  logger: ILogger,
  debug: boolean = false
): Promise<PhaseResult<TechProfile>> {
  const spinner = createSpinner('Analyzing project structure...');
  spinner.start();

  try {
    // Get folder structure
    const structure = await getFolderStructure(targetPath);

    if (debug) {
      printDebugInfo(targetPath, structure);
    }

    spinner.text = 'Reading configuration files...';

    // Read config files
    const configContents = await readConfigFiles(targetPath, structure.configFiles);

    // Create folder tree string
    const folderTree = createFolderTree(structure.directories);

    // Get provider name for display
    const providerName = getProviderDisplayName(providerManager);
    spinner.text = `Analyzing tech stack with ${providerName}...`;

    // Use AI provider to analyze
    const techProfile = await analyzeWithAI(depth, folderTree, configContents, structure);

    // Ensure structure is populated
    techProfile.structure = {
      ...structure,
      root: targetPath,
    };

    spinner.stop();
    printSuccess('Discovery phase complete');

    // Print summary and handle exclusions
    printDiscoverySummary(techProfile);
    await handleProjectExclusions(techProfile, providerManager);

    return {
      success: true,
      data: techProfile,
      humanReviewRequired: true,
      reviewPrompt: 'Please review the detected tech stack. Is this accurate? (y/n)',
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

/**
 * Print debug information about the structure
 */
function printDebugInfo(targetPath: string, structure: FolderStructure): void {
  printInfo(`[DEBUG] Analyzing directory: ${targetPath}`);
  printInfo(`[DEBUG] Found ${structure.directories.length} directories`);
  printInfo(`[DEBUG] Key files: ${structure.keyFiles.length} (${structure.keyFiles.slice(0, 5).join(', ')}${structure.keyFiles.length > 5 ? '...' : ''})`);
  printInfo(`[DEBUG] Config files: ${structure.configFiles.length} (${structure.configFiles.slice(0, 3).join(', ')}${structure.configFiles.length > 3 ? '...' : ''})`);
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