/**
 * Transform flat PatternReport into domain-grouped structure
 * Bridges Phase 2 (flat arrays) and Phase 3 (domain objects)
 */

import type {
  PatternReport,
  TechProfile,
  PatternSummary,
  TestingConfig,
  TypeConfig,
  ConfigPattern
} from '@/types';

/**
 * Transform flat pattern arrays into domain-grouped structure
 */
export function transformPatterns(
  flatPatterns: PatternReport,
  techProfile: TechProfile
): PatternReport {
  const transformed: PatternReport = {
    ...flatPatterns, // Keep original flat structure for compatibility
  };

  // Determine project type and count from tech profile
  const projectType = techProfile.projects?.[0]?.type || 'unknown';
  const projectCount = techProfile.projects?.length || 1;
  const isMonorepo = techProfile.isMonorepo || techProfile.structure?.isMonorepo || false;
  const hasMultipleProjects = isMonorepo || projectCount > 1;

  const isBackend = projectType === 'backend';
  const isFrontend = projectType === 'frontend';

  // Group patterns by domain based on project type
  if (isBackend) {
    transformed.backend = {
      architecture: findPattern(flatPatterns, 'architecturePatterns'),
      errorHandling: findPattern(flatPatterns, 'errorHandling'),
      logging: findPattern(flatPatterns, 'loggingPatterns'),
      testing: detectTesting(techProfile),
    };
  }

  if (isFrontend) {
    transformed.frontend = {
      componentPatterns: findPattern(flatPatterns, 'architecturePatterns'),
      stateManagement: findPattern(flatPatterns, 'stateManagement'),
      testing: detectTesting(techProfile),
    };
  }

  // Shared patterns only make sense with multiple projects (monorepo/multi-project)
  // For single projects, merge shared patterns into the main domain instead
  if (hasMultipleProjects) {
    transformed.shared = {
      importPatterns: findPattern(flatPatterns, 'importPatterns'),
      namingConventions: findPattern(flatPatterns, 'namingConventions'),
      types: detectTypeUsage(techProfile),
      configuration: detectConfiguration(techProfile),
    };
  } else {
    // Single project: add shared patterns to the main domain
    const sharedPatterns = {
      importPatterns: findPattern(flatPatterns, 'importPatterns'),
      namingConventions: findPattern(flatPatterns, 'namingConventions'),
      types: detectTypeUsage(techProfile),
      configuration: detectConfiguration(techProfile),
    };

    if (isBackend && transformed.backend) {
      transformed.backend = { ...transformed.backend, ...sharedPatterns };
    } else if (isFrontend && transformed.frontend) {
      transformed.frontend = { ...transformed.frontend, ...sharedPatterns };
    }
  }

  return transformed;
}

/**
 * Find a pattern category in the flat structure
 */
function findPattern(patterns: PatternReport, key: string): PatternSummary | undefined {
  const value = (patterns as Record<string, unknown>)[key];
  if (!value) return undefined;

  // If it's an array of patterns, convert to summary object
  if (Array.isArray(value) && value.length > 0) {
    return {
      patterns: value,
      summary: value.map(p => p.name).join(', ')
    };
  }

  return value as PatternSummary | undefined;
}

/**
 * Detect testing patterns from tech profile
 */
function detectTesting(techProfile: TechProfile): TestingConfig | undefined {
  const testing = techProfile.stack.testingFrameworks;
  if (!testing || testing.length === 0) return undefined;

  return {
    framework: testing[0],
    hasTestFolder: true,
    testFilePattern: '**/*.{test,spec}.{ts,tsx,js,jsx}'
  };
}

/**
 * Detect TypeScript usage
 */
function detectTypeUsage(techProfile: TechProfile): TypeConfig | undefined {
  const hasTypeScript = techProfile.stack.languages.includes('typescript');
  if (!hasTypeScript) return undefined;

  return {
    hasTypeScript: true,
    strictMode: false, // Would need to parse tsconfig.json to determine
    usesGenerics: false // Would need code analysis to determine
  };
}

/**
 * Detect configuration patterns
 */
function detectConfiguration(techProfile: TechProfile): ConfigPattern | undefined {
  const hasConfig = techProfile.stack.buildTools.length > 0 ||
                   techProfile.stack.frameworks.length > 0;
  if (!hasConfig) return undefined;

  return {
    type: 'build-tools',
    files: techProfile.structure?.configFiles || [],
    description: `Using ${techProfile.stack.buildTools.join(', ')}`
  };
}
