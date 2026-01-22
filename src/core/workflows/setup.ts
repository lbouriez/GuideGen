/**
 * Full setup workflow - runs all phases in sequence
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import type { IProviderClient } from '../../providers/types';
import type { AnalysisDepth } from '../../types';
import { runDiscoveryPhase } from '../phases/discovery';
import { runAnalysisPhase } from '../phases/analysis';
import { runGuidelinesWorkflow, type GuidelinesWorkflowResult } from './guidelines-update';
import { runIndexesWorkflow, type IndexesWorkflowResult } from './indexes-update';
import { runClaudeArtifactsWorkflow, type ClaudeArtifactsWorkflowResult } from './claude-update';

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
 */
function hasExistingGuidelines(targetPath: string): boolean {
  const guidelinesPath = join(targetPath, '.guidelines');
  if (!existsSync(guidelinesPath)) {
    return false;
  }

  // Check if it has any markdown files (not just the root index.md)
  try {
    const files = readdirSync(guidelinesPath, { recursive: true, withFileTypes: true });
    const markdownFiles = files.filter(f => f.isFile() && f.name.endsWith('.md'));
    // If there are more than just index.md, consider it existing
    return markdownFiles.length > 1;
  } catch {
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
    // Check for existing guidelines
    if (hasExistingGuidelines(targetPath)) {
      return createErrorResult(phasesCompleted, summary,
        `Existing guidelines detected in ${targetPath}/.guidelines/\n\n` +
        `The 'setup' command is for initial setup only.\n` +
        `To update existing guidelines, use:\n` +
        `  npm run guidelines -- ${targetPath}\n` +
        `  npm run indexes -- ${targetPath}\n` +
        `  npm run claude -- ${targetPath}\n\n` +
        `Or delete .guidelines/ and .claude/ folders to start fresh.`
      );
    }

    // Phase 1: Discovery
    const discoveryResult = await executePhase('Discovery', 1, 5,
      () => runDiscoveryPhase(targetPath, depth),
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
      () => runAnalysisPhase(targetPath, techProfile, depth),
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
      () => runGuidelinesWorkflow(client, targetPath, techProfile, patterns, false, onProgress),
      onProgress
    );

    if (!guidelinesResult.success) {
      return createErrorResult(phasesCompleted, summary, guidelinesResult.error!);
    }

    phasesCompleted.push('guidelines');
    summary.guidelinesGenerated = guidelinesResult.data?.guidelinesGenerated ?? 0;

    if (onProgress) {
      onProgress(`✓ Generated ${summary.guidelinesGenerated} guidelines`);
    }

    // Phase 4: Indexes Generation
    const projectName = targetPath.split(/[/\\]/).pop() || 'Project';
    const indexesResult = await executePhase<IndexesWorkflowResult>('Indexes Generation', 4, 5,
      () => runIndexesWorkflow(client, targetPath, projectName, techProfile, false, onProgress),
      onProgress
    );

    if (!indexesResult.success) {
      return createErrorResult(phasesCompleted, summary, indexesResult.error!);
    }

    phasesCompleted.push('indexes');
    summary.indexesGenerated = indexesResult.data?.indexesGenerated ?? 0;

    if (onProgress) {
      onProgress(`✓ Generated ${summary.indexesGenerated} indexes`);
    }

    // Phase 5: Claude Artifacts
    const artifactsResult = await executePhase<ClaudeArtifactsWorkflowResult>('Claude Artifacts', 5, 5,
      () => runClaudeArtifactsWorkflow(client, targetPath, techProfile, false, onProgress),
      onProgress
    );

    if (!artifactsResult.success) {
      return createErrorResult(phasesCompleted, summary, artifactsResult.error!);
    }

    phasesCompleted.push('claude-artifacts');
    summary.skillsGenerated = artifactsResult.data?.skillsGenerated ?? 0;
    summary.agentsGenerated = artifactsResult.data?.agentsGenerated ?? 0;

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
