/**
 * Phase 3: Extraction
 * Convert patterns into enforceable rules and workflows
 */

import { join } from 'path';
import type {
  TechProfile,
  PatternReport,
  RulesReport,
  Workflow,
  PhaseResult,
  AnalysisDepth,
} from '@/types';
import { createProviderClient } from '@/providers/manager';
import { readFileSafe } from '../../utils/file-io';
import {
  createSpinner,
  printSuccess,
  printSection,
  printList,
  printKeyValue,
} from '@/utils/display';
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_USER_PROMPT,
} from './prompts';

interface ExtractionResult {
  rules: RulesReport;
  workflows: Workflow[];
}

export async function runExtractionPhase(
  targetPath: string,
  techProfile: TechProfile,
  patternReport: PatternReport,
  depth: AnalysisDepth,
  debug: boolean = false
): Promise<PhaseResult<ExtractionResult>> {
  const spinner = createSpinner('Reading linter configuration...');
  spinner.start();

  try {
    // Try to read linter configs
    const linterConfig = await readLinterConfig(targetPath);

    spinner.text = 'Converting patterns to rules...';

    // Use AI provider to extract rules and workflows
    const client = await createProviderClient(depth);
    const result = await client.completeWithJson<{
      rules: RulesReport['rules'];
      workflows: Workflow[];
      existingLinterRules: string[];
    }>(
      EXTRACTION_SYSTEM_PROMPT,
      EXTRACTION_USER_PROMPT(
        JSON.stringify(techProfile, null, 2),
        JSON.stringify(patternReport, null, 2),
        linterConfig
      )
    );

    const extractionResult: ExtractionResult = {
      rules: {
        rules: result.rules,
        existingLinterRules: result.existingLinterRules || [],
      },
      workflows: result.workflows,
    };

    spinner.stop();
    printSuccess('Extraction phase complete');

    // Print summary
    printRulesSummary(extractionResult);

    return {
      success: true,
      data: extractionResult,
      humanReviewRequired: true,
      reviewPrompt:
        'Please review the extracted rules. Do these capture your conventions? (y/n)',
    };
  } catch (error) {
    spinner.stop();
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      humanReviewRequired: false,
    };
  }
}

async function readLinterConfig(targetPath: string): Promise<string> {
  const configFiles = [
    '.eslintrc.json',
    '.eslintrc.js',
    '.eslintrc',
    'eslint.config.js',
    'eslint.config.mjs',
    '.prettierrc',
    '.prettierrc.json',
    'prettier.config.js',
  ];

  const configs: string[] = [];

  for (const file of configFiles) {
    const content = await readFileSafe(join(targetPath, file));
    if (content) {
      configs.push(`### ${file}\n${content}`);
    }
  }

  return configs.join('\n\n') || 'No linter configuration found';
}

function printRulesSummary(result: ExtractionResult): void {
  const { rules, workflows } = result;

  printSection('Rules by Category');

  const critical = rules.rules.filter((r) => r.category === 'critical');
  const important = rules.rules.filter((r) => r.category === 'important');
  const recommended = rules.rules.filter((r) => r.category === 'recommended');

  if (critical.length > 0) {
    printKeyValue('Critical', `${critical.length} rules`);
    printList(critical.map((r) => r.description));
  }

  if (important.length > 0) {
    printKeyValue('Important', `${important.length} rules`);
    printList(important.map((r) => r.description));
  }

  if (recommended.length > 0) {
    printKeyValue('Recommended', `${recommended.length} rules`);
    printList(recommended.map((r) => r.description));
  }

  const enforceable = rules.rules.filter((r) => r.enforceable);
  printKeyValue('Enforceable (for agents)', `${enforceable.length} rules`);

  printSection('Workflows Detected');
  printList(workflows.map((w) => `${w.name} (${w.steps.length} steps)`));
}