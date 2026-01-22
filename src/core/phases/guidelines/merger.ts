/**
 * Smart merge logic for guidelines - preserves manual edits
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GeneratedGuideline } from '@/types';

export interface MergeResult {
  action: 'created' | 'updated' | 'skipped';
  reason?: string;
  conflicts?: string[];
}

/**
 * Parse markdown into sections
 */
function parseMarkdown(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = content.split('\n');

  let currentSection = 'header';
  let currentContent: string[] = [];

  for (const line of lines) {
    // Detect section headers (## or ###)
    const headerMatch = line.match(/^#{2,3}\s+(.+)/);
    if (headerMatch) {
      // Save previous section
      if (currentContent.length > 0) {
        sections.set(currentSection, currentContent.join('\n'));
      }
      // Start new section
      currentSection = headerMatch[1].trim();
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentContent.length > 0) {
    sections.set(currentSection, currentContent.join('\n'));
  }

  return sections;
}

/**
 * Detect if content has been manually edited
 */
function hasManualEdits(existing: string, generated: string): boolean {
  // Simple heuristic: if content is very different, assume manual edits
  const existingLines = existing.split('\n').filter(l => l.trim().length > 0);
  const generatedLines = generated.split('\n').filter(l => l.trim().length > 0);

  // If lengths differ significantly, likely manual edits
  if (Math.abs(existingLines.length - generatedLines.length) > existingLines.length * 0.3) {
    return true;
  }

  // Check for marker comments indicating manual edits
  if (existing.includes('<!-- MANUAL EDIT -->') || existing.includes('<!-- DO NOT OVERWRITE -->')) {
    return true;
  }

  return false;
}

/**
 * Merge generated guideline with existing file
 */
export function mergeGuideline(
  existing: string | null,
  generated: GeneratedGuideline
): { content: string; result: MergeResult } {
  // No existing file - create new
  if (!existing) {
    return {
      content: generated.content,
      result: { action: 'created' }
    };
  }

  // Check for manual edits
  if (hasManualEdits(existing, generated.content)) {
    // Parse both into sections
    const existingSections = parseMarkdown(existing);
    const generatedSections = parseMarkdown(generated.content);

    // Merge: keep manual sections, update AI sections
    const merged = new Map<string, string>();
    const conflicts: string[] = [];

    // Start with all existing sections
    for (const [section, content] of existingSections) {
      merged.set(section, content);
    }

    // Update with generated sections that haven't been manually edited
    for (const [section, content] of generatedSections) {
      const existingContent = existingSections.get(section);

      if (!existingContent) {
        // New section - add it
        merged.set(section, content);
      } else if (existingContent === content) {
        // Unchanged - keep existing
        merged.set(section, existingContent);
      } else {
        // Changed - potential conflict
        // Keep existing but note conflict
        conflicts.push(section);
      }
    }

    // Reconstruct markdown
    const mergedContent = Array.from(merged.values()).join('\n\n');

    return {
      content: mergedContent,
      result: {
        action: 'updated',
        reason: 'Merged with manual edits preserved',
        conflicts: conflicts.length > 0 ? conflicts : undefined
      }
    };
  }

  // No manual edits - safe to overwrite
  return {
    content: generated.content,
    result: {
      action: 'updated',
      reason: 'Overwritten (no manual edits detected)'
    }
  };
}

/**
 * Merge all guidelines with existing files
 */
export function mergeAllGuidelines(
  targetPath: string,
  guidelines: GeneratedGuideline[]
): Map<string, MergeResult> {
  const results = new Map<string, MergeResult>();

  for (const guideline of guidelines) {
    const filePath = path.join(targetPath, '.guidelines', guideline.domain, guideline.fileName);

    // Check if file exists
    let existing: string | null = null;
    if (fs.existsSync(filePath)) {
      existing = fs.readFileSync(filePath, 'utf-8');
    }

    // Merge
    const { content, result } = mergeGuideline(existing, guideline);

    // Write merged content
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');

    results.set(`${guideline.domain}/${guideline.fileName}`, result);
  }

  return results;
}
