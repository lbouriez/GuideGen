/**
 * Types for phase execution and wizard state
 */

import type { TechProfile } from './tech-profile';
import type { PatternReport } from './patterns';
import type { RulesReport, Workflow } from './rules';
import type { GeneratedArtifacts } from './claude-artifacts';

export type AnalysisDepth = 'quick' | 'standard' | 'thorough';

export type RunMode = 'setup' | 'analyze' | 'suggest';

export interface CliOptions {
  mode: RunMode;
  targetPath: string;
  depth: AnalysisDepth;
  interactive: boolean;
  outputDir?: string;
}

export type PhaseResult<T> =
  | {
      success: true;
      data: T;
      humanReviewRequired?: boolean;
      reviewPrompt?: string;
    }
  | {
      success: false;
      error: string;
      humanReviewRequired: false;
    };

export interface WizardState {
  targetPath: string;
  options: CliOptions;
  techProfile?: TechProfile;
  patternReport?: PatternReport;
  rulesReport?: RulesReport;
  workflows?: Workflow[];
  artifacts?: GeneratedArtifacts;
  userApprovals: {
    techProfile: boolean;
    patterns: boolean;
    rules: boolean;
    artifacts: boolean;
  };
}
