/**
 * File Service Interfaces
 * Abstractions for file system operations
 */

import type { Dirent, Stats } from 'fs';

/**
 * Core file system interface
 */
export interface IFileSystem {
  // Async operations
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  writeFile(path: string, content: string, encoding: BufferEncoding): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<Stats>;
  readdir(path: string): Promise<string[]>;
  readdirWithFileTypes(path: string): Promise<Dirent[]>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;

  // Sync operations (for backwards compatibility)
  readFileSync(path: string, encoding: BufferEncoding): string;
  writeFileSync(path: string, content: string, encoding: BufferEncoding): void;
  existsSync(path: string): boolean;
  readdirSync(path: string): string[];
  readdirSyncWithFileTypes(path: string): Dirent[];
}

/**
 * High-level file service interface
 */
export interface IFileService {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readJsonFile<T>(path: string): Promise<T>;
  writeJsonFile<T>(path: string, data: T): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  ensureDir(path: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
}

/**
 * Safe file reader with error handling
 */
export interface IFileReader {
  readFileSafe(path: string): Promise<string | null>;
  readMultipleFiles(paths: string[]): Promise<Array<{
    path: string;
    content: string;
    size: number;
  }>>;
  readJsonFileSafe<T>(path: string): Promise<T | null>;
}

/**
 * Safe file writer with error handling
 */
export interface IFileWriter {
  writeFileSafe(path: string, content: string): Promise<boolean>;
  writeMultipleFiles(files: Array<{
    path: string;
    content: string;
  }>): Promise<void>;
  writeJsonFileSafe<T>(path: string, data: T): Promise<boolean>;
}

/**
 * Tree generator for directory visualization
 */
export interface ITreeGenerator {
  generateTree(
    rootPath: string,
    maxDepth?: number,
    maxItems?: number
  ): Promise<string>;
  generateTreeWithExclusions(
    rootPath: string,
    exclusions: string[],
    maxDepth?: number
  ): Promise<string>;
}
