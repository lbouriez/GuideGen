/**
 * Unit tests for AnthropicClient
 * Tests API client methods with mocked SDK
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicClient } from '@/providers/anthropic';
import type { ProviderConfig } from '@/providers/types';
import { ProviderType } from '@/providers/types';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        messages: {
          create: vi.fn(),
        },
      };
    }),
  };
});

describe('AnthropicClient', () => {
  let client: AnthropicClient;
  let mockConfig: ProviderConfig;
  let mockAnthropicInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock config
    mockConfig = {
      provider: ProviderType.ANTHROPIC,
      models: {
        quick: 'claude-3-5-haiku-latest',
        standard: 'claude-3-5-sonnet-latest',
        thorough: 'claude-3-5-sonnet-latest',
      },
      apiKey: 'test-api-key',
    };

    // Create client
    client = new AnthropicClient(mockConfig);

    // Access the mocked instance through the client's internal SDK
    mockAnthropicInstance = (client as any).client;
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeDefined();
    });

    it('should use standard depth by default', () => {
      expect(client.getModelType()).toBe('standard');
    });

    it('should accept custom depth', () => {
      const customClient = new AnthropicClient(mockConfig, 'quick');
      expect(customClient).toBeDefined();
    });
  });

  describe('setDepth()', () => {
    it('should update depth', () => {
      client.setDepth('quick');
      expect(client).toBeDefined();
    });

    it('should accept all valid depth values', () => {
      client.setDepth('quick');
      client.setDepth('standard');
      client.setDepth('thorough');
      expect(client).toBeDefined();
    });
  });

  describe('getModelType()', () => {
    it('should return standard for Anthropic models', () => {
      expect(client.getModelType()).toBe('standard');
    });
  });

  describe('complete()', () => {
    it('should call API with correct parameters', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Test response' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.complete('System prompt', 'User prompt');

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith({
        model: mockConfig.models.standard,
        max_tokens: 8192,
        system: 'System prompt',
        messages: [
          {
            role: 'user',
            content: 'User prompt',
          },
        ],
      });
      expect(result).toBe('Test response');
    });

    it('should use custom depth when provided', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Quick response' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.complete('System', 'User', { depth: 'quick' });

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockConfig.models.quick,
          max_tokens: 4096,
        })
      );
    });

    it('should use custom maxTokens when provided', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.complete('System', 'User', { maxTokens: 2000 });

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2000,
        })
      );
    });

    it('should throw error for non-text response', async () => {
      const mockResponse = {
        content: [{ type: 'image', data: 'binary' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await expect(client.complete('System', 'User')).rejects.toThrow(
        'Unexpected response type from Anthropic'
      );
    });

    it('should handle model decommissioned error', async () => {
      const error = new Error('Model decommissioned') as any;
      error.error = { code: 'model_decommissioned' };
      mockAnthropicInstance.messages.create.mockRejectedValue(error);

      await expect(client.complete('System', 'User')).rejects.toThrow(
        'MODEL_DECOMMISSIONED:claude-3-5-sonnet-latest'
      );
    });

    it('should handle decommissioned error in message', async () => {
      const error = new Error('This model has been decommissioned');
      mockAnthropicInstance.messages.create.mockRejectedValue(error);

      await expect(client.complete('System', 'User')).rejects.toThrow(
        'MODEL_DECOMMISSIONED:claude-3-5-sonnet-latest'
      );
    });

    it('should handle invalid_request_error type', async () => {
      const error = new Error('Invalid request') as any;
      error.error = { type: 'invalid_request_error' };
      mockAnthropicInstance.messages.create.mockRejectedValue(error);

      await expect(client.complete('System', 'User')).rejects.toThrow(
        'MODEL_DECOMMISSIONED:claude-3-5-sonnet-latest'
      );
    });

    it('should propagate other errors', async () => {
      const error = new Error('Network error');
      mockAnthropicInstance.messages.create.mockRejectedValue(error);

      await expect(client.complete('System', 'User')).rejects.toThrow('Network error');
    });
  });

  describe('completeWithJson()', () => {
    it('should parse clean JSON response', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '{"key": "value"}' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson<{ key: string }>('System', 'User');

      expect(result).toEqual({ key: 'value' });
    });

    it('should parse JSON from markdown code block', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '```json\n{"data": 123}\n```' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson<{ data: number }>('System', 'User');

      expect(result).toEqual({ data: 123 });
    });

    it('should parse JSON from code block without language', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '```\n{"value": true}\n```' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson<{ value: boolean }>('System', 'User');

      expect(result).toEqual({ value: true });
    });

    it('should handle whitespace around JSON', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '   {"trimmed": "yes"}   ' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson<{ trimmed: string }>('System', 'User');

      expect(result).toEqual({ trimmed: 'yes' });
    });

    it('should throw error for invalid JSON', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Not valid JSON' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await expect(client.completeWithJson('System', 'User')).rejects.toThrow(
        'Failed to parse JSON response'
      );
    });

    it('should include JSON instruction in system prompt', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: '{"ok": true}' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.completeWithJson('System prompt', 'User');

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Respond ONLY with valid JSON'),
        })
      );
    });

    it('should parse complex nested JSON', async () => {
      const complexJson = {
        array: [1, 2, 3],
        nested: { deep: { value: 'test' } },
        bool: true,
        num: 42,
      };
      const mockResponse = {
        content: [{ type: 'text', text: JSON.stringify(complexJson) }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson('System', 'User');

      expect(result).toEqual(complexJson);
    });
  });

  describe('sendMessage()', () => {
    it('should return content in expected format', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Message content' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const result = await client.sendMessage('System', 'User');

      expect(result).toEqual({ content: 'Message content' });
    });

    it('should accept custom options', async () => {
      const mockResponse = {
        content: [{ type: 'text', text: 'Response' }],
      };
      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.sendMessage('System', 'User', { depth: 'thorough', maxTokens: 10000 });

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockConfig.models.thorough,
          max_tokens: 10000,
        })
      );
    });

    it('should propagate errors from complete()', async () => {
      const error = new Error('API error');
      mockAnthropicInstance.messages.create.mockRejectedValue(error);

      await expect(client.sendMessage('System', 'User')).rejects.toThrow('API error');
    });
  });
});
