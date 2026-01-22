/**
 * AI provider abstraction layer
 */

import type { AnalysisDepth } from '../types';

export enum ProviderType {
  ANTHROPIC = 'anthropic',
  GROQ = 'groq',
}

export interface ProviderConfig {
  provider: ProviderType;
  models: {
    quick: string;
    standard: string;
    thorough: string;
  };
  apiKey: string;
  excludedProjects?: string[];
}

/**
 * Options for provider client requests
 */
export interface CompletionOptions {
  depth?: AnalysisDepth;
  maxTokens?: number;
}

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

export const DEFAULT_MODELS = {
  [ProviderType.ANTHROPIC]: {
    quick: 'claude-3-5-haiku-latest',
    standard: 'claude-3-5-sonnet-latest',
    thorough: 'claude-3-5-sonnet-latest',
  },
  [ProviderType.GROQ]: {
    quick: 'llama-3.1-8b-instant',
    standard: 'llama-3.3-70b-versatile',
    thorough: 'openai/gpt-oss-120b',
  },
} as const;

export const MAX_TOKENS_MAP = {
  quick: 4096,
  standard: 8192,
  thorough: 16384,
} as const;