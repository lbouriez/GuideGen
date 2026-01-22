/**
 * Types for rules and workflows
 */

export interface Rule {
  id: string;
  description: string;
  category: 'critical' | 'important' | 'recommended';
  domain: 'backend' | 'frontend' | 'shared' | 'all';
  enforceable: boolean;
  doExample?: string;
  dontExample?: string;
}

export interface RulesReport {
  rules: Rule[];
  existingLinterRules: string[];
}

export interface WorkflowStep {
  order: number;
  action: string;
  guidelineReference?: string;
  files?: string[];
}

export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  domain: 'backend' | 'frontend' | 'fullstack' | 'devops';
}

export interface ExtractedRule {
  id: string;
  description: string;
  category: 'critical' | 'important' | 'recommended';
  domain?: 'backend' | 'frontend' | 'shared' | 'all';
  enforceable: boolean;
  type?: string;
  steps?: WorkflowStep[];
  goodExample?: string;
  badExample?: string;
  example?: string;
}
