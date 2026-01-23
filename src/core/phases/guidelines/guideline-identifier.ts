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

const IDENTIFICATION_SYSTEM_PROMPT = `You are a code documentation expert analyzing a codebase to identify which specific guidelines should be created.

Your task: Analyze the project structure, detected patterns, and tech stack to determine which SPECIFIC guideline topics are most relevant.

CRITICAL RULES:
1. Suggest SPECIFIC topics based on what you actually see in the codebase
2. DO NOT use generic topics like "architecture" or "error-handling"
3. Focus on CONCRETE patterns: "dependency-injection", "cli-commands", "provider-pattern", etc.
4. Suggest 5-12 guidelines depending on project complexity
5. Each guideline should document a specific, observable pattern

DOMAIN ASSIGNMENT RULES (VERY IMPORTANT - BE CONSISTENT):
- Testing frameworks/patterns → domain: "testing" (vitest, jest, mocha, test patterns)
- Backend API/architecture patterns → domain: "backend" (routes, services, DI, providers, phases)
- Frontend UI/component patterns → domain: "frontend" (components, hooks, state, styling)
- Build/tooling → domain: "tooling" (webpack, vite, typescript config)
- Shared/common → domain: "shared" (ONLY if monorepo with multiple projects)

Example GOOD suggestions with correct domains:
- { domain: "testing", type: "vitest-testing", priority: 1 } (if you see vitest config)
- { domain: "backend", type: "dependency-injection", priority: 1 } (if @injectable decorators)
- { domain: "backend", type: "cli-commands", priority: 1 } (if commander.js)
- { domain: "backend", type: "provider-pattern", priority: 1 } (if provider pattern)
- { domain: "backend", type: "phase-architecture", priority: 1 } (if phase-based structure)
- { domain: "tooling", type: "typescript-config", priority: 2 } (if complex tsconfig)

Example BAD suggestions:
- "architecture" (too generic)
- "error-handling" (too generic)
- { domain: "backend", type: "vitest-testing" } (WRONG - testing should be in "testing" domain)`;

function IDENTIFICATION_USER_PROMPT(
  projectType: string,
  techStack: string,
  patterns: string,
  projectStructure: string
): string {
  return `Analyze this ${projectType} codebase and identify which SPECIFIC guideline topics to document.

## Tech Stack
${techStack}

## Detected Patterns
${patterns}

## Project Structure (sample)
${projectStructure}

## Instructions

Based on what you see above, suggest 5-12 SPECIFIC guideline topics that would be most valuable to document.

Focus on:
1. Architectural patterns you can identify (DI, phases, providers, layers)
2. Key technical implementations (CLI, testing framework, prompts, file handling)
3. Project-specific workflows (setup, generation, validation)
4. Important conventions (naming, organization, error handling)

CRITICAL: Assign correct domains using these rules:
- Testing (vitest, jest, test patterns) → "testing" domain
- Backend patterns (API, DI, phases) → "backend" domain
- Frontend patterns (components, hooks) → "frontend" domain
- Build/tooling (tsconfig, webpack) → "tooling" domain

Return ONLY a JSON object:
{
  "guidelines": [
    {
      "domain": "backend",
      "type": "dependency-injection",
      "priority": 1,
      "description": "InversifyJS DI pattern with @injectable decorators"
    },
    {
      "domain": "testing",
      "type": "vitest-testing",
      "priority": 1,
      "description": "Vitest testing framework and patterns"
    }
  ]
}

Suggest guidelines that reflect the ACTUAL codebase, not generic templates.
Remember: vitest/jest/testing → "testing" domain, NOT "backend"`;
}

/**
 * Use AI to identify which guidelines should be created
 */
export async function identifyGuidelinesWithAI(
  client: IProviderClient,
  patterns: PatternReport,
  techProfile: { projects?: Array<{ type: string }>; stack: { languages: string[]; frameworks: string[]; buildTools: string[] } },
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
    const techStack = [
      ...techProfile.stack.languages,
      ...techProfile.stack.frameworks,
      ...techProfile.stack.buildTools
    ].join(', ');

    // Format patterns summary
    const patternsSummary = [
      patterns.importPatterns?.map(p => `- Import: ${p.name}`).join('\n'),
      patterns.namingConventions?.map(p => `- Naming: ${p.name}`).join('\n'),
      patterns.architecturePatterns?.map(p => `- Architecture: ${p.name}`).join('\n'),
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
      IDENTIFICATION_USER_PROMPT(projectType, techStack, patternsSummary, structureSummary)
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
