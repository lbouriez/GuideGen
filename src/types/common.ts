/**
 * Common types shared across the application
 */

// Re-export to avoid duplication
export type { TechStack, FolderStructure } from './tech-profile';

export type RunMode = 'setup' | 'analyze' | 'suggest' | 'update';

export type UpdateMode = 'override' | 'update' | 'cancel';

export interface CliOptions {
  mode: RunMode;
  targetPath: string;
  interactive: boolean;
  outputDir?: string;
}