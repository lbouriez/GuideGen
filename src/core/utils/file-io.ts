/**
 * File system utilities for codebase analysis
 */

import { readFile, readdir, stat, writeFile, mkdir } from 'fs/promises';
import type { Dirent } from 'fs';
import { join, relative, extname, basename } from 'path';
import { glob } from 'glob';
import type { FolderStructure } from '@/types';
import { IGNORE_PATTERNS, CONFIG_FILE_PATTERNS } from '@/config';

export async function getFolderStructure(rootPath: string): Promise<FolderStructure> {
  const directories: string[] = [];
  const keyFiles: string[] = [];
  const configFiles: string[] = [];

  // Get all directories (excluding ignored)
  const allDirs = await glob('**/', {
    cwd: rootPath,
    ignore: IGNORE_PATTERNS.map((p) => `**/${p}/**`),
  });

  directories.push(...allDirs.map((d) => d.replace(/\/$/, '')));

  // Get config files
  for (const pattern of CONFIG_FILE_PATTERNS) {
    const matches = await glob(pattern, {
      cwd: rootPath,
      ignore: IGNORE_PATTERNS.map((p) => `**/${p}/**`),
    });
    configFiles.push(...matches);
  }

  // Get key files (README, main entry points, etc.)
  const keyFilePatterns = [
    'README.md',
    'README.txt',
    'CLAUDE.md',
    'CONTRIBUTING.md',
    'src/index.*',
    'src/main.*',
    'src/app.*',
    'index.*',
    'main.*',
    'app.*',
  ];

  for (const pattern of keyFilePatterns) {
    const matches = await glob(pattern, {
      cwd: rootPath,
      ignore: IGNORE_PATTERNS.map((p) => `**/${p}/**`),
    });
    keyFiles.push(...matches);
  }

  return {
    root: rootPath,
    directories: [...new Set(directories)].sort(),
    keyFiles: [...new Set(keyFiles)].sort(),
    configFiles: [...new Set(configFiles)].sort(),
  };
}

export async function readFileContent(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file: ${filePath}`);
  }
}

export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function writeFileContent(
  filePath: string,
  content: string
): Promise<void> {
  const dir = join(filePath, '..');
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, content, 'utf-8');
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function sampleFiles(
  rootPath: string,
  pattern: string,
  maxFiles: number = 5
): Promise<Array<{ path: string; content: string }>> {
  const files = await glob(pattern, {
    cwd: rootPath,
    ignore: IGNORE_PATTERNS.map((p) => `**/${p}/**`),
  });

  // Take a sample of files
  const sample = files.slice(0, maxFiles);

  const results: Array<{ path: string; content: string }> = [];
  for (const file of sample) {
    const fullPath = join(rootPath, file);
    const content = await readFileSafe(fullPath);
    if (content) {
      results.push({ path: file, content });
    }
  }

  return results;
}

export async function findPackageJsonFiles(
  rootPath: string
): Promise<string[]> {
  return glob('**/package.json', {
    cwd: rootPath,
    ignore: IGNORE_PATTERNS.map((p) => `**/${p}/**`),
  });
}

export async function getFilesByExtension(
  rootPath: string,
  extensions: string[]
): Promise<string[]> {
  const patterns = extensions.map((ext) => `**/*${ext}`);
  const results: string[] = [];

  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: rootPath,
      ignore: IGNORE_PATTERNS.map((p) => `**/${p}/**`),
    });
    results.push(...files);
  }

  return [...new Set(results)].sort();
}

export function getRelativePath(from: string, to: string): string {
  return relative(from, to);
}

export function getFileExtension(filePath: string): string {
  return extname(filePath);
}

export function getFileName(filePath: string): string {
  return basename(filePath);
}

/**
 * Filter items to exclude ignored patterns
 */
function filterIgnoredItems(items: Dirent[], depth: number): Dirent[] {
  return items.filter(item => {
    const shouldIgnore = IGNORE_PATTERNS.some(pattern => {
      if (pattern === 'claude-bootstrap') {
        // Only ignore claude-bootstrap in subdirectories, not at root
        return item.name === pattern && depth > 0;
      }
      return item.name === pattern || item.name.startsWith('.');
    });
    return !shouldIgnore;
  });
}

/**
 * Sort items: directories first, then files, alphabetically
 */
function sortTreeItems(items: Dirent[]): Dirent[] {
  return items.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Format tree line with proper connectors
 */
function formatTreeLine(prefix: string, isLast: boolean, name: string, isDirectory: boolean): string {
  const connector = isLast ? '└── ' : '├── ';
  const suffix = isDirectory ? '/' : '';
  return `${prefix}${connector}${name}${suffix}`;
}

/**
 * Get prefix for child items
 */
function getChildPrefix(prefix: string, isLast: boolean): string {
  return prefix + (isLast ? '    ' : '│   ');
}

/**
 * Process directory items and add tree lines
 */
async function processDirectoryItems(
  items: Dirent[],
  currentPath: string,
  depth: number,
  maxDepth: number,
  maxItemsPerDir: number,
  prefix: string,
  lines: string[],
  processedDirs: Set<string>,
  buildTreeFn: (path: string, depth: number, prefix: string) => Promise<void>
): Promise<void> {
  const filteredItems = filterIgnoredItems(items, depth);
  const sortedItems = sortTreeItems(filteredItems);
  const limitedItems = sortedItems.slice(0, maxItemsPerDir);
  const hasMore = filteredItems.length > maxItemsPerDir;

  for (let i = 0; i < limitedItems.length; i++) {
    const item = limitedItems[i];
    const isLast = i === limitedItems.length - 1 && !hasMore;

    lines.push(formatTreeLine(prefix, isLast, item.name, item.isDirectory()));

    if (item.isDirectory()) {
      const childPrefix = getChildPrefix(prefix, isLast);
      await buildTreeFn(join(currentPath, item.name), depth + 1, childPrefix);
    }
  }

  if (hasMore) {
    lines.push(`${prefix}└── ... (${filteredItems.length - maxItemsPerDir} more items)`);
  }
}

/**
 * Generate a tree structure visualization of the project
 * Limits depth and number of items to keep it readable
 */
export async function generateProjectTree(
  rootPath: string,
  maxDepth: number = 3,
  maxItemsPerDir: number = 10
): Promise<string> {
  const lines: string[] = [];
  const processedDirs = new Set<string>();

  async function buildTree(currentPath: string, depth: number, prefix: string = ''): Promise<void> {
    if (depth > maxDepth) return;
    if (processedDirs.has(currentPath)) return;
    processedDirs.add(currentPath);

    try {
      const items = await readdir(currentPath, { withFileTypes: true });
      await processDirectoryItems(
        items,
        currentPath,
        depth,
        maxDepth,
        maxItemsPerDir,
        prefix,
        lines,
        processedDirs,
        buildTree
      );
    } catch (error) {
      // Silently skip directories we can't read
    }
  }

  // Start with root directory name
  const rootName = basename(rootPath);
  lines.push(`${rootName}/`);
  await buildTree(rootPath, 0, '');

  return lines.join('\n');
}
