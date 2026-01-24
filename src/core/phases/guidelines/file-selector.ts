/**
 * AI-driven file selection for guideline generation
 * Lets AI choose which files are most relevant for each guideline
 */

import type { IProviderClient } from '@/providers/types';
import type { FolderStructure } from '@/types';
import { readFileSafe } from '../../utils/file-io';
import { join } from 'path';

const FILE_SELECTION_SYSTEM_PROMPT = `You are a code analysis expert identifying the most relevant files to document a specific coding pattern.

Your task: Given a guideline type and list of available files, select the 8-12 most relevant files that would best demonstrate this pattern.

CRITICAL RULES:
1. **Select files based on their paths and names** - infer what the file might contain
2. **Prioritize implementation files** - actual code, not just interfaces or types
3. **Include variety** - different types of files that show the pattern from multiple angles
4. **Avoid test files** - unless the guideline is specifically about testing
5. **Prefer concrete examples** - files likely to have actual implementation code

Selection strategy:
- For "dependency-injection": Look for container, service, workflow files with dependency injection
- For "provider-pattern": Look for provider implementations (anthropic.ts, groq.ts, etc.)
- For "phase-workflow": Look for phase implementation files (discovery, analysis, generation)
- For "validation-schemas": Look for schema definitions, validators, input validation
- For "prompt-engineering": Look for files with "prompt" in the name
- For "typescript-imports" or "module-imports" or any imports-related:
  * Prioritize files in src/core/, src/workflows/, src/phases/ (likely to have both path aliases and relative imports)
  * Include files from multiple directories to show different import styles
  * Look for files in nested directories (more likely to use path aliases like @/)
- For any pattern: Infer from file paths what they might contain

IMPORTANT: You're selecting based on FILE PATHS ONLY, not file contents. Use your understanding of typical project structures.`;

function FILE_SELECTION_USER_PROMPT(
  guidelineType: string,
  domain: string,
  availableFiles: string[]
): string {
  return `Select the 8-12 most relevant files for documenting: **${domain} - ${guidelineType}**

## Available Files (${availableFiles.length} total)

${availableFiles.slice(0, 50).join('\n')}
${availableFiles.length > 50 ? `\n... and ${availableFiles.length - 50} more files` : ''}

## Instructions

Based on the file paths above, select 8-12 files that would best demonstrate the "${guidelineType}" pattern.

Consider:
1. **File paths that suggest implementation** (not just types/interfaces)
2. **Files in relevant directories** (e.g., for DI: di/, services/, workflows/)
3. **Files that likely contain concrete examples** (not abstract base classes)
4. **Variety of examples** (different use cases of the same pattern)

Return ONLY a JSON object:
{
  "selectedFiles": [
    "path/to/file1.ts",
    "path/to/file2.ts",
    ...
  ],
  "reasoning": "Brief explanation of why these files were chosen"
}

Select files whose paths suggest they contain the most relevant code examples for "${guidelineType}".`;
}

/**
 * AI-driven file selection - let AI choose based on file paths
 */
async function selectFilesByAI(
  client: IProviderClient,
  projectStructure: FolderStructure,
  guidelineType: string,
  domain: string,
  maxFiles: number
): Promise<string[]> {
  try {
    const allFiles = [...projectStructure.keyFiles, ...projectStructure.configFiles];

    // Ask AI to select relevant files
    const response = await client.completeWithJson<{
      selectedFiles: string[];
      reasoning?: string;
    }>(
      FILE_SELECTION_SYSTEM_PROMPT,
      FILE_SELECTION_USER_PROMPT(guidelineType, domain, allFiles)
    );

    const selectedFiles = response.selectedFiles || [];

    // Validate selected files exist in available files
    const validFiles = selectedFiles.filter(f => allFiles.includes(f));

    if (validFiles.length === 0) {
      // Fallback to simple relevance scoring
      return selectFilesBySimpleScoring(projectStructure, guidelineType, maxFiles);
    }

    return validFiles.slice(0, maxFiles);
  } catch (error) {
    // Fallback to simple scoring on error
    return selectFilesBySimpleScoring(projectStructure, guidelineType, maxFiles);
  }
}

/**
 * Simple scoring fallback - used when AI selection fails
 * Enhanced with diversity and smart sampling for large projects
 */
function selectFilesBySimpleScoring(
  projectStructure: FolderStructure,
  guidelineType: string,
  maxFiles: number
): string[] {
  const allFiles = [...projectStructure.keyFiles, ...projectStructure.configFiles];

  // Score files based on relevance to guideline type
  const scoredFiles = allFiles
    .map(file => {
      let score = 0;
      const normalized = file.replace(/\\/g, '/').toLowerCase();
      const guidelineLower = guidelineType.toLowerCase();

      // Boost score if filename contains part of guideline type
      const guidelineWords = guidelineLower.split('-');
      for (const word of guidelineWords) {
        if (normalized.includes(word)) score += 3;
      }

      // Boost for implementation files
      if (normalized.endsWith('.ts') && !normalized.includes('.test.') && !normalized.includes('.spec.')) {
        score += 2;
      }

      // Smart test file handling - include when relevant
      const isTestFile = normalized.includes('.test.') || normalized.includes('.spec.');
      if (guidelineLower.includes('test') || guidelineLower.includes('testing')) {
        // BOOST test files when guideline is about testing
        if (isTestFile) score += 5;
      } else {
        // Penalize test files for non-testing guidelines
        if (isTestFile) score -= 5;
      }

      // Boost for service/provider/workflow files (architectural core)
      if (normalized.includes('/services/') || normalized.includes('/providers/') || normalized.includes('/workflows/')) {
        score += 2;
      }

      // Boost for core/src directories (more likely to show patterns)
      if (normalized.includes('/core/') || normalized.includes('/src/')) {
        score += 1;
      }

      // Boost for interface/types files (show contracts)
      if (normalized.includes('/interfaces/') || normalized.includes('/types/') || normalized.includes('types.ts')) {
        score += 1;
      }

      // Extract directory path and file type for diversity scoring
      const parts = normalized.split('/');
      const directory = parts.slice(0, -1).join('/'); // Full directory path
      const fileName = parts[parts.length - 1];
      const fileType = inferFileType(fileName, directory);

      return { path: file, score, directory, fileType, normalized };
    })
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score);

  // Smart sampling with diversity - avoid overrepresentation
  const selected: typeof scoredFiles = [];
  const directoryCounts = new Map<string, number>();
  const fileTypeCounts = new Map<string, number>();

  // Diversity limits
  const maxPerDirectory = Math.max(2, Math.floor(maxFiles / 3)); // Max 1/3 from same dir
  const maxPerFileType = Math.max(2, Math.floor(maxFiles / 4)); // Max 1/4 of same type

  for (const file of scoredFiles) {
    if (selected.length >= maxFiles) break;

    const dirCount = directoryCounts.get(file.directory) || 0;
    const typeCount = fileTypeCounts.get(file.fileType) || 0;

    // Apply diversity constraints
    if (dirCount >= maxPerDirectory) {
      // Skip if too many from this directory already
      continue;
    }

    if (typeCount >= maxPerFileType) {
      // Skip if too many of this file type already
      continue;
    }

    // Add this file
    selected.push(file);
    directoryCounts.set(file.directory, dirCount + 1);
    fileTypeCounts.set(file.fileType, typeCount + 1);
  }

  // If diversity constraints resulted in too few files, relax them
  if (selected.length < maxFiles * 0.6) {
    // Fall back to top-scored files without diversity constraints
    return scoredFiles.slice(0, maxFiles).map(f => f.path);
  }

  return selected.map(f => f.path);
}

/**
 * Infer file type from filename and directory for diversity scoring
 */
function inferFileType(fileName: string, directory: string): string {
  const lower = fileName.toLowerCase();

  // Test files
  if (lower.includes('.test.') || lower.includes('.spec.')) return 'test';

  // Config files
  if (lower.includes('config') || lower.includes('.config.')) return 'config';

  // Type/Interface files
  if (lower.includes('types.ts') || lower.includes('interface')) return 'types';

  // By directory
  if (directory.includes('/services/')) return 'service';
  if (directory.includes('/providers/')) return 'provider';
  if (directory.includes('/workflows/')) return 'workflow';
  if (directory.includes('/utils/') || directory.includes('/helpers/')) return 'utility';
  if (directory.includes('/controllers/')) return 'controller';
  if (directory.includes('/models/')) return 'model';
  if (directory.includes('/phases/')) return 'phase';
  if (directory.includes('/interfaces/')) return 'interface';

  // By filename patterns
  if (lower.endsWith('service.ts')) return 'service';
  if (lower.endsWith('provider.ts')) return 'provider';
  if (lower.endsWith('controller.ts')) return 'controller';
  if (lower.endsWith('model.ts')) return 'model';
  if (lower.endsWith('util.ts') || lower.endsWith('helper.ts')) return 'utility';

  return 'other';
}

/**
 * Smart file selection for a specific guideline type
 * Uses AI to intelligently select relevant files based on guideline type
 */
export async function selectFilesForGuideline(
  client: IProviderClient,
  projectStructure: FolderStructure,
  guidelineType: string,
  domain: string,
  maxFiles: number = 10
): Promise<string[]> {
  // Use AI-driven selection - let AI intelligently choose files
  return await selectFilesByAI(client, projectStructure, guidelineType, domain, maxFiles);
}

/**
 * Read selected files and concatenate their content
 */
export async function readSelectedFiles(
  targetPath: string,
  filePaths: string[]
): Promise<string> {
  const fileContents: string[] = [];

  for (const filePath of filePaths) {
    const fullPath = join(targetPath, filePath);
    const content = await readFileSafe(fullPath);

    if (content && content.length > 0 && content.length < 100000) {
      // Include file with header
      fileContents.push(`// File: ${filePath}\n${content}`);
    }
  }

  if (fileContents.length === 0) {
    return '(No files could be read)';
  }

  // Concatenate all file contents
  const concatenated = fileContents.join('\n\n---\n\n');

  // Limit to ~50k chars to avoid token limits
  return concatenated.slice(0, 50000);
}

/**
 * Select and read files for a guideline in one call
 */
export async function selectAndReadFiles(
  client: IProviderClient,
  targetPath: string,
  projectStructure: FolderStructure,
  guidelineType: string,
  domain: string,
  maxFiles: number = 10
): Promise<string> {
  // Let AI select relevant files
  const selectedFiles = await selectFilesForGuideline(
    client,
    projectStructure,
    guidelineType,
    domain,
    maxFiles
  );

  if (selectedFiles.length === 0) {
    return '(No relevant files found for this guideline type)';
  }

  // Read and concatenate the selected files
  return await readSelectedFiles(targetPath, selectedFiles);
}
