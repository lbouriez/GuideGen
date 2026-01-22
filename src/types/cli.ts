/**
 * CLI-specific types
 */

import type { CliOptions } from './common';
import type { TechProfile, PatternReport, RulesReport as AnalysisRulesReport } from './analysis';
import type { Workflow, GeneratedArtifacts } from './generation';

export interface WizardState {
  targetPath: string;
  options: CliOptions;
  techProfile?: TechProfile;
  patternReport?: PatternReport;
  rulesReport?: AnalysisRulesReport;
  workflows?: Workflow[];
  artifacts?: GeneratedArtifacts;
  userApprovals: {
    techProfile: boolean;
    patterns: boolean;
    rules: boolean;
    artifacts: boolean;
  };
}