/**
 * Guidelines generation logic
 */

import type { IProviderClient } from '@/providers/types';
import type { ILogger } from '../../../interfaces/services/ILogger';
import type { PatternReport, GeneratedGuideline, FolderStructure, TechProfile } from '@/types';
import { GUIDELINE_SYSTEM_PROMPT, GUIDELINE_USER_PROMPT } from './prompts';
import { selectAndReadFiles } from './file-selector';
import { identifyGuidelinesWithAI, type GuidelineToGenerate } from './guideline-identifier';

export type { GuidelineToGenerate };

// Old hardcoded identification removed - now using AI-driven identification

/**
 * Determine optimal number of files to read based on guideline type and tech stack
 */
function determineMaxFiles(guideline: GuidelineToGenerate, techProfile: TechProfile): number {
  const guidelineType = guideline.type.toLowerCase();

  // Testing guidelines need more context to show proper test patterns
  if (guidelineType.includes('test') || guidelineType.includes('testing')) {
    // If testing frameworks detected, be even more generous
    if (techProfile.stack.testingFrameworks && techProfile.stack.testingFrameworks.length > 0) {
      return 20; // 2x context for testing with frameworks
    }
    return 15; // 1.5x context for testing without frameworks
  }

  // Mocking strategies also benefit from more test examples
  if (guidelineType.includes('mock')) {
    return 15;
  }

  // Architecture, patterns, organization guidelines benefit from more variety
  if (guidelineType.includes('architecture') ||
      guidelineType.includes('organization') ||
      guidelineType.includes('pattern')) {
    return 12;
  }

  // Default for most guidelines
  return 10;
}

/**
 * Generate a single guideline using AI
 */
export async function generateGuideline(
  client: IProviderClient,
  guideline: GuidelineToGenerate,
  patterns: PatternReport,
  targetPath: string,
  projectStructure: FolderStructure,
  techProfile: TechProfile
): Promise<GeneratedGuideline> {
  // Determine optimal number of files based on guideline type and tech stack
  const maxFiles = determineMaxFiles(guideline, techProfile);

  // Let AI select and read relevant files for this guideline
  const codeExamples = await selectAndReadFiles(
    client,
    targetPath,
    projectStructure,
    guideline.type,
    guideline.domain,
    maxFiles
  );

  // Extract relevant patterns
  const relevantPatterns = extractRelevantPatterns(patterns, guideline);

  // Generate guideline content with REAL code examples and tech stack validation
  const response = await client.sendMessage(
    GUIDELINE_SYSTEM_PROMPT,
    GUIDELINE_USER_PROMPT(guideline.domain, guideline.type, relevantPatterns, codeExamples, techProfile)
  );

  return {
    domain: guideline.domain,
    type: guideline.type,
    fileName: `${guideline.type}.md`,
    content: response.content,
    priority: guideline.priority
  };
}

/**
 * Extract backend-specific patterns
 */
function extractBackendPatterns(patterns: PatternReport, guideline: GuidelineToGenerate): string {
  if (guideline.domain !== 'backend' || !patterns.backend) {
    return '';
  }

  const backend = patterns.backend;
  const relevant: string[] = [];

  switch (guideline.type) {
    case 'architecture':
      if (backend.architecture) {
        relevant.push(`Architecture: ${JSON.stringify(backend.architecture, null, 2)}`);
      }
      break;
    case 'api-design':
      if (backend.apiPatterns) {
        relevant.push(`API Patterns: ${JSON.stringify(backend.apiPatterns, null, 2)}`);
      }
      break;
    case 'database':
      if (backend.database) {
        relevant.push(`Database: ${JSON.stringify(backend.database, null, 2)}`);
      }
      break;
    case 'auth-security':
      if (backend.authentication) {
        relevant.push(`Auth: ${JSON.stringify(backend.authentication, null, 2)}`);
      }
      break;
    case 'error-handling':
      if (backend.errorHandling) {
        relevant.push(`Error Handling: ${JSON.stringify(backend.errorHandling, null, 2)}`);
      }
      break;
    case 'logging':
      if (backend.logging) {
        relevant.push(`Logging: ${JSON.stringify(backend.logging, null, 2)}`);
      }
      break;
    case 'testing':
      if (backend.testing) {
        relevant.push(`Testing: ${JSON.stringify(backend.testing, null, 2)}`);
      }
      break;
  }

  return relevant.join('\n\n');
}

/**
 * Extract frontend-specific patterns
 */
function extractFrontendPatterns(patterns: PatternReport, guideline: GuidelineToGenerate): string {
  if (guideline.domain !== 'frontend' || !patterns.frontend) {
    return '';
  }

  const frontend = patterns.frontend;
  const relevant: string[] = [];

  switch (guideline.type) {
    case 'components':
      if (frontend.componentPatterns) {
        relevant.push(`Components: ${JSON.stringify(frontend.componentPatterns, null, 2)}`);
      }
      break;
    case 'state-management':
      if (frontend.stateManagement) {
        relevant.push(`State: ${JSON.stringify(frontend.stateManagement, null, 2)}`);
      }
      break;
    case 'routing':
      if (frontend.routing) {
        relevant.push(`Routing: ${JSON.stringify(frontend.routing, null, 2)}`);
      }
      break;
    case 'styling':
      if (frontend.styling) {
        relevant.push(`Styling: ${JSON.stringify(frontend.styling, null, 2)}`);
      }
      break;
    case 'performance':
      if (frontend.performance) {
        relevant.push(`Performance: ${JSON.stringify(frontend.performance, null, 2)}`);
      }
      break;
    case 'testing':
      if (frontend.testing) {
        relevant.push(`Testing: ${JSON.stringify(frontend.testing, null, 2)}`);
      }
      break;
  }

  return relevant.join('\n\n');
}

/**
 * Extract shared patterns
 */
function extractSharedPatterns(patterns: PatternReport, guideline: GuidelineToGenerate): string {
  if (guideline.domain !== 'shared' || !patterns.shared) {
    return '';
  }

  const shared = patterns.shared;
  const relevant: string[] = [];

  switch (guideline.type) {
    case 'organization':
      if (shared.importPatterns) {
        relevant.push(`Imports: ${JSON.stringify(shared.importPatterns, null, 2)}`);
      }
      if (shared.folderStructure) {
        relevant.push(`Structure: ${JSON.stringify(shared.folderStructure, null, 2)}`);
      }
      break;
    case 'naming':
      if (shared.namingConventions) {
        relevant.push(`Naming: ${JSON.stringify(shared.namingConventions, null, 2)}`);
      }
      break;
    case 'types':
      if (shared.types) {
        relevant.push(`Types: ${JSON.stringify(shared.types, null, 2)}`);
      }
      break;
    case 'configuration':
      if (shared.configuration) {
        relevant.push(`Config: ${JSON.stringify(shared.configuration, null, 2)}`);
      }
      break;
  }

  return relevant.join('\n\n');
}

/**
 * Extract patterns relevant to a specific guideline
 */
function extractRelevantPatterns(patterns: PatternReport, guideline: GuidelineToGenerate): string {
  const backendPatterns = extractBackendPatterns(patterns, guideline);
  const frontendPatterns = extractFrontendPatterns(patterns, guideline);
  const sharedPatterns = extractSharedPatterns(patterns, guideline);

  return [backendPatterns, frontendPatterns, sharedPatterns]
    .filter(p => p.length > 0)
    .join('\n\n');
}

/**
 * Generate all guidelines
 */
export async function generateAllGuidelines(
  client: IProviderClient,
  patterns: PatternReport,
  targetPath: string,
  projectStructure: FolderStructure,
  techProfile: TechProfile,
  logger?: ILogger,
  onProgress?: (current: number, total: number, guideline: string) => void
): Promise<GeneratedGuideline[]> {
  // Use AI to identify which guidelines to create based on actual codebase
  if (onProgress) {
    onProgress(0, 1, 'Identifying guidelines from codebase...');
  }

  const toGenerate = await identifyGuidelinesWithAI(
    client,
    patterns,
    techProfile,
    projectStructure,
    logger
  );

  const results: GeneratedGuideline[] = [];

  for (let i = 0; i < toGenerate.length; i++) {
    const guideline = toGenerate[i];
    if (onProgress) {
      onProgress(i + 1, toGenerate.length, `${guideline.domain}/${guideline.type}`);
    }

    const generated = await generateGuideline(
      client,
      guideline,
      patterns,
      targetPath,
      projectStructure,
      techProfile
    );
    results.push(generated);
  }

  return results;
}
