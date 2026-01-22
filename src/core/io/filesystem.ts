/**
 * File System Abstraction Layer
 * Provides a testable interface for file operations
 */

import { injectable } from 'inversify';
import type { Dirent, Stats } from 'fs';

/**
 * File system interface for abstraction
 */
export interface IFileSystem {
  // File operations
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  writeFile(path: string, content: string, encoding: BufferEncoding): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<Stats>;

  // Directory operations
  readdir(path: string): Promise<string[]>;
  readdirWithFileTypes(path: string): Promise<Dirent[]>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;

  // Synchronous operations (for backwards compatibility)
  readFileSync(path: string, encoding: BufferEncoding): string;
  writeFileSync(path: string, content: string, encoding: BufferEncoding): void;
  existsSync(path: string): boolean;
  readdirSync(path: string): string[];
  readdirSyncWithFileTypes(path: string): Dirent[];
}

/**
 * Real file system implementation using Node.js fs module
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

/**
 * Global file system instance
 * Can be swapped for testing
 */
let globalFileSystem: IFileSystem = new RealFileSystem();

export function getFileSystem(): IFileSystem {
  return globalFileSystem;
}

export function setFileSystem(fs: IFileSystem): void {
  globalFileSystem = fs;
}

export function resetFileSystem(): void {
  globalFileSystem = new RealFileSystem();
}
