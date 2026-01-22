/**
 * Guideline File Service
 * Handles all file I/O operations for guidelines
 */

import * as fs from 'fs';
import * as path from 'path';
import type { GeneratedGuideline } from '@/types';

export class GuidelineFileService {
  /**
   * Check if .guidelines folder exists
   */
  exists(targetPath: string): boolean {
    return fs.existsSync(path.join(targetPath, '.guidelines'));
  }

  /**
   * Delete all guidelines (for override mode)
   */
  deleteAll(targetPath: string): void {
    const guidelinesPath = path.join(targetPath, '.guidelines');
    if (fs.existsSync(guidelinesPath)) {
      fs.rmSync(guidelinesPath, { recursive: true, force: true });
    }
  }

  /**
   * Read existing guidelines from disk
   */
  readAll(targetPath: string): Map<string, string> {
    const existing = new Map<string, string>();
    const guidelinesPath = path.join(targetPath, '.guidelines');

    if (!fs.existsSync(guidelinesPath)) {
      return existing;
    }

    // Scan all domains
    const domains = fs.readdirSync(guidelinesPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const domain of domains) {
      const domainPath = path.join(guidelinesPath, domain);
      const files = fs.readdirSync(domainPath)
        .filter(f => f.endsWith('.md'));

      for (const file of files) {
        const filePath = path.join(domainPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        existing.set(`${domain}/${file}`, content);
      }
    }

    return existing;
  }

  /**
   * Write guidelines to disk
   */
  writeAll(
    targetPath: string,
    guidelines: GeneratedGuideline[],
    mergedContent?: Map<string, string>
  ): void {
    for (const guideline of guidelines) {
      this.writeOne(targetPath, guideline, mergedContent);
    }
  }

  /**
   * Write a single guideline to disk
   */
  writeOne(
    targetPath: string,
    guideline: GeneratedGuideline,
    mergedContent?: Map<string, string>
  ): void {
    const filePath = path.join(targetPath, '.guidelines', guideline.domain, guideline.fileName);
    const dir = path.dirname(filePath);

    // Create directory if needed
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Use merged content if available, otherwise use generated content
    const content = mergedContent?.get(`${guideline.domain}/${guideline.fileName}`) || guideline.content;

    fs.writeFileSync(filePath, content, 'utf-8');
  }
}
