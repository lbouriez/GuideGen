/**
 * Types related to code analysis and patterns
 */

import type { TechStack, FolderStructure } from './common';

export interface TechProfile {
  stack: TechStack;
  structure: FolderStructure;
  isMonorepo: boolean;
  projects: ProjectInfo[];
}

export interface ProjectInfo {
  name: string;
  path: string;
  type: 'frontend' | 'backend' | 'shared' | 'website' | 'mobile' | 'unknown';
  stack: Partial<TechStack>;
}

export interface CodePattern {
  name: string;
  description: string;
  examples: string[];
  files: string[];
  frequency: 'always' | 'common' | 'occasional';
}

export interface PatternReport {
  importPatterns?: CodePattern[];
  namingConventions?: CodePattern[];
  architecturePatterns?: CodePattern[];
  stateManagement?: CodePattern[];
  errorHandling?: CodePattern[];
  loggingPatterns?: CodePattern[];
  testingPatterns?: CodePattern[];
}

// Re-export to avoid duplication
export type { Rule, RulesReport } from './rules';