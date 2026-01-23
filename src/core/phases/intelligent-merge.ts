/**
 * AI-Powered Intelligent Merge System
 *
 * Uses AI to intelligently merge existing content with newly generated content.
 * Works like asking Claude Code: "Review my current guidelines and update them"
 */

import type { IProviderClient } from '../../providers/types';
import type { ILogger } from '../../interfaces/services/ILogger';
import { IntelligentMergeResultSchema, parseAIResponse } from '@/types';

export interface MergeChange {
  type: 'added' | 'modified' | 'removed' | 'kept';
  section: string;
  description: string;
  significance: 'minor' | 'major';
}

export interface IntelligentMergeResult {
  mergedContent: string;
  changes: MergeChange[];
  requiresConfirmation: boolean;
}

const MERGE_SYSTEM_PROMPT = `You are an intelligent documentation merge assistant. Your job is to merge existing documentation with newly generated content.

CRITICAL RULES:
1. PRESERVE manual edits and customizations in existing content
2. ADD new sections/patterns detected in the codebase
3. UPDATE outdated sections with new information
4. SUGGEST removing obsolete content (mark with significance: major)
5. Use surgical precision - only change what needs changing
6. Maintain the existing structure and tone where possible

You will receive:
- EXISTING content (what the user currently has)
- NEW content (what was just generated from codebase analysis)

Your response MUST be valid JSON in this exact format:
{
  "mergedContent": "the full merged markdown content",
  "changes": [
    {
      "type": "added|modified|removed|kept",
      "section": "section name",
      "description": "what changed and why",
      "significance": "minor|major"
    }
  ]
}

MERGE STRATEGY:
- If section exists in BOTH: Keep existing if no significant codebase changes, otherwise merge intelligently
- If section only in EXISTING: Keep it (user may have added it manually)
- If section only in NEW: Add it (new pattern detected)
- If section in EXISTING but obsolete: Mark as "removed" with significance "major" for user confirmation

Think like Claude Code reviewing and updating documentation.`;

function MERGE_USER_PROMPT(existingContent: string, newContent: string, contentType: string): string {
  return `Merge the following ${contentType}:

## EXISTING CONTENT (current)
\`\`\`markdown
${existingContent}
\`\`\`

## NEW CONTENT (generated from current codebase)
\`\`\`markdown
${newContent}
\`\`\`

Analyze both and create an intelligent merge that:
1. Preserves manual customizations in EXISTING
2. Adds new patterns/rules from NEW
3. Updates outdated sections
4. Identifies obsolete content for removal

Return valid JSON with mergedContent and changes array.`;
}

/**
 * Intelligently merge existing content with new content using AI
 */
export async function intelligentMerge(
  client: IProviderClient,
  existingContent: string,
  newContent: string,
  contentType: 'guideline' | 'index' | 'skill' | 'agent' | 'claude-md',
  logger: ILogger
): Promise<IntelligentMergeResult> {
  try {
    const response = await client.sendMessage(
      MERGE_SYSTEM_PROMPT,
      MERGE_USER_PROMPT(existingContent, newContent, contentType)
    );

    // Parse and validate JSON response with Zod
    const parseResult = parseAIResponse(IntelligentMergeResultSchema, response.content);

    if (!parseResult.success) {
      throw new Error(`Failed to parse AI merge response: ${parseResult.error}`);
    }

    const result = parseResult.data;

    // Determine if confirmation needed (has major removals)
    const requiresConfirmation = result.changes.some(
      (c) => c.type === 'removed' && c.significance === 'major'
    );

    return {
      mergedContent: result.mergedContent,
      changes: result.changes,
      requiresConfirmation: requiresConfirmation || result.requiresConfirmation
    };
  } catch (error) {
    // Fallback: return new content with all changes marked as modified
    logger.warn('Intelligent merge failed, falling back to new content', error);
    return {
      mergedContent: newContent,
      changes: [{
        type: 'modified',
        section: 'entire file',
        description: 'Merge failed, using new content',
        significance: 'major'
      }],
      requiresConfirmation: true
    };
  }
}

/**
 * Batch merge multiple files
 */
export async function batchIntelligentMerge(
  client: IProviderClient,
  files: Array<{
    fileName: string;
    existing: string | null;
    generated: string;
    type: 'guideline' | 'index' | 'skill' | 'agent' | 'claude-md';
  }>,
  logger: ILogger,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<Map<string, IntelligentMergeResult>> {
  const results = new Map<string, IntelligentMergeResult>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (onProgress) {
      onProgress(i + 1, files.length, file.fileName);
    }

    // If no existing content, just use generated
    if (!file.existing) {
      results.set(file.fileName, {
        mergedContent: file.generated,
        changes: [{
          type: 'added',
          section: 'entire file',
          description: 'New file created',
          significance: 'minor'
        }],
        requiresConfirmation: false
      });
      continue;
    }

    // Intelligent merge
    const mergeResult = await intelligentMerge(
      client,
      file.existing,
      file.generated,
      file.type,
      logger
    );

    results.set(file.fileName, mergeResult);
  }

  return results;
}

/**
 * Format changes for display
 */
export function formatChanges(changes: MergeChange[]): string {
  const lines: string[] = [];

  const added = changes.filter(c => c.type === 'added');
  const modified = changes.filter(c => c.type === 'modified');
  const removed = changes.filter(c => c.type === 'removed');
  const kept = changes.filter(c => c.type === 'kept');

  if (added.length > 0) {
    lines.push('\n✅ Added:');
    added.forEach(c => lines.push(`  + ${c.section}: ${c.description}`));
  }

  if (modified.length > 0) {
    lines.push('\n📝 Modified:');
    modified.forEach(c => lines.push(`  ~ ${c.section}: ${c.description}`));
  }

  if (removed.length > 0) {
    lines.push('\n❌ Removed:');
    removed.forEach(c => lines.push(`  - ${c.section}: ${c.description}`));
  }

  if (kept.length > 0 && kept.length <= 5) {
    lines.push('\n✓ Kept unchanged:');
    kept.forEach(c => lines.push(`  = ${c.section}`));
  } else if (kept.length > 5) {
    lines.push(`\n✓ Kept ${kept.length} sections unchanged`);
  }

  return lines.join('\n');
}
