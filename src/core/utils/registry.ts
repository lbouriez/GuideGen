/**
 * Tool registry for managing available tools
 */

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

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools = new Map<string, ITool>();

  private constructor() {
    this.registerTool(new FileSelectionTool());
    this.registerTool(new FileReadingTool());
  }

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
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