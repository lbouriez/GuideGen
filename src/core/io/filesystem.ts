/**
 * File System Abstraction Layer
 *
 * This module provides a testable interface for file operations, enabling
 * dependency injection and easy mocking in tests. It supports both async
 * and sync operations for maximum flexibility.
 *
 * @module core/io/filesystem
 *
 * @example
 * ```typescript
 * // Using the real file system
 * const fs = new RealFileSystem();
 * const content = await fs.readFile('/path/to/file', 'utf-8');
 *
 * // Using the mock file system in tests
 * const mockFs = new MockFileSystem({ '/test/file.txt': 'content' });
 * const content = await mockFs.readFile('/test/file.txt', 'utf-8');
 * ```
 */

import { injectable } from 'inversify';
import type { Dirent, Stats } from 'fs';

/**
 * Interface for file system operations
 *
 * This interface abstracts file system operations to enable:
 * - Unit testing with mock implementations
 * - Dependency injection
 * - Platform-agnostic file operations
 *
 * Implementations:
 * - {@link RealFileSystem} - Uses Node.js fs module
 * - {@link MockFileSystem} - In-memory implementation for testing
 */
export interface IFileSystem {
  // Async file operations

  /**
   * Read file contents asynchronously
   * @param path - Path to the file
   * @param encoding - Character encoding
   * @returns File contents as string
   * @throws Error if file doesn't exist or can't be read
   */
  readFile(path: string, encoding: BufferEncoding): Promise<string>;

  /**
   * Write content to a file asynchronously
   * @param path - Path to the file
   * @param content - Content to write
   * @param encoding - Character encoding
   */
  writeFile(path: string, content: string, encoding: BufferEncoding): Promise<void>;

  /**
   * Check if a file or directory exists
   * @param path - Path to check
   * @returns true if path exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file/directory statistics
   * @param path - Path to stat
   * @returns Stats object with file information
   * @throws Error if path doesn't exist
   */
  stat(path: string): Promise<Stats>;

  // Async directory operations

  /**
   * Read directory contents
   * @param path - Path to directory
   * @returns Array of file/directory names
   */
  readdir(path: string): Promise<string[]>;

  /**
   * Read directory contents with file type information
   * @param path - Path to directory
   * @returns Array of Dirent objects with isFile/isDirectory methods
   */
  readdirWithFileTypes(path: string): Promise<Dirent[]>;

  /**
   * Create a directory
   * @param path - Path for new directory
   * @param options - Options including recursive flag
   */
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;

  // Sync operations (for backwards compatibility)

  /**
   * Read file contents synchronously
   * @param path - Path to the file
   * @param encoding - Character encoding
   * @returns File contents as string
   */
  readFileSync(path: string, encoding: BufferEncoding): string;

  /**
   * Write content to a file synchronously
   * @param path - Path to the file
   * @param content - Content to write
   * @param encoding - Character encoding
   */
  writeFileSync(path: string, content: string, encoding: BufferEncoding): void;

  /**
   * Check if a file or directory exists (sync)
   * @param path - Path to check
   * @returns true if path exists
   */
  existsSync(path: string): boolean;

  /**
   * Read directory contents synchronously
   * @param path - Path to directory
   * @returns Array of file/directory names
   */
  readdirSync(path: string): string[];

  /**
   * Read directory contents with file type information (sync)
   * @param path - Path to directory
   * @returns Array of Dirent objects
   */
  readdirSyncWithFileTypes(path: string): Dirent[];
}

/**
 * Real file system implementation using Node.js fs module
 *
 * This is the production implementation of {@link IFileSystem} that
 * performs actual file system operations using Node.js fs module.
 *
 * @example
 * ```typescript
 * const fs = new RealFileSystem();
 *
 * // Read a file
 * const content = await fs.readFile('./package.json', 'utf-8');
 *
 * // Check if directory exists
 * if (await fs.exists('./src')) {
 *   const files = await fs.readdir('./src');
 * }
 * ```
 */
@injectable()
export class RealFileSystem implements IFileSystem {
  private fs = require('fs');
  private fsPromises = require('fs').promises;

  async readFile(path: string, encoding: BufferEncoding): Promise<string> {
    return this.fsPromises.readFile(path, encoding);
  }

  async writeFile(path: string, content: string, encoding: BufferEncoding): Promise<void> {
    await this.fsPromises.writeFile(path, content, encoding);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.fsPromises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<Stats> {
    return this.fsPromises.stat(path);
  }

  async readdir(path: string): Promise<string[]> {
    return this.fsPromises.readdir(path);
  }

  async readdirWithFileTypes(path: string): Promise<Dirent[]> {
    return this.fsPromises.readdir(path, { withFileTypes: true });
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await this.fsPromises.mkdir(path, options);
  }

  readFileSync(path: string, encoding: BufferEncoding): string {
    return this.fs.readFileSync(path, encoding);
  }

  writeFileSync(path: string, content: string, encoding: BufferEncoding): void {
    this.fs.writeFileSync(path, content, encoding);
  }

  existsSync(path: string): boolean {
    return this.fs.existsSync(path);
  }

  readdirSync(path: string): string[] {
    return this.fs.readdirSync(path);
  }

  readdirSyncWithFileTypes(path: string): Dirent[] {
    return this.fs.readdirSync(path, { withFileTypes: true });
  }
}

/**
 * Mock file system for testing
 *
 * In-memory implementation of {@link IFileSystem} that stores files
 * and directories in Maps/Sets. Useful for unit testing without
 * touching the real file system.
 *
 * @example
 * ```typescript
 * // Initialize with files
 * const fs = new MockFileSystem({
 *   '/project/package.json': '{"name": "test"}',
 *   '/project/src/index.ts': 'export {}',
 * });
 *
 * // Add directories
 * fs.addDirectory('/project/src');
 *
 * // Use like real file system
 * const content = await fs.readFile('/project/package.json', 'utf-8');
 * ```
 */
@injectable()
export class MockFileSystem implements IFileSystem {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();

  constructor(initialFiles: Record<string, string> = {}) {
    Object.entries(initialFiles).forEach(([path, content]) => {
      this.files.set(path, content);
    });
  }

  async readFile(path: string, _encoding: BufferEncoding): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }

  async writeFile(path: string, content: string, _encoding: BufferEncoding): Promise<void> {
    this.files.set(path, content);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.directories.has(path);
  }

  async stat(path: string): Promise<Stats> {
    if (!this.files.has(path) && !this.directories.has(path)) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }
    // Mock stats object
    return {
      isFile: () => this.files.has(path),
      isDirectory: () => this.directories.has(path),
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      size: this.files.get(path)?.length || 0,
      mode: 0o644,
      uid: 1000,
      gid: 1000,
      atime: new Date(),
      mtime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
      dev: 0,
      ino: 0,
      nlink: 1,
      rdev: 0,
      blksize: 4096,
      blocks: 0,
      atimeMs: Date.now(),
      mtimeMs: Date.now(),
      ctimeMs: Date.now(),
      birthtimeMs: Date.now(),
    } as Stats;
  }

  async readdir(path: string): Promise<string[]> {
    if (!this.directories.has(path)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }
    const results: string[] = [];
    const prefix = path.endsWith('/') ? path : `${path}/`;

    // Find direct children
    this.files.forEach((_content, filePath) => {
      if (filePath.startsWith(prefix)) {
        const relative = filePath.substring(prefix.length);
        const slashIndex = relative.indexOf('/');
        if (slashIndex === -1) {
          results.push(relative);
        }
      }
    });

    this.directories.forEach(dirPath => {
      if (dirPath.startsWith(prefix) && dirPath !== path) {
        const relative = dirPath.substring(prefix.length);
        const slashIndex = relative.indexOf('/');
        if (slashIndex === -1) {
          results.push(relative);
        }
      }
    });

    return [...new Set(results)];
  }

  async readdirWithFileTypes(path: string): Promise<Dirent[]> {
    const names = await this.readdir(path);
    const prefix = path.endsWith('/') ? path : `${path}/`;

    return names.map(name => ({
      name,
      isFile: () => this.files.has(prefix + name),
      isDirectory: () => this.directories.has(prefix + name),
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      path: prefix,
      parentPath: path,
    } as Dirent));
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    if (options?.recursive) {
      const parts = path.split('/').filter(Boolean);
      let current = '';
      for (const part of parts) {
        current += (current ? '/' : '') + part;
        this.directories.add(current);
      }
    } else {
      this.directories.add(path);
    }
  }

  readFileSync(path: string, _encoding: BufferEncoding): string {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    return content;
  }

  writeFileSync(path: string, content: string, _encoding: BufferEncoding): void {
    this.files.set(path, content);
  }

  existsSync(path: string): boolean {
    return this.files.has(path) || this.directories.has(path);
  }

  readdirSync(path: string): string[] {
    if (!this.directories.has(path)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }
    const results: string[] = [];
    const prefix = path.endsWith('/') ? path : `${path}/`;

    this.files.forEach((_content, filePath) => {
      if (filePath.startsWith(prefix)) {
        const relative = filePath.substring(prefix.length);
        const slashIndex = relative.indexOf('/');
        if (slashIndex === -1) {
          results.push(relative);
        }
      }
    });

    return results;
  }

  readdirSyncWithFileTypes(path: string): Dirent[] {
    const names = this.readdirSync(path);
    const prefix = path.endsWith('/') ? path : `${path}/`;

    return names.map(name => ({
      name,
      isFile: () => this.files.has(prefix + name),
      isDirectory: () => this.directories.has(prefix + name),
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      path: prefix,
      parentPath: path,
    } as Dirent));
  }

  // Test helpers
  addFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  addDirectory(path: string): void {
    this.directories.add(path);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
  }

  getFile(path: string): string | undefined {
    return this.files.get(path);
  }
}

// ============================================================================
// Global File System Instance
// ============================================================================

/**
 * Global file system instance
 *
 * This singleton can be swapped for testing. Use {@link setFileSystem} to
 * inject a mock implementation and {@link resetFileSystem} to restore
 * the real implementation.
 */
let globalFileSystem: IFileSystem = new RealFileSystem();

/**
 * Get the current global file system instance
 * @returns The current IFileSystem implementation
 */
export function getFileSystem(): IFileSystem {
  return globalFileSystem;
}

/**
 * Set a custom file system implementation
 *
 * Useful for testing to inject a mock file system.
 *
 * @param fs - The file system implementation to use
 *
 * @example
 * ```typescript
 * // In tests
 * const mockFs = new MockFileSystem({ ... });
 * setFileSystem(mockFs);
 *
 * // Run tests...
 *
 * // Cleanup
 * resetFileSystem();
 * ```
 */
export function setFileSystem(fs: IFileSystem): void {
  globalFileSystem = fs;
}

/**
 * Reset to the default RealFileSystem implementation
 *
 * Should be called in test cleanup to restore normal operation.
 */
export function resetFileSystem(): void {
  globalFileSystem = new RealFileSystem();
}
