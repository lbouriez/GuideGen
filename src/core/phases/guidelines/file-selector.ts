/**
 * AI-driven file selection for guideline generation
 * Lets AI choose which files are most relevant for each guideline
 */

import type { IProviderClient } from '@/providers/types';
import type { FolderStructure } from '@/types';
import { readFileSafe } from '../../utils/file-io';
import { join } from 'path';

/**
 * Get pattern-based file selection
 * Smart pattern matching that selects most relevant files for each guideline type
 */
function selectFilesByPattern(
  projectStructure: FolderStructure,
  guidelineType: string,
  domain: string,
  maxFiles: number
): string[] {
  const allFiles = [...projectStructure.keyFiles, ...projectStructure.configFiles];

  // Pattern matching for guideline types
  const patterns: Record<string, string[]> = {
    'architecture': ['index.ts', 'src/', 'core/', 'phases/', 'providers/', 'workflows/'],
    'error-handling': ['error', 'exception', 'handler', 'try', 'catch'],
    'logging': ['log', 'logger', 'display', 'print', 'console'],
    'testing': ['test', 'spec', '.test.', '.spec.', 'vitest'],
    'api-design': ['route', 'api', 'controller', 'endpoint', 'server'],
    'configuration': ['config', 'tsconfig', 'package', 'env'],
    'database': ['model', 'schema', 'repository', 'prisma', 'database'],
    'types': ['types', 'interface', 'type.ts'],
    'organization': ['src/', 'index', 'structure'],
    'naming': ['src/', 'index', 'core/', 'utilities/'],
  };

  const relevantPatterns = patterns[guidelineType] || ['src/', 'index'];

  // Score files based on pattern matches
  const scoredFiles = allFiles
    .map(file => {
      let score = 0;

      // Pattern matching
      for (const pattern of relevantPatterns) {
        if (file.toLowerCase().includes(pattern.toLowerCase())) {
          score += 2;
        }
      }

      // Boost score for main source files
      if (file.startsWith('src/') && file.endsWith('.ts')) score += 1;
      if (file.includes('index.ts')) score += 1;

      // Penalize test and config files (unless looking for testing guideline)
      if (guidelineType !== 'testing' && (file.includes('.test.') || file.includes('.spec.'))) {
        score -= 3;
      }
      if (guidelineType !== 'configuration' && file.includes('config')) {
        score -= 1;
      }

      return { path: file, score };
    })
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles)
    .map(f => f.path);

  // If we found files, return them
  if (scoredFiles.length > 0) {
    return scoredFiles;
  }

  // Fallback: return first N TypeScript files from src/
  return allFiles
    .filter(f => f.startsWith('src/') && f.endsWith('.ts'))
    .slice(0, Math.min(maxFiles, 5));
}

/**
 * Smart file selection for a specific guideline type
 * Uses pattern matching for reliability (AI selection has token limit issues)
 */
export async function selectFilesForGuideline(
  client: IProviderClient,
  projectStructure: FolderStructure,
  guidelineType: string,
  domain: string,
  maxFiles: number = 10
): Promise<string[]> {
  // Use pattern-based selection (reliable and fast)
  return selectFilesByPattern(projectStructure, guidelineType, domain, maxFiles);
}

/**
 * Read selected files and concatenate their content
 */
export async function readSelectedFiles(
  targetPath: string,
  filePaths: string[]
): Promise<string> {
  const fileContents: string[] = [];

  for (const filePath of filePaths) {
    const fullPath = join(targetPath, filePath);
    const content = await readFileSafe(fullPath);

    if (content && content.length > 0 && content.length < 100000) {
      // Include file with header
      fileContents.push(`// File: ${filePath}\n${content}`);
    }
  }

  if (fileContents.length === 0) {
    return '(No files could be read)';
  }

  // Concatenate all file contents
  const concatenated = fileContents.join('\n\n---\n\n');

  // Limit to ~50k chars to avoid token limits
  return concatenated.slice(0, 50000);
}

/**
 * Select and read files for a guideline in one call
 */
export async function selectAndReadFiles(
  client: IProviderClient,
  targetPath: string,
  projectStructure: FolderStructure,
  guidelineType: string,
  domain: string,
  maxFiles: number = 10
): Promise<string> {
  // Let AI select relevant files
  const selectedFiles = await selectFilesForGuideline(
    client,
    projectStructure,
    guidelineType,
    domain,
    maxFiles
  );

  if (selectedFiles.length === 0) {
    return '(No relevant files found for this guideline type)';
  }

  // Read and concatenate the selected files
  return await readSelectedFiles(targetPath, selectedFiles);
}
