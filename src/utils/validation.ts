/**
 * Validation utilities for existing Claude Code setup
 */

import { join, dirname, basename } from 'path';
import { glob } from 'glob';
import { readFileSafe } from '@/core/utils/file-io';
import {
  printSection,
  printSuccess,
  printWarning,
  printInfo,
  printKeyValue,
} from '@/utils/display';

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'missing_reference' | 'broken_reference' | 'orphan_file' | 'missing_index';
  severity: 'error' | 'warning';
  file: string;
  message: string;
  suggestion?: string;
}

/**
 * Validate that guideline index files properly reference all guidelines
 */
export async function validateGuidelineIndexes(
  targetPath: string
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const guidelinesPath = join(targetPath, '.guidelines');

  // Find all guideline files
  const allGuidelineFiles = await glob('**/*.md', {
    cwd: guidelinesPath,
    ignore: ['node_modules/**'],
  });

  if (allGuidelineFiles.length === 0) {
    return { isValid: true, issues: [] };
  }

  // Check main index.md exists
  const mainIndex = await readFileSafe(join(guidelinesPath, 'index.md'));
  if (!mainIndex) {
    issues.push({
      type: 'missing_index',
      severity: 'error',
      file: '.guidelines/index.md',
      message: 'Main index.md is missing',
      suggestion: 'Create .guidelines/index.md to serve as navigation hub',
    });
  }

  // Group files by directory
  const filesByDir: Record<string, string[]> = {};
  for (const file of allGuidelineFiles) {
    const dir = dirname(file) || '.';
    if (!filesByDir[dir]) {
      filesByDir[dir] = [];
    }
    filesByDir[dir].push(file);
  }

  // Check each directory has an index and references its files
  for (const [dir, files] of Object.entries(filesByDir)) {
    if (dir === '.') continue; // Skip root, handled by main index

    const indexFile = files.find(
      (f) => f.endsWith('-index.md') || f.endsWith('/index.md')
    );

    if (!indexFile && files.length > 1) {
      issues.push({
        type: 'missing_index',
        severity: 'warning',
        file: `.guidelines/${dir}/`,
        message: `Directory "${dir}" has ${files.length} files but no index`,
        suggestion: `Create .guidelines/${dir}/${dir}-index.md`,
      });
      continue;
    }

    if (indexFile) {
      const indexContent = await readFileSafe(join(guidelinesPath, indexFile));
      if (indexContent) {
        // Check if all files in directory are referenced in the index
        for (const file of files) {
          if (file === indexFile) continue;
          const filename = basename(file);
          if (!indexContent.includes(filename)) {
            issues.push({
              type: 'missing_reference',
              severity: 'warning',
              file: `.guidelines/${file}`,
              message: `File "${filename}" is not referenced in ${indexFile}`,
              suggestion: `Add reference to ${filename} in ${indexFile}`,
            });
          }
        }
      }
    }
  }

  // Check main index references subdirectory indexes
  if (mainIndex) {
    for (const [dir, files] of Object.entries(filesByDir)) {
      if (dir === '.') continue;

      const indexFile = files.find(
        (f) => f.endsWith('-index.md') || f.endsWith('/index.md')
      );

      if (indexFile) {
        const indexFilename = basename(indexFile);
        if (!mainIndex.includes(dir) && !mainIndex.includes(indexFilename)) {
          issues.push({
            type: 'missing_reference',
            severity: 'warning',
            file: `.guidelines/${indexFile}`,
            message: `Subdirectory index "${indexFile}" not referenced in main index`,
            suggestion: `Add link to ${dir}/ in .guidelines/index.md`,
          });
        }
      }
    }
  }

  return {
    isValid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
  };
}

/**
 * Print validation results
 */
export function printValidationResults(result: ValidationResult): void {
  printSection('Guideline Index Validation');

  if (result.issues.length === 0) {
    printSuccess('All guideline indexes are properly configured');
    return;
  }

  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');

  if (errors.length > 0) {
    printKeyValue('Errors', errors.length.toString());
    for (const issue of errors) {
      printWarning(`[ERROR] ${issue.message}`);
      printInfo(`  File: ${issue.file}`);
      if (issue.suggestion) {
        printInfo(`  Fix: ${issue.suggestion}`);
      }
    }
  }

  if (warnings.length > 0) {
    printKeyValue('Warnings', warnings.length.toString());
    for (const issue of warnings) {
      printInfo(`[WARN] ${issue.message}`);
      printInfo(`  File: ${issue.file}`);
      if (issue.suggestion) {
        printInfo(`  Fix: ${issue.suggestion}`);
      }
    }
  }
}
