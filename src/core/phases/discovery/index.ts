/**
 * Phase 1: Discovery
 * Detect tech stack and project structure
 */

import { join } from 'path';
import type { TechProfile, PhaseResult, AnalysisDepth } from '@/types';
import type { ILogger } from '../../../interfaces/services/ILogger';
import { createProviderClient, ProviderManager } from '@/providers/manager';
import { readFileSafe } from '../../utils/file-io';
import { getFolderStructure, createFolderTree } from '../../utils/structure';
import { analyzeTechStack } from './analyzer';
import {
  createSpinner,
  printSuccess,
  printInfo,
  printSummary,
} from '@/utils/display';

/**
 * Discover project tech stack and structure using AI-powered analysis
 *
 * This phase analyzes the project directory structure and configuration files
 * to identify the tech stack, frameworks, build tools, and project organization.
 * For monorepo projects, it also detects sub-projects and their relationships.
 *
 * The discovery process:
 * 1. Scans directory structure to identify project layout
 * 2. Reads essential configuration files (package.json, tsconfig.json, etc.)
 * 3. Uses AI to analyze configs and identify tech stack components
 * 4. For monorepos, detects sub-projects and allows exclusion selection
 * 5. Returns comprehensive tech profile with structure and dependencies
 *
 * @param targetPath - Absolute path to the project root directory to analyze
 * @param depth - Analysis depth controlling AI model selection and detail level
 *                'quick' - Fast analysis with smaller models, less detail
 *                'standard' - Balanced approach (recommended for most projects)
 *                'thorough' - Comprehensive analysis with larger models, maximum detail
 * @param debug - If true, outputs detailed debug information during discovery
 *
 * @returns Promise resolving to PhaseResult containing the discovered TechProfile
 *          with project structure, tech stack details, and monorepo configuration
 *
 * @throws {PathTraversalError} If targetPath attempts directory traversal
 * @throws {Error} If project directory cannot be read or analyzed
 *
 * @example
 * ```typescript
 * // Discover tech stack for a project
 * const result = await runDiscoveryPhase(
 *   '/path/to/project',
 *   'standard',
 *   false  // no debug output
 * );
 *
 * if (result.success && result.data) {
 *   console.log('Languages:', result.data.stack.languages);
 *   console.log('Frameworks:', result.data.stack.frameworks);
 *   console.log('Is monorepo:', result.data.isMonorepo);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Thorough discovery with debug output
 * const result = await runDiscoveryPhase(
 *   process.cwd(),
 *   'thorough',
 *   true  // enable debug output
 * );
 * ```
 */
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
      printInfo(`[DEBUG] Analyzing directory: ${targetPath}`);
      printInfo(`[DEBUG] Found ${structure.directories.length} directories`);
      printInfo(`[DEBUG] Key files: ${structure.keyFiles.length}`);
      printInfo(`[DEBUG] Config files: ${structure.configFiles.length}`);
    }

    spinner.text = 'Reading configuration files...';

    // Read essential config files only
    const configContents: Array<{ path: string; content: string }> = [];
    const essentialConfigs = structure.configFiles.slice(0, 10); // Limit to first 10

    for (const configFile of essentialConfigs) {
      const content = await readFileSafe(join(targetPath, configFile));
      if (content) {
        configContents.push({ path: configFile, content });
      }
    }

    // Create folder tree
    const folderTree = createFolderTree(structure.directories);

    // Get provider name for display
    const currentProvider = providerManager.getCurrentProvider();
    const providerName = currentProvider === 'anthropic' ? 'Claude' :
                        currentProvider === 'groq' ? 'Groq' : 'AI';

    spinner.text = `Analyzing tech stack with ${providerName}...`;

    // Use AI provider to analyze
    const client = await createProviderClient(depth);
    const techProfile = await analyzeTechStack(client, folderTree, configContents);

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
    }

    return {
      success: true,
      data: techProfile,
      humanReviewRequired: true,
      reviewPrompt: 'Does this tech stack look correct?',
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

// Re-export for compatibility
export { runDiscoveryPhase as default };
