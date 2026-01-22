/**
 * Provider Client Factory
 * Creates appropriate AI provider clients
 */

import type { IProviderClient, ProviderConfig } from './types';
import { ProviderType } from './types';
import { AnthropicClient } from './anthropic';
import { GroqClient } from './groq';

export class ProviderClientFactory {
  /**
   * Create a client based on configuration
   */
  createClient(config: ProviderConfig): IProviderClient {
    switch (config.provider) {
      case ProviderType.ANTHROPIC:
        return new AnthropicClient(config);
      case ProviderType.GROQ:
        return new GroqClient(config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }
}
