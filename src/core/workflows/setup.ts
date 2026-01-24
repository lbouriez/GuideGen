/**
 * Full setup workflow - runs all phases in sequence
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { IProviderClient } from '../../providers/types';
import type { ILogger } from '../../interfaces/services/ILogger';
import type { AnalysisDepth } from '../../types';
import { ProviderManager } from '../../providers/manager';
import { ClaudeArtifactsWorkflow } from '../../workflows/claude-artifacts/ClaudeArtifactsWorkflow';
import { runDiscoveryPhase } from '../phases/discovery';
import { runAnalysisPhase } from '../phases/analysis';
import { runGuidelinesWorkflow, type GuidelinesWorkflowResult } from './guidelines-update';
import { runIndexesWorkflow, type IndexesWorkflowResult } from './indexes-update';
import { runClaudeArtifactsWorkflow, type ClaudeArtifactsWorkflowResult } from './claude-update';
import { InputValidator } from '../../validation/input-validator';
import { PathTraversalError } from '../../errors';

export interface SetupWorkflowResult {
  success: boolean;
  phasesCompleted: string[];
  summary: {
    guidelinesGenerated: number;
    indexesGenerated: number;
    skillsGenerated: number;
    agentsGenerated: number;
  };
  error?: string;
}

/**
 * Check if guidelines already exist
 * @param targetPath - Base path to check (must be validated)
 * @param validator - InputValidator instance for path validation
 */
function hasExistingGuidelines(targetPath: string, validator: InputValidator): boolean {
  try {
    // Validate the combined path
    const guidelinesPath = validator.validatePath(
      join(targetPath, '.guidelines'),
      targetPath
    );

    if (!existsSync(guidelinesPath)) {
      return false;
    }

    // Check if it has any markdown files (not just the root index.md)
    const files = readdirSync(guidelinesPath, { recursive: true, withFileTypes: true });
    const markdownFiles = files.filter(f => f.isFile() && f.name.endsWith('.md'));
    // If there are more than just index.md, consider it existing
    return markdownFiles.length > 1;
  } catch (error) {
    // If validation fails or path doesn't exist, no existing guidelines
    if (error instanceof PathTraversalError) {
      throw error; // Re-throw security errors
    }
    return false;
  }
}

/**
 * Phase execution helper to reduce duplication
 */
type PhaseExecutor<T> = () => Promise<{ success: boolean; data?: T; error?: string }>;

async function executePhase<T>(
  phaseName: string,
  phaseNumber: number,
  totalPhases: number,
  executor: PhaseExecutor<T>,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; data?: T; error?: string }> {
  if (onProgress) {
    onProgress(`\n=== Phase ${phaseNumber}/${totalPhases}: ${phaseName} ===\n`);
  }

  const result = await executor();

  if (!result.success) {
    return {
      success: false,
      error: `${phaseName} failed: ${result.error}`
    };
  }

  return result;
}

/**
 * Run complete setup workflow
 */
export async function runSetupWorkflow(
  client: IProviderClient,
  targetPath: string,
  depth: AnalysisDepth = 'standard',
  providerManager: ProviderManager,
  logger: ILogger,
  workflow: ClaudeArtifactsWorkflow,
  onProgress?: (message: string) => void
): Promise<SetupWorkflowResult> {
  const phasesCompleted: string[] = [];
  const summary = {
    guidelinesGenerated: 0,
    indexesGenerated: 0,
    skillsGenerated: 0,
    agentsGenerated: 0
  };

  try {
    // Validate target path before any operations
    const validator = new InputValidator();
    const validatedPath = validator.validatePath(targetPath);

    // Check for existing guidelines
    if (hasExistingGuidelines(validatedPath, validator)) {
      return createErrorResult(phasesCompleted, summary,
        `Existing guidelines detected in ${validatedPath}/.guidelines/\n\n` +
        `The 'setup' command is for initial setup only.\n` +
        `To update existing guidelines, use:\n` +
        `  npm run guidelines -- ${validatedPath}\n` +
        `  npm run indexes -- ${validatedPath}\n` +
        `  npm run claude -- ${validatedPath}\n\n` +
        `Or delete .guidelines/ and .claude/ folders to start fresh.`
      );
    }

    // Phase 1: Discovery
    const discoveryResult = await executePhase('Discovery', 1, 5,
      () => runDiscoveryPhase(validatedPath, depth, providerManager, logger),
      onProgress
    );

    if (!discoveryResult.success) {
      return createErrorResult(phasesCompleted, summary, discoveryResult.error!);
    }

    phasesCompleted.push('discovery');
    const techProfile = discoveryResult.data!;

    if (onProgress) {
      onProgress(`✓ Discovered tech stack: ${techProfile.stack.languages.join(', ')}`);
    }

    // Phase 2: Analysis
    const analysisResult = await executePhase('Pattern Analysis', 2, 5,
      () => runAnalysisPhase(validatedPath, techProfile, depth),
      onProgress
    );

    if (!analysisResult.success) {
      return createErrorResult(phasesCompleted, summary, analysisResult.error!);
    }

    phasesCompleted.push('analysis');
    const patterns = analysisResult.data!;

    if (onProgress) {
      onProgress(`✓ Analyzed code patterns`);
    }

    // Phase 3: Guidelines Generation
    const guidelinesResult = await executePhase<GuidelinesWorkflowResult>('Guidelines Generation', 3, 5,
      () => runGuidelinesWorkflow(client, validatedPath, techProfile, patterns, false, onProgress, logger),
      onProgress
    );

    if (!guidelinesResult.success) {
      return createErrorResult(phasesCompleted, summary, guidelinesResult.error!);
    }

    phasesCompleted.push('guidelines');
    summary.guidelinesGenerated = (guidelinesResult as unknown as GuidelinesWorkflowResult).guidelinesGenerated ?? 0;

    if (onProgress) {
      onProgress(`✓ Generated ${summary.guidelinesGenerated} guidelines`);
    }

    // Phase 4: Indexes Generation
    const projectName = validatedPath.split(/[/\\]/).pop() || 'Project';
    const indexesResult = await executePhase<IndexesWorkflowResult>('Indexes Generation', 4, 5,
      () => runIndexesWorkflow(client, validatedPath, projectName, techProfile, false, onProgress),
      onProgress
    );

    if (!indexesResult.success) {
      return createErrorResult(phasesCompleted, summary, indexesResult.error!);
    }

    phasesCompleted.push('indexes');
    summary.indexesGenerated = (indexesResult as unknown as IndexesWorkflowResult).indexesGenerated ?? 0;

    if (onProgress) {
      onProgress(`✓ Generated ${summary.indexesGenerated} indexes`);
    }

    // Phase 5: Claude Artifacts
    const artifactsResult = await executePhase<ClaudeArtifactsWorkflowResult>('Claude Artifacts', 5, 5,
      () => runClaudeArtifactsWorkflow(client, validatedPath, techProfile, workflow, false, onProgress),
      onProgress
    );

    if (!artifactsResult.success) {
      return createErrorResult(phasesCompleted, summary, artifactsResult.error!);
    }

    phasesCompleted.push('claude-artifacts');
    const artifactsData = artifactsResult as unknown as ClaudeArtifactsWorkflowResult;
    summary.skillsGenerated = artifactsData.skillsGenerated ?? 0;
    summary.agentsGenerated = artifactsData.agentsGenerated ?? 0;

    if (onProgress) {
      onProgress(`✓ Generated ${summary.skillsGenerated} skills and ${summary.agentsGenerated} agents`);
    }

    // Success!
    printCompletionSummary(summary, onProgress);

    return {
      success: true,
      phasesCompleted,
      summary
    };
  } catch (error) {
    return createErrorResult(
      phasesCompleted,
      summary,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Create error result helper
 */
function createErrorResult(
  phasesCompleted: string[],
  summary: SetupWorkflowResult['summary'],
  error: string
): SetupWorkflowResult {
  return {
    success: false,
    phasesCompleted,
    summary,
    error
  };
}

/**
 * Print completion summary
 */
function printCompletionSummary(
  summary: SetupWorkflowResult['summary'],
  onProgress?: (message: string) => void
): void {
  if (!onProgress) return;

  onProgress('\n=== Setup Complete! ===\n');
  onProgress(`
Summary:
- ${summary.guidelinesGenerated} guidelines generated
- ${summary.indexesGenerated} indexes created
- ${summary.skillsGenerated} skills created
- ${summary.agentsGenerated} agents created

Files created in:
- .guidelines/ - Comprehensive coding guidelines
- .claude/skills/ - Workflow automation skills
- .claude/agents/ - Rule enforcement agents
  `);
}
