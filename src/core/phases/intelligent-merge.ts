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
2. PRESERVE all examples, code snippets, and complete working demonstrations
3. PRESERVE "Key Rules", "✅ DO", "❌ NEVER" sections - these are valuable
4. ADD new sections/patterns detected in the codebase
5. UPDATE outdated sections with new information (but keep examples intact)
6. NEVER remove content unless it's clearly obsolete, incorrect, or contradicts new patterns
7. Use surgical precision - only change what needs changing
8. Maintain the existing structure and tone where possible
9. When in doubt, KEEP existing content rather than removing it

CONTENT PRESERVATION PRIORITY (highest to lowest):
1. Code examples and complete demonstrations - ALWAYS preserve
2. "Key Rules", "✅ DO", "❌ NEVER" sections - ALWAYS preserve
3. Configuration examples (tsconfig, package.json, etc.) - ALWAYS preserve
4. Manual edits and customizations - ALWAYS preserve
5. Detailed explanations - preserve unless clearly outdated
6. Section structure - preserve unless new structure is significantly better

You will receive:
- EXISTING content (what the user currently has)
- NEW content (what was just generated from codebase analysis)

Your response MUST follow this exact format:

## MERGED CONTENT
\`\`\`markdown
[The full merged markdown content goes here - no escaping needed]
\`\`\`

## CHANGES
\`\`\`json
{
  "changes": [
    {
      "type": "added|modified|removed|kept",
      "section": "section name",
      "description": "what changed and why",
      "significance": "minor|major"
    }
  ],
  "requiresConfirmation": false
}
\`\`\`

IMPORTANT:
- Put the merged markdown content in the markdown code block (no escaping needed)
- Put the changes array in the JSON code block
- Both sections are required

MERGE STRATEGY:
- If section exists in BOTH: Keep existing unless there's a compelling reason to update
- If section only in EXISTING: ALWAYS keep it (user may have added it manually)
- If section only in NEW: Add it (new pattern detected)
- If section in EXISTING but obsolete: Mark as "removed" with significance "major" for user confirmation
- If NEW content is shorter/simpler: Prefer keeping EXISTING detailed content and augmenting it
- NEVER remove examples, "Key Rules", "❌ NEVER" sections, or configuration snippets

BE CONSERVATIVE: The existing content has been curated and refined. Only remove content if it's demonstrably wrong or obsolete.

Think like Claude Code reviewing and updating documentation - preserve quality, add value, remove nothing unless necessary.`;

function MERGE_USER_PROMPT(existingContent: string, newContent: string, contentType: string): string {
  const existingLines = existingContent.split('\n').length;
  const newLines = newContent.split('\n').length;
  const contentDiff = existingLines - newLines;
  const percentDiff = existingLines > 0 ? Math.abs(contentDiff / existingLines * 100) : 0;

  // Add warning if new content is significantly shorter
  const lengthWarning = contentDiff > existingLines * 0.3
    ? `\n\n⚠️ **CRITICAL WARNING**: NEW content is ${percentDiff.toFixed(0)}% shorter than EXISTING (${newLines} vs ${existingLines} lines).
This often indicates the new generation is a STUB or OUTLINE, not a complete replacement.
**DEFAULT ACTION**: Keep EXISTING content unless NEW content provides substantial improvements.
DO NOT replace detailed examples, complete code snippets, or comprehensive sections with brief summaries.`
    : '';

  return `Merge the following ${contentType}:

## EXISTING CONTENT (current) - ${existingLines} lines
\`\`\`markdown
${existingContent}
\`\`\`

## NEW CONTENT (generated from current codebase) - ${newLines} lines
\`\`\`markdown
${newContent}
\`\`\`${lengthWarning}

Analyze both and create an intelligent merge that:
1. Preserves manual customizations in EXISTING
2. Preserves detailed examples and code snippets from EXISTING
3. Adds new patterns/rules from NEW (if they don't exist in EXISTING)
4. Updates outdated sections (but keep examples intact)
5. Identifies obsolete content for removal (only if clearly wrong or contradicted)

**MERGE DECISION GUIDE**:
- If NEW is significantly shorter → Keep EXISTING, add any new patterns from NEW
- If NEW has examples but EXISTING has better examples → Keep EXISTING examples
- If NEW is missing sections that EXISTING has → Keep EXISTING sections
- Only replace EXISTING sections if NEW provides clear improvements

Return valid JSON with mergedContent and changes array.`;
}

/**
 * Normalize AI's enum values to expected values
 */
function normalizeChangeType(type: string): 'added' | 'modified' | 'removed' | 'kept' {
  const normalized = type.toLowerCase();
  if (normalized === 'updated' || normalized === 'changed') return 'modified';
  if (normalized === 'added') return 'added';
  if (normalized === 'removed' || normalized === 'deleted') return 'removed';
  if (normalized === 'kept' || normalized === 'unchanged') return 'kept';
  // Default fallback
  return 'modified';
}

function normalizeSignificance(sig: string): 'minor' | 'major' {
  const normalized = sig.toLowerCase();
  if (normalized === 'major' || normalized === 'high' || normalized === 'critical') return 'major';
  // Everything else (minor, low, none, etc.) → minor
  return 'minor';
}

/**
 * Parse the new merge response format (markdown + JSON code blocks)
 */
function parseMergeResponse(response: string): IntelligentMergeResult | null {
  // Extract merged content from markdown code block
  const mergedContentMatch = response.match(/## MERGED CONTENT\s*```markdown\s*([\s\S]*?)```/);
  if (!mergedContentMatch) {
    return null;
  }
  const mergedContent = mergedContentMatch[1].trim();

  // Extract changes from JSON code block
  const changesMatch = response.match(/## CHANGES\s*```json\s*([\s\S]*?)```/);
  if (!changesMatch) {
    return null;
  }

  try {
    const changesData = JSON.parse(changesMatch[1]);

    // Normalize AI's enum values before validation
    if (changesData.changes && Array.isArray(changesData.changes)) {
      changesData.changes = changesData.changes.map((change: any) => ({
        ...change,
        type: normalizeChangeType(change.type),
        significance: normalizeSignificance(change.significance)
      }));
    }

    // Validate with Zod schema (without mergedContent)
    const ChangesOnlySchema = IntelligentMergeResultSchema.omit({ mergedContent: true });
    const parseResult = ChangesOnlySchema.safeParse(changesData);

    if (!parseResult.success) {
      return null;
    }

    return {
      mergedContent,
      changes: parseResult.data.changes,
      requiresConfirmation: parseResult.data.requiresConfirmation ?? false
    };
  } catch {
    return null;
  }
}

/**
 * Calculate content loss percentage between existing and merged content
 */
function calculateContentLoss(existingContent: string, mergedContent: string): number {
  const existingLines = existingContent.split('\n').length;
  const mergedLines = mergedContent.split('\n').length;

  if (existingLines === 0) return 0;

  const lostLines = existingLines - mergedLines;
  return (lostLines / existingLines) * 100;
}

/**
 * Validate merge result for significant content loss
 */
function validateContentLoss(
  existingContent: string,
  mergeResult: IntelligentMergeResult,
  logger: ILogger
): IntelligentMergeResult {
  const contentLossPercent = calculateContentLoss(existingContent, mergeResult.mergedContent);
  const SIGNIFICANT_LOSS_THRESHOLD = 30; // 30% content loss is significant

  if (contentLossPercent > SIGNIFICANT_LOSS_THRESHOLD) {
    const existingLines = existingContent.split('\n').length;
    const mergedLines = mergeResult.mergedContent.split('\n').length;
    const lostLines = existingLines - mergedLines;

    logger.warn(
      `⚠️  SIGNIFICANT CONTENT LOSS DETECTED: ${contentLossPercent.toFixed(1)}% (${lostLines} lines removed: ${existingLines} → ${mergedLines})`
    );

    // Add a warning change to the result
    const warningChange: MergeChange = {
      type: 'removed',
      section: 'Content Loss Warning',
      description: `Merge removed ${contentLossPercent.toFixed(1)}% of content (${lostLines} lines). Review carefully - this may indicate quality degradation.`,
      significance: 'major'
    };

    return {
      ...mergeResult,
      changes: [warningChange, ...mergeResult.changes],
      requiresConfirmation: true // Force confirmation for significant content loss
    };
  }

  return mergeResult;
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

    // DEBUG: Log first 500 chars of AI response
    logger.debug(`AI merge response (first 500 chars): ${response.content.substring(0, 500)}`);

    // Try new format first (markdown + JSON code blocks)
    const newFormatResult = parseMergeResponse(response.content);
    if (newFormatResult) {
      logger.debug('Successfully parsed new format (markdown + JSON)');
      // Determine if confirmation needed (has major removals)
      const requiresConfirmation = newFormatResult.changes.some(
        (c) => c.type === 'removed' && c.significance === 'major'
      );

      const result = {
        ...newFormatResult,
        requiresConfirmation: requiresConfirmation || newFormatResult.requiresConfirmation
      };

      // Validate for content loss
      return validateContentLoss(existingContent, result, logger);
    }

    logger.debug('New format parsing failed, trying old format (full JSON)');

    // Fall back to old format (full JSON) for backwards compatibility
    const parseResult = parseAIResponse(IntelligentMergeResultSchema, response.content);

    if (!parseResult.success) {
      logger.warn(`Both parsers failed. Full AI response:\n${response.content}`);
      throw new Error(`Failed to parse AI merge response: ${parseResult.error}`);
    }

    const result = parseResult.data;

    // Determine if confirmation needed (has major removals)
    const requiresConfirmation = result.changes.some(
      (c) => c.type === 'removed' && c.significance === 'major'
    );

    const mergeResult = {
      mergedContent: result.mergedContent,
      changes: result.changes,
      requiresConfirmation: requiresConfirmation || result.requiresConfirmation
    };

    // Validate for content loss
    return validateContentLoss(existingContent, mergeResult, logger);
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
