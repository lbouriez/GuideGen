/**
 * Phase 2: Analysis
 * Extract code patterns and conventions using AI-powered file selection
 */

import { join } from 'path';
import type {
  TechProfile,
  PatternReport,
  PhaseResult,
  AnalysisDepth,
} from '@/types';
import type { IProviderClient } from '@/providers/types';
import { createProviderClient } from '@/providers/manager';
import {
  createSpinner,
  printSuccess,
  printSection,
  printList,
  printInfo,
} from '@/utils/display';
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_USER_PROMPT,
} from './prompts';
import type { IToolRegistry, SelectedFiles, FileSelectionCriteria, ConcatenatedFiles } from '../../utils';
import { container } from '@/di/container';
import { TYPES } from '@/di/identifiers';

/**
 * Select files for analysis using AI-powered selection
 */
async function selectFilesForAnalysis(
  toolRegistry: IToolRegistry,
  client: IProviderClient,
  techProfile: TechProfile,
  depth: AnalysisDepth,
  debug: boolean
): Promise<SelectedFiles> {
  const fileSelectionCriteria: FileSelectionCriteria = {
    projectStructure: techProfile.structure!,
    techProfile,
    depth,
  };

  const result = await toolRegistry.executeTool<FileSelectionCriteria, SelectedFiles>(
    'file_selection',
    fileSelectionCriteria,
    client
  );

  if (!result.success || !result.data) {
    throw new Error(`File selection failed: ${result.error}`);
  }

  if (debug) {
    printDebugFileSelection(result.data);
  }

  return result.data;
}

/**
 * Print debug information about file selection
 */
function printDebugFileSelection(selectedFiles: SelectedFiles): void {
  printInfo(`[DEBUG] AI selected ${selectedFiles.files.length} files for analysis:`);
  selectedFiles.files.forEach(file => {
    const priority = typeof file.priority === 'string' ? file.priority.toUpperCase() : 'UNKNOWN';
    printInfo(`[DEBUG]   ${priority}: ${file.path} - ${file.reason}`);
  });
  printInfo(`[DEBUG] Estimated total tokens: ${selectedFiles.totalEstimatedTokens}`);
}

/**
 * Read and concatenate selected files
 */
async function readSelectedFiles(
  toolRegistry: IToolRegistry,
  client: IProviderClient,
  targetPath: string,
  selectedFiles: SelectedFiles,
  debug: boolean
): Promise<ConcatenatedFiles> {
  const filePaths = selectedFiles.files.map(f => join(targetPath, f.path));

  const result = await toolRegistry.executeTool<string[], ConcatenatedFiles>(
    'file_reading',
    filePaths,
    client
  );

  if (!result.success || !result.data) {
    throw new Error(`File reading failed: ${result.error}`);
  }

  if (debug) {
    printInfo(`[DEBUG] Successfully read ${result.data.fileCount} files`);
    printInfo(`[DEBUG] Total content size: ${result.data.totalSize} characters`);
  }

  return result.data;
}

/**
 * Analyze patterns using AI
 */
async function analyzePatterns(
  client: IProviderClient,
  techProfile: TechProfile,
  fileContent: string
): Promise<PatternReport> {
  const projectType = determineProjectType(techProfile);

  return client.completeWithJson<PatternReport>(
    ANALYSIS_SYSTEM_PROMPT,
    ANALYSIS_USER_PROMPT(JSON.stringify(techProfile, null, 2), fileContent, projectType)
  );
}

export async function runAnalysisPhase(
  targetPath: string,
  techProfile: TechProfile,
  depth: AnalysisDepth,
  debug: boolean = false
): Promise<PhaseResult<PatternReport>> {
  const spinner = createSpinner('Analyzing codebase with AI assistance...');
  spinner.start();

  try {
    const client = await createProviderClient(depth);
    const toolRegistry = container.get<IToolRegistry>(TYPES.IToolRegistry);

    // Step 1: Select files for analysis
    spinner.text = 'Selecting most relevant files for analysis...';
    const selectedFiles = await selectFilesForAnalysis(
      toolRegistry, client, techProfile, depth, debug
    );

    // Step 2: Read selected files
    spinner.text = `Reading ${selectedFiles.files.length} selected files...`;
    const concatenatedFiles = await readSelectedFiles(
      toolRegistry, client, targetPath, selectedFiles, debug
    );

    // Step 3: Analyze patterns
    spinner.text = 'Analyzing code patterns and architecture...';
    const patternReport = await analyzePatterns(client, techProfile, concatenatedFiles.content);

    spinner.stop();
    printSuccess('Analysis phase complete');
    printPatternSummary(patternReport);

    return {
      success: true,
      data: patternReport,
      humanReviewRequired: true,
      reviewPrompt: 'Please review the detected patterns. Do these look accurate? (y/n)',
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

function determineProjectType(techProfile: TechProfile): string {
  const { stack, structure } = techProfile;

  // Check for CLI indicators
  if (stack.frameworks.length === 0 && stack.buildTools.includes('pkg')) {
    return 'CLI';
  }

  // Check for command-line interface patterns
  const hasCommandFiles = (structure?.keyFiles || []).some(file =>
    file.includes('cli') || file.includes('command') || file.includes('bin')
  );
  if (hasCommandFiles && stack.frameworks.length === 0) {
    return 'CLI';
  }

  // Check for web app indicators
  const webFrameworks = ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt'];
  const hasWebFramework = stack.frameworks.some(fw =>
    webFrameworks.some(webFw => fw.toLowerCase().includes(webFw))
  );
  if (hasWebFramework) {
    return 'Web App';
  }

  // Check for backend/API indicators
  const backendFrameworks = ['express', 'fastify', 'koa', 'nestjs', 'spring'];
  const hasBackendFramework = stack.frameworks.some(fw =>
    backendFrameworks.some(beFw => fw.toLowerCase().includes(beFw))
  );
  if (hasBackendFramework) {
    return 'Backend API';
  }

  // Check for mobile indicators
  const mobileIndicators = ['react-native', 'expo', 'cordova', 'capacitor'];
  const hasMobile = stack.frameworks.some(fw =>
    mobileIndicators.some(mobile => fw.toLowerCase().includes(mobile))
  );
  if (hasMobile) {
    return 'Mobile App';
  }

  // Default fallback
  return 'Fullstack';
}

function printPatternSummary(report: PatternReport): void {
  if (report.importPatterns && report.importPatterns.length > 0) {
    printSection('Import Patterns');
    printList(
      report.importPatterns.map((p) => `${p.name} (${p.frequency})`)
    );
  }

  if (report.namingConventions && report.namingConventions.length > 0) {
    printSection('Naming Conventions');
    printList(
      report.namingConventions.map((p) => `${p.name} (${p.frequency})`)
    );
  }

  if (report.architecturePatterns && report.architecturePatterns.length > 0) {
    printSection('Architecture Patterns');
    printList(
      report.architecturePatterns.map((p) => `${p.name} (${p.frequency})`)
    );
  }

  if (report.stateManagement && report.stateManagement.length > 0) {
    printSection('State Management');
    printList(
      report.stateManagement.map((p) => `${p.name} (${p.frequency})`)
    );
  }

  if (report.errorHandling && report.errorHandling.length > 0) {
    printSection('Error Handling');
    printList(
      report.errorHandling.map((p) => `${p.name} (${p.frequency})`)
    );
  }

  if (report.loggingPatterns && report.loggingPatterns.length > 0) {
    printSection('Logging Patterns');
    printList(
      report.loggingPatterns.map((p) => `${p.name} (${p.frequency})`)
    );
  }
}