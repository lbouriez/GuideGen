#!/usr/bin/env node

/**
 * GuideGen CLI - AI-Powered Guideline Generator
 */

import { Command } from 'commander';
import { resolve } from 'path';
import type { AnalysisDepth } from './types';
import {
  runSetupWorkflow,
  runGuidelinesGeneration,
  runIndexGeneration,
  runClaudeGeneration,
  runDiscoveryPhase,
  runAnalysisPhase,
} from './core/workflows';
import {
  printHeader,
  printPhase,
  printError,
  printSuccess,
  printInfo,
  printDivider,
} from './utils/display';
import { ProviderManager } from './providers/manager';
import { generateAnalysisReport } from './core/phases/analysis-report';
import { getErrorMessage } from './core/utils/errors';
import * as fs from 'fs';
import * as path from 'path';

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
  .action(async (path: string, options: { depth: string; forceSetup: boolean }) => {
    await runSetup(path, options.depth as AnalysisDepth, options.forceSetup);
  });

program
  .command('analyze')
  .description('Analysis only - detect patterns without generating files')
  .argument('[path]', 'Path to the project to analyze', '../')
  .option('-d, --depth <depth>', 'Analysis depth: quick, standard, thorough', 'standard')
  .option('--force-setup', 'Force re-run the AI provider setup')
  .action(async (path: string, options: { depth: string; forceSetup: boolean }) => {
    await runAnalyze(path, options.depth as AnalysisDepth, options.forceSetup);
  });

program
  .command('guidelines')
  .description('Generate guidelines only')
  .argument('[path]', 'Path to the project', '../')
  .option('-d, --depth <depth>', 'Analysis depth', 'standard')
  .option('--force-setup', 'Force re-run setup')
  .action(async (path: string, options: { depth: string; forceSetup: boolean }) => {
    try {
      await runGuidelinesGeneration(path, options.depth as AnalysisDepth, false, false, options.forceSetup, false);
      printSuccess('✓ Guidelines generation complete!');
    } catch (error: unknown) {
      printError(`Guidelines generation failed: ${getErrorMessage(error)}`);
      process.exit(1);
    }
  });

program
  .command('indexes')
  .description('Generate/update index files')
  .argument('[path]', 'Path to the project', '../')
  .option('--force-setup', 'Force re-run setup')
  .action(async (path: string, options: { forceSetup: boolean }) => {
    try {
      await runIndexGeneration(path, false, false, options.forceSetup, false);
      printSuccess('✓ Index generation complete!');
    } catch (error: unknown) {
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
  .action(async (path: string, options: { depth: string; forceSetup: boolean }) => {
    try {
      await runClaudeGeneration(path, options.depth as AnalysisDepth, false, false, options.forceSetup, false);
      printSuccess('✓ Claude artifacts generation complete!');
    } catch (error: unknown) {
      printError(`Claude artifacts generation failed: ${getErrorMessage(error)}`);
      process.exit(1);
    }
  });

async function runSetup(
  targetPath: string,
  depth: AnalysisDepth,
  forceSetup: boolean = false
): Promise<void> {
  printHeader();
  const resolvedPath = resolve(targetPath);
  printInfo(`Target: ${resolvedPath}`);
  printInfo(`Depth: ${depth}`);
  printDivider();

  try {
    // Initialize provider
    printInfo('Initializing AI provider...');
    const providerManager = ProviderManager.getInstance();

    if (forceSetup) {
      await providerManager.forceSetup();
    }

    const client = await providerManager.getClient(depth);
    printSuccess('AI provider ready');
    printDivider();

    // Run full setup workflow
    const result = await runSetupWorkflow(
      client,
      resolvedPath,
      depth,
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
  targetPath: string,
  depth: AnalysisDepth,
  forceSetup: boolean = false
): Promise<void> {
  printHeader();
  const resolvedPath = resolve(targetPath);
  printInfo(`Target: ${resolvedPath}`);
  printInfo(`Depth: ${depth}`);
  printDivider();

  try {
    // Initialize provider
    const providerManager = ProviderManager.getInstance();
    if (forceSetup) {
      await providerManager.forceSetup();
    }

    // Phase 1: Discovery
    printPhase(1, 'Discovery');
    const discoveryResult = await runDiscoveryPhase(resolvedPath, depth);

    if (!discoveryResult.success) {
      printError(`Discovery failed: ${discoveryResult.error}`);
      process.exit(1);
    }

    printSuccess('✓ Discovery complete');
    printDivider();

    // Phase 2: Analysis
    printPhase(2, 'Pattern Analysis');
    const analysisResult = await runAnalysisPhase(resolvedPath, discoveryResult.data, depth);

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
