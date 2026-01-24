/**
 * AI-powered guideline matching
 * Matches newly identified guidelines with existing ones based on semantic similarity
 */

import type { IProviderClient } from '../../../providers/types';
import type { ILogger } from '../../../interfaces/services/ILogger';
import type { GuidelineMeta } from './frontmatter-parser';

export interface MatchDecision {
  action: 'update' | 'create';
  existingFileName?: string;  // For 'update' action
  newType: string;            // Guideline type to generate
  reason: string;             // AI's reasoning
}

const MATCHING_SYSTEM_PROMPT = `You are a documentation expert helping organize project guidelines.

Your task: Match newly identified guideline types with existing guidelines based on semantic similarity.

Guidelines for matching:
1. Match by TOPIC and PURPOSE, not exact names
2. "error-handling-pattern" matches "error-handling-try-catch" (same topic)
3. "vitest-testing" matches "testing-vitest" (same topic, different order)
4. "typescript-imports" matches "import-patterns" (same concept)
5. "api-security" does NOT match "authentication" (related but different topics)

When in doubt:
- If 80%+ overlap in topic → UPDATE existing
- If only 40% overlap → CREATE new
- Consider domain (backend/frontend/all) - must match

Be conservative: Only merge if clearly the same topic. Better to create a new guideline than incorrectly merge unrelated ones.

Respond with valid JSON only.`;

/**
 * Ask AI to match generated guidelines with existing ones
 *
 * Strategy:
 * 1. Single AI call with all existing metadata and identified types
 * 2. AI decides which existing guidelines to update vs creating new ones
 * 3. Returns mapping of guideline type → decision (update/create)
 */
export async function matchGuidelinesWithAI(
  existingMetadata: GuidelineMeta[],
  identifiedGuidelines: string[],  // Types AI wants to generate
  client: IProviderClient,
  logger: ILogger
): Promise<Map<string, MatchDecision>> {
  if (existingMetadata.length === 0) {
    // No existing guidelines - all are new
    const decisions = new Map<string, MatchDecision>();
    for (const type of identifiedGuidelines) {
      decisions.set(type, {
        action: 'create',
        newType: type,
        reason: 'No existing guidelines'
      });
    }
    return decisions;
  }

  const prompt = buildMatchingPrompt(existingMetadata, identifiedGuidelines);

  try {
    const response = await client.completeWithJson<{
      decisions: Array<{
        guidelineType: string;
        action: 'update' | 'create';
        matchedGuideline?: string;  // Existing guideline title to update
        reason: string;
      }>;
    }>(MATCHING_SYSTEM_PROMPT, prompt);

    // Convert to Map for easy lookup
    const decisions = new Map<string, MatchDecision>();
    for (const decision of response.decisions) {
      const existingFileName = decision.matchedGuideline
        ? findFileNameByTitle(existingMetadata, decision.matchedGuideline)
        : undefined;

      decisions.set(decision.guidelineType, {
        action: decision.action,
        existingFileName,
        newType: decision.guidelineType,
        reason: decision.reason
      });
    }

    logger.debug(`AI matching completed: ${decisions.size} decisions made`);
    return decisions;

  } catch (error) {
    logger.error('AI matching failed, falling back to create all', error);

    // Fallback: create all as new
    const decisions = new Map<string, MatchDecision>();
    for (const type of identifiedGuidelines) {
      decisions.set(type, {
        action: 'create',
        newType: type,
        reason: 'Matching failed, creating new'
      });
    }
    return decisions;
  }
}

/**
 * Build prompt for AI matching
 */
function buildMatchingPrompt(
  existingMetadata: GuidelineMeta[],
  identifiedGuidelines: string[]
): string {
  return `You are helping decide which existing guidelines to update vs creating new ones.

## Existing Guidelines

${existingMetadata.map(m => `
### ${m.title}
- **Domain**: ${m.domain}
- **File**: ${m.fileName}
- **Description**: ${m.description}
`).join('\n')}

## Newly Identified Guideline Types

From codebase analysis, these guidelines should exist:
${identifiedGuidelines.map(type => `- ${type}`).join('\n')}

## Your Task

For EACH newly identified guideline type, decide:

1. **UPDATE** - If an existing guideline covers this topic
   - Provide exact title of existing guideline to update
   - Explain why it's a match

2. **CREATE** - If no existing guideline matches
   - Explain why no match was found

Match based on SEMANTIC SIMILARITY, not exact names:
- "error-handling-try-catch" matches "error-handling-pattern" → UPDATE
- "vitest-testing" matches "testing-vitest" → UPDATE
- "typescript-imports" matches "import-patterns" → UPDATE
- "api-security" does NOT match "authentication" → CREATE NEW

Examples:

**Identified**: "error-handling-pattern"
**Existing**: "Error Handling with Try-Catch" (backend/error-handling-try-catch.md)
**Decision**: UPDATE (both about error handling patterns)

**Identified**: "api-rate-limiting"
**Existing**: "Error Handling" (backend/error-handling.md)
**Decision**: CREATE (different topics)

Return JSON:
{
  "decisions": [
    {
      "guidelineType": "error-handling-pattern",
      "action": "update",
      "matchedGuideline": "Error Handling with Try-Catch",
      "reason": "Both cover error handling patterns with try-catch"
    },
    {
      "guidelineType": "new-pattern-name",
      "action": "create",
      "reason": "No existing guideline covers this topic"
    }
  ]
}

Respond with valid JSON only.`;
}

/**
 * Find filename by title
 * Looks up the original filename for a given guideline title
 */
function findFileNameByTitle(
  metadata: GuidelineMeta[],
  title: string
): string | undefined {
  const normalized = title.toLowerCase().trim();

  for (const meta of metadata) {
    if (meta.title.toLowerCase().trim() === normalized) {
      return meta.fileName;
    }
  }

  return undefined;
}
