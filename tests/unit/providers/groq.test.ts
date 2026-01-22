/**
 * Unit tests for GroqClient
 * Tests API client methods with mocked SDK
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroqClient } from '@/providers/groq';
import type { ProviderConfig } from '@/providers/types';
import { ProviderType } from '@/providers/types';

// Mock the Groq SDK
vi.mock('groq-sdk', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        chat: {
          completions: {
            create: vi.fn(),
          },
        },
      };
    }),
  };
});

describe('GroqClient', () => {
  let client: GroqClient;
  let mockConfig: ProviderConfig;
  let mockGroqInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock config
    mockConfig = {
      provider: ProviderType.GROQ,
      models: {
        quick: 'llama-3.1-8b-instant',
        standard: 'llama-3.3-70b-versatile',
        thorough: 'openai/gpt-oss-120b',
      },
      apiKey: 'test-groq-key',
    };

    // Create client
    client = new GroqClient(mockConfig);

    // Access the mocked instance through the client's internal SDK
    mockGroqInstance = (client as any).client;
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      expect(client).toBeDefined();
    });

    it('should use standard depth by default', () => {
      expect(client.getModelType()).toBe('standard');
    });

    it('should accept custom depth', () => {
      const customClient = new GroqClient(mockConfig, 'quick');
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
    it('should return standard for Groq models', () => {
      expect(client.getModelType()).toBe('standard');
    });
  });

  describe('complete()', () => {
    it('should call API with correct parameters', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test response from Groq',
            },
          },
        ],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.complete('System prompt', 'User prompt');

      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith({
        model: mockConfig.models.standard,
        messages: [
          {
            role: 'system',
            content: 'System prompt',
          },
          {
            role: 'user',
            content: 'User prompt',
          },
        ],
        max_tokens: 8192,
        temperature: 0.1,
      });
      expect(result).toBe('Test response from Groq');
    });

    it('should use custom depth when provided', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Quick response' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      await client.complete('System', 'User', { depth: 'quick' });

      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockConfig.models.quick,
          max_tokens: 4096,
        })
      );
    });

    it('should use custom maxTokens when provided', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      await client.complete('System', 'User', { maxTokens: 2000 });

      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2000,
        })
      );
    });

    it('should use low temperature for consistent analysis', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      await client.complete('System', 'User');

      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.1,
        })
      );
    });

    it('should throw error when no choices in response', async () => {
      const mockResponse = { choices: [] };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(client.complete('System', 'User')).rejects.toThrow(
        'Unexpected response format from Groq'
      );
    });

    it('should throw error when no message in choice', async () => {
      const mockResponse = {
        choices: [{}],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(client.complete('System', 'User')).rejects.toThrow(
        'Unexpected response format from Groq'
      );
    });

    it('should throw error when no content in message', async () => {
      const mockResponse = {
        choices: [{ message: {} }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(client.complete('System', 'User')).rejects.toThrow(
        'Unexpected response format from Groq'
      );
    });

    it('should handle model decommissioned error', async () => {
      const error = new Error('Model decommissioned') as any;
      error.error = { code: 'model_decommissioned' };
      mockGroqInstance.chat.completions.create.mockRejectedValue(error);

      await expect(client.complete('System', 'User')).rejects.toThrow(
        'MODEL_DECOMMISSIONED:llama-3.3-70b-versatile'
      );
    });

    it('should handle decommissioned error in message', async () => {
      const error = new Error('This model has been decommissioned');
      mockGroqInstance.chat.completions.create.mockRejectedValue(error);

      await expect(client.complete('System', 'User')).rejects.toThrow(
        'MODEL_DECOMMISSIONED:llama-3.3-70b-versatile'
      );
    });

    it('should handle no longer supported error', async () => {
      const error = new Error('Model is no longer supported');
      mockGroqInstance.chat.completions.create.mockRejectedValue(error);

      await expect(client.complete('System', 'User')).rejects.toThrow(
        'MODEL_DECOMMISSIONED:llama-3.3-70b-versatile'
      );
    });

    it('should propagate other errors', async () => {
      const error = new Error('Rate limit exceeded');
      mockGroqInstance.chat.completions.create.mockRejectedValue(error);

      await expect(client.complete('System', 'User')).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('completeWithJson()', () => {
    it('should parse clean JSON response', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"key": "value"}' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson<{ key: string }>('System', 'User');

      expect(result).toEqual({ key: 'value' });
    });

    it('should parse JSON from markdown code block', async () => {
      const mockResponse = {
        choices: [{ message: { content: '```json\n{"data": 123}\n```' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson<{ data: number }>('System', 'User');

      expect(result).toEqual({ data: 123 });
    });

    it('should parse JSON from code block without language', async () => {
      const mockResponse = {
        choices: [{ message: { content: '```\n{"value": true}\n```' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson<{ value: boolean }>('System', 'User');

      expect(result).toEqual({ value: true });
    });

    it('should handle whitespace around JSON', async () => {
      const mockResponse = {
        choices: [{ message: { content: '   {"trimmed": "yes"}   ' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson<{ trimmed: string }>('System', 'User');

      expect(result).toEqual({ trimmed: 'yes' });
    });

    it('should throw error for invalid JSON', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Not valid JSON' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(client.completeWithJson('System', 'User')).rejects.toThrow(
        'Failed to parse JSON response'
      );
    });

    it('should include JSON instruction in system prompt', async () => {
      const mockResponse = {
        choices: [{ message: { content: '{"ok": true}' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      await client.completeWithJson('System prompt', 'User');

      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Respond ONLY with valid JSON'),
            }),
          ]),
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
        choices: [{ message: { content: JSON.stringify(complexJson) } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson('System', 'User');

      expect(result).toEqual(complexJson);
    });

    it('should parse array JSON response', async () => {
      const mockResponse = {
        choices: [{ message: { content: '[1, 2, 3]' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.completeWithJson<number[]>('System', 'User');

      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('sendMessage()', () => {
    it('should return content in expected format', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Message content' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await client.sendMessage('System', 'User');

      expect(result).toEqual({ content: 'Message content' });
    });

    it('should accept custom options', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
      };
      mockGroqInstance.chat.completions.create.mockResolvedValue(mockResponse);

      await client.sendMessage('System', 'User', { depth: 'thorough', maxTokens: 10000 });

      expect(mockGroqInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: mockConfig.models.thorough,
          max_tokens: 10000,
        })
      );
    });

    it('should propagate errors from complete()', async () => {
      const error = new Error('API error');
      mockGroqInstance.chat.completions.create.mockRejectedValue(error);

      await expect(client.sendMessage('System', 'User')).rejects.toThrow('API error');
    });
  });
});
