/**
 * AI tools and tool management
 */

// Tool classes
export { ToolRegistry } from './registry';
export { FileSelectionTool } from './file-selection';
export { FileReadingTool } from './file-reading';

// Tool interfaces and types
export type {
  ToolResult,
  FileSelectionCriteria,
  SelectedFiles,
  FileContent,
  ConcatenatedFiles,
  ITool,
} from './registry';

// Error utilities
export { getErrorMessage, isError, formatError } from './errors';