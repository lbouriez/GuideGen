/**
 * Types for tech stack and project structure
 */

export interface TechStack {
  languages: string[];
  frameworks: string[];
  buildTools: string[];
  testingFrameworks: string[];
  linters: string[];
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';
}

export interface FolderStructure {
  root: string;
  directories: string[];
  keyFiles: string[];
  configFiles: string[];
}

export interface ProjectInfo {
  name: string;
  path: string;
  type: 'frontend' | 'backend' | 'shared' | 'website' | 'mobile' | 'unknown';
  stack: Partial<TechStack>;
}

export interface TechProfile {
  stack: TechStack;
  structure?: FolderStructure & {
    isMonorepo?: boolean;
  };
  isMonorepo?: boolean;
  projects?: ProjectInfo[];
  languages?: string[];
  frameworks?: string[];
  tools?: string[];
}
