/**
 * Phase 2: Analysis
 * Detect code patterns
 */

import { join } from 'path';
import { glob } from 'glob';
import type { TechProfile, PatternReport, PhaseResult, AnalysisDepth } from '@/types';
import { createProviderClient } from '@/providers/manager';
import { readFileSafe } from '../../utils/file-io';
import { detectPatterns } from './pattern-detector';
import {
  createSpinner,
  printSuccess,
  printInfo,
  printSummary,
} from '@/utils/display';
import { getFileLimits, IGNORE_PATTERNS } from '@/config';

/**
 * Analyze codebase patterns and conventions using AI-powered code analysis
 *
 * This phase samples representative files from the project and uses AI to detect
 * coding patterns, naming conventions, architectural patterns, and other conventions
 * that should be documented in guidelines. The analysis is intelligent and selective,
 * focusing on the most relevant files based on project structure.
 *
 * The analysis process:
 * 1. Intelligently selects representative files based on project type and structure
 * 2. Reads and samples code from each project (in monorepo scenarios)
 * 3. Uses AI to identify patterns: imports, naming, architecture, state management
 * 4. Categorizes patterns by frequency (common, occasional, rare)
 * 5. Returns comprehensive pattern report for guideline generation
 *
 * @param targetPath - Absolute path to the project root directory
 * @param techProfile - Tech profile from discovery phase containing project structure
 * @param depth - Analysis depth controlling sample size and AI model selection
 *                'quick' - Samples fewer files, faster analysis
 *                'standard' - Balanced sampling (recommended)
 *                'thorough' - Comprehensive sampling, maximum pattern detection
 * @param debug - If true, outputs detailed debug information about file sampling
 *
 * @returns Promise resolving to PhaseResult containing the PatternReport with
 *          detected patterns categorized by type and frequency
 *
 * @throws {Error} If files cannot be read or AI analysis fails
 *
 * @example
 * ```typescript
 * // Analyze patterns after discovery
 * const discoveryResult = await runDiscoveryPhase('/path/to/project', 'standard');
 *
 * if (discoveryResult.success && discoveryResult.data) {
 *   const analysisResult = await runAnalysisPhase(
 *     '/path/to/project',
 *     discoveryResult.data,
 *     'standard',
 *     false  // no debug output
 *   );
 *
 *   if (analysisResult.success && analysisResult.data) {
 *     console.log('Import patterns:', analysisResult.data.importPatterns);
 *     console.log('Naming conventions:', analysisResult.data.namingConventions);
 *     console.log('Architecture patterns:', analysisResult.data.architecturePatterns);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Thorough analysis with debug output
 * const result = await runAnalysisPhase(
 *   process.cwd(),
 *   techProfile,
 *   'thorough',
 *   true  // enable debug to see file sampling details
 * );
 * ```
 */
export async function runAnalysisPhase(
  targetPath: string,
  techProfile: TechProfile,
  depth: AnalysisDepth,
  debug: boolean = false
): Promise<PhaseResult<PatternReport>> {
  const spinner = createSpinner('Analyzing code patterns...');
  spinner.start();

  try {
    const client = await createProviderClient(depth);

    // Sample files from each project
    const sampleFiles: Array<{ path: string; content: string }> = [];
    const limits = getFileLimits(depth);
    const maxFilesPerProject = limits.maxFilesPerProject;

    for (const project of techProfile.projects!) {
      spinner.text = `Sampling files from ${project.name}...`;

      // Get file patterns based on project type
      const patterns = getFilePatterns(project.type);
      
      for (const pattern of patterns) {
        const files = await glob(pattern, {
          cwd: join(targetPath, project.path),
          ignore: IGNORE_PATTERNS.map(p => `**/${p}/**`),
        });

        // Sample files
        const sampled = files.slice(0, Math.ceil(maxFilesPerProject / patterns.length));
        
        for (const file of sampled) {
          const fullPath = join(targetPath, project.path, file);
          const content = await readFileSafe(fullPath);
          if (content && content.length < 10000) { // Skip very large files
            sampleFiles.push({
              path: join(project.path, file),
              content: content.slice(0, 5000), // Truncate to 5000 chars
            });
          }
        }
      }
    }

    if (debug) {
      printInfo(`[DEBUG] Sampled ${sampleFiles.length} files`);
    }

    spinner.text = 'Detecting patterns...';

    // Detect patterns
    const patternReport = await detectPatterns(client, techProfile, sampleFiles, depth);

    spinner.stop();
    printSuccess('Analysis phase complete');

    // Print summary
    const patternCount = Object.values(patternReport).flat().length;
    printSummary('Patterns Detected', {
      'Total Patterns': patternCount,
      'Import Patterns': patternReport.importPatterns?.length || 0,
      'Naming Conventions': patternReport.namingConventions?.length || 0,
      'Architecture Patterns': patternReport.architecturePatterns?.length || 0,
    });

    return {
      success: true,
      data: patternReport,
      humanReviewRequired: true,
      reviewPrompt: 'Do these patterns look correct?',
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

function getFilePatterns(projectType: string): string[] {
  const basePatterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
  
  switch (projectType) {
    case 'backend':
      return ['**/*.ts', '**/routes/**/*.ts', '**/services/**/*.ts', '**/repositories/**/*.ts'];
    case 'frontend':
      return ['**/*.tsx', '**/components/**/*.tsx', '**/screens/**/*.tsx', '**/hooks/**/*.ts'];
    case 'mobile':
      return ['**/*.tsx', '**/components/**/*.tsx', '**/screens/**/*.tsx'];
    default:
      return basePatterns;
  }
}

export { runAnalysisPhase as default };
