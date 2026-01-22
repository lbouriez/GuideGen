/**
 * Provider Configuration Manager
 * Handles loading and saving provider configuration
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { ProviderConfig } from './types';
import { ProviderType, DEFAULT_MODELS } from './types';
import { logger } from '@/utils/logger';

export class ProviderConfigManager {
  private readonly envPath: string;

  constructor(envPath?: string) {
    this.envPath = envPath || join(process.cwd(), '.env');
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
      const lines = envContent.split('\n');

      let provider: ProviderType | null = null;
      let apiKey = '';
      const models = {
        quick: '',
        standard: '',
        thorough: '',
      };
      let excludedProjects: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();

        switch (key.trim()) {
          case 'AI_PROVIDER':
            provider = value as ProviderType;
            break;
          case 'ANTHROPIC_API_KEY':
            if (!apiKey) apiKey = value;
            break;
          case 'GROQ_API_KEY':
            if (!apiKey) apiKey = value;
            break;
          case 'AI_MODEL_QUICK':
            models.quick = value;
            break;
          case 'AI_MODEL_STANDARD':
            models.standard = value;
            break;
          case 'AI_MODEL_THOROUGH':
            models.thorough = value;
            break;
          case 'EXCLUDED_PROJECTS':
            excludedProjects = value ? value.split(',').map(p => p.trim()) : [];
            break;
        }
      }

      if (!provider || !apiKey) {
        return null;
      }

      // Use defaults if models not specified
      const defaultModels = DEFAULT_MODELS[provider];
      return {
        provider,
        apiKey,
        models: {
          quick: models.quick || defaultModels.quick,
          standard: models.standard || defaultModels.standard,
          thorough: models.thorough || defaultModels.thorough,
        },
        excludedProjects,
      };
    } catch (error) {
      logger.error('Failed to parse .env file', error);
      return null;
    }
  }

  /**
   * Save configuration to .env file
   */
  saveToEnv(config: ProviderConfig): void {
    const apiKeyVar = config.provider === ProviderType.ANTHROPIC ? 'ANTHROPIC_API_KEY' : 'GROQ_API_KEY';

    const envContent = `# GuideGen AI Provider Configuration
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
