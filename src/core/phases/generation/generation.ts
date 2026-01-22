/**
 * Legacy generation phase - DEPRECATED
 *
 * This file is kept for backward compatibility only.
 * New code should use the split phases:
 * - src/core/phases/guidelines/
 * - src/core/phases/indexes/
 * - src/core/phases/claude-artifacts/
 */

import type { TechProfile, PatternReport, PhaseResult, GeneratedGuideline } from '@/types';
import type { IProviderClient } from '@/providers/types';
import { logger } from '@/utils/logger';

/**
 * @deprecated Legacy result type - use specific phase results instead
 */
export interface GenerationResult {
  guidelines: GeneratedGuideline[];
  skills: unknown[];
  agents: unknown[];
}

/**
 * @deprecated Use runGuidelinesPhase, runIndexesPhase, and runClaudeArtifactsPhase instead
 */
export async function runGenerationPhase(
  client: IProviderClient,
  targetPath: string,
  techProfile: TechProfile,
  patterns: PatternReport,
  rules: GeneratedGuideline[],
  onProgress?: (message: string) => void
): Promise<PhaseResult<GenerationResult>> {
  if (onProgress) {
    onProgress('⚠️  Legacy generation phase called. Please use new split phases instead.');
  }

  logger.warn('runGenerationPhase is deprecated. Use the new split phases: runGuidelinesPhase(), runIndexesPhase(), runClaudeArtifactsPhase()');

  return {
    success: false,
    error: 'Legacy generation phase is deprecated. Use new split phases instead.',
    humanReviewRequired: false
  };
}

/**
 * @deprecated No longer needed with new workflow system
 */
export async function writeArtifacts(): Promise<void> {
  logger.warn('writeArtifacts is deprecated - artifacts are written directly by each phase');
}
