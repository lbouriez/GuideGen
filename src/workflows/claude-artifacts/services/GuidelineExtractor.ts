/**
 * Guideline Extractor Service
 * Extracts guidelines and rules from the filesystem
 */

import { injectable, inject } from 'inversify';
import * as fs from 'fs';
import * as path from 'path';
import { TYPES } from '../../../di/identifiers.js';
import type { ILogger } from '../../../interfaces/services/ILogger.js';
import type { GeneratedGuideline, ExtractedRule } from '../../../types/index.js';
import { toGuidelineDomain } from '../../../types/index.js';
import { PackageJsonSchema, parseWithSchema } from '../../../types/schemas.js';

@injectable()
export class GuidelineExtractor {
  constructor(
    @inject(TYPES.ILogger) private logger: ILogger
  ) {}

  /**
   * Read existing guidelines from the target path
   */
  readGuidelines(targetPath: string): GeneratedGuideline[] {
    const guidelines: GeneratedGuideline[] = [];
    const guidelinesPath = path.join(targetPath, '.guidelines');

    if (!fs.existsSync(guidelinesPath)) {
      this.logger.debug('No guidelines directory found');
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

    this.logger.debug(`Read ${guidelines.length} guidelines`);
    return guidelines;
  }

  /**
   * Extract rules from guidelines for agent generation
   */
  extractRules(guidelines: GeneratedGuideline[]): ExtractedRule[] {
    const rules: ExtractedRule[] = [];

    for (const guideline of guidelines) {
      // Extract critical rules (✅/❌ patterns)
      const criticalRules = guideline.content.match(/- [✅❌][^\n]+/g) || [];

      for (let i = 0; i < criticalRules.length; i++) {
        const domain = guideline.domain as 'backend' | 'frontend' | 'shared' | 'all' | undefined;
        rules.push({
          id: `${guideline.type}-rule-${i + 1}`,
          category: 'critical',
          description: criticalRules[i].replace(/^- [✅❌]\s*/, ''),
          domain,
          enforceable: true
        });
      }
    }

    this.logger.debug(`Extracted ${rules.length} rules from guidelines`);
    return rules;
  }

  /**
   * Get package.json scripts from the target path
   */
  getPackageJsonScripts(targetPath: string): Record<string, string> | undefined {
    try {
      const packageJsonPath = path.join(targetPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const result = parseWithSchema(PackageJsonSchema, content);
        if (result.success) {
          return result.data.scripts;
        }
      }
    } catch (error) {
      this.logger.debug('Failed to read package.json scripts', { error });
    }
    return undefined;
  }
}
