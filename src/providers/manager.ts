/**
 * Provider Manager - Refactored
 * Coordinates provider configuration, client creation, and error recovery
 */

import { injectable } from 'inversify';
import type { AnalysisDepth } from '../types';
import type { IProviderClient, ProviderConfig, CompletionOptions } from './types';
import { ProviderType } from './types';
import { ProviderConfigManager } from './config-manager';
import { InteractiveSetup } from './interactive-setup';
import { ProviderClientFactory } from './client-factory';
import { ErrorRecoveryHandler } from './error-recovery';
import { RateLimiterWithRetry } from '../services/rate-limiter';

/**
 * Provider Manager - Orchestrates AI provider configuration and client lifecycle
 *
 * Uses dependency injection for all dependencies. Get instance from DI container:
 *
 * @example
 * ```typescript
 * import { container } from '@/di/container';
 * import { TYPES } from '@/di/identifiers';
 * const providerManager = container.get<ProviderManager>(TYPES.IProviderManager);
 * ```
 */
@injectable()
export class ProviderManager {
  private config: ProviderConfig | null = null;
  private client: IProviderClient | null = null;

  constructor(
    private configManager: ProviderConfigManager = new ProviderConfigManager(),
    private interactiveSetup: InteractiveSetup = new InteractiveSetup(),
    private clientFactory: ProviderClientFactory = new ProviderClientFactory(),
    private errorRecovery: ErrorRecoveryHandler = new ErrorRecoveryHandler(),
    // Rate limiter: 3 concurrent requests, 500ms between calls, 3 retries, 2s initial retry delay
    private rateLimiter: RateLimiterWithRetry = new RateLimiterWithRetry(3, 500, 3, 2000)
  ) {}

  /**
   * Get AI provider client with error recovery wrapper
   */
  async getClient(depth: AnalysisDepth = 'standard', forceSetup: boolean = false): Promise<IProviderClient> {
    if (!this.client || forceSetup) {
      const config = await this.loadOrSetupConfig(forceSetup);
      this.client = this.clientFactory.createClient(config);
      this.client.setDepth(depth);
    }

    // Wrap the client to catch provider errors
    return this.wrapClientWithErrorRecovery(this.client, depth);
  }

  /**
   * Load or setup provider configuration
   * Priority: 1) Environment variables, 2) .env file, 3) Interactive setup
   */
  async loadOrSetupConfig(forceSetup: boolean = false): Promise<ProviderConfig> {
    if (this.config && !forceSetup) {
      return this.config;
    }

    // Try to load from environment variables first (more secure)
    const envVarsConfig = this.configManager.loadFromEnvironment();
    if (envVarsConfig && !forceSetup) {
      this.config = envVarsConfig;
      return envVarsConfig;
    }

    // Try to load from .env file
    const envConfig = this.configManager.loadFromEnv();

    if (envConfig && !forceSetup) {
      // Ask if user wants to use existing config
      const useExisting = await this.interactiveSetup.promptUseExistingConfig(envConfig);

      if (useExisting) {
        this.config = envConfig;
        return envConfig;
      }

      // User wants to reconfigure - run setup wizard with existing config
      const newConfig = await this.interactiveSetup.runSetupWizard(envConfig);
      this.config = newConfig;
      this.configManager.saveToEnv(newConfig);
      return newConfig;
    }

    // No existing config or forced setup - run wizard
    const newConfig = await this.interactiveSetup.runSetupWizard();
    this.config = newConfig;
    this.configManager.saveToEnv(newConfig);
    return newConfig;
  }

  /**
   * Wrap client with rate limiting and error recovery
   */
  private wrapClientWithErrorRecovery(originalClient: IProviderClient, depth: AnalysisDepth): IProviderClient {
    return {
      setDepth: (depth: AnalysisDepth) => originalClient.setDepth(depth),
      getModelType: () => originalClient.getModelType(),

      complete: async (systemPrompt: string, userPrompt: string, options?: CompletionOptions) => {
        return this.rateLimiter.throttleWithRetry(async () => {
          try {
            return await originalClient.complete(systemPrompt, userPrompt, options);
          } catch (error: unknown) {
            if (this.errorRecovery.shouldReconfigureProvider(error)) {
              return await this.errorRecovery.handleProviderError(
                error,
                depth,
                async (depth) => await this.reconfigureProvider(depth),
                async () => this.client!.complete(systemPrompt, userPrompt, options)
              );
            }
            throw error;
          }
        });
      },

      completeWithJson: async <T = unknown>(systemPrompt: string, userPrompt: string, options?: CompletionOptions): Promise<T> => {
        return this.rateLimiter.throttleWithRetry(async () => {
          try {
            return await originalClient.completeWithJson<T>(systemPrompt, userPrompt, options);
          } catch (error: unknown) {
            if (this.errorRecovery.shouldReconfigureProvider(error)) {
              return await this.errorRecovery.handleProviderError(
                error,
                depth,
                async (depth) => await this.reconfigureProvider(depth),
                async () => this.client!.completeWithJson<T>(systemPrompt, userPrompt, options)
              );
            }
            throw error;
          }
        });
      },

      sendMessage: async (systemPrompt: string, userPrompt: string, options?: CompletionOptions) => {
        return this.rateLimiter.throttleWithRetry(async () => {
          try {
            return await originalClient.sendMessage(systemPrompt, userPrompt, options);
          } catch (error: unknown) {
            if (this.errorRecovery.shouldReconfigureProvider(error)) {
              return await this.errorRecovery.handleProviderError(
                error,
                depth,
                async (depth) => await this.reconfigureProvider(depth),
                async () => this.client!.sendMessage(systemPrompt, userPrompt, options)
              );
            }
            throw error;
          }
        });
      },
    };
  }

  /**
   * Reconfigure provider after error
   */
  private async reconfigureProvider(depth: AnalysisDepth): Promise<void> {
    // Clear invalid config and client
    this.config = null;
    this.client = null;
    await this.configManager.clear();

    // Force re-setup with interactive wizard
    const newConfig = await this.loadOrSetupConfig(true);
    this.client = this.clientFactory.createClient(newConfig);
    this.client.setDepth(depth);
  }

  /**
   * Force setup wizard
   */
  async forceSetup(): Promise<void> {
    await this.loadOrSetupConfig(true);
  }

  /**
   * Get current provider type
   */
  getCurrentProvider(): ProviderType | null {
    return this.config?.provider || null;
  }

  /**
   * Get excluded projects list
   */
  getExcludedProjects(): string[] {
    return this.config?.excludedProjects || [];
  }

  /**
   * Check if exclusions are configured
   */
  hasConfiguredExclusions(): boolean {
    return (this.config?.excludedProjects?.length || 0) > 0;
  }

  /**
   * Update excluded projects
   */
  async updateExcludedProjects(excludedProjects: string[]): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration loaded');
    }

    this.config = await this.configManager.updateExcludedProjects(this.config, excludedProjects);
  }
}

/**
 * Helper function to create a provider client
 *
 * NOTE: This function uses the global DI container. For better testability,
 * inject ProviderManager directly into your classes instead.
 *
 * @deprecated Use dependency injection instead:
 * ```typescript
 * import { container } from '@/di/container';
 * import { TYPES } from '@/di/identifiers';
 * const manager = container.get<ProviderManager>(TYPES.IProviderManager);
 * const client = await manager.getClient(depth);
 * ```
 */
export async function createProviderClient(depth: AnalysisDepth = 'standard'): Promise<IProviderClient> {
  const { container } = await import('../di/container');
  const { TYPES } = await import('../di/identifiers');
  const providerManager = container.get<ProviderManager>(TYPES.IProviderManager);
  return providerManager.getClient(depth);
}
