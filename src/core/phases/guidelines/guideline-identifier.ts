/**
 * AI-driven guideline identification
 * Let AI decide which guidelines to create based on actual codebase
 */

import type { IProviderClient } from '@/providers/types';
import type { ILogger } from '../../../interfaces/services/ILogger';
import type { PatternReport, FolderStructure, GuidelineDomain } from '@/types';
import { toGuidelineDomain } from '@/types';

export interface GuidelineToGenerate {
  domain: GuidelineDomain;
  type: string;
  priority: number;
  description?: string;
}

/**
 * Get recommended guideline count based on project size and complexity
 */
function getRecommendedGuidelineCount(
  techStack: string[],
  fileCount: number
): { min: number; max: number; target: string } {
  // Small projects (< 50 files)
  if (fileCount < 50) {
    return { min: 3, max: 6, target: '3-6' };
  }

  // Medium projects (50-200 files)
  if (fileCount < 200) {
    return { min: 5, max: 10, target: '5-10' };
  }

  // Large projects (200+ files) or multi-framework
  if (fileCount >= 200 || techStack.length > 5) {
    return { min: 8, max: 15, target: '8-15' };
  }

  // Default
  return { min: 5, max: 10, target: '5-10' };
}

const IDENTIFICATION_SYSTEM_PROMPT = `You are a code documentation expert and software architect analyzing a codebase to identify which specific technical patterns should be documented.

Your task: Based on the detected frameworks and project structure, identify the MOST IMPORTANT technical patterns that have clear implementation code to document.

IMPORTANT: The number of guidelines should match the project's complexity. Don't force a specific count.

CORE PRINCIPLES:
1. **Document implementations, not concepts** - Only suggest patterns where actual code exists
2. **Framework-specific patterns** - Adapt suggestions based on detected tech stack
3. **Observable patterns only** - Must be visible in file paths/structure/patterns
4. **Avoid generic advice** - No "best practices" that apply to every project
5. **Avoid contradictions** - If a codebase uses BOTH path aliases AND relative imports, create ONE guideline documenting both, not two contradicting guidelines
6. **Skip trivial naming conventions** - Do NOT create separate guidelines for "camelCase" or "PascalCase" unless there's a specific project convention (e.g., "Service suffix for all service classes")

GUIDELINE SELECTION STRATEGY:

For each detected framework, identify its characteristic patterns:

**Backend Frameworks:**
- Express: middleware patterns, route organization, error handling middleware
- NestJS: decorators (@Injectable, @Controller), module system, guards/interceptors
- Fastify: plugin system, hooks, schema validation

**Frontend Frameworks:**
- React: component patterns, hooks usage, context/state management
- Vue: composition API, Pinia stores, directives
- Angular: services, dependency injection, modules, RxJS patterns

**Build Tools:**
- TypeScript: path aliases, strict mode configuration, type patterns
- Webpack/Vite: custom plugins, environment configs

**Testing:**
- Vitest/Jest: test organization, mocking patterns, fixture usage
- Playwright: page object models, test structure

**Other Patterns:**
- GraphQL: schema patterns, resolver organization
- Database: ORM patterns, migration structure, query builders
- Authentication: strategy patterns, middleware usage

DOMAIN ASSIGNMENT:
- "backend" → Server-side patterns (routes, services, DB, API)
- "frontend" → UI patterns (components, state, rendering)
- "testing" → Test patterns (any test framework)
- "all" → Applies everywhere (TypeScript config, build tools)

OUTPUT FORMAT:
Return specific, technical pattern names like:
- "express-middleware" (not "middleware")
- "inversify-di" (not "dependency-injection")
- "zod-validation" (not "validation")
- "react-hooks" (not "hooks")
- "typescript-imports" or "module-imports" (not separate "path-aliases" AND "relative-imports" - combine them!)

SPECIAL RULES FOR COMMON PATTERNS:
- **Imports**: If codebase uses both path aliases and relative imports, create ONE "typescript-imports" or "module-imports" guideline documenting both styles
- **Naming**: Only create naming guidelines if there's a SPECIFIC convention (e.g., "service-naming" for "XxxService" suffix pattern), NOT generic camelCase/PascalCase
- **File organization**: Only if there's a specific pattern (e.g., "feature-folders" for specific folder structure), NOT generic "organize your files"

Be specific about the framework/library in the guideline name.`;

function IDENTIFICATION_USER_PROMPT(
  projectType: string,
  techStack: string,
  patterns: string,
  projectStructure: string,
  guidelineCountTarget: string
): string {
  return `Analyze this ${projectType} codebase and identify ${guidelineCountTarget} specific technical patterns to document.

**IMPORTANT**: Aim for ${guidelineCountTarget} guidelines, but quality > quantity. If the project only has 4 clear patterns, return 4. If it has 12, return 12. The range is a guide, not a requirement.

## Tech Stack
${techStack}

## Detected Patterns
${patterns}

## Project Structure (sample)
${projectStructure}

## Your Task

Based on the tech stack and patterns above, identify which framework-specific patterns should be documented.

For each framework/library detected:
1. Identify its characteristic implementation patterns
2. Look for evidence in file paths and detected patterns
3. Suggest specific guideline names (include framework name)
4. Assign appropriate domain (backend/frontend/testing/all)

**Example thought process:**
- See "inversify" in tech stack → Look for DI container files → Suggest "inversify-di"
- See "express" in frameworks → Look for middleware → Suggest "express-middleware"
- See "zod" in dependencies → Look for schema files → Suggest "zod-validation"
- See "react" in frameworks → Look for hooks → Suggest "react-hooks"
- See "vitest" in test tools → Look for test patterns → Suggest "vitest-testing"
- See both path aliases and relative imports → Suggest ONE "typescript-imports" guideline (not two separate ones)
- See "Service" suffix pattern → Suggest "service-naming" (specific convention, not generic camelCase)

**Domain rules:**
- Backend server patterns → "backend"
- UI/component patterns → "frontend"
- Test patterns → "testing"
- Build/config (applies to all) → "all"

Return JSON:
{
  "guidelines": [
    {
      "domain": "backend",
      "type": "framework-specific-pattern-name",
      "priority": 1,
      "description": "Brief technical description"
    }
  ]
}

Focus on patterns where actual implementation code exists.
Name guidelines specifically (e.g., "express-routes", not "routing").

CRITICAL - DO NOT CREATE THESE GENERIC GUIDELINES:
- ❌ "camelCase-naming" or "PascalCase-naming" (too generic)
- ❌ "path-aliases" AND "relative-imports" separately (combine into one "typescript-imports")
- ❌ "file-organization" or "folder-structure" (unless there's a specific pattern like "feature-folders")
- ❌ "layer-separation" (too abstract unless there's a specific layering framework)`;
}

/**
 * Use AI to identify which guidelines should be created
 */
export async function identifyGuidelinesWithAI(
  client: IProviderClient,
  patterns: PatternReport,
  techProfile: { projects?: Array<{ type: string }>; stack: { languages: string[]; frameworks: string[]; buildTools: string[]; testingFrameworks?: string[] } },
  projectStructure: FolderStructure,
  logger?: ILogger
): Promise<GuidelineToGenerate[]> {
  // Create a no-op logger if none provided
  const safeLogger = logger || {
    warn: () => {},
    info: () => {},
    error: () => {},
    debug: () => {},
    log: () => {}
  };

  try {
    // Prepare inputs
    const projectType = techProfile.projects?.[0]?.type || 'unknown';
    const techStackArray = [
      ...techProfile.stack.languages,
      ...techProfile.stack.frameworks,
      ...techProfile.stack.buildTools,
      ...(techProfile.stack.testingFrameworks || [])
    ];
    const techStack = techStackArray.join(', ');

    // Calculate recommended guideline count based on project size
    const fileCount = projectStructure.keyFiles.length + (projectStructure.configFiles?.length || 0);
    const countRecommendation = getRecommendedGuidelineCount(techStackArray, fileCount);

    safeLogger.debug(`Project has ${fileCount} files, recommending ${countRecommendation.target} guidelines`);

    // Format patterns summary
    const patternsSummary = [
      patterns.importPatterns?.map(p => `- Import: ${p.name}`).join('\n'),
      patterns.namingConventions?.map(p => `- Naming: ${p.name}`).join('\n'),
      patterns.architecturePatterns?.map(p => `- Architecture: ${p.name}`).join('\n'),
      patterns.testingPatterns?.map(p => `- Testing: ${p.name}`).join('\n'),
      patterns.errorHandling?.map(p => `- Error Handling: ${p.name}`).join('\n'),
      patterns.loggingPatterns?.map(p => `- Logging: ${p.name}`).join('\n'),
      patterns.stateManagement?.map(p => `- State Management: ${p.name}`).join('\n'),
    ].filter(Boolean).join('\n') || '(No patterns detected)';

    // Format project structure (sample)
    const structureSummary = [
      'Key Files:',
      ...projectStructure.keyFiles.slice(0, 15).map(f => `  - ${f}`),
      '',
      'Directories:',
      ...projectStructure.directories.slice(0, 20).map(d => `  - ${d}`),
    ].join('\n');

    // Ask AI to identify guidelines
    const response = await client.completeWithJson<{
      guidelines: Array<{
        domain: string;
        type: string;
        priority: number;
        description?: string;
      }>;
    }>(
      IDENTIFICATION_SYSTEM_PROMPT,
      IDENTIFICATION_USER_PROMPT(projectType, techStack, patternsSummary, structureSummary, countRecommendation.target)
    );

    const guidelines = (response.guidelines || []).map(g => ({
      ...g,
      domain: toGuidelineDomain(g.domain)
    }));

    if (guidelines.length === 0) {
      safeLogger.warn('AI returned no guidelines, using fallback');
      return getFallbackGuidelines(projectType);
    }

    safeLogger.info(`AI identified ${guidelines.length} guidelines: ${guidelines.map(g => g.type).join(', ')}`);

    return guidelines;
  } catch (error) {
    safeLogger.error('Guideline identification failed, using fallback', error);
    const projectType = techProfile.projects?.[0]?.type || 'unknown';
    return getFallbackGuidelines(projectType);
  }
}

/**
 * Fallback guidelines if AI identification fails
 */
function getFallbackGuidelines(projectType: string): GuidelineToGenerate[] {
  const domain = toGuidelineDomain(projectType);
  const base: GuidelineToGenerate[] = [
    { domain, type: 'project-structure', priority: 1 },
    { domain, type: 'code-organization', priority: 1 },
  ];

  if (projectType === 'backend') {
    return [
      ...base,
      { domain: 'backend', type: 'architecture', priority: 1 },
      { domain: 'backend', type: 'error-handling', priority: 2 },
      { domain: 'backend', type: 'testing', priority: 2 },
    ];
  }

  if (projectType === 'frontend') {
    return [
      ...base,
      { domain: 'frontend', type: 'component-patterns', priority: 1 },
      { domain: 'frontend', type: 'state-management', priority: 2 },
    ];
  }

  return base;
}
