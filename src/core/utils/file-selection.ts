/**
 * Tool for intelligent file selection based on project analysis
 */

import type { FileSelectionCriteria, SelectedFiles, ToolResult, ITool } from './registry';
import type { IProviderClient } from '../../providers/types';

export class FileSelectionTool implements ITool<FileSelectionCriteria, SelectedFiles> {
  name = 'file_selection';
  description = 'Analyzes project structure and selects the most relevant files for guideline generation';

  async execute(
    input: FileSelectionCriteria,
    client: IProviderClient
  ): Promise<ToolResult<SelectedFiles>> {
    try {
      const systemPrompt = `You are an expert software architect analyzing a codebase to select the most relevant files for generating comprehensive development guidelines.

Your task is to identify files that contain:
- Core business logic and domain models
- Configuration and setup files
- Key architectural patterns and implementations
- Important utility functions and helpers
- Files that demonstrate coding standards and best practices

Return a JSON object with a "files" array containing objects with "path", "reason", and "priority" fields.
Also include "totalEstimatedTokens" for the combined content.

Prioritize files based on:
- Architectural significance
- Code quality examples
- Domain-specific patterns
- Configuration that affects development workflow`;

      const userPrompt = `Project Structure:
${JSON.stringify(input.projectStructure, null, 2)}

Tech Stack:
${JSON.stringify(input.techProfile, null, 2)}

Analysis Depth: ${input.depth}
${input.domain ? `Domain Focus: ${input.domain}` : ''}

Select the most relevant files for creating comprehensive development guidelines. Focus on files that demonstrate the project's architecture, patterns, and best practices.`;

      const result = await client.completeWithJson<SelectedFiles>(
        systemPrompt,
        userPrompt,
        { maxTokens: 2000 }
      );

      // Normalize the result to ensure proper types
      const normalizedResult: SelectedFiles = {
        files: result.files.map(file => ({
          path: file.path,
          reason: file.reason,
          priority: (file.priority === 'high' || file.priority === 'medium' || file.priority === 'low')
            ? file.priority
            : 'medium', // Default to medium if invalid
        })),
        totalEstimatedTokens: result.totalEstimatedTokens || 0,
      };

      return {
        success: true,
        data: normalizedResult,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in file selection',
      };
    }
  }
}