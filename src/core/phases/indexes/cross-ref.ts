/**
 * Cross-reference validation for indexes
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GeneratedIndex } from './generator';
import type { GeneratedGuideline } from '@/types';

export interface CrossRefResult {
  valid: boolean;
  brokenLinks: string[];
  missingGuidelines: string[];
}

/**
 * Extract all markdown links from content
 */
function extractLinks(content: string): Array<{ text: string; url: string }> {
  const links: Array<{ text: string; url: string }> = [];
  const linkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.push({ text: match[1], url: match[2] });
  }

  return links;
}

/**
 * Validate that all links in indexes point to existing guidelines
 */
export function validateIndexLinks(
  targetPath: string,
  index: GeneratedIndex,
  guidelines: GeneratedGuideline[]
): CrossRefResult {
  const brokenLinks: string[] = [];
  const links = extractLinks(index.content);

  // Build set of valid guideline paths
  const validPaths = new Set<string>();
  for (const guideline of guidelines) {
    validPaths.add(`./${guideline.fileName}`);
    validPaths.add(`../${guideline.domain}/${guideline.fileName}`);
    validPaths.add(`./${guideline.domain}/${guideline.fileName}`);
  }

  // Check each link
  for (const link of links) {
    // Skip external links
    if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
      continue;
    }

    // Skip anchor links
    if (link.url.startsWith('#')) {
      continue;
    }

    // Skip index file links (they're generated together, so they may not exist on disk yet)
    if (link.url.includes('index.md') || link.url.includes('-index.md')) {
      continue;
    }

    // Check if link points to a valid guideline
    if (!validPaths.has(link.url)) {
      // Try resolving the path
      const basePath = index.type === 'root'
        ? path.join(targetPath, '.guidelines')
        : path.join(targetPath, '.guidelines', index.domain!);

      const resolvedPath = path.resolve(basePath, link.url);

      if (!fs.existsSync(resolvedPath)) {
        brokenLinks.push(`${link.text} -> ${link.url}`);
      }
    }
  }

  // Check for guidelines not referenced in any index
  const referencedGuidelines = new Set<string>();
  for (const link of links) {
    const match = link.url.match(/([^\/]+)\.md$/);
    if (match) {
      referencedGuidelines.add(match[0]);
    }
  }

  const missingGuidelines: string[] = [];
  if (index.type === 'domain') {
    // Check domain guidelines are all referenced
    const domainGuidelines = guidelines.filter(g => g.domain === index.domain);
    for (const guideline of domainGuidelines) {
      if (!referencedGuidelines.has(guideline.fileName)) {
        missingGuidelines.push(`${guideline.domain}/${guideline.fileName}`);
      }
    }
  }

  return {
    valid: brokenLinks.length === 0 && missingGuidelines.length === 0,
    brokenLinks,
    missingGuidelines
  };
}

/**
 * Validate all indexes
 */
export function validateAllIndexes(
  targetPath: string,
  indexes: GeneratedIndex[],
  guidelines: GeneratedGuideline[]
): Map<string, CrossRefResult> {
  const results = new Map<string, CrossRefResult>();

  for (const index of indexes) {
    const result = validateIndexLinks(targetPath, index, guidelines);
    const key = index.type === 'root' ? 'index.md' : `${index.domain}/index.md`;
    results.set(key, result);
  }

  return results;
}
