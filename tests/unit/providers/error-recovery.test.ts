/**
 * Error Recovery Service Tests
 * Tests for AI provider error handling and automatic recovery
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorRecoveryService } from '../../../src/providers/error-recovery.js';
import type { IProviderClient } from '../../../src/providers/types';

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;
  let mockLogger: any;
  let mockGetAlternativeClient: any;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockGetAlternativeClient = vi.fn();

    service = new ErrorRecoveryService(mockLogger, mockGetAlternativeClient);
  });

  describe('shouldReconfigureProvider', () => {
    it('should detect rate limit errors', () => {
      const error = {
        message: 'Rate limit exceeded',
        error: { code: 'rate_limit_exceeded' },
      };

      expect(service.shouldReconfigureProvider(error)).toBe(true);
    });

    it('should detect authentication errors', () => {
      const error = {
        message: 'Invalid API key',
        error: { code: 'invalid_api_key' },
      };

      expect(service.shouldReconfigureProvider(error)).toBe(true);
    });

    it('should detect quota exceeded errors', () => {
      const error = {
        message: 'Quota exceeded',
        error: { code: 'insufficient_quota' },
      };

      expect(service.shouldReconfigureProvider(error)).toBe(true);
    });

    it('should not trigger on transient network errors', () => {
      const error = new Error('ECONNREFUSED');

      expect(service.shouldReconfigureProvider(error)).toBe(false);
    });

    it('should not trigger on validation errors', () => {
      const error = new Error('Invalid input format');

      expect(service.shouldReconfigureProvider(error)).toBe(false);
    });
  });

  describe('handleProviderError', () => {
    it('should switch to alternative provider on rate limit', async () => {
      const mockAlternativeClient: IProviderClient = {
        complete: vi.fn().mockResolvedValue('Alternative response'),
        completeWithJson: vi.fn(),
        sendMessage: vi.fn(),
        setDepth: vi.fn(),
        provider: { name: 'groq', apiKey: 'test' },
      };

      mockGetAlternativeClient.mockResolvedValue(mockAlternativeClient);

      const error = {
        message: 'Rate limit exceeded',
        error: { code: 'rate_limit_exceeded' },
      };

      const mockOperation = vi.fn().mockResolvedValue('Success');

      const result = await service.handleProviderError(
        error,
        mockOperation,
        'anthropic',
        'Completing request'
      );

      expect(result).toBe('Success');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Switching provider')
      );
      expect(mockGetAlternativeClient).toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledWith(mockAlternativeClient);
    });

    it('should throw if no alternative provider available', async () => {
      mockGetAlternativeClient.mockResolvedValue(null);

      const error = {
        message: 'Rate limit exceeded',
        error: { code: 'rate_limit_exceeded' },
      };

      const mockOperation = vi.fn();

      await expect(
        service.handleProviderError(error, mockOperation, 'anthropic', 'Test operation')
      ).rejects.toThrow('No alternative provider available');
    });

    it('should log recovery attempt', async () => {
      const mockAlternativeClient: IProviderClient = {
        complete: vi.fn().mockResolvedValue('Response'),
        completeWithJson: vi.fn(),
        sendMessage: vi.fn(),
        setDepth: vi.fn(),
        provider: { name: 'groq', apiKey: 'test' },
      };

      mockGetAlternativeClient.mockResolvedValue(mockAlternativeClient);

      const error = { error: { code: 'rate_limit_exceeded' } };
      const mockOperation = vi.fn().mockResolvedValue('Success');

      await service.handleProviderError(error, mockOperation, 'anthropic', 'Test operation');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully recovered')
      );
    });

    it('should handle recovery failures', async () => {
      const mockAlternativeClient: IProviderClient = {
        complete: vi.fn(),
        completeWithJson: vi.fn(),
        sendMessage: vi.fn(),
        setDepth: vi.fn(),
        provider: { name: 'groq', apiKey: 'test' },
      };

      mockGetAlternativeClient.mockResolvedValue(mockAlternativeClient);

      const error = { error: { code: 'rate_limit_exceeded' } };
      const mockOperation = vi.fn().mockRejectedValue(new Error('Alternative also failed'));

      await expect(
        service.handleProviderError(error, mockOperation, 'anthropic', 'Test')
      ).rejects.toThrow('Alternative also failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Recovery failed')
      );
    });
  });

  describe('getErrorType', () => {
    it('should identify rate limit errors', () => {
      const error = { error: { code: 'rate_limit_exceeded' } };
      expect(service['getErrorType'](error)).toBe('rate_limit');
    });

    it('should identify authentication errors', () => {
      const error = { error: { code: 'invalid_api_key' } };
      expect(service['getErrorType'](error)).toBe('authentication');
    });

    it('should identify quota errors', () => {
      const error = { error: { code: 'insufficient_quota' } };
      expect(service['getErrorType'](error)).toBe('quota');
    });

    it('should identify overloaded errors', () => {
      const error = { error: { type: 'overloaded_error' } };
      expect(service['getErrorType'](error)).toBe('overloaded');
    });

    it('should return unknown for unrecognized errors', () => {
      const error = new Error('Random error');
      expect(service['getErrorType'](error)).toBe('unknown');
    });
  });
});
