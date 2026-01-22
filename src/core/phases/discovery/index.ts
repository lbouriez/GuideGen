/**
 * Phase 1: Discovery
 * Detect tech stack and project structure
 */

import { join } from 'path';
import type { TechProfile, PhaseResult, AnalysisDepth } from '@/types';
import { createProviderClient } from '@/providers/manager';
import { readFileSafe } from '../../utils/file-io';
import { getFolderStructure, createFolderTree } from '../../utils/structure';
import { analyzeTechStack } from './analyzer';
import {
  createSpinner,
  printSuccess,
  printInfo,
  printSummary,
} from '@/utils/display';

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
    const { ProviderManager } = await import('../../../providers/manager');
    const providerManager = ProviderManager.getInstance();
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
