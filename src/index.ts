#!/usr/bin/env node

/**
 * GuideGen CLI - AI-Powered Guideline Generator
 */

// Must be imported first for DI decorators to work
import 'reflect-metadata';

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync, statSync } from 'fs';
import type { AnalysisDepth } from './types';
import {
  runSetupWorkflow,
  runGuidelinesGeneration,
  runIndexGeneration,
  runClaudeGeneration,
  runDiscoveryPhase,
  runAnalysisPhase,
} from './core/workflows/index.js';
import {
  printHeader,
  printPhase,
  printError,
  printSuccess,
  printInfo,
  printDivider,
} from './utils/display';
import { ProviderManager } from './providers/manager';
import { container } from './di/container';
import { TYPES } from './di/identifiers';
import type { ILogger } from './interfaces/services/ILogger';
import type { ClaudeArtifactsWorkflow } from './workflows/claude-artifacts/ClaudeArtifactsWorkflow';
import { generateAnalysisReport } from './core/phases/analysis-report';
import { getErrorMessage } from './core/utils/errors';
import { TargetPathSchema, AnalysisDepthSchema } from './validation/schemas';
import { ValidationError } from './errors';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validate and resolve target path
 */
function validateTargetPath(inputPath: string): string {
  const resolvedPath = resolve(inputPath);

  // Validate path format
  const parseResult = TargetPathSchema.safeParse(inputPath);
  if (!parseResult.success) {
    throw new ValidationError(
      `Invalid path: ${parseResult.error.issues.map(i => i.message).join(', ')}`,
      { path: inputPath },
      'path'
    );
  }

  // Check if path exists and is a directory
  if (!existsSync(resolvedPath)) {
    throw new ValidationError(
      `Path does not exist: ${resolvedPath}`,
      { path: resolvedPath },
      'path'
    );
  }

  const stats = statSync(resolvedPath);
  if (!stats.isDirectory()) {
    throw new ValidationError(
      `Path is not a directory: ${resolvedPath}`,
      { path: resolvedPath },
      'path'
    );
  }

  return resolvedPath;
}

/**
 * Validate analysis depth
 */
function validateDepth(depth: string): AnalysisDepth {
  const parseResult = AnalysisDepthSchema.safeParse(depth);
  if (!parseResult.success) {
    throw new ValidationError(
      `Invalid depth: ${depth}. Must be one of: quick, standard, thorough`,
      { depth },
      'depth'
    );
  }
  return parseResult.data;
}

const program = new Command();

program
  .name('guidegen')
  .description('AI-powered guideline generator - analyzes your codebase and generates intelligent documentation')
  .version('0.1.0');

program
  .command('setup')
  .description('Full setup - analyze codebase and generate all artifacts')
  .argument('[path]', 'Path to the project to analyze', '../')
  .option('-d, --depth <depth>', 'Analysis depth: quick, standard, thorough', 'standard')
  .option('--force-setup', 'Force re-run the AI provider setup')
  .action(async (inputPath: string, options: { depth: string; forceSetup: boolean }) => {
    try {
      const validatedPath = validateTargetPath(inputPath);
      const validatedDepth = validateDepth(options.depth);
      await runSetup(validatedPath, validatedDepth, options.forceSetup);
    } catch (error) {
      if (error instanceof ValidationError) {
        printError(`Validation error: ${error.message}`);
        process.exit(1);
      }
      throw error;
    }
  });

program
  .command('analyze')
  .description('Analysis only - detect patterns without generating files')
  .argument('[path]', 'Path to the project to analyze', '../')
  .option('-d, --depth <depth>', 'Analysis depth: quick, standard, thorough', 'standard')
  .option('--force-setup', 'Force re-run the AI provider setup')
  .action(async (inputPath: string, options: { depth: string; forceSetup: boolean }) => {
    try {
      const validatedPath = validateTargetPath(inputPath);
      const validatedDepth = validateDepth(options.depth);
      await runAnalyze(validatedPath, validatedDepth, options.forceSetup);
    } catch (error) {
      if (error instanceof ValidationError) {
        printError(`Validation error: ${error.message}`);
        process.exit(1);
      }
      throw error;
    }
  });

program
  .command('guidelines')
  .description('Generate guidelines only')
  .argument('[path]', 'Path to the project', '../')
  .option('-d, --depth <depth>', 'Analysis depth', 'standard')
  .option('--force-setup', 'Force re-run setup')
  .action(async (inputPath: string, options: { depth: string; forceSetup: boolean }) => {
    try {
      const validatedPath = validateTargetPath(inputPath);
      const validatedDepth = validateDepth(options.depth);
      const providerManager = container.get<ProviderManager>(TYPES.IProviderManager);
      const logger = container.get<ILogger>(TYPES.ILogger);
      await runGuidelinesGeneration(validatedPath, validatedDepth, false, false, providerManager, logger, options.forceSetup, false);
      printSuccess('✓ Guidelines generation complete!');
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        printError(`Validation error: ${error.message}`);
        process.exit(1);
      }
      printError(`Guidelines generation failed: ${getErrorMessage(error)}`);
      process.exit(1);
    }
  });

program
  .command('indexes')
  .description('Generate/update index files')
  .argument('[path]', 'Path to the project', '../')
  .option('--force-setup', 'Force re-run setup')
  .action(async (inputPath: string, options: { forceSetup: boolean }) => {
    try {
      const validatedPath = validateTargetPath(inputPath);
      const providerManager = container.get<ProviderManager>(TYPES.IProviderManager);
      const logger = container.get<ILogger>(TYPES.ILogger);
      await runIndexGeneration(validatedPath, false, false, providerManager, logger, options.forceSetup, false);
      printSuccess('✓ Index generation complete!');
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        printError(`Validation error: ${error.message}`);
        process.exit(1);
      }
      printError(`Index generation failed: ${getErrorMessage(error)}`);
      process.exit(1);
    }
  });

program
  .command('claude')
  .description('Generate Claude skills and agents')
  .argument('[path]', 'Path to the project', '../')
  .option('-d, --depth <depth>', 'Analysis depth', 'standard')
  .option('--force-setup', 'Force re-run setup')
  .action(async (inputPath: string, options: { depth: string; forceSetup: boolean }) => {
    try {
      const validatedPath = validateTargetPath(inputPath);
      const validatedDepth = validateDepth(options.depth);
      const providerManager = container.get<ProviderManager>(TYPES.IProviderManager);
      const logger = container.get<ILogger>(TYPES.ILogger);
      const workflow = container.get<ClaudeArtifactsWorkflow>(TYPES.IClaudeWorkflow);
      await runClaudeGeneration(validatedPath, validatedDepth, false, false, providerManager, logger, workflow, options.forceSetup, false);
      printSuccess('✓ Claude artifacts generation complete!');
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        printError(`Validation error: ${error.message}`);
        process.exit(1);
      }
      printError(`Claude artifacts generation failed: ${getErrorMessage(error)}`);
      process.exit(1);
    }
  });

async function runSetup(
  resolvedPath: string,
  depth: AnalysisDepth,
  forceSetup: boolean = false
): Promise<void> {
  printHeader();
  printInfo(`Target: ${resolvedPath}`);
  printInfo(`Depth: ${depth}`);
  printDivider();

  try {
    // Initialize provider
    printInfo('Initializing AI provider...');
    const providerManager = container.get<ProviderManager>(TYPES.IProviderManager);

    if (forceSetup) {
      await providerManager.forceSetup();
    }

    const client = await providerManager.getClient(depth);
    printSuccess('AI provider ready');
    printDivider();

    // Get dependencies from container
    const logger = container.get<ILogger>(TYPES.ILogger);
    const workflow = container.get<ClaudeArtifactsWorkflow>(TYPES.IClaudeWorkflow);

    // Run full setup workflow
    const result = await runSetupWorkflow(
      client,
      resolvedPath,
      depth,
      providerManager,
      logger,
      workflow,
      (msg) => printInfo(msg)
    );

    if (!result.success) {
      printError(`Setup failed: ${result.error}`);
      process.exit(1);
    }

    printSuccess('\n🎉 Setup complete!');
    printInfo(`\nGenerated:`);
    printInfo(`  - ${result.summary.guidelinesGenerated} guidelines`);
    printInfo(`  - ${result.summary.indexesGenerated} indexes`);
    printInfo(`  - ${result.summary.skillsGenerated} skills`);
    printInfo(`  - ${result.summary.agentsGenerated} agents`);
    printDivider();

  } catch (error: unknown) {
    printError(`Setup failed: ${getErrorMessage(error)}`);
    process.exit(1);
  }
}

async function runAnalyze(
  resolvedPath: string,
  depth: AnalysisDepth,
  forceSetup: boolean = false
): Promise<void> {
  printHeader();
  printInfo(`Target: ${resolvedPath}`);
  printInfo(`Depth: ${depth}`);
  printDivider();

  try {
    // Initialize provider
    const providerManager = container.get<ProviderManager>(TYPES.IProviderManager);
    if (forceSetup) {
      await providerManager.forceSetup();
    }

    // Get dependencies from container
    const logger = container.get<ILogger>(TYPES.ILogger);

    // Phase 1: Discovery
    printPhase(1, 'Discovery');
    const discoveryResult = await runDiscoveryPhase(resolvedPath, depth, providerManager, logger);

    if (!discoveryResult.success) {
      printError(`Discovery failed: ${discoveryResult.error}`);
      process.exit(1);
    }

    printSuccess('✓ Discovery complete');
    printDivider();

    // Phase 2: Analysis
    printPhase(2, 'Pattern Analysis');
    const analysisResult = await runAnalysisPhase(resolvedPath, discoveryResult.data, depth, false);

    if (!analysisResult.success) {
      printError(`Analysis failed: ${analysisResult.error}`);
      process.exit(1);
    }

    printSuccess('✓ Analysis complete');
    printDivider();

    // Generate analysis report
    printInfo('Generating analysis report...');
    const projectName = path.basename(resolvedPath);
    const report = generateAnalysisReport(
      projectName,
      discoveryResult.data,
      analysisResult.data
    );

    // Write report to file
    const reportPath = path.join(resolvedPath, report.fileName);
    fs.writeFileSync(reportPath, report.content, 'utf-8');

    printSuccess(`✓ Report saved: ${report.fileName}`);
    printDivider();

    printSuccess('\n🎉 Analysis complete!');
    printInfo(`\nReport: ${reportPath}`);
    printInfo(`\nNext steps:`);
    printInfo(`  - Review the analysis report`);
    printInfo(`  - Run 'npm run setup' to generate full guidelines`);
    printInfo(`  - Run 'npm run claude' to generate Claude Code skills and agents`);

  } catch (error: unknown) {
    printError(`Analysis failed: ${getErrorMessage(error)}`);
    process.exit(1);
  }
}

program.parse();
