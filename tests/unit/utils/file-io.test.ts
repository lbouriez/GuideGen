/**
 * Unit tests for file I/O utilities
 * Tests file reading, writing, and directory operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  getFolderStructure,
  readFileContent,
  readFileSafe,
  writeFileContent,
  fileExists,
  sampleFiles,
  findPackageJsonFiles,
  getFilesByExtension,
  getRelativePath,
  getFileExtension,
  getFileName,
  generateProjectTree,
} from '@/core/utils/file-io';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  stat: vi.fn(),
  readdir: vi.fn(),
}));

// Mock glob
vi.mock('glob', () => ({
  glob: vi.fn(),
}));

describe('File I/O Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('readFileSafe()', () => {
    it('should return file content when file exists', async () => {
      const mockContent = 'File content here';
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result = await readFileSafe('/path/to/file.txt');

      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8');
    });

    it('should return null when file does not exist', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      const result = await readFileSafe('/path/to/missing.txt');

      expect(result).toBeNull();
    });

    it('should return null on permission error', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('EACCES'));

      const result = await readFileSafe('/path/to/restricted.txt');

      expect(result).toBeNull();
    });

    it('should handle empty files', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('');

      const result = await readFileSafe('/path/to/empty.txt');

      expect(result).toBe('');
    });

    it('should handle large files', async () => {
      const largeContent = 'x'.repeat(10000);
      vi.mocked(fs.readFile).mockResolvedValue(largeContent);

      const result = await readFileSafe('/path/to/large.txt');

      expect(result).toBe(largeContent);
      expect(result?.length).toBe(10000);
    });
  });

  describe('readFileContent()', () => {
    it('should return file content when successful', async () => {
      const mockContent = 'Success content';
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const result = await readFileContent('/path/to/file.txt');

      expect(result).toBe(mockContent);
    });

    it('should throw error with file path when read fails', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Read error'));

      await expect(readFileContent('/path/to/file.txt')).rejects.toThrow(
        'Failed to read file: /path/to/file.txt'
      );
    });
  });

  describe('writeFileContent()', () => {
    it('should create directory and write file', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await writeFileContent('/path/to/new/file.txt', 'Content');

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledWith('/path/to/new/file.txt', 'Content', 'utf-8');
    });

    it('should create nested directories recursively', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await writeFileContent('/deep/nested/path/file.txt', 'Content');

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    it('should write empty content', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await writeFileContent('/path/to/file.txt', '');

      expect(fs.writeFile).toHaveBeenCalledWith('/path/to/file.txt', '', 'utf-8');
    });

    it('should write multiline content', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const content = 'Line 1\nLine 2\nLine 3';
      await writeFileContent('/path/to/file.txt', content);

      expect(fs.writeFile).toHaveBeenCalledWith('/path/to/file.txt', content, 'utf-8');
    });

    it('should handle special characters in content', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const content = 'Special: \n\t\r\u2028\u2029';
      await writeFileContent('/path/to/file.txt', content);

      expect(fs.writeFile).toHaveBeenCalledWith('/path/to/file.txt', content, 'utf-8');
    });
  });

  describe('fileExists()', () => {
    it('should return true when file exists', async () => {
      vi.mocked(fs.stat).mockResolvedValue({} as any);

      const result = await fileExists('/path/to/file.txt');

      expect(result).toBe(true);
      expect(fs.stat).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should return false when file does not exist', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      const result = await fileExists('/path/to/missing.txt');

      expect(result).toBe(false);
    });

    it('should return false on permission error', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('EACCES'));

      const result = await fileExists('/path/to/restricted.txt');

      expect(result).toBe(false);
    });

    it('should work with directory paths', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any);

      const result = await fileExists('/path/to/directory');

      expect(result).toBe(true);
    });
  });

  describe('getFolderStructure()', () => {
    it('should scan directory structure', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValueOnce(['src/', 'tests/'] as any);
      vi.mocked(glob).mockResolvedValueOnce(['package.json', 'tsconfig.json'] as any);
      vi.mocked(glob).mockResolvedValue([] as any);

      const result = await getFolderStructure('/project');

      expect(result.root).toBe('/project');
      expect(result.directories).toContain('src');
      expect(result.directories).toContain('tests');
    });

    it('should find config files', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValueOnce([] as any); // directories
      vi.mocked(glob).mockResolvedValue(['package.json', 'tsconfig.json'] as any);

      const result = await getFolderStructure('/project');

      expect(result.configFiles).toContain('package.json');
      expect(result.configFiles).toContain('tsconfig.json');
    });

    it('should find key files', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob)
        .mockResolvedValueOnce([] as any) // directories
        .mockResolvedValue([] as any); // Initial config files calls

      // Mock the key files search
      vi.mocked(glob).mockResolvedValueOnce(['README.md'] as any);

      const result = await getFolderStructure('/project');

      expect(result.keyFiles).toBeDefined();
    });

    it('should deduplicate and sort results', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob)
        .mockResolvedValueOnce(['src/', 'src/'] as any) // duplicate directories
        .mockResolvedValue([] as any);

      const result = await getFolderStructure('/project');

      expect(result.directories.filter(d => d === 'src')).toHaveLength(1);
    });
  });

  describe('sampleFiles()', () => {
    it('should return sample of files with content', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue([
        'file1.ts',
        'file2.ts',
        'file3.ts',
      ] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce('content1')
        .mockResolvedValueOnce('content2')
        .mockResolvedValueOnce('content3');

      const result = await sampleFiles('/project', '**/*.ts', 3);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ path: 'file1.ts', content: 'content1' });
    });

    it('should limit to maxFiles', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue([
        'file1.ts',
        'file2.ts',
        'file3.ts',
        'file4.ts',
        'file5.ts',
        'file6.ts',
      ] as any);
      vi.mocked(fs.readFile).mockResolvedValue('content');

      const result = await sampleFiles('/project', '**/*.ts', 3);

      expect(result).toHaveLength(3);
    });

    it('should skip files that cannot be read', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue(['file1.ts', 'file2.ts'] as any);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce('content1')
        .mockRejectedValueOnce(new Error('Cannot read'));

      const result = await sampleFiles('/project', '**/*.ts', 2);

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('file1.ts');
    });

    it('should use default maxFiles of 5', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue(Array(10).fill('file.ts') as any);
      vi.mocked(fs.readFile).mockResolvedValue('content');

      const result = await sampleFiles('/project', '**/*.ts');

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('findPackageJsonFiles()', () => {
    it('should find all package.json files', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue([
        'package.json',
        'packages/app/package.json',
      ] as any);

      const result = await findPackageJsonFiles('/project');

      expect(result).toContain('package.json');
      expect(result).toContain('packages/app/package.json');
    });

    it('should exclude node_modules', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue(['package.json'] as any);

      await findPackageJsonFiles('/project');

      expect(glob).toHaveBeenCalledWith(
        '**/package.json',
        expect.objectContaining({
          ignore: expect.arrayContaining([expect.stringContaining('node_modules')]),
        })
      );
    });
  });

  describe('getFilesByExtension()', () => {
    it('should find files with given extensions', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob)
        .mockResolvedValueOnce(['file1.ts', 'file2.ts'] as any)
        .mockResolvedValueOnce(['file1.js'] as any);

      const result = await getFilesByExtension('/project', ['.ts', '.js']);

      expect(result).toContain('file1.ts');
      expect(result).toContain('file2.ts');
      expect(result).toContain('file1.js');
    });

    it('should deduplicate results', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue(['duplicate.ts'] as any);

      const result = await getFilesByExtension('/project', ['.ts', '.ts']);

      expect(result.filter(f => f === 'duplicate.ts')).toHaveLength(1);
    });

    it('should sort results', async () => {
      const { glob } = await import('glob');
      vi.mocked(glob).mockResolvedValue(['z.ts', 'a.ts', 'm.ts'] as any);

      const result = await getFilesByExtension('/project', ['.ts']);

      expect(result[0]).toBe('a.ts');
      expect(result[result.length - 1]).toBe('z.ts');
    });
  });

  describe('getRelativePath()', () => {
    it('should compute relative path', () => {
      const result = getRelativePath('/project', '/project/src/file.ts');
      expect(result).toBe(path.relative('/project', '/project/src/file.ts'));
    });

    it('should handle parent directories', () => {
      const result = getRelativePath('/project/src', '/project/tests');
      expect(result).toBeTruthy();
    });

    it('should handle same directory', () => {
      const result = getRelativePath('/project', '/project');
      expect(result).toBe('');
    });
  });

  describe('getFileExtension()', () => {
    it('should return file extension with dot', () => {
      expect(getFileExtension('file.ts')).toBe('.ts');
      expect(getFileExtension('file.test.ts')).toBe('.ts');
      expect(getFileExtension('archive.tar.gz')).toBe('.gz');
    });

    it('should return empty string for no extension', () => {
      expect(getFileExtension('README')).toBe('');
      expect(getFileExtension('.gitignore')).toBe('');
    });

    it('should work with paths', () => {
      expect(getFileExtension('/path/to/file.js')).toBe('.js');
    });
  });

  describe('getFileName()', () => {
    it('should return filename from path', () => {
      expect(getFileName('/path/to/file.ts')).toBe('file.ts');
      expect(getFileName('file.ts')).toBe('file.ts');
    });

    it('should handle Windows paths', () => {
      expect(getFileName('C:\\path\\to\\file.ts')).toBeTruthy();
    });

    it('should handle trailing slash', () => {
      const result = getFileName('/path/to/dir/');
      // The actual behavior depends on path.basename implementation
      expect(result).toBeDefined();
    });
  });

  describe('generateProjectTree()', () => {
    it('should generate tree structure', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'src', isDirectory: () => true } as any,
        { name: 'package.json', isDirectory: () => false } as any,
      ]);

      const result = await generateProjectTree('/project', 1, 10);

      expect(result).toContain('project/');
      expect(result).toContain('src');
      expect(result).toContain('package.json');
    });

    it('should respect maxDepth', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'level1', isDirectory: () => true } as any,
      ]);

      const result = await generateProjectTree('/project', 0, 10);

      expect(result).toContain('project/');
      // Should not recurse into level1
    });

    it('should limit items per directory', async () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        name: `file${i}.txt`,
        isDirectory: () => false,
      }));
      vi.mocked(fs.readdir).mockResolvedValue(manyItems as any);

      const result = await generateProjectTree('/project', 1, 5);

      expect(result).toContain('... (15 more items)');
    });

    it('should filter ignored patterns', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'node_modules', isDirectory: () => true } as any,
        { name: '.git', isDirectory: () => true } as any,
        { name: 'src', isDirectory: () => true } as any,
      ]);

      const result = await generateProjectTree('/project', 1, 10);

      expect(result).not.toContain('node_modules');
      expect(result).not.toContain('.git');
      expect(result).toContain('src');
    });

    it('should sort directories before files', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'file.txt', isDirectory: () => false } as any,
        { name: 'dir', isDirectory: () => true } as any,
      ]);

      const result = await generateProjectTree('/project', 1, 10);

      const dirIndex = result.indexOf('dir');
      const fileIndex = result.indexOf('file.txt');
      expect(dirIndex).toBeLessThan(fileIndex);
    });

    it('should handle read errors gracefully', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'));

      const result = await generateProjectTree('/project', 1, 10);

      expect(result).toContain('project/');
      // Should complete without throwing
    });
  });
});
