/**
 * Provider Manager - Refactored
 * Coordinates provider configuration, client creation, and error recovery
 */

import type { AnalysisDepth } from '../types';
import type { IProviderClient, ProviderConfig, CompletionOptions } from './types';
import { ProviderType } from './types';
import { ProviderConfigManager } from './config-manager';
import { InteractiveSetup } from './interactive-setup';
import { ProviderClientFactory } from './client-factory';
import { ErrorRecoveryHandler } from './error-recovery';

export class ProviderManager {
  private static instance: ProviderManager;
  private config: ProviderConfig | null = null;
  private client: IProviderClient | null = null;

  private configManager: ProviderConfigManager;
  private interactiveSetup: InteractiveSetup;
  private clientFactory: ProviderClientFactory;
  private errorRecovery: ErrorRecoveryHandler;

  private constructor() {
    this.configManager = new ProviderConfigManager();
    this.interactiveSetup = new InteractiveSetup();
    this.clientFactory = new ProviderClientFactory();
    this.errorRecovery = new ErrorRecoveryHandler();
  }

  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

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
   */
  async loadOrSetupConfig(forceSetup: boolean = false): Promise<ProviderConfig> {
    if (this.config && !forceSetup) {
      return this.config;
    }

    // Try to load from .env
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
   * Wrap client with error recovery
   */
  private wrapClientWithErrorRecovery(originalClient: IProviderClient, depth: AnalysisDepth): IProviderClient {
    return {
      setDepth: (depth: AnalysisDepth) => originalClient.setDepth(depth),
      getModelType: () => originalClient.getModelType(),

      complete: async (systemPrompt: string, userPrompt: string, options?: CompletionOptions) => {
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
      },

      completeWithJson: async (systemPrompt: string, userPrompt: string, options?: CompletionOptions) => {
        try {
          return await originalClient.completeWithJson(systemPrompt, userPrompt, options);
        } catch (error: unknown) {
          if (this.errorRecovery.shouldReconfigureProvider(error)) {
            return await this.errorRecovery.handleProviderError(
              error,
              depth,
              async (depth) => await this.reconfigureProvider(depth),
              async () => this.client!.completeWithJson(systemPrompt, userPrompt, options)
            );
          }
          throw error;
        }
      },

      sendMessage: async (systemPrompt: string, userPrompt: string, options?: CompletionOptions) => {
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
 */
export async function createProviderClient(depth: AnalysisDepth = 'standard'): Promise<IProviderClient> {
  return ProviderManager.getInstance().getClient(depth);
}
