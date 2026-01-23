/**
 * Claude artifacts workflow
 * Thin wrapper around ClaudeArtifactsWorkflow for backwards compatibility
 */

import { container } from '../../di/container.js';
import { TYPES } from '../../di/identifiers.js';
import type { IProviderClient } from '../../providers/types.js';
import type { TechProfile } from '../../types/index.js';
import type { ClaudeArtifactsWorkflow } from '../../workflows/claude-artifacts/ClaudeArtifactsWorkflow.js';

export interface ClaudeArtifactsWorkflowResult {
  success: boolean;
  skillsGenerated: number;
  agentsGenerated: number;
  mode?: 'created' | 'updated' | 'cancelled';
  error?: string;
}

/**
 * Run claude artifacts generation workflow with intelligent update
 *
 * This function orchestrates the generation of Claude Code skills, agents, and CLAUDE.md
 * from existing project guidelines. It supports intelligent merging when artifacts already
 * exist, allowing users to update artifacts without losing manual customizations.
 *
 * The workflow:
 * 1. Reads existing guidelines from .guidelines/ directory
 * 2. Extracts critical rules from guidelines
 * 3. Checks for existing artifacts and prompts for update mode
 * 4. Generates skills and agents using AI
 * 5. Validates generated artifacts
 * 6. Intelligently merges with existing artifacts (if updating)
 * 7. Writes artifacts to .claude/ directory and CLAUDE.md
 *
 * @param client - Provider client for AI model interactions
 * @param targetPath - Absolute path to the project root directory
 * @param techProfile - Tech profile from discovery phase containing project structure
 * @param interactive - If true, prompts user for update mode and confirms changes
 * @param onProgress - Optional callback for progress updates during generation
 *
 * @returns Promise resolving to ClaudeArtifactsWorkflowResult with generation details
 *
 * @throws {Error} If guidelines don't exist, validation fails, or generation errors occur
 *
 * @example
 * ```typescript
 * // Generate artifacts after running guidelines workflow
 * const client = await providerManager.getClient('standard');
 * const result = await runClaudeArtifactsWorkflow(
 *   client,
 *   '/path/to/project',
 *   techProfile,
 *   true,  // interactive mode
 *   (msg) => console.log(msg)
 * );
 *
 * if (result.success) {
 *   console.log(`Generated ${result.skillsGenerated} skills and ${result.agentsGenerated} agents`);
 *   console.log(`Mode: ${result.mode}`); // 'created', 'updated', or 'cancelled'
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Non-interactive mode (auto-merge existing artifacts)
 * const result = await runClaudeArtifactsWorkflow(
 *   client,
 *   process.cwd(),
 *   techProfile,
 *   false  // non-interactive
 * );
 * ```
 */
export async function runClaudeArtifactsWorkflow(
  client: IProviderClient,
  targetPath: string,
  techProfile: TechProfile,
  interactive: boolean = true,
  onProgress?: (message: string) => void
): Promise<ClaudeArtifactsWorkflowResult> {
  const workflow = container.get<ClaudeArtifactsWorkflow>(TYPES.IClaudeWorkflow);
  return workflow.execute(client, targetPath, techProfile, interactive, onProgress);
}
