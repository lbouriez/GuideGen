/**
 * Suggest Phase
 * Compare existing setup with fresh analysis and suggest improvements
 */

import { join } from 'path';
import { glob } from 'glob';
import type {
  TechProfile,
  PatternReport,
  RulesReport,
  Workflow,
  PhaseResult,
  AnalysisDepth,
} from '@/types';
import { createProviderClient } from '@/providers/manager';
import type { IProviderClient } from '@/providers/types';
import { readFileSafe, fileExists } from '../../utils/file-io';
import {
  createSpinner,
  printSuccess,
  printSection,
  printInfo,
  printWarning,
  printKeyValue,
  colors,
} from '@/utils/display';
import {
  validateGuidelineIndexes,
  printValidationResults,
  type ValidationResult,
} from '@/utils/validation';
import {
  SUGGEST_SYSTEM_PROMPT,
  SUGGEST_USER_PROMPT,
  type SuggestionsReport,
  type Suggestion,
} from './prompts';

interface ExistingSetup {
  claudeMd: string | null;
  guidelines: Array<{ path: string; content: string }>;
  skills: Array<{ path: string; content: string }>;
  agents: Array<{ path: string; content: string }>;
  hasExistingSetup: boolean;
}

interface SuggestInput {
  techProfile: TechProfile;
  patternReport: PatternReport;
  rulesReport: RulesReport;
  workflows: Workflow[];
}

export async function readExistingSetup(
  targetPath: string
): Promise<ExistingSetup> {
  const spinner = createSpinner('Reading existing Claude Code setup...');
  spinner.start();

  const setup: ExistingSetup = {
    claudeMd: null,
    guidelines: [],
    skills: [],
    agents: [],
    hasExistingSetup: false,
  };

  try {
    // Read CLAUDE.md
    setup.claudeMd = await readFileSafe(join(targetPath, 'CLAUDE.md'));
    if (setup.claudeMd) {
      setup.hasExistingSetup = true;
    }

    // Read guidelines
    const guidelineFiles = await glob('**/*.md', {
      cwd: join(targetPath, '.guidelines'),
      ignore: ['node_modules/**'],
    });

    for (const file of guidelineFiles) {
      const content = await readFileSafe(
        join(targetPath, '.guidelines', file)
      );
      if (content) {
        setup.guidelines.push({ path: `.guidelines/${file}`, content });
        setup.hasExistingSetup = true;
      }
    }

    // Read skills
    const skillFiles = await glob('*.md', {
      cwd: join(targetPath, '.claude', 'skills'),
    });

    for (const file of skillFiles) {
      const content = await readFileSafe(
        join(targetPath, '.claude', 'skills', file)
      );
      if (content) {
        setup.skills.push({ path: `.claude/skills/${file}`, content });
        setup.hasExistingSetup = true;
      }
    }

    // Read agents
    const agentFiles = await glob('*.md', {
      cwd: join(targetPath, '.claude', 'agents'),
    });

    for (const file of agentFiles) {
      const content = await readFileSafe(
        join(targetPath, '.claude', 'agents', file)
      );
      if (content) {
        setup.agents.push({ path: `.claude/agents/${file}`, content });
        setup.hasExistingSetup = true;
      }
    }

    spinner.stop();

    if (setup.hasExistingSetup) {
      printSuccess('Found existing Claude Code setup');
      printKeyValue('CLAUDE.md', setup.claudeMd ? 'Yes' : 'No');
      printKeyValue('Guidelines', `${setup.guidelines.length} files`);
      printKeyValue('Skills', `${setup.skills.length} files`);
      printKeyValue('Agents', `${setup.agents.length} files`);
    } else {
      printWarning('No existing Claude Code setup found');
      printInfo('Run "setup" command to create initial setup');
    }

    return setup;
  } catch (error) {
    spinner.stop();
    throw error;
  }
}

export async function runSuggestPhase(
  targetPath: string,
  existingSetup: ExistingSetup,
  input: SuggestInput,
  depth: AnalysisDepth
): Promise<PhaseResult<SuggestionsReport>> {
  const spinner = createSpinner('Validating guideline indexes...');
  spinner.start();

  try {
    // Step 1: Validate guideline indexes
    const validationResult = await validateGuidelineIndexes(targetPath);

    spinner.stop();

    // Print validation results
    if (validationResult.issues.length > 0) {
      printValidationResults(validationResult);
    } else {
      printSuccess('Guideline indexes are properly configured');
    }

    // Format validation issues for the prompt
    const validationIssuesText = validationResult.issues.length > 0
      ? validationResult.issues
          .map((issue) => `- [${issue.severity.toUpperCase()}] ${issue.message}\n  File: ${issue.file}${issue.suggestion ? `\n  Suggestion: ${issue.suggestion}` : ''}`)
          .join('\n')
      : undefined;

    spinner.text = 'Comparing setup with analysis...';
    spinner.start();

    const client = await createProviderClient(depth);

    const report = await client.completeWithJson<SuggestionsReport>(
      SUGGEST_SYSTEM_PROMPT,
      SUGGEST_USER_PROMPT(
        {
          claudeMd: existingSetup.claudeMd,
          guidelines: existingSetup.guidelines,
          skills: existingSetup.skills,
          agents: existingSetup.agents,
        },
        {
          techProfile: JSON.stringify(input.techProfile, null, 2),
          patterns: JSON.stringify(input.patternReport, null, 2),
          rules: JSON.stringify(input.rulesReport, null, 2),
          workflows: JSON.stringify(input.workflows, null, 2),
        },
        validationIssuesText
      )
    );

    spinner.stop();
    printSuccess('Suggestion analysis complete');

    // Print summary
    printSuggestionsSummary(report);

    return {
      success: true,
      data: report,
      humanReviewRequired: true,
      reviewPrompt: 'Would you like to apply any of these suggestions?',
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

function printSuggestionsSummary(report: SuggestionsReport): void {
  printSection('Suggestions Summary');

  printKeyValue('Total suggestions', report.summary.totalSuggestions.toString());
  printKeyValue('High priority', report.summary.highPriority.toString());
  printKeyValue('Medium priority', report.summary.mediumPriority.toString());
  printKeyValue('Low priority', report.summary.lowPriority.toString());

  console.log();
  console.log(colors.muted('Overall assessment:'));
  console.log(colors.info(`  ${report.overallAssessment}`));

  if (report.suggestions.length > 0) {
    printSection('Detailed Suggestions');

    // Group by priority
    const highPriority = report.suggestions.filter((s) => s.priority === 'high');
    const mediumPriority = report.suggestions.filter((s) => s.priority === 'medium');
    const lowPriority = report.suggestions.filter((s) => s.priority === 'low');

    if (highPriority.length > 0) {
      console.log(colors.error('\n🔴 High Priority:'));
      printSuggestionList(highPriority);
    }

    if (mediumPriority.length > 0) {
      console.log(colors.warning('\n🟡 Medium Priority:'));
      printSuggestionList(mediumPriority);
    }

    if (lowPriority.length > 0) {
      console.log(colors.muted('\n🟢 Low Priority:'));
      printSuggestionList(lowPriority);
    }
  }
}

function printSuggestionList(suggestions: Suggestion[]): void {
  suggestions.forEach((s, i) => {
    console.log();
    console.log(colors.subtitle(`  ${i + 1}. [${s.category}] ${s.description}`));
    console.log(colors.muted(`     Current: ${s.currentState}`));
    console.log(colors.info(`     Suggested: ${s.suggestedChange}`));
    console.log(colors.code(`     File: ${s.fileToModify}`));
  });
}

export function formatSuggestionForApply(suggestion: Suggestion): string {
  return `## ${suggestion.description}

**Category**: ${suggestion.category}
**Priority**: ${suggestion.priority}
**File**: ${suggestion.fileToModify}

### Current State
${suggestion.currentState}

### Suggested Change
${suggestion.suggestedChange}

${suggestion.suggestedContent ? `### Suggested Content\n\`\`\`markdown\n${suggestion.suggestedContent}\n\`\`\`` : ''}
`;
}
