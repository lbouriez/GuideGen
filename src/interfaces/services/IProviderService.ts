/**
 * Provider Service Interfaces
 * Abstractions for AI provider operations
 */

import type { AnalysisDepth } from '../../types/index.js';

/**
 * Completion options for provider requests
 */
export interface CompletionOptions {
  depth?: AnalysisDepth;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Provider client interface for AI interactions
 */
export interface IProviderClient {
  setDepth(depth: AnalysisDepth): void;
  getModelType(): 'reasoning' | 'standard';

  complete(
    systemPrompt: string,
    userPrompt: string,
    options?: CompletionOptions
  ): Promise<string>;

  completeWithJson<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: CompletionOptions
  ): Promise<T>;

  sendMessage(
    systemPrompt: string,
    userPrompt: string,
    options?: CompletionOptions
  ): Promise<{ content: string }>;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  provider: 'anthropic' | 'groq';
  models: {
    quick: string;
    standard: string;
    thorough: string;
  };
  apiKey: string;
  excludedProjects?: string[];
}

/**
 * Provider manager interface
 */
export interface IProviderManager {
  getClient(depth?: AnalysisDepth, forceSetup?: boolean): Promise<IProviderClient>;
  loadOrSetupConfig(forceSetup?: boolean): Promise<ProviderConfig>;
  forceSetup(): Promise<void>;
  getCurrentProvider(): string | null;
  getExcludedProjects(): string[];
  hasConfiguredExclusions(): boolean;
  updateExcludedProjects(excludedProjects: string[]): Promise<void>;
}

/**
 * Provider configuration manager interface
 */
export interface IProviderConfigManager {
  loadFromEnv(): ProviderConfig | null;
  saveToEnv(config: ProviderConfig): Promise<void>;
  clear(): Promise<void>;
  updateExcludedProjects(
    config: ProviderConfig,
    excludedProjects: string[]
  ): Promise<ProviderConfig>;
}

/**
 * Provider client factory interface
 */
export interface IProviderClientFactory {
  createClient(config: ProviderConfig): IProviderClient;
}

/**
 * Error recovery handler interface
 */
export interface IErrorRecoveryHandler {
  shouldReconfigureProvider(error: unknown): boolean;
  handleProviderError<T>(
    error: unknown,
    depth: AnalysisDepth,
    reconfigure: (depth: AnalysisDepth) => Promise<void>,
    retry: () => Promise<T>
  ): Promise<T>;
}

/**
 * Rate limiter interface
 */
export interface IRateLimiter {
  throttle<T>(fn: () => Promise<T>): Promise<T>;
  setMaxConcurrent(max: number): void;
  setMinDelay(delayMs: number): void;
  getQueueSize(): number;
}
