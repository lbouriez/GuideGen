/**
 * Intelligent Merge Tests
 * Tests for AI-powered content merging with conflict detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { intelligentMerge, batchIntelligentMerge } from '../../../../src/core/phases/intelligent-merge.js';
import type { IProviderClient } from '../../../../src/providers/types';

describe('Intelligent Merge', () => {
  let mockClient: IProviderClient;
  let mockLogger: any;

  beforeEach(() => {
    mockClient = {
      complete: vi.fn(),
      completeWithJson: vi.fn(),
      sendMessage: vi.fn(),
      setDepth: vi.fn(),
      provider: { name: 'test', apiKey: 'test' },
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  describe('intelligentMerge', () => {
    it('should merge content without conflicts', async () => {
      const oldContent = '# Old Title\nOld content here';
      const newContent = '# New Title\nNew content here';

      mockClient.complete = vi.fn().mockResolvedValue(
        '# Merged Title\nOld content here\nNew content here'
      );

      const result = await intelligentMerge(
        mockClient,
        oldContent,
        newContent,
        'test.md',
        mockLogger
      );

      expect(result.mergedContent).toContain('Merged Title');
      expect(result.changes).toBeDefined();
      expect(mockClient.complete).toHaveBeenCalled();
    });

    it('should detect and report conflicts', async () => {
      const oldContent = '# Naming\n- Use camelCase';
      const newContent = '# Naming\n- Use PascalCase';

      mockClient.complete = vi.fn().mockResolvedValue(
        '# Naming\n- Use camelCase\n- Use PascalCase\n\n<!-- CONFLICT: Different naming conventions -->'
      );

      const result = await intelligentMerge(
        mockClient,
        oldContent,
        newContent,
        'naming.md',
        mockLogger
      );

      expect(result.mergedContent).toContain('CONFLICT');
      expect(result.changes).toContain('CONFLICT');
    });

    it('should preserve user customizations', async () => {
      const oldContent = '# Custom\n<!-- USER CUSTOMIZATION -->\nMy custom rule';
      const newContent = '# Custom\nGenerated rule';

      mockClient.complete = vi.fn().mockResolvedValue(
        '# Custom\n<!-- USER CUSTOMIZATION -->\nMy custom rule\nGenerated rule'
      );

      const result = await intelligentMerge(
        mockClient,
        oldContent,
        newContent,
        'custom.md',
        mockLogger
      );

      expect(result.mergedContent).toContain('USER CUSTOMIZATION');
      expect(result.mergedContent).toContain('My custom rule');
    });

    it('should handle empty old content', async () => {
      const oldContent = '';
      const newContent = '# New Content';

      mockClient.complete = vi.fn().mockResolvedValue('# New Content');

      const result = await intelligentMerge(
        mockClient,
        oldContent,
        newContent,
        'new.md',
        mockLogger
      );

      expect(result.mergedContent).toBe('# New Content');
      expect(result.changes).toContain('Created new file');
    });

    it('should handle AI errors gracefully', async () => {
      mockClient.complete = vi.fn().mockRejectedValue(new Error('AI service timeout'));

      await expect(
        intelligentMerge(mockClient, 'old', 'new', 'test.md', mockLogger)
      ).rejects.toThrow('AI service timeout');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Merge failed')
      );
    });
  });

  describe('batchIntelligentMerge', () => {
    it('should merge multiple files in batch', async () => {
      const files = new Map([
        ['file1.md', { oldContent: '# Old 1', newContent: '# New 1' }],
        ['file2.md', { oldContent: '# Old 2', newContent: '# New 2' }],
      ]);

      mockClient.complete = vi.fn()
        .mockResolvedValueOnce('# Merged 1')
        .mockResolvedValueOnce('# Merged 2');

      const results = await batchIntelligentMerge(
        mockClient,
        files,
        mockLogger
      );

      expect(results.size).toBe(2);
      expect(results.get('file1.md')?.mergedContent).toContain('Merged 1');
      expect(results.get('file2.md')?.mergedContent).toContain('Merged 2');
    });

    it('should report progress during batch merge', async () => {
      const files = new Map([
        ['file1.md', { oldContent: '# Old 1', newContent: '# New 1' }],
        ['file2.md', { oldContent: '# Old 2', newContent: '# New 2' }],
      ]);

      mockClient.complete = vi.fn().mockResolvedValue('# Merged');

      const progressUpdates: number[] = [];
      const onProgress = (current: number, total: number) => {
        progressUpdates.push(current);
      };

      await batchIntelligentMerge(mockClient, files, mockLogger, onProgress);

      expect(progressUpdates).toEqual([1, 2]);
    });

    it('should handle partial batch failures', async () => {
      const files = new Map([
        ['file1.md', { oldContent: '# Old 1', newContent: '# New 1' }],
        ['file2.md', { oldContent: '# Old 2', newContent: '# New 2' }],
        ['file3.md', { oldContent: '# Old 3', newContent: '# New 3' }],
      ]);

      mockClient.complete = vi.fn()
        .mockResolvedValueOnce('# Merged 1')
        .mockRejectedValueOnce(new Error('Merge failed'))
        .mockResolvedValueOnce('# Merged 3');

      const results = await batchIntelligentMerge(mockClient, files, mockLogger);

      expect(results.size).toBe(2);
      expect(results.has('file1.md')).toBe(true);
      expect(results.has('file2.md')).toBe(false);
      expect(results.has('file3.md')).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should skip merge when content is identical', async () => {
      const files = new Map([
        ['file1.md', { oldContent: '# Same', newContent: '# Same' }],
      ]);

      mockClient.complete = vi.fn().mockResolvedValue('# Same');

      const results = await batchIntelligentMerge(mockClient, files, mockLogger);

      expect(results.get('file1.md')?.changes).toContain('No changes');
    });
  });
});
