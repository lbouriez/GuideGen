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
