/**
 * Guidelines Workflow - Refactored
 * Orchestrates guideline generation with intelligent update mode
 */

import * as path from 'path';
import type { IProviderClient } from '../../providers/types';
import type { TechProfile, PatternReport, GeneratedGuideline } from '../../types';
import { generateAllGuidelines } from '../phases/guidelines/generator';
import { validateAllGuidelines, checkDuplicates } from '../phases/guidelines/validator';
import { batchIntelligentMerge, formatChanges } from '../phases/intelligent-merge';
import { promptUpdateMode, confirmChanges } from '../../utils/interactive';
import { transformPatterns } from '../phases/guidelines/transformer';
import { printSuccess } from '../../utils/display';
import { GuidelineFileService } from './services';
import { InputValidator } from '../../validation/input-validator';

export interface GuidelinesWorkflowResult {
  success: boolean;
  guidelinesGenerated: number;
  mode?: 'created' | 'updated' | 'cancelled';
  error?: string;
}

type UpdateMode = 'override' | 'update' | 'new';

/**
 * Run guidelines generation workflow with intelligent update
 */
export async function runGuidelinesWorkflow(
  client: IProviderClient,
  targetPath: string,
  techProfile: TechProfile,
  patterns: PatternReport,
  interactive: boolean = true,
  onProgress?: (message: string) => void
): Promise<GuidelinesWorkflowResult> {
  try {
    // Validate target path before any operations
    const validator = new InputValidator();
    const validatedPath = validator.validatePath(targetPath);

    const fileService = new GuidelineFileService();

    // Determine update mode
    const updateMode = await determineUpdateMode(fileService, validatedPath, interactive, onProgress);
    if (updateMode === 'cancelled') {
      return { success: true, guidelinesGenerated: 0, mode: 'cancelled' };
    }

    // Apply override if requested
    if (updateMode === 'override') {
      fileService.deleteAll(validatedPath);
    }

    // Transform patterns
    if (onProgress) onProgress('Transforming patterns...');
    const transformedPatterns = transformPatterns(patterns, techProfile);

    if (!techProfile.structure) {
      return {
        success: false,
        guidelinesGenerated: 0,
        error: 'Project structure not found. Run discovery first.'
      };
    }

    // Generate guidelines
    if (onProgress) onProgress('Generating guidelines from codebase patterns...');
    const guidelines = await generateAllGuidelines(
      client,
      transformedPatterns,
      validatedPath,
      techProfile.structure,
      techProfile,
      (current, total, name) => {
        if (onProgress) onProgress(`Generating ${current}/${total}: ${name}`);
      }
    );

    // Validate
    const validationError = validateGenerated(guidelines, onProgress);
    if (validationError) {
      return validationError;
    }

    // Handle update mode
    if (updateMode === 'update') {
      return await handleUpdateMode(
        client,
        fileService,
        validatedPath,
        guidelines,
        interactive,
        onProgress
      );
    }

    // New or override mode - write directly
    if (onProgress) onProgress('Writing guidelines...');
    fileService.writeAll(validatedPath, guidelines);

    printSuccess(`\n✓ Guidelines created: ${guidelines.length} files`);

    return {
      success: true,
      guidelinesGenerated: guidelines.length,
      mode: 'created'
    };
  } catch (error) {
    return {
      success: false,
      guidelinesGenerated: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Determine update mode based on existing files and user choice
 */
async function determineUpdateMode(
  fileService: GuidelineFileService,
  targetPath: string,
  interactive: boolean,
  onProgress?: (message: string) => void
): Promise<UpdateMode | 'cancelled'> {
  if (onProgress) onProgress('Starting guidelines workflow...');

  const exists = fileService.exists(targetPath);

  if (!exists) {
    return 'new';
  }

  if (interactive) {
    const choice = await promptUpdateMode(path.join(targetPath, '.guidelines'));
    if (choice === 'cancel') return 'cancelled';
    if (choice === 'override') return 'override';
    return 'update';
  }

  // Non-interactive mode - default to update
  return 'update';
}

/**
 * Validate generated guidelines
 */
function validateGenerated(
  guidelines: GeneratedGuideline[],
  onProgress?: (message: string) => void
): GuidelinesWorkflowResult | null {
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
      guidelinesGenerated: 0,
      error: `Validation failed:\n${errors.join('\n')}`
    };
  }

  const duplicates = checkDuplicates(guidelines);
  if (duplicates.length > 0) {
    return {
      success: false,
      guidelinesGenerated: 0,
      error: `Duplicate guidelines detected: ${duplicates.join(', ')}`
    };
  }

  return null;
}

/**
 * Handle update mode with intelligent merging
 */
async function handleUpdateMode(
  client: IProviderClient,
  fileService: GuidelineFileService,
  targetPath: string,
  guidelines: GeneratedGuideline[],
  interactive: boolean,
  onProgress?: (message: string) => void
): Promise<GuidelinesWorkflowResult> {
  // Read existing
  if (onProgress) onProgress('Reading existing guidelines...');
  const existingGuidelines = fileService.readAll(targetPath);

  // Prepare files for merge
  if (onProgress) onProgress('Intelligently merging with existing content...');
  const filesToMerge = guidelines.map(g => ({
    fileName: `${g.domain}/${g.fileName}`,
    existing: existingGuidelines.get(`${g.domain}/${g.fileName}`) || null,
    generated: g.content,
    type: 'guideline' as const
  }));

  // Perform merge
  const mergeResults = await batchIntelligentMerge(
    client,
    filesToMerge,
    (current, total, fileName) => {
      if (onProgress) onProgress(`Merging ${current}/${total}: ${fileName}`);
    }
  );

  // Build change summary
  const changesSummary = buildChangeSummary(mergeResults);

  // Confirm changes if interactive
  if (interactive) {
    const confirmed = await confirmChanges(changesSummary, mergeResults.size);
    if (!confirmed) {
      return { success: true, guidelinesGenerated: 0, mode: 'cancelled' };
    }
  }

  // Write merged content
  if (onProgress) onProgress('Writing updated guidelines...');
  const mergedContent = new Map<string, string>();
  for (const [fileName, result] of mergeResults) {
    mergedContent.set(fileName, result.mergedContent);
  }

  fileService.writeAll(targetPath, guidelines, mergedContent);

  printSuccess(`\n✓ Guidelines updated: ${guidelines.length} files`);

  return {
    success: true,
    guidelinesGenerated: guidelines.length,
    mode: 'updated'
  };
}

/**
 * Build change summary from merge results
 */
function buildChangeSummary(mergeResults: Map<string, import('../phases/intelligent-merge').IntelligentMergeResult>): string {
  const changesSummary: string[] = [];

  for (const [fileName, result] of mergeResults) {
    changesSummary.push(`\n${fileName}:`);
    changesSummary.push(formatChanges(result.changes));
  }

  return changesSummary.join('\n');
}
