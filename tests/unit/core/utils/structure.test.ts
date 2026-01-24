/**
 * Structure Utilities Tests
 * Tests for project structure analysis and tree generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFolderStructure, createFolderTree } from '../../../../src/core/utils/structure.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('Structure Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFolderStructure', () => {
    it('should be a function', () => {
      expect(typeof getFolderStructure).toBe('function');
    });

    it('should return a promise', () => {
      // Mock basic fs operations
      vi.mocked(fs.readdirSync).mockReturnValue([]);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

      const result = getFolderStructure('/test');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should have root property', async () => {
      vi.mocked(fs.readdirSync).mockReturnValue([]);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

      const result = await getFolderStructure('/test/project');

      expect(result).toHaveProperty('root');
      expect(result).toHaveProperty('directories');
      expect(result).toHaveProperty('keyFiles');
      expect(result).toHaveProperty('configFiles');
    });
  });

  describe('createFolderTree', () => {
    it('should create ASCII tree representation', () => {
      const directories = ['src', 'tests', 'docs'];

      const tree = createFolderTree(directories);

      expect(tree).toContain('src');
      expect(tree).toContain('tests');
      expect(tree).toContain('docs');
    });

    it('should handle empty directories array', () => {
      const directories: string[] = [];

      const tree = createFolderTree(directories);

      expect(tree).toBe('');
    });

    it('should create hierarchical structure', () => {
      const directories = ['src', 'src/utils', 'tests'];

      const tree = createFolderTree(directories);

      expect(tree).toBeDefined();
      expect(typeof tree).toBe('string');
      expect(tree.length).toBeGreaterThan(0);
      expect(tree).toContain('src');
      expect(tree).toContain('utils');
      expect(tree).toContain('tests');
    });

    it('should sort directories alphabetically', () => {
      const directories = ['tests', 'docs', 'src'];

      const tree = createFolderTree(directories);

      const lines = tree.split('\n');
      expect(lines[0]).toContain('docs');
      expect(lines[1]).toContain('src');
      expect(lines[2]).toContain('tests');
    });
  });
});
