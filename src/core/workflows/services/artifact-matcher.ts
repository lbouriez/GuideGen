/**
 * AI-powered artifact matching
 * Matches newly identified skills/agents with existing ones based on semantic similarity
 */

import type { IProviderClient } from '../../../providers/types';
import type { ILogger } from '../../../interfaces/services/ILogger';
import type { ArtifactMeta } from './frontmatter-parser';

export interface ArtifactMatchDecision {
  action: 'update' | 'create';
  existingFileName?: string;  // For 'update' action
  newName: string;            // Artifact name to generate
  reason: string;             // AI's reasoning
}

const ARTIFACT_MATCHING_SYSTEM_PROMPT = `You are a Claude Code expert helping organize project skills and agents.

Your task: Match newly generated skills/agents with existing ones based on semantic similarity.

Guidelines for matching:
1. Match by PURPOSE and FUNCTIONALITY, not exact names
2. "guideline-browser" matches "browse-guidelines" (same purpose)
3. "error-handler-agent" matches "error-handling-enforcer" (same function)
4. "security-checker" matches "security-audit-agent" (same concept)
5. "test-runner" does NOT match "test-generator" (related but different)

When in doubt:
- If 80%+ overlap in functionality → UPDATE existing
- If only 40% overlap → CREATE new
- Consider type (skill vs agent) - must match

Be conservative: Only merge if clearly the same function. Better to create a new artifact than incorrectly merge unrelated ones.

Respond with valid JSON only.`;

/**
 * Ask AI to match generated artifacts with existing ones
 *
 * Strategy:
 * 1. Single AI call with all existing metadata and identified names
 * 2. AI decides which existing artifacts to update vs creating new ones
 * 3. Returns mapping of artifact name → decision (update/create)
 */
export async function matchArtifactsWithAI(
  existingMetadata: ArtifactMeta[],
  identifiedArtifacts: string[],  // Names AI wants to generate
  artifactType: 'skill' | 'agent',
  client: IProviderClient,
  logger: ILogger
): Promise<Map<string, ArtifactMatchDecision>> {
  if (existingMetadata.length === 0) {
    // No existing artifacts - all are new
    const decisions = new Map<string, ArtifactMatchDecision>();
    for (const name of identifiedArtifacts) {
      decisions.set(name, {
        action: 'create',
        newName: name,
        reason: `No existing ${artifactType}s`
      });
    }
    return decisions;
  }

  const prompt = buildArtifactMatchingPrompt(existingMetadata, identifiedArtifacts, artifactType);

  try {
    const response = await client.completeWithJson<{
      decisions: Array<{
        artifactName: string;
        action: 'update' | 'create';
        matchedArtifact?: string;  // Existing artifact name to update
        reason: string;
      }>;
    }>(ARTIFACT_MATCHING_SYSTEM_PROMPT, prompt);

    // Convert to Map for easy lookup
    const decisions = new Map<string, ArtifactMatchDecision>();
    for (const decision of response.decisions) {
      const existingFileName = decision.matchedArtifact
        ? findFileNameByName(existingMetadata, decision.matchedArtifact)
        : undefined;

      decisions.set(decision.artifactName, {
        action: decision.action,
        existingFileName,
        newName: decision.artifactName,
        reason: decision.reason
      });
    }

    logger.debug(`AI matching completed: ${decisions.size} decisions made`);
    return decisions;

  } catch (error) {
    logger.error(`AI matching failed, falling back to create all ${artifactType}s`, error);

    // Fallback: create all as new
    const decisions = new Map<string, ArtifactMatchDecision>();
    for (const name of identifiedArtifacts) {
      decisions.set(name, {
        action: 'create',
        newName: name,
        reason: 'Matching failed, creating new'
      });
    }
    return decisions;
  }
}

/**
 * Build prompt for AI matching
 */
function buildArtifactMatchingPrompt(
  existingMetadata: ArtifactMeta[],
  identifiedArtifacts: string[],
  artifactType: 'skill' | 'agent'
): string {
  const artifactTypeLabel = artifactType === 'skill' ? 'Skills' : 'Agents';

  return `You are helping decide which existing ${artifactType}s to update vs creating new ones.

## Existing ${artifactTypeLabel}

${existingMetadata.map(m => `
### ${m.name}
- **File**: ${m.fileName}
- **Description**: ${m.description}
`).join('\n')}

## Newly Identified ${artifactTypeLabel}

From guideline analysis, these ${artifactType}s should exist:
${identifiedArtifacts.map(name => `- ${name}`).join('\n')}

## Your Task

For EACH newly identified ${artifactType}, decide:

1. **UPDATE** - If an existing ${artifactType} serves this purpose
   - Provide exact name of existing ${artifactType} to update
   - Explain why it's a match

2. **CREATE** - If no existing ${artifactType} matches
   - Explain why no match was found

Match based on SEMANTIC SIMILARITY, not exact names:
- "guideline-browser" matches "browse-guidelines" → UPDATE
- "error-handler" matches "error-handling-enforcer" → UPDATE
- "api-security-checker" does NOT match "api-validator" → CREATE NEW

Examples:

**Identified**: "browse-guidelines"
**Existing**: "guideline-browser" (guideline-browser.md)
**Decision**: UPDATE (both browse project guidelines)

**Identified**: "security-audit"
**Existing**: "code-quality-checker" (code-quality-checker.md)
**Decision**: CREATE (different purposes)

Return JSON:
{
  "decisions": [
    {
      "artifactName": "browse-guidelines",
      "action": "update",
      "matchedArtifact": "guideline-browser",
      "reason": "Both provide guideline browsing functionality"
    },
    {
      "artifactName": "new-artifact-name",
      "action": "create",
      "reason": "No existing ${artifactType} covers this functionality"
    }
  ]
}

Respond with valid JSON only.`;
}

/**
 * Find filename by artifact name
 * Looks up the original filename for a given artifact name
 */
function findFileNameByName(
  metadata: ArtifactMeta[],
  name: string
): string | undefined {
  const normalized = name.toLowerCase().trim();

  for (const meta of metadata) {
    if (meta.name.toLowerCase().trim() === normalized) {
      return meta.fileName;
    }
  }

  return undefined;
}
