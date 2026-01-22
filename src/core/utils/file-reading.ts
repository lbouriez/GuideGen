/**
 * Tool for reading and concatenating selected files
 */

import type { ConcatenatedFiles, FileContent, ToolResult, ITool } from './registry';
import type { IProviderClient } from '../../providers/types';

export class FileReadingTool implements ITool<string[], ConcatenatedFiles> {
  name = 'file_reading';
  description = 'Reads multiple files and concatenates them with file path headers';

  async execute(
    filePaths: string[],
    client: IProviderClient
  ): Promise<ToolResult<ConcatenatedFiles>> {
    try {
      const { readFileSafe } = await import('@/core/utils/file-io');

      const contents: FileContent[] = [];
      let totalSize = 0;

      for (const filePath of filePaths) {
        const content = await readFileSafe(filePath);
        if (content) {
          const size = content.length;
          contents.push({
            path: filePath,
            content,
            size,
          });
          totalSize += size;
        }
      }

      // Concatenate with file headers
      const concatenatedContent = contents
        .map(file => `=== FILE: ${file.path} ===\n${file.content}`)
        .join('\n\n');

      return {
        success: true,
        data: {
          content: concatenatedContent,
          totalSize,
          fileCount: contents.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in file reading',
      };
    }
  }
}