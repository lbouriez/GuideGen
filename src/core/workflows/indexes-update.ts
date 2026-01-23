/**
 * Indexes workflow with intelligent update mode
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IProviderClient } from '../../providers/types';
import type { TechProfile, GeneratedGuideline } from '../../types';
import type { ILogger } from '../../interfaces/services/ILogger';
import { toGuidelineDomain } from '../../types';
import { generateAllIndexes, type GeneratedIndex } from '../phases/indexes/generator';
import { validateAllIndexes } from '../phases/indexes/cross-ref';
import { batchIntelligentMerge, formatChanges } from '../phases/intelligent-merge';
import { promptUpdateMode, confirmChanges } from '../../utils/interactive';
import { printSuccess } from '../../utils/display';

export interface IndexesWorkflowResult {
  success: boolean;
  indexesGenerated: number;
  mode?: 'created' | 'updated' | 'cancelled';
  error?: string;
}

/**
 * Check if indexes exist
 */
function indexesExist(targetPath: string): boolean {
  const guidelinesPath = path.join(targetPath, '.guidelines');
  if (!fs.existsSync(guidelinesPath)) return false;

  // Check for root index
  if (fs.existsSync(path.join(guidelinesPath, 'index.md'))) return true;

  // Check for domain indexes
  const domains = fs.readdirSync(guidelinesPath, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const domain of domains) {
    const indexPath = path.join(guidelinesPath, domain.name, `${domain.name}-index.md`);
    if (fs.existsSync(indexPath)) return true;
  }

  return false;
}

/**
 * Delete all indexes (for override mode)
 */
function deleteIndexes(targetPath: string): void {
  const guidelinesPath = path.join(targetPath, '.guidelines');

  // Delete root index
  const rootIndex = path.join(guidelinesPath, 'index.md');
  if (fs.existsSync(rootIndex)) {
    fs.unlinkSync(rootIndex);
  }

  // Delete domain indexes
  if (fs.existsSync(guidelinesPath)) {
    const domains = fs.readdirSync(guidelinesPath, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const domain of domains) {
      const indexPath = path.join(guidelinesPath, domain.name, `${domain.name}-index.md`);
      if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }
    }
  }
}

/**
 * Read existing indexes from disk
 */
function readExistingIndexes(targetPath: string): Map<string, string> {
  const existing = new Map<string, string>();
  const guidelinesPath = path.join(targetPath, '.guidelines');

  if (!fs.existsSync(guidelinesPath)) {
    return existing;
  }

  // Read root index
  const rootIndexPath = path.join(guidelinesPath, 'index.md');
  if (fs.existsSync(rootIndexPath)) {
    existing.set('index.md', fs.readFileSync(rootIndexPath, 'utf-8'));
  }

  // Read domain indexes
  const domains = fs.readdirSync(guidelinesPath, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const domain of domains) {
    const indexPath = path.join(guidelinesPath, domain.name, `${domain.name}-index.md`);
    if (fs.existsSync(indexPath)) {
      existing.set(`${domain.name}/${domain.name}-index.md`, fs.readFileSync(indexPath, 'utf-8'));
    }
  }

  return existing;
}

/**
 * Read existing guidelines to pass to index generator
 */
function readExistingGuidelines(targetPath: string): GeneratedGuideline[] {
  const guidelines: GeneratedGuideline[] = [];
  const guidelinesPath = path.join(targetPath, '.guidelines');

  if (!fs.existsSync(guidelinesPath)) {
    return guidelines;
  }

  const domains = fs.readdirSync(guidelinesPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const domainStr of domains) {
    const domain = toGuidelineDomain(domainStr);
    const domainPath = path.join(guidelinesPath, domainStr);
    const files = fs.readdirSync(domainPath)
      .filter(f => f.endsWith('.md') && !f.includes('-index.md'));

    for (const file of files) {
      const filePath = path.join(domainPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      guidelines.push({
        type: file.replace('.md', ''),
        domain,
        fileName: file,
        content,
        priority: 1
      });
    }
  }

  return guidelines;
}

/**
 * Write indexes to disk
 */
function writeIndexes(
  targetPath: string,
  indexes: GeneratedIndex[],
  mergedContent?: Map<string, string>
): void {
  for (const index of indexes) {
    let filePath: string;
    let fileName: string;

    if (index.type === 'root') {
      filePath = path.join(targetPath, '.guidelines', index.fileName);
      fileName = index.fileName;
    } else {
      filePath = path.join(targetPath, '.guidelines', index.domain!, index.fileName);
      fileName = `${index.domain}/${index.fileName}`;
    }

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = mergedContent?.get(fileName) || index.content;
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

/**
 * Run indexes generation workflow with intelligent update
 */
export async function runIndexesWorkflow(
  client: IProviderClient,
  targetPath: string,
  projectName: string,
  techProfile: TechProfile,
  interactive: boolean = true,
  onProgress?: (message: string) => void
): Promise<IndexesWorkflowResult> {
  try {
    if (onProgress) onProgress('Starting indexes workflow...');

    // Read existing guidelines
    const existingGuidelines = readExistingGuidelines(targetPath);

    if (existingGuidelines.length === 0) {
      return {
        success: false,
        indexesGenerated: 0,
        error: 'No guidelines found. Run guidelines generation first.'
      };
    }

    // Check if indexes already exist
    const exists = indexesExist(targetPath);
    let updateMode: 'override' | 'update' | 'new' = 'new';

    if (exists && interactive) {
      const choice = await promptUpdateMode(path.join(targetPath, '.guidelines/*.md (indexes)'));

      if (choice === 'cancel') {
        return {
          success: true,
          indexesGenerated: 0,
          mode: 'cancelled'
        };
      }

      if (choice === 'override') {
        deleteIndexes(targetPath);
        updateMode = 'override';
      } else {
        updateMode = 'update';
      }
    } else if (exists) {
      updateMode = 'update';
    }

    // Generate indexes (in memory)
    if (onProgress) onProgress('Generating indexes...');
    const indexes = await generateAllIndexes(
      client,
      projectName,
      techProfile,
      existingGuidelines,
      targetPath,
      undefined,
      (current: number, total: number, name: string) => {
        if (onProgress) {
          onProgress(`Generating index ${current}/${total}: ${name}`);
        }
      }
    );

    // Validate
    if (onProgress) onProgress('Validating indexes...');
    const validationResults = validateAllIndexes(targetPath, indexes, existingGuidelines);

    // Check for validation errors
    const errors: string[] = [];
    for (const [key, result] of validationResults) {
      if (!result.valid) {
        const issues = [
          ...result.brokenLinks.map(l => `Broken link: ${l}`),
          ...result.missingGuidelines.map(g => `Missing guideline: ${g}`)
        ];
        if (issues.length > 0) {
          errors.push(`${key}: ${issues.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        indexesGenerated: 0,
        error: `Validation failed:\n${errors.join('\n')}`
      };
    }

    // If update mode, do intelligent merge
    if (updateMode === 'update') {
      if (onProgress) onProgress('Reading existing indexes...');
      const existingIndexes = readExistingIndexes(targetPath);

      if (onProgress) onProgress('Intelligently merging indexes...');

      const filesToMerge = indexes.map(idx => {
        const fileName = idx.type === 'root' ? idx.fileName : `${idx.domain}/${idx.fileName}`;
        return {
          fileName,
          existing: existingIndexes.get(fileName) || null,
          generated: idx.content,
          type: 'index' as const
        };
      });

      // Create a no-op logger for merge operations
      const noOpLogger: ILogger = {
        debug: () => {},
        log: () => {},
        info: () => {},
        warn: () => {},
        error: () => {}
      };

      const mergeResults = await batchIntelligentMerge(
        client,
        filesToMerge,
        noOpLogger,
        (current, total, fileName) => {
          if (onProgress) {
            onProgress(`Merging ${current}/${total}: ${fileName}`);
          }
        }
      );

      // Build change summary
      const changesSummary: string[] = [];
      for (const [fileName, result] of mergeResults) {
        changesSummary.push(`\n${fileName}:`);
        changesSummary.push(formatChanges(result.changes));
      }

      // Show dry-run preview
      if (interactive) {
        const confirmed = await confirmChanges(
          changesSummary.join('\n'),
          mergeResults.size
        );

        if (!confirmed) {
          return {
            success: true,
            indexesGenerated: 0,
            mode: 'cancelled'
          };
        }
      }

      // Write merged content
      if (onProgress) onProgress('Writing updated indexes...');
      const mergedContent = new Map<string, string>();
      for (const [fileName, result] of mergeResults) {
        mergedContent.set(fileName, result.mergedContent);
      }

      writeIndexes(targetPath, indexes, mergedContent);

      printSuccess(`\n✓ Indexes updated: ${indexes.length} files`);

      return {
        success: true,
        indexesGenerated: indexes.length,
        mode: 'updated'
      };
    }

    // New or override mode
    if (onProgress) onProgress('Writing indexes...');
    writeIndexes(targetPath, indexes);

    printSuccess(`\n✓ Indexes created: ${indexes.length} files`);

    return {
      success: true,
      indexesGenerated: indexes.length,
      mode: 'created'
    };
  } catch (error) {
    return {
      success: false,
      indexesGenerated: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
