/**
 * Provider Configuration Manager
 * Handles loading and saving provider configuration
 */

import { injectable, inject } from 'inversify';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { TYPES } from '@/di/identifiers';
import type { ILogger } from '../interfaces/services/ILogger';
import type { ProviderConfig } from './types';
import { ProviderType, DEFAULT_MODELS } from './types';
import { printWarning } from '@/utils/display';

@injectable()
export class ProviderConfigManager {
  private readonly envPath: string;
  private readonly projectRoot: string;
  private readonly logger: ILogger;

  constructor(
    @inject(TYPES.ILogger) logger: ILogger,
    envPath?: string
  ) {
    this.logger = logger;
    this.envPath = envPath || join(process.cwd(), '.env');
    this.projectRoot = dirname(this.envPath);
  }

  /**
   * Check if .env is listed in .gitignore
   */
  isEnvInGitignore(): boolean {
    const gitignorePath = join(this.projectRoot, '.gitignore');

    if (!existsSync(gitignorePath)) {
      return false;
    }

    try {
      const content = readFileSync(gitignorePath, 'utf-8');
      const lines = content.split('\n').map(l => l.trim());

      // Check for various .env patterns
      const envPatterns = ['.env', '.env*', '.env.local', '*.env'];
      return lines.some(line => {
        if (line.startsWith('#')) return false;
        return envPatterns.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
            return regex.test('.env');
          }
          return line === pattern;
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * Warn user if .env is not in .gitignore
   */
  private warnIfEnvNotIgnored(): void {
    if (!this.isEnvInGitignore()) {
      printWarning(
        '\n⚠️  Security Warning: Your .env file is not in .gitignore!\n' +
        '   API keys may be accidentally committed to version control.\n' +
        '   Add ".env" to your .gitignore file to prevent this.\n'
      );
    }
  }

  /**
   * Load configuration from environment variables (preferred, more secure)
   */
  loadFromEnvironment(): ProviderConfig | null {
    const provider = process.env.AI_PROVIDER as ProviderType | undefined;
    const apiKey = provider === ProviderType.ANTHROPIC
      ? process.env.ANTHROPIC_API_KEY
      : process.env.GROQ_API_KEY;

    if (!provider || !apiKey) {
      return null;
    }

    const defaultModels = DEFAULT_MODELS[provider];
    return {
      provider,
      apiKey,
      models: {
        quick: process.env.AI_MODEL_QUICK || defaultModels.quick,
        standard: process.env.AI_MODEL_STANDARD || defaultModels.standard,
        thorough: process.env.AI_MODEL_THOROUGH || defaultModels.thorough,
      },
      excludedProjects: process.env.EXCLUDED_PROJECTS
        ? process.env.EXCLUDED_PROJECTS.split(',').map(p => p.trim())
        : [],
    };
  }

  /**
   * Parse .env file content into key-value map
   */
  private parseEnvFile(content: string): Map<string, string> {
    const envMap = new Map<string, string>();
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      envMap.set(key.trim(), value);
    }

    return envMap;
  }

  /**
   * Build ProviderConfig from parsed environment variables
   */
  private buildConfigFromEnvMap(envMap: Map<string, string>): ProviderConfig | null {
    const provider = envMap.get('AI_PROVIDER') as ProviderType | undefined;
    const apiKey = envMap.get('ANTHROPIC_API_KEY') || envMap.get('GROQ_API_KEY') || '';

    if (!provider || !apiKey) {
      return null;
    }

    const defaultModels = DEFAULT_MODELS[provider];
    const excludedProjectsStr = envMap.get('EXCLUDED_PROJECTS') || '';

    return {
      provider,
      apiKey,
      models: {
        quick: envMap.get('AI_MODEL_QUICK') || defaultModels.quick,
        standard: envMap.get('AI_MODEL_STANDARD') || defaultModels.standard,
        thorough: envMap.get('AI_MODEL_THOROUGH') || defaultModels.thorough,
      },
      excludedProjects: excludedProjectsStr
        ? excludedProjectsStr.split(',').map(p => p.trim())
        : [],
    };
  }

  /**
   * Load configuration from .env file
   */
  loadFromEnv(): ProviderConfig | null {
    if (!existsSync(this.envPath)) {
      return null;
    }

    try {
      const envContent = readFileSync(this.envPath, 'utf-8');
      const envMap = this.parseEnvFile(envContent);
      return this.buildConfigFromEnvMap(envMap);
    } catch (error) {
      this.logger.error('Failed to parse .env file', error);
      return null;
    }
  }

  /**
   * Save configuration to .env file
   * Warns if .env is not in .gitignore to prevent accidental commits
   */
  saveToEnv(config: ProviderConfig): void {
    // Check security before saving
    this.warnIfEnvNotIgnored();

    const apiKeyVar = config.provider === ProviderType.ANTHROPIC ? 'ANTHROPIC_API_KEY' : 'GROQ_API_KEY';

    const envContent = `# GuideGen AI Provider Configuration
# WARNING: This file contains sensitive API keys. Ensure it's in .gitignore!
AI_PROVIDER=${config.provider}
${apiKeyVar}=${config.apiKey}

# Model configuration (optional - defaults will be used if not specified)
AI_MODEL_QUICK=${config.models.quick}
AI_MODEL_STANDARD=${config.models.standard}
AI_MODEL_THOROUGH=${config.models.thorough}

# Excluded projects (comma-separated, optional)
EXCLUDED_PROJECTS=${config.excludedProjects?.join(',') || ''}
`;

    writeFileSync(this.envPath, envContent, 'utf-8');
  }

  /**
   * Clear configuration from .env file
   */
  async clear(): Promise<void> {
    if (existsSync(this.envPath)) {
      const envContent = readFileSync(this.envPath, 'utf-8');
      const lines = envContent.split('\n');
      const configKeys = [
        'AI_PROVIDER',
        'ANTHROPIC_API_KEY',
        'GROQ_API_KEY',
        'AI_MODEL_QUICK',
        'AI_MODEL_STANDARD',
        'AI_MODEL_THOROUGH',
        'EXCLUDED_PROJECTS',
      ];

      // Filter out GuideGen config lines
      const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') && trimmed.includes('GuideGen')) return false;
        const key = trimmed.split('=')[0].trim();
        return !configKeys.includes(key);
      });

      if (filteredLines.length > 0) {
        writeFileSync(this.envPath, filteredLines.join('\n'), 'utf-8');
      }
    }
  }

  /**
   * Update excluded projects in configuration
   */
  async updateExcludedProjects(config: ProviderConfig, excludedProjects: string[]): Promise<ProviderConfig> {
    const updatedConfig = { ...config, excludedProjects };
    this.saveToEnv(updatedConfig);
    return updatedConfig;
  }
}
