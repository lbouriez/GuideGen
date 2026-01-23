/**
 * Indexes generation phase
 */

import type { IProviderClient } from '@/providers/types';
import type { TechProfile, PhaseResult, GeneratedGuideline } from '@/types';
import { generateAllIndexes, type GeneratedIndex } from './generator';
import { mergeAllIndexes, type IndexMergeResult } from './merger';
import { validateAllIndexes, type CrossRefResult } from './cross-ref';

export interface IndexesPhaseResult {
  indexes: GeneratedIndex[];
  mergeResults: Map<string, IndexMergeResult>;
  validationResults: Map<string, CrossRefResult>;
}

/**
 * Run indexes generation phase
 */
export async function runIndexesPhase(
  client: IProviderClient,
  targetPath: string,
  projectName: string,
  techProfile: TechProfile,
  guidelines: GeneratedGuideline[],
  onProgress?: (message: string) => void
): Promise<PhaseResult<IndexesPhaseResult>> {
  try {
    if (onProgress) onProgress('Starting index generation...');

    // Generate all indexes
    if (onProgress) onProgress('Generating domain and root indexes...');
    const indexes = await generateAllIndexes(
      client,
      projectName,
      techProfile,
      guidelines,
      targetPath,
      undefined,
      (current, total, name) => {
        if (onProgress) {
          onProgress(`Generating index ${current}/${total}: ${name}`);
        }
      }
    );

    // Validate cross-references
    if (onProgress) onProgress('Validating cross-references...');
    const validation = validateAllIndexes(targetPath, indexes, guidelines);

    // Check for validation errors
    let hasErrors = false;
    const errors: string[] = [];

    for (const [key, result] of validation) {
      if (!result.valid) {
        hasErrors = true;
        if (result.brokenLinks.length > 0) {
          errors.push(`${key} has broken links: ${result.brokenLinks.join(', ')}`);
        }
        if (result.missingGuidelines.length > 0) {
          errors.push(`${key} missing references: ${result.missingGuidelines.join(', ')}`);
        }
      }
    }

    if (hasErrors) {
      // Warning but not fatal - indexes can still be generated
      if (onProgress) {
        onProgress(`⚠ Warning: Some validation issues found:\n${errors.join('\n')}`);
      }
    }

    // Merge with existing files
    if (onProgress) onProgress('Merging with existing indexes...');
    const mergeResults = mergeAllIndexes(targetPath, indexes);

    // Count actions
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const result of mergeResults.values()) {
      if (result.action === 'created') created++;
      if (result.action === 'updated') updated++;
      if (result.action === 'skipped') skipped++;
    }

    if (onProgress) {
      onProgress(`Indexes phase complete: ${created} created, ${updated} updated, ${skipped} skipped`);
    }

    return {
      success: true,
      data: {
        indexes,
        mergeResults,
        validationResults: validation
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
