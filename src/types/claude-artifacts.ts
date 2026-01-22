/**
 * Types for Claude-specific skills and agents
 */

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

export interface GeneratedArtifacts {
  claudeMd: string;
  guidelines: import('./guidelines').GeneratedGuideline[];
  skills: GeneratedSkill[];
  agents: GeneratedAgent[];
}
