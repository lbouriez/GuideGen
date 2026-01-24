/**
 * FileSystem Tests
 * Tests for RealFileSystem and MockFileSystem implementations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'reflect-metadata';
import {
  MockFileSystem,
  RealFileSystem,
  type IFileSystem,
} from '../../../../src/core/io/filesystem.js';

describe('MockFileSystem', () => {
  let mockFs: MockFileSystem;

  beforeEach(() => {
    mockFs = new MockFileSystem();
  });

  describe('constructor', () => {
    it('should create empty file system', () => {
      const fs = new MockFileSystem();
      expect(fs.existsSync('/any/path')).toBe(false);
    });

    it('should initialize with provided files', () => {
      const fs = new MockFileSystem({
        '/test/file.txt': 'content',
        '/another/file.md': 'markdown',
      });

      expect(fs.existsSync('/test/file.txt')).toBe(true);
      expect(fs.existsSync('/another/file.md')).toBe(true);
      expect(fs.existsSync('/missing/file.txt')).toBe(false);
    });
  });

  describe('readFile', () => {
    beforeEach(() => {
      mockFs.addFile('/test/file.txt', 'file content');
    });

    it('should read existing file', async () => {
      const content = await mockFs.readFile('/test/file.txt', 'utf8');
      expect(content).toBe('file content');
    });

    it('should throw error for non-existent file', async () => {
      await expect(mockFs.readFile('/missing/file.txt', 'utf8'))
        .rejects.toThrow('ENOENT');
    });

    it('should read file with different content', async () => {
      mockFs.addFile('/test/json.json', '{"key": "value"}');
      const content = await mockFs.readFile('/test/json.json', 'utf8');
      expect(content).toBe('{"key": "value"}');
    });
  });

  describe('readFileSync', () => {
    beforeEach(() => {
      mockFs.addFile('/test/sync.txt', 'sync content');
    });

    it('should read existing file synchronously', () => {
      const content = mockFs.readFileSync('/test/sync.txt', 'utf8');
      expect(content).toBe('sync content');
    });

    it('should throw error for non-existent file', () => {
      expect(() => mockFs.readFileSync('/missing/file.txt', 'utf8'))
        .toThrow('ENOENT');
    });
  });

  describe('writeFile', () => {
    it('should write new file', async () => {
      await mockFs.writeFile('/new/file.txt', 'new content', 'utf8');
      const content = await mockFs.readFile('/new/file.txt', 'utf8');
      expect(content).toBe('new content');
    });

    it('should overwrite existing file', async () => {
      mockFs.addFile('/test/file.txt', 'old content');
      await mockFs.writeFile('/test/file.txt', 'new content', 'utf8');
      const content = await mockFs.readFile('/test/file.txt', 'utf8');
      expect(content).toBe('new content');
    });

    it('should write empty content', async () => {
      await mockFs.writeFile('/empty.txt', '', 'utf8');
      const content = await mockFs.readFile('/empty.txt', 'utf8');
      expect(content).toBe('');
    });
  });

  describe('writeFileSync', () => {
    it('should write file synchronously', () => {
      mockFs.writeFileSync('/sync/file.txt', 'sync content', 'utf8');
      const content = mockFs.readFileSync('/sync/file.txt', 'utf8');
      expect(content).toBe('sync content');
    });
  });

  describe('exists', () => {
    beforeEach(() => {
      mockFs.addFile('/test/file.txt', 'content');
      mockFs.addDirectory('/test/dir');
    });

    it('should return true for existing file', async () => {
      expect(await mockFs.exists('/test/file.txt')).toBe(true);
    });

    it('should return true for existing directory', async () => {
      expect(await mockFs.exists('/test/dir')).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      expect(await mockFs.exists('/missing/path')).toBe(false);
    });
  });

  describe('existsSync', () => {
    beforeEach(() => {
      mockFs.addFile('/test/file.txt', 'content');
    });

    it('should return true for existing file synchronously', () => {
      expect(mockFs.existsSync('/test/file.txt')).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(mockFs.existsSync('/missing.txt')).toBe(false);
    });
  });

  describe('stat', () => {
    beforeEach(() => {
      mockFs.addFile('/test/file.txt', 'content');
      mockFs.addDirectory('/test/dir');
    });

    it('should return stats for file', async () => {
      const stats = await mockFs.stat('/test/file.txt');
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
      expect(stats.size).toBe('content'.length);
    });

    it('should return stats for directory', async () => {
      const stats = await mockFs.stat('/test/dir');
      expect(stats.isFile()).toBe(false);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should throw error for non-existent path', async () => {
      await expect(mockFs.stat('/missing/path'))
        .rejects.toThrow('ENOENT');
    });
  });

  describe('mkdir', () => {
    it('should create directory', async () => {
      await mockFs.mkdir('/new/dir');
      expect(await mockFs.exists('/new/dir')).toBe(true);
    });

    it('should create directory recursively', async () => {
      // MockFileSystem creates directories without leading slash internally
      await mockFs.mkdir('deep/nested/dir', { recursive: true });
      expect(await mockFs.exists('deep')).toBe(true);
      expect(await mockFs.exists('deep/nested')).toBe(true);
      expect(await mockFs.exists('deep/nested/dir')).toBe(true);
    });
  });

  describe('readdir', () => {
    beforeEach(() => {
      mockFs.addDirectory('/test');
      mockFs.addFile('/test/file1.txt', 'content1');
      mockFs.addFile('/test/file2.txt', 'content2');
      mockFs.addDirectory('/test/subdir');
    });

    it('should list directory contents', async () => {
      const contents = await mockFs.readdir('/test');
      expect(contents).toContain('file1.txt');
      expect(contents).toContain('file2.txt');
      expect(contents).toContain('subdir');
    });

    it('should throw error for non-existent directory', async () => {
      await expect(mockFs.readdir('/missing'))
        .rejects.toThrow('ENOENT');
    });
  });

  describe('readdirSync', () => {
    beforeEach(() => {
      mockFs.addDirectory('/test');
      mockFs.addFile('/test/file.txt', 'content');
    });

    it('should list directory contents synchronously', () => {
      const contents = mockFs.readdirSync('/test');
      expect(contents).toContain('file.txt');
    });

    it('should throw error for non-existent directory', () => {
      expect(() => mockFs.readdirSync('/missing'))
        .toThrow('ENOENT');
    });
  });

  describe('readdirWithFileTypes', () => {
    beforeEach(() => {
      mockFs.addDirectory('/test');
      mockFs.addFile('/test/file.txt', 'content');
      mockFs.addDirectory('/test/subdir');
    });

    it('should return Dirent objects', async () => {
      const entries = await mockFs.readdirWithFileTypes('/test');

      const fileEntry = entries.find(e => e.name === 'file.txt');
      expect(fileEntry?.isFile()).toBe(true);
      expect(fileEntry?.isDirectory()).toBe(false);

      const dirEntry = entries.find(e => e.name === 'subdir');
      expect(dirEntry?.isFile()).toBe(false);
      expect(dirEntry?.isDirectory()).toBe(true);
    });
  });

  describe('test helpers', () => {
    it('should add file with addFile', () => {
      mockFs.addFile('/helper/test.txt', 'helper content');
      expect(mockFs.existsSync('/helper/test.txt')).toBe(true);
    });

    it('should add directory with addDirectory', () => {
      mockFs.addDirectory('/helper/dir');
      expect(mockFs.existsSync('/helper/dir')).toBe(true);
    });

    it('should get file content with getFile', () => {
      mockFs.addFile('/get/file.txt', 'get content');
      expect(mockFs.getFile('/get/file.txt')).toBe('get content');
    });

    it('should return undefined for non-existent file', () => {
      expect(mockFs.getFile('/missing.txt')).toBeUndefined();
    });

    it('should clear all files and directories', () => {
      mockFs.addFile('/test/file.txt', 'content');
      mockFs.addDirectory('/test/dir');
      mockFs.clear();
      expect(mockFs.existsSync('/test/file.txt')).toBe(false);
      expect(mockFs.existsSync('/test/dir')).toBe(false);
    });
  });
});

describe('RealFileSystem', () => {
  // These tests verify the interface but don't make real FS calls
  // unless explicitly testing integration

  it('should implement IFileSystem interface', () => {
    const realFs = new RealFileSystem();

    // Verify all interface methods exist
    expect(typeof realFs.readFile).toBe('function');
    expect(typeof realFs.writeFile).toBe('function');
    expect(typeof realFs.exists).toBe('function');
    expect(typeof realFs.stat).toBe('function');
    expect(typeof realFs.readdir).toBe('function');
    expect(typeof realFs.readdirWithFileTypes).toBe('function');
    expect(typeof realFs.mkdir).toBe('function');
    expect(typeof realFs.readFileSync).toBe('function');
    expect(typeof realFs.writeFileSync).toBe('function');
    expect(typeof realFs.existsSync).toBe('function');
    expect(typeof realFs.readdirSync).toBe('function');
    expect(typeof realFs.readdirSyncWithFileTypes).toBe('function');
  });
});

// NOTE: Global FileSystem functions (getFileSystem, setFileSystem, resetFileSystem)
// have been removed in favor of dependency injection.
// Use the DI container to get IFileSystem instances instead.
