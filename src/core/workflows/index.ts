/**
 * Core workflows for phase orchestration
 */

// Export workflows
export { runGuidelinesWorkflow } from './guidelines-update';
export { runIndexesWorkflow } from './indexes-update';
export { runClaudeArtifactsWorkflow } from './claude-update';
export { runSetupWorkflow } from './setup';

// Re-export phases for direct access
export { runDiscoveryPhase } from '../phases/discovery';
export { runAnalysisPhase } from '../phases/analysis';

// CLI-friendly wrapper functions
import { resolve } from 'path';
import type { AnalysisDepth } from '../../types';
import type { ILogger } from '../../interfaces/services/ILogger';
import { ProviderManager } from '../../providers/manager';
import { runGuidelinesWorkflow } from './guidelines-update';
import { runIndexesWorkflow } from './indexes-update';
import { runClaudeArtifactsWorkflow } from './claude-update';
import { runDiscoveryPhase } from '../phases/discovery';
import { runAnalysisPhase } from '../phases/analysis';
import type { ClaudeArtifactsWorkflow } from '../../workflows/claude-artifacts/ClaudeArtifactsWorkflow.js';

/**
 * Generate project-specific coding guidelines based on existing code patterns
 *
 * This command orchestrates the full guidelines generation workflow:
 * 1. Discovers project tech stack and structure
 * 2. Analyzes code patterns and conventions
 * 3. Generates comprehensive guidelines across domains (backend, frontend, shared)
 *
 * @param targetPath - Absolute or relative path to the project root directory
 * @param depth - Analysis depth level controlling AI model selection and detail
 *                'quick' - Fast analysis with smaller models
 *                'standard' - Balanced approach (recommended)
 *                'thorough' - Comprehensive analysis with larger models
 * @param skipConfirm - If true, skips user confirmation prompts
 * @param overwrite - If true, overwrites existing guidelines without merging
 * @param forceSetup - If true, re-runs provider configuration setup
 * @param debug - If true, enables detailed logging for troubleshooting
 *
 * @throws {Error} If discovery, analysis, or generation phases fail
 * @throws {PathTraversalError} If targetPath contains directory escape attempts
 *
 * @example
 * ```typescript
 * // Generate guidelines for current project
 * await runGuidelinesGeneration(
 *   process.cwd(),
 *   'standard',
 *   false,  // require confirmation
 *   false,  // merge with existing
 *   false,  // use existing provider config
 *   false   // normal logging
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Quick generation with debug logging
 * await runGuidelinesGeneration(
 *   './my-project',
 *   'quick',
 *   true,   // skip confirmations
 *   false,
 *   false,
 *   true    // enable debug output
 * );
 * ```
 */
export async function runGuidelinesGeneration(
  targetPath: string,
  depth: AnalysisDepth,
  skipConfirm: boolean,
  overwrite: boolean,
  providerManager: ProviderManager,
  logger: ILogger,
  forceSetup: boolean = false,
  debug: boolean = false
): Promise<void> {
  const resolvedPath = resolve(targetPath);

  // Initialize provider
  if (forceSetup) {
    await providerManager.forceSetup();
  }

  const client = await providerManager.getClient(depth);

  // Run discovery and analysis first
  logger.info('Running discovery...');
  const discoveryResult = await runDiscoveryPhase(resolvedPath, depth, providerManager, logger);
  if (!discoveryResult.success) {
    throw new Error(`Discovery failed: ${discoveryResult.error}`);
  }

  logger.info('Running analysis...');
  const analysisResult = await runAnalysisPhase(resolvedPath, discoveryResult.data, depth);
  if (!analysisResult.success) {
    throw new Error(`Analysis failed: ${analysisResult.error}`);
  }

  // Run guidelines generation with interactive mode
  logger.info('Generating guidelines...');
  const result = await runGuidelinesWorkflow(
    client,
    resolvedPath,
    discoveryResult.data,
    analysisResult.data,
    true, // interactive=true for CLI command
    (msg) => logger.info(msg),
    logger
  );

  if (!result.success) {
    throw new Error(`Guidelines generation failed: ${result.error}`);
  }

  logger.info(`✓ Generated ${result.guidelinesGenerated} guidelines`);
}

/**
 * Generate markdown index files for project guidelines
 *
 * Creates organized index files that catalog all generated guidelines,
 * making them easily discoverable and navigable. Indexes are generated
 * per domain (backend, frontend, shared) and include metadata about
 * each guideline.
 *
 * @param targetPath - Absolute or relative path to the project root directory
 * @param skipConfirm - If true, skips user confirmation prompts
 * @param overwrite - If true, overwrites existing index files
 * @param forceSetup - If true, re-runs provider configuration setup
 * @param debug - If true, enables detailed logging for troubleshooting
 *
 * @throws {Error} If discovery or index generation fails
 * @throws {PathTraversalError} If targetPath contains directory escape attempts
 *
 * @example
 * ```typescript
 * // Generate indexes for existing guidelines
 * await runIndexGeneration(
 *   process.cwd(),
 *   false,  // require confirmation
 *   false,  // merge with existing
 *   false,  // use existing provider config
 *   false   // normal logging
 * );
 * ```
 *
 * @remarks
 * This command requires existing guidelines to be present in the .guidelines directory.
 * Run `runGuidelinesGeneration()` first if guidelines don't exist yet.
 */
export async function runIndexGeneration(
  targetPath: string,
  skipConfirm: boolean,
  overwrite: boolean,
  providerManager: ProviderManager,
  logger: ILogger,
  forceSetup: boolean = false,
  debug: boolean = false
): Promise<void> {
  const resolvedPath = resolve(targetPath);

  // Initialize provider
  if (forceSetup) {
    await providerManager.forceSetup();
  }

  const client = await providerManager.getClient('standard');

  // Run discovery to get tech profile
  logger.info('Running discovery...');
  const discoveryResult = await runDiscoveryPhase(resolvedPath, 'standard', providerManager, logger);
  if (!discoveryResult.success) {
    throw new Error(`Discovery failed: ${discoveryResult.error}`);
  }

  // Extract project name
  const projectName = resolvedPath.split(/[/\\]/).pop() || 'Project';

  // Run indexes generation with interactive mode
  logger.info('Generating indexes...');
  const result = await runIndexesWorkflow(
    client,
    resolvedPath,
    projectName,
    discoveryResult.data,
    true, // interactive=true for CLI command
    (msg) => logger.info(msg)
  );

  if (!result.success) {
    throw new Error(`Index generation failed: ${result.error}`);
  }

  logger.info(`✓ Generated ${result.indexesGenerated} indexes`);
}

/**
 * Generate Claude Code artifacts (skills and agents) from project guidelines
 *
 * Creates custom Claude Code skills and agents tailored to your project's
 * specific patterns and conventions. These artifacts help Claude Code
 * understand and follow your project's guidelines automatically.
 *
 * Generated artifacts include:
 * - Custom skills for project-specific tasks
 * - Specialized agents for workflow automation
 * - CLAUDE.md file with project context and references
 *
 * @param targetPath - Absolute or relative path to the project root directory
 * @param depth - Analysis depth level controlling AI model selection
 *                'quick' - Fast generation with smaller models
 *                'standard' - Balanced approach (recommended)
 *                'thorough' - Comprehensive generation with larger models
 * @param skipConfirm - If true, skips user confirmation prompts
 * @param overwrite - If true, overwrites existing artifacts
 * @param forceSetup - If true, re-runs provider configuration setup
 * @param debug - If true, enables detailed logging for troubleshooting
 *
 * @throws {Error} If discovery or artifact generation fails
 * @throws {PathTraversalError} If targetPath contains directory escape attempts
 *
 * @example
 * ```typescript
 * // Generate Claude artifacts for current project
 * await runClaudeGeneration(
 *   process.cwd(),
 *   'standard',
 *   false,  // require confirmation
 *   false,  // merge with existing
 *   false,  // use existing provider config
 *   false   // normal logging
 * );
 * ```
 *
 * @remarks
 * This command requires existing guidelines in .guidelines directory.
 * Run `runGuidelinesGeneration()` first if guidelines don't exist.
 * Generated artifacts are written to .claude/ directory and CLAUDE.md file.
 */
export async function runClaudeGeneration(
  targetPath: string,
  depth: AnalysisDepth,
  skipConfirm: boolean,
  overwrite: boolean,
  providerManager: ProviderManager,
  logger: ILogger,
  workflow: ClaudeArtifactsWorkflow,
  forceSetup: boolean = false,
  debug: boolean = false
): Promise<void> {
  const resolvedPath = resolve(targetPath);

  // Initialize provider
  if (forceSetup) {
    await providerManager.forceSetup();
  }

  const client = await providerManager.getClient(depth);

  // Run discovery to get tech profile
  logger.info('Running discovery...');
  const discoveryResult = await runDiscoveryPhase(resolvedPath, depth, providerManager, logger);
  if (!discoveryResult.success) {
    throw new Error(`Discovery failed: ${discoveryResult.error}`);
  }

  // Run Claude artifacts generation with interactive mode
  logger.info('Generating Claude artifacts...');
  const result = await runClaudeArtifactsWorkflow(
    client,
    resolvedPath,
    discoveryResult.data,
    workflow,
    true, // interactive=true for CLI command
    (msg) => logger.info(msg)
  );

  if (!result.success) {
    throw new Error(`Claude artifacts generation failed: ${result.error}`);
  }

  logger.info(`✓ Generated ${result.skillsGenerated} skills and ${result.agentsGenerated} agents`);
}
