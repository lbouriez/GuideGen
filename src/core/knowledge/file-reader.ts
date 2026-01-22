/**
 * Smart File Reader
 * Iterative file reading that builds knowledge progressively
 */

import { glob } from 'glob';
import { join } from 'path';
import { readFileSafe } from '@/core/utils/file-io';
import { KnowledgeRegistry, type KnowledgeEntry } from './index';
import { IGNORE_PATTERNS, KNOWLEDGE_LIMITS } from '@/config';

export interface FileReadOptions {
  patterns: string[];
  targetPath: string;
  maxFiles: number;
  domain: string;
  purpose: KnowledgeEntry['purpose'];
}

/**
 * Read files iteratively and add to knowledge registry
 */
export async function readFilesIteratively(
  options: FileReadOptions,
  registry: KnowledgeRegistry
): Promise<void> {
  const { patterns, targetPath, maxFiles, domain, purpose } = options;

  let filesRead = 0;
  
  for (const pattern of patterns) {
    if (filesRead >= maxFiles) break;

    const files = await glob(pattern, {
      cwd: targetPath,
      ignore: IGNORE_PATTERNS.map(p => `**/${p}/**`),
    });

    // Sort files by relevance (prioritize smaller, well-named files)
    const sortedFiles = files
      .map(f => ({
        path: f,
        score: calculateRelevance(f),
      }))
      .sort((a, b) => b.score - a.score);

    for (const { path, score } of sortedFiles) {
      if (filesRead >= maxFiles) break;

      const fullPath = join(targetPath, path);
      const content = await readFileSafe(fullPath);

      if (!content || content.length > KNOWLEDGE_LIMITS.maxFileSize) continue; // Skip empty or very large files

      const entry: KnowledgeEntry = {
        filePath: path,
        content: content.slice(0, KNOWLEDGE_LIMITS.maxContentPerFile), // Keep first 10k chars
        purpose,
        domain,
        relevance: score,
        metadata: {
          lineCount: content.split('\n').length,
          hasTypes: path.endsWith('.ts') || path.endsWith('.tsx'),
          hasTests: path.includes('.test.') || path.includes('.spec.'),
        },
      };

      registry.add(entry);
      filesRead++;
    }
  }
}

/**
 * Calculate relevance score for a file
 */
function calculateRelevance(filePath: string): number {
  let score = 0.5; // Base score

  // Prioritize certain file types
  if (filePath.includes('/routes/') || filePath.includes('/api/')) score += 0.2;
  if (filePath.includes('/services/')) score += 0.15;
  if (filePath.includes('/repositories/')) score += 0.15;
  if (filePath.includes('/components/')) score += 0.15;
  if (filePath.includes('/hooks/')) score += 0.1;
  if (filePath.includes('/utils/') || filePath.includes('/helpers/')) score += 0.05;

  // Prioritize well-named files
  if (filePath.includes('index.')) score += 0.05;
  if (filePath.match(/\/(api|routes|services|repositories|components)\//)) score += 0.1;

  // Deprioritize tests and config
  if (filePath.includes('.test.') || filePath.includes('.spec.')) score -= 0.2;
  if (filePath.includes('config')) score -= 0.1;

  return Math.max(0, Math.min(1, score));
}

/**
 * Get file patterns based on domain
 */
export function getFilePatternsForDomain(domain: string): string[] {
  switch (domain) {
    case 'backend':
      return [
        '**/routes/**/*.ts',
        '**/api/**/*.ts',
        '**/services/**/*.ts',
        '**/repositories/**/*.ts',
        '**/controllers/**/*.ts',
        '**/*.ts',
      ];
    case 'frontend':
      return [
        '**/components/**/*.tsx',
        '**/screens/**/*.tsx',
        '**/pages/**/*.tsx',
        '**/hooks/**/*.ts',
        '**/*.tsx',
        '**/*.ts',
      ];
    case 'mobile':
      return [
        '**/components/**/*.tsx',
        '**/screens/**/*.tsx',
        '**/hooks/**/*.ts',
        '**/*.tsx',
      ];
    case 'shared':
      return [
        '**/types/**/*.ts',
        '**/utils/**/*.ts',
        '**/constants/**/*.ts',
        '**/*.ts',
      ];
    default:
      return ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
  }
}
