/**
 * Smart merge logic for indexes
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GeneratedIndex } from './generator';

export interface IndexMergeResult {
  action: 'created' | 'updated' | 'skipped';
  reason?: string;
  addedLinks?: number;
  removedLinks?: number;
}

/**
 * Extract all markdown links from content
 */
function extractLinks(content: string): Set<string> {
  const links = new Set<string>();
  const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.add(match[2]); // The URL part
  }

  return links;
}

/**
 * Merge index with existing file - preserve manual sections
 */
export function mergeIndex(
  existing: string | null,
  generated: GeneratedIndex
): { content: string; result: IndexMergeResult } {
  // No existing file - create new
  if (!existing) {
    return {
      content: generated.content,
      result: { action: 'created' }
    };
  }

  // Parse links from both
  const existingLinks = extractLinks(existing);
  const generatedLinks = extractLinks(generated.content);

  // Find added and removed links
  const addedLinks = Array.from(generatedLinks).filter(l => !existingLinks.has(l));
  const removedLinks = Array.from(existingLinks).filter(l => !generatedLinks.has(l));

  // Check for manual edit markers
  if (existing.includes('<!-- MANUAL EDIT -->') || existing.includes('<!-- DO NOT OVERWRITE -->')) {
    return {
      content: existing,
      result: {
        action: 'skipped',
        reason: 'Manual edit marker detected',
        addedLinks: addedLinks.length,
        removedLinks: removedLinks.length
      }
    };
  }

  // If no significant changes, keep existing
  if (addedLinks.length === 0 && removedLinks.length === 0) {
    return {
      content: existing,
      result: {
        action: 'skipped',
        reason: 'No changes detected'
      }
    };
  }

  // Merge: Update generated content but preserve custom sections
  let mergedContent = generated.content;

  // Check for custom sections in existing (sections between <!-- CUSTOM START --> and <!-- CUSTOM END -->)
  const customSectionRegex = /<!-- CUSTOM START -->[\s\S]*?<!-- CUSTOM END -->/g;
  const customSections = existing.match(customSectionRegex);

  if (customSections) {
    // Append custom sections to merged content
    mergedContent += '\n\n' + customSections.join('\n\n');
  }

  return {
    content: mergedContent,
    result: {
      action: 'updated',
      reason: 'Merged with updates',
      addedLinks: addedLinks.length,
      removedLinks: removedLinks.length
    }
  };
}

/**
 * Merge all indexes with existing files
 */
export function mergeAllIndexes(
  targetPath: string,
  indexes: GeneratedIndex[]
): Map<string, IndexMergeResult> {
  const results = new Map<string, IndexMergeResult>();

  for (const index of indexes) {
    let filePath: string;

    if (index.type === 'root') {
      filePath = path.join(targetPath, '.guidelines', index.fileName);
    } else {
      filePath = path.join(targetPath, '.guidelines', index.domain!, index.fileName);
    }

    // Check if file exists
    let existing: string | null = null;
    if (fs.existsSync(filePath)) {
      existing = fs.readFileSync(filePath, 'utf-8');
    }

    // Merge
    const { content, result } = mergeIndex(existing, index);

    // Write merged content
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');

    const key = index.type === 'root' ? 'index.md' : `${index.domain}/index.md`;
    results.set(key, result);
  }

  return results;
}
