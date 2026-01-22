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
export { runExtractionPhase } from '../phases/extraction';
export { runGenerationPhase } from '../phases/generation';
export { runSuggestPhase } from '../phases/suggest';

// CLI-friendly wrapper functions
import { resolve } from 'path';
import type { AnalysisDepth } from '../../types';
import { ProviderManager } from '../../providers/manager';
import { container } from '../../di/container';
import { TYPES } from '../../di/identifiers';
import { runGuidelinesWorkflow } from './guidelines-update';
import { runIndexesWorkflow } from './indexes-update';
import { runClaudeArtifactsWorkflow } from './claude-update';
import { runDiscoveryPhase } from '../phases/discovery';
import { runAnalysisPhase } from '../phases/analysis';
import { logger } from '@/utils/logger';

/**
 * Wrapper for guidelines generation command
 */
export async function runGuidelinesGeneration(
  targetPath: string,
  depth: AnalysisDepth,
  skipConfirm: boolean,
  overwrite: boolean,
  forceSetup: boolean = false,
  debug: boolean = false
): Promise<void> {
  const resolvedPath = resolve(targetPath);

  // Initialize provider
  const providerManager = container.get<ProviderManager>(TYPES.IProviderManager);
  if (forceSetup) {
    await providerManager.forceSetup();
  }

  const client = await providerManager.getClient(depth);

  // Run discovery and analysis first
  logger.info('Running discovery...');
  const discoveryResult = await runDiscoveryPhase(resolvedPath, depth);
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
    (msg) => logger.info(msg)
  );

  if (!result.success) {
    throw new Error(`Guidelines generation failed: ${result.error}`);
  }

  logger.info(`✓ Generated ${result.guidelinesGenerated} guidelines`);
}

/**
 * Wrapper for index generation command
 */
export async function runIndexGeneration(
  targetPath: string,
  skipConfirm: boolean,
  overwrite: boolean,
  forceSetup: boolean = false,
  debug: boolean = false
): Promise<void> {
  const resolvedPath = resolve(targetPath);

  // Initialize provider
  const providerManager = container.get<ProviderManager>(TYPES.IProviderManager);
  if (forceSetup) {
    await providerManager.forceSetup();
  }

  const client = await providerManager.getClient('standard');

  // Run discovery to get tech profile
  logger.info('Running discovery...');
  const discoveryResult = await runDiscoveryPhase(resolvedPath, 'standard');
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
 * Wrapper for Claude artifacts generation command
 */
export async function runClaudeGeneration(
  targetPath: string,
  depth: AnalysisDepth,
  skipConfirm: boolean,
  overwrite: boolean,
  forceSetup: boolean = false,
  debug: boolean = false
): Promise<void> {
  const resolvedPath = resolve(targetPath);

  // Initialize provider
  const providerManager = container.get<ProviderManager>(TYPES.IProviderManager);
  if (forceSetup) {
    await providerManager.forceSetup();
  }

  const client = await providerManager.getClient(depth);

  // Run discovery to get tech profile
  logger.info('Running discovery...');
  const discoveryResult = await runDiscoveryPhase(resolvedPath, depth);
  if (!discoveryResult.success) {
    throw new Error(`Discovery failed: ${discoveryResult.error}`);
  }

  // Run Claude artifacts generation with interactive mode
  logger.info('Generating Claude artifacts...');
  const result = await runClaudeArtifactsWorkflow(
    client,
    resolvedPath,
    discoveryResult.data,
    true, // interactive=true for CLI command
    (msg) => logger.info(msg)
  );

  if (!result.success) {
    throw new Error(`Claude artifacts generation failed: ${result.error}`);
  }

  logger.info(`✓ Generated ${result.skillsGenerated} skills and ${result.agentsGenerated} agents`);
}
