/**
 * Tool registry for managing available tools
 */

import { injectable } from 'inversify';
import 'reflect-metadata';
import type { FolderStructure, TechProfile, AnalysisDepth } from '../../types';
import type { IProviderClient } from '../../providers/types';

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FileSelectionCriteria {
  projectStructure: FolderStructure;
  techProfile: TechProfile;
  depth: AnalysisDepth;
  domain?: string;
}

export interface SelectedFiles {
  files: Array<{
    path: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  totalEstimatedTokens: number;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export interface ConcatenatedFiles {
  content: string;
  totalSize: number;
  fileCount: number;
}

/**
 * Base tool interface
 */
export interface ITool<TInput = any, TOutput = any> {
  name: string;
  description: string;

  execute(input: TInput, client: IProviderClient): Promise<ToolResult<TOutput>>;
}

/**
 * Tool registry interface for dependency injection
 */
export interface IToolRegistry {
  registerTool<T extends ITool>(tool: T): void;
  getTool(name: string): ITool | undefined;
  getAllTools(): ITool[];
  executeTool<TInput, TOutput>(
    toolName: string,
    input: TInput,
    client: IProviderClient
  ): Promise<ToolResult<TOutput>>;
}

/**
 * Tool registry implementation
 * Manages available tools for code analysis workflows
 */
@injectable()
export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ITool>();

  constructor() {
    this.registerTool(new FileSelectionTool());
    this.registerTool(new FileReadingTool());
  }

  registerTool<T extends ITool>(tool: T): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  async executeTool<TInput, TOutput>(
    toolName: string,
    input: TInput,
    client: IProviderClient
  ): Promise<ToolResult<TOutput>> {
    const tool = this.getTool(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found`,
      };
    }

    return tool.execute(input, client) as Promise<ToolResult<TOutput>>;
  }
}

// Import the tool classes here to avoid circular dependencies
import { FileSelectionTool } from './file-selection';
import { FileReadingTool } from './file-reading';