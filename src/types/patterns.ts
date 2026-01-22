/**
 * Types for code pattern analysis
 */

export interface CodePattern {
  name: string;
  description: string;
  examples: string[];
  files: string[];
  frequency: 'always' | 'common' | 'occasional';
}

/**
 * Pattern summary with list and description
 */
export interface PatternSummary {
  patterns: CodePattern[];
  summary: string;
}

/**
 * Testing framework configuration
 */
export interface TestingConfig {
  framework: string;
  hasTestFolder: boolean;
  testFilePattern: string;
}

/**
 * Type system configuration
 */
export interface TypeConfig {
  hasTypeScript: boolean;
  strictMode: boolean;
  usesGenerics: boolean;
}

/**
 * Configuration pattern
 */
export interface ConfigPattern {
  type: string;
  files: string[];
  description: string;
}

/**
 * Backend-specific patterns
 */
export interface BackendPatterns {
  architecture?: PatternSummary;
  apiPatterns?: PatternSummary;
  database?: PatternSummary;
  authentication?: PatternSummary;
  errorHandling?: PatternSummary;
  logging?: PatternSummary;
  testing?: TestingConfig;
  importPatterns?: PatternSummary;
  namingConventions?: PatternSummary;
  types?: TypeConfig;
  configuration?: ConfigPattern;
}

/**
 * Frontend-specific patterns
 */
export interface FrontendPatterns {
  componentPatterns?: PatternSummary;
  stateManagement?: PatternSummary;
  routing?: PatternSummary;
  styling?: PatternSummary;
  performance?: PatternSummary;
  testing?: TestingConfig;
  importPatterns?: PatternSummary;
  namingConventions?: PatternSummary;
  types?: TypeConfig;
  configuration?: ConfigPattern;
}

/**
 * Shared patterns across domains
 */
export interface SharedPatterns {
  importPatterns?: PatternSummary;
  namingConventions?: PatternSummary;
  types?: TypeConfig;
  configuration?: ConfigPattern;
  folderStructure?: PatternSummary;
}

/**
 * Complete pattern report
 */
export interface PatternReport {
  importPatterns?: CodePattern[];
  namingConventions?: CodePattern[];
  architecturePatterns?: CodePattern[];
  stateManagement?: CodePattern[];
  errorHandling?: CodePattern[];
  loggingPatterns?: CodePattern[];
  backend?: BackendPatterns;
  frontend?: FrontendPatterns;
  shared?: SharedPatterns;
}
