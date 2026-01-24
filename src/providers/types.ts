/**
 * AI Provider Abstraction Layer
 *
 * This module provides a unified interface for working with different AI providers
 * (Anthropic Claude, Groq, etc.). It abstracts away provider-specific implementation
 * details and provides a consistent API for all AI operations.
 *
 * @module providers/types
 */

import type { AnalysisDepth } from '../types';

/**
 * Supported AI provider types
 */
export enum ProviderType {
  /** Anthropic Claude API */
  ANTHROPIC = 'anthropic',
  /** Groq API (for Llama models) */
  GROQ = 'groq',
}

/**
 * Configuration for an AI provider
 *
 * @example
 * ```typescript
 * const config: ProviderConfig = {
 *   provider: ProviderType.ANTHROPIC,
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   models: {
 *     quick: 'claude-3-5-haiku-latest',
 *     standard: 'claude-3-5-sonnet-latest',
 *     thorough: 'claude-3-5-sonnet-latest',
 *   },
 * };
 * ```
 */
export interface ProviderConfig {
  /** The AI provider type */
  provider: ProviderType;
  /** Model configurations for each analysis depth */
  models: {
    /** Fast model for quick operations */
    quick: string;
    /** Balanced model for standard operations */
    standard: string;
    /** Powerful model for thorough analysis */
    thorough: string;
  };
  /** API key for authentication */
  apiKey: string;
  /** Projects to exclude from analysis (for monorepos) */
  excludedProjects?: string[];
}

/**
 * Options for AI completion requests
 */
export interface CompletionOptions {
  /** Analysis depth affecting model selection */
  depth?: AnalysisDepth;
  /** Maximum tokens in the response */
  maxTokens?: number;
}

/**
 * Unified interface for AI provider clients
 *
 * This interface provides a consistent API for interacting with different
 * AI providers. All provider-specific implementations must implement this
 * interface to ensure compatibility with the rest of the application.
 *
 * @example
 * ```typescript
 * const client: IProviderClient = await createProviderClient('standard');
 *
 * // Simple text completion
 * const response = await client.complete(systemPrompt, userPrompt);
 *
 * // JSON-structured completion
 * const data = await client.completeWithJson<MyType>(systemPrompt, userPrompt);
 * ```
 */
export interface IProviderClient {
  /**
   * Set the analysis depth, which affects model selection
   * @param depth - The analysis depth level
   */
  setDepth(depth: AnalysisDepth): void;

  /**
   * Get the type of model being used
   * @returns 'reasoning' for advanced models, 'standard' for basic models
   */
  getModelType(): 'reasoning' | 'standard';

  /**
   * Complete a prompt and return the text response
   * @param systemPrompt - The system prompt providing context
   * @param userPrompt - The user's prompt/request
   * @param options - Optional completion options
   * @returns The AI's text response
   */
  complete(
    systemPrompt: string,
    userPrompt: string,
    options?: CompletionOptions
  ): Promise<string>;

  /**
   * Complete a prompt and parse the response as JSON
   * @param systemPrompt - The system prompt providing context
   * @param userPrompt - The user's prompt/request
   * @param options - Optional completion options
   * @returns The AI's response parsed as type T
   * @template T - The expected response type
   */
  completeWithJson<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: CompletionOptions
  ): Promise<T>;

  /**
   * Send a message and get a structured response
   * @param systemPrompt - The system prompt providing context
   * @param userPrompt - The user's message
   * @param options - Optional completion options
   * @returns Object containing the AI's response content
   */
  sendMessage(
    systemPrompt: string,
    userPrompt: string,
    options?: CompletionOptions
  ): Promise<{ content: string }>;
}

/**
 * Default model configurations for each provider
 *
 * These models are used when the user doesn't specify custom models
 * in their configuration. Models are selected based on analysis depth
 * to balance speed and quality.
 */
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

/**
 * Maximum token limits for each analysis depth
 *
 * Higher depths allow more tokens in responses, enabling more
 * detailed analysis but at higher cost and latency.
 */
export const MAX_TOKENS_MAP = {
  /** Quick analysis: fast responses */
  quick: 4096,
  /** Standard analysis: balanced responses */
  standard: 8192,
  /** Thorough analysis: detailed responses */
  thorough: 16384,
} as const;