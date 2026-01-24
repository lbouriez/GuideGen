/**
 * Folder structure analysis utilities
 * Extracted from discovery phase for better separation of concerns
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import type { FolderStructure } from '@/types';
import { CONFIG_FILE_PATTERNS, IGNORE_PATTERNS } from '@/config';

const KEY_FILE_PATTERNS = [
  'index.ts',
  'index.js',
  'main.ts',
  'main.js',
  'app.ts',
  'app.js',
  'server.ts',
  'server.js',
];

/**
 * Get folder structure for a project
 */
export async function getFolderStructure(rootPath: string): Promise<FolderStructure> {
  const directories: string[] = [];
  const keyFiles: string[] = [];
  const configFiles: string[] = [];

  await scanDirectory(rootPath, rootPath, directories, keyFiles, configFiles, 0);

  return {
    root: rootPath,
    directories,
    keyFiles,
    configFiles,
  };
}

async function scanDirectory(
  rootPath: string,
  currentPath: string,
  directories: string[],
  keyFiles: string[],
  configFiles: string[],
  depth: number
): Promise<void> {
  // Limit depth to avoid performance issues
  if (depth > 4) return;

  try {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      const relativePath = fullPath.replace(rootPath, '').replace(/^[\\/]/, '');

      // Skip node_modules, .git, dist, build, etc.
      if (shouldSkip(entry.name)) continue;

      if (entry.isDirectory()) {
        directories.push(relativePath);
        await scanDirectory(rootPath, fullPath, directories, keyFiles, configFiles, depth + 1);
      } else if (entry.isFile()) {
        // Check if it's a config file
        // Strip glob patterns (e.g., "**/package.json" -> "package.json")
        if (CONFIG_FILE_PATTERNS.some(pattern => {
          const cleanPattern = pattern.replace(/^\*\*\//, '').replace(/^\*/, '');
          return relativePath.includes(cleanPattern) || entry.name === cleanPattern || entry.name.includes(cleanPattern);
        })) {
          configFiles.push(relativePath);
        }
        // Check if it's a key file
        if (KEY_FILE_PATTERNS.some(pattern => entry.name === pattern)) {
          keyFiles.push(relativePath);
        }
        // Always include DI (dependency injection) files as key files
        // Use path separators that work on both Windows and Unix
        const normalizedPath = relativePath.replace(/\\/g, '/');
        if (normalizedPath.includes('di/') && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          keyFiles.push(relativePath);
        }
        // Include service files with likely DI decorators
        if ((normalizedPath.includes('services/') || normalizedPath.includes('workflows/')) &&
            !entry.name.includes('index') &&
            (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
          keyFiles.push(relativePath);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
}

function shouldSkip(name: string): boolean {
  return (IGNORE_PATTERNS as readonly string[]).includes(name) || name.startsWith('.');
}

/**
 * Create a simple folder tree string
 */
export function createFolderTree(directories: string[]): string {
  const lines: string[] = [];
  const sortedDirs = directories.sort();
  
  for (const dir of sortedDirs.slice(0, 50)) { // Limit to first 50
    const depth = dir.split(/[\\/]/).length - 1;
    const indent = '  '.repeat(depth);
    const name = dir.split(/[\\/]/).pop() || dir;
    lines.push(`${indent}${name}/`);
  }
  
  return lines.join('\n');
}
