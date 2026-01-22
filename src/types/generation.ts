/**
 * Types related to artifact generation
 */

export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  domain: 'backend' | 'frontend' | 'fullstack' | 'devops';
}

export interface WorkflowStep {
  order: number;
  action: string;
  guidelineReference?: string;
  files?: string[];
}

export interface GeneratedArtifacts {
  claudeMd: string;
  guidelines: GeneratedGuideline[];
  skills: GeneratedSkill[];
  agents: GeneratedAgent[];
}

export interface GeneratedGuideline {
  filename: string;
  path: string;
  content: string;
}

export interface GeneratedSkill {
  name: string;
  filename: string;
  content: string;
}

export interface GeneratedAgent {
  name: string;
  filename: string;
  content: string;
  triggerDescription: string;
}