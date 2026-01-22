/**
 * Context Builder
 * Build AI context from knowledge registry
 */

import { KnowledgeRegistry } from './index';

/**
 * Build context for guideline generation
 */
export function buildContextForGuideline(
  domain: string,
  guidelineType: string,
  registry: KnowledgeRegistry,
  maxExamples: number = 5
): string {
  // Get relevant files for this guideline type
  const entries = registry
    .query({ domain, purpose: 'example', minRelevance: 0.3 })
    .filter(e => isRelevantForGuidelineType(e.filePath, guidelineType))
    .slice(0, maxExamples);

  if (entries.length === 0) {
    return '(No specific code examples found for this guideline type)';
  }

  const examples = entries.map((entry, i) => {
    return `### Example ${i + 1}: ${entry.filePath}\n\`\`\`\n${entry.content}\n\`\`\``;
  });

  return examples.join('\n\n');
}

/**
 * Build context for skills generation
 */
export function buildContextForSkills(
  domain: string,
  registry: KnowledgeRegistry
): string {
  // Get entry points and key files
  const entryPoints = registry.query({ domain, purpose: 'entry-point' });
  const examples = registry.getBest(domain, 3);

  const sections: string[] = [];

  if (entryPoints.length > 0) {
    sections.push(`## Entry Points\n${entryPoints.map(e => `- ${e.filePath}`).join('\n')}`);
  }

  if (examples.length > 0) {
    sections.push(
      `## Code Examples\n${examples.map(e => `### ${e.filePath}\n\`\`\`\n${e.content.slice(0, 500)}\n...\n\`\`\``).join('\n\n')}`
    );
  }

  return sections.join('\n\n') || '(No context available)';
}

/**
 * Build context for agents generation
 */
export function buildContextForAgents(
  domain: string,
  ruleId: string,
  registry: KnowledgeRegistry
): string {
  // Get relevant examples for this rule
  const entries = registry
    .query({ domain, minRelevance: 0.4 })
    .slice(0, 3);

  if (entries.length === 0) {
    return '(No specific examples found)';
  }

  return entries
    .map(e => `### ${e.filePath}\n\`\`\`\n${e.content.slice(0, 400)}\n...\n\`\`\``)
    .join('\n\n');
}

/**
 * Check if file is relevant for guideline type
 */
function isRelevantForGuidelineType(filePath: string, guidelineType: string): boolean {
  const lowerPath = filePath.toLowerCase();
  const lowerType = guidelineType.toLowerCase();

  // Map guideline types to file patterns
  const patterns: Record<string, string[]> = {
    'api-design': ['route', 'api', 'controller', 'endpoint'],
    'api-routes': ['route', 'api', 'controller'],
    'components': ['component', 'ui', 'button', 'form', 'modal'],
    'state-management': ['store', 'state', 'reducer', 'context'],
    'database': ['model', 'schema', 'migration', 'repository', 'prisma'],
    'data-models': ['model', 'schema', 'entity', 'type'],
    'validation': ['schema', 'validator', 'validation'],
    'error-handling': ['error', 'exception', 'handler'],
    'testing': ['test', 'spec', '__tests__'],
    'hooks': ['hook', 'use'],
    'styling': ['style', 'css', 'theme', 'styled'],
    'authentication': ['auth', 'login', 'session', 'jwt'],
    'middleware': ['middleware', 'guard', 'interceptor'],
  };

  const relevantPatterns = patterns[lowerType] || [];
  return relevantPatterns.some(pattern => lowerPath.includes(pattern));
}

/**
 * Get code example summary
 */
export function getCodeExampleSummary(registry: KnowledgeRegistry): string {
  const domains = registry.getDomains();
  const summary: string[] = [];

  for (const domain of domains) {
    const count = registry.query({ domain }).length;
    summary.push(`- ${domain}: ${count} files`);
  }

  return `Total files in registry: ${registry.size()}\n${summary.join('\n')}`;
}
