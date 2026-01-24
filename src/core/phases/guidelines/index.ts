/**
 * Guidelines generation phase
 */

import type { IProviderClient } from '@/providers/types';
import type { PatternReport, PhaseResult, GeneratedGuideline, FolderStructure, TechProfile } from '@/types';
import { generateAllGuidelines } from './generator';
import { validateAllGuidelines, checkDuplicates, type ValidationResult } from './validator';
import { mergeAllGuidelines, type MergeResult } from './merger';

export interface GuidelinesPhaseResult {
  guidelines: GeneratedGuideline[];
  validationResults: Map<string, ValidationResult>;
  mergeResults: Map<string, MergeResult>;
}

/**
 * Run guidelines generation phase
 */
export async function runGuidelinesPhase(
  client: IProviderClient,
  targetPath: string,
  patterns: PatternReport,
  projectStructure: FolderStructure,
  techProfile: TechProfile,
  onProgress?: (message: string) => void
): Promise<PhaseResult<GuidelinesPhaseResult>> {
  try {
    if (onProgress) onProgress('Starting guidelines generation...');

    // Generate all guidelines with AI-selected code examples
    if (onProgress) onProgress('Generating guidelines from patterns...');
    const guidelines = await generateAllGuidelines(
      client,
      patterns,
      targetPath,
      projectStructure,
      techProfile,
      undefined,
      (current, total, name) => {
        if (onProgress) {
          onProgress(`Generating guideline ${current}/${total}: ${name}`);
        }
      }
    );

    // Validate generated guidelines
    if (onProgress) onProgress('Validating generated guidelines...');
    const validation = validateAllGuidelines(guidelines);

    if (!validation.valid) {
      const errors: string[] = [];
      for (const [key, result] of validation.results) {
        if (!result.valid) {
          errors.push(`${key}: ${result.errors.join(', ')}`);
        }
      }
      return {
        success: false,
        error: `Validation failed:\n${errors.join('\n')}`,
        humanReviewRequired: false
      };
    }

    // Check for duplicates
    const duplicates = checkDuplicates(guidelines);
    if (duplicates.length > 0) {
      return {
        success: false,
        error: `Duplicate guidelines detected: ${duplicates.join(', ')}`,
        humanReviewRequired: false
      };
    }

    // Merge with existing files
    if (onProgress) onProgress('Merging with existing guidelines...');
    const mergeResults = mergeAllGuidelines(targetPath, guidelines);

    // Count actions
    let created = 0;
    let updated = 0;
    let conflicts = 0;
    for (const result of mergeResults.values()) {
      if (result.action === 'created') created++;
      if (result.action === 'updated') updated++;
      if (result.conflicts) conflicts += result.conflicts.length;
    }

    if (onProgress) {
      onProgress(`Guidelines phase complete: ${created} created, ${updated} updated, ${conflicts} conflicts`);
    }

    return {
      success: true,
      data: {
        guidelines,
        validationResults: validation.results,
        mergeResults
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
