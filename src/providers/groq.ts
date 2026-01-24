/**
 * Groq API client implementation
 */

import Groq from 'groq-sdk';
import type { AnalysisDepth } from '../types';
import type { IProviderClient, ProviderConfig } from '../types';
import { MAX_TOKENS_MAP } from '../types';

export class GroqClient implements IProviderClient {
  private client: Groq;
  private config: ProviderConfig;
  private depth: AnalysisDepth;

  constructor(config: ProviderConfig, depth: AnalysisDepth = 'standard') {
    this.config = config;
    this.depth = depth;
    this.client = new Groq({ apiKey: config.apiKey });
  }

  setDepth(depth: AnalysisDepth): void {
    this.depth = depth;
  }

  getModelType(): 'reasoning' | 'standard' {
    // Groq models are standard (non-reasoning) models
    return 'standard';
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      depth?: AnalysisDepth;
      maxTokens?: number;
    }
  ): Promise<string> {
    const depth = options?.depth ?? this.depth;
    const model = this.config.models[depth];
    const maxTokens = options?.maxTokens ?? MAX_TOKENS_MAP[depth];

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.0, // Lowest temperature for maximum consistency and minimal hallucination
      });

      const choice = response.choices[0];
      if (!choice || !choice.message || !choice.message.content) {
        throw new Error('Unexpected response format from Groq');
      }

      return choice.message.content;
    } catch (error: unknown) {
      // Handle model decommission errors
      const errorObj = error as Record<string, unknown>;
      const errorMessage = error instanceof Error ? error.message : '';
      const errorCode = (errorObj.error as Record<string, unknown>)?.code;

      if (errorCode === 'model_decommissioned' ||
          errorMessage.includes('decommissioned') ||
          errorMessage.includes('no longer supported')) {
        throw new Error(`MODEL_DECOMMISSIONED:${model}`);
      }
      throw error;
    }
  }

  async completeWithJson<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      depth?: AnalysisDepth;
      maxTokens?: number;
    }
  ): Promise<T> {
    const jsonSystemPrompt = `${systemPrompt}

IMPORTANT: Respond ONLY with valid JSON. No markdown code blocks, no explanation, just the JSON object.`;

    const response = await this.complete(jsonSystemPrompt, userPrompt, options);

    // Try to extract JSON from the response
    let jsonStr = response.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return parsed as T;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to parse JSON response from Groq API.\n` +
        `Error: ${errorMsg}\n` +
        `Response preview: ${jsonStr.slice(0, 200)}${jsonStr.length > 200 ? '...' : ''}\n` +
        `Tip: Ensure the AI model is returning valid JSON format.`
      );
    }
  }

  async sendMessage(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      depth?: AnalysisDepth;
      maxTokens?: number;
    }
  ): Promise<{ content: string }> {
    const content = await this.complete(systemPrompt, userPrompt, options);
    return { content };
  }
}