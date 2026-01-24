/**
 * Error Classes Tests
 * Tests for all custom error classes
 */

import { describe, it, expect } from 'vitest';
import {
  GuideGenError,
  ValidationError,
  FileOperationError,
  ProviderError,
  PhaseExecutionError,
  ConfigurationError,
  RateLimitError,
  PathTraversalError,
  getErrorMessage,
  wrapError,
  isGuideGenError,
} from '../../../src/errors/index.js';

describe('ValidationError', () => {
  describe('constructor', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create error with details', () => {
      const details = { field: 'email', received: 'invalid' };
      const error = new ValidationError('Invalid email', details);

      expect(error.details).toEqual(details);
    });

    it('should create error with field name', () => {
      const error = new ValidationError('Invalid email', { field: 'email' }, 'email');

      expect(error.field).toBe('email');
    });

    it('should have timestamp', () => {
      const error = new ValidationError('Test');

      expect(error.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON', () => {
      const error = new ValidationError('Test error', { key: 'value' }, 'fieldName');
      const json = error.toJSON();

      expect(json.name).toBe('ValidationError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.details).toEqual({ key: 'value' });
      expect(json.field).toBe('fieldName');
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });
  });

  describe('inheritance', () => {
    it('should be instance of Error', () => {
      const error = new ValidationError('Test');

      expect(error).toBeInstanceOf(Error);
    });

    it('should have stack trace', () => {
      const error = new ValidationError('Test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });
});

describe('FileOperationError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const cause = new Error('ENOENT');
      const error = new FileOperationError('File not found', '/path/to/file', 'read', cause);

      expect(error.message).toBe('File not found');
      expect(error.filePath).toBe('/path/to/file');
      expect(error.operation).toBe('read');
      expect(error.cause).toBe(cause);
      expect(error.code).toBe('FILE_OPERATION_ERROR');
    });

    it('should accept all operation types', () => {
      const operations: Array<'read' | 'write' | 'delete' | 'mkdir' | 'stat'> = [
        'read',
        'write',
        'delete',
        'mkdir',
        'stat',
      ];

      for (const op of operations) {
        const error = new FileOperationError('Test', '/path', op);
        expect(error.operation).toBe(op);
      }
    });

    it('should work without cause', () => {
      const error = new FileOperationError('Test', '/path', 'read');

      expect(error.cause).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON with cause', () => {
      const cause = new Error('Original error');
      const error = new FileOperationError('Failed', '/path/to/file', 'write', cause);
      const json = error.toJSON();

      expect(json.filePath).toBe('/path/to/file');
      expect(json.operation).toBe('write');
      expect(json.cause).toBe('Original error');
    });

    it('should serialize to JSON without cause', () => {
      const error = new FileOperationError('Failed', '/path/to/file', 'read');
      const json = error.toJSON();

      expect(json.cause).toBeUndefined();
    });
  });
});

describe('ProviderError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const cause = new Error('API error');
      const error = new ProviderError('Request failed', 'anthropic', 429, true, cause);

      expect(error.message).toBe('Request failed');
      expect(error.provider).toBe('anthropic');
      expect(error.statusCode).toBe(429);
      expect(error.retryable).toBe(true);
      expect(error.cause).toBe(cause);
      expect(error.code).toBe('PROVIDER_ERROR');
    });

    it('should default retryable to false', () => {
      const error = new ProviderError('Error', 'groq');

      expect(error.retryable).toBe(false);
    });

    it('should accept optional parameters', () => {
      const error = new ProviderError('Error', 'anthropic', 500);

      expect(error.statusCode).toBe(500);
      expect(error.retryable).toBe(false);
      expect(error.cause).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties', () => {
      const error = new ProviderError('Rate limit', 'anthropic', 429, true);
      const json = error.toJSON();

      expect(json.provider).toBe('anthropic');
      expect(json.statusCode).toBe(429);
      expect(json.retryable).toBe(true);
    });
  });
});

describe('PhaseExecutionError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const cause = new Error('Phase failed');
      const error = new PhaseExecutionError('Discovery failed', 'discovery', cause, true);

      expect(error.message).toBe('Discovery failed');
      expect(error.phase).toBe('discovery');
      expect(error.cause).toBe(cause);
      expect(error.recoverable).toBe(true);
      expect(error.code).toBe('PHASE_EXECUTION_ERROR');
    });

    it('should default recoverable to false', () => {
      const error = new PhaseExecutionError('Error', 'analysis');

      expect(error.recoverable).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties', () => {
      const cause = new Error('Original');
      const error = new PhaseExecutionError('Failed', 'guidelines', cause, true);
      const json = error.toJSON();

      expect(json.phase).toBe('guidelines');
      expect(json.recoverable).toBe(true);
      expect(json.cause).toBe('Original');
    });
  });
});

describe('ConfigurationError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new ConfigurationError(
        'Invalid config',
        'apiKey',
        'string',
        undefined
      );

      expect(error.message).toBe('Invalid config');
      expect(error.configKey).toBe('apiKey');
      expect(error.expectedType).toBe('string');
      expect(error.actualValue).toBeUndefined();
      expect(error.code).toBe('CONFIGURATION_ERROR');
    });

    it('should work with minimal parameters', () => {
      const error = new ConfigurationError('Missing configuration');

      expect(error.configKey).toBeUndefined();
      expect(error.expectedType).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties', () => {
      const error = new ConfigurationError('Type mismatch', 'port', 'number', 'not-a-number');
      const json = error.toJSON();

      expect(json.configKey).toBe('port');
      expect(json.expectedType).toBe('number');
      expect(json.actualValue).toBe('not-a-number');
    });
  });
});

describe('RateLimitError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new RateLimitError('Too many requests', 'anthropic', 60);

      expect(error.message).toBe('Too many requests');
      expect(error.provider).toBe('anthropic');
      expect(error.retryAfter).toBe(60);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
    });

    it('should work without retryAfter', () => {
      const error = new RateLimitError('Rate limited', 'groq');

      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties', () => {
      const error = new RateLimitError('Limited', 'anthropic', 30);
      const json = error.toJSON();

      expect(json.provider).toBe('anthropic');
      expect(json.retryAfter).toBe(30);
    });
  });
});

describe('PathTraversalError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new PathTraversalError(
        'Path escapes directory',
        '../../../etc/passwd',
        '/home/user'
      );

      expect(error.message).toBe('Path escapes directory');
      expect(error.requestedPath).toBe('../../../etc/passwd');
      expect(error.basePath).toBe('/home/user');
      expect(error.code).toBe('PATH_TRAVERSAL_ERROR');
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties', () => {
      const error = new PathTraversalError('Blocked', '../secret', '/base');
      const json = error.toJSON();

      expect(json.requestedPath).toBe('../secret');
      expect(json.basePath).toBe('/base');
    });
  });
});

describe('Helper Functions', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error', () => {
      const error = new Error('Test message');
      expect(getErrorMessage(error)).toBe('Test message');
    });

    it('should extract message from GuideGenError', () => {
      const error = new ValidationError('Validation failed');
      expect(getErrorMessage(error)).toBe('Validation failed');
    });

    it('should return string directly', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should convert other types to string', () => {
      expect(getErrorMessage(123)).toBe('123');
      expect(getErrorMessage({ key: 'value' })).toBe('[object Object]');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
    });
  });

  describe('wrapError', () => {
    it('should return GuideGenError unchanged', () => {
      const original = new ValidationError('Original');
      const wrapped = wrapError(original, 'Context');

      expect(wrapped).toBe(original);
    });

    it('should wrap regular Error with context', () => {
      const original = new Error('Original message');
      const wrapped = wrapError(original, 'Context');

      expect(wrapped.message).toBe('Context: Original message');
    });

    it('should wrap string with context', () => {
      const wrapped = wrapError('String error', 'Context');

      expect(wrapped.message).toBe('Context: String error');
    });

    it('should wrap other types with context', () => {
      const wrapped = wrapError(42, 'Context');

      expect(wrapped.message).toBe('Context: 42');
    });
  });

  describe('isGuideGenError', () => {
    it('should return true for GuideGenError instances', () => {
      expect(isGuideGenError(new ValidationError('Test'))).toBe(true);
      expect(isGuideGenError(new FileOperationError('Test', '/path', 'read'))).toBe(true);
      expect(isGuideGenError(new ProviderError('Test', 'provider'))).toBe(true);
      expect(isGuideGenError(new PhaseExecutionError('Test', 'phase'))).toBe(true);
      expect(isGuideGenError(new ConfigurationError('Test'))).toBe(true);
      expect(isGuideGenError(new RateLimitError('Test', 'provider'))).toBe(true);
      expect(isGuideGenError(new PathTraversalError('Test', '/path', '/base'))).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isGuideGenError(new Error('Regular error'))).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isGuideGenError('string')).toBe(false);
      expect(isGuideGenError(123)).toBe(false);
      expect(isGuideGenError(null)).toBe(false);
      expect(isGuideGenError(undefined)).toBe(false);
      expect(isGuideGenError({})).toBe(false);
    });
  });
});

describe('Error Codes', () => {
  it('should have unique error codes', () => {
    const codes = [
      new ValidationError('').code,
      new FileOperationError('', '', 'read').code,
      new ProviderError('', '').code,
      new PhaseExecutionError('', '').code,
      new ConfigurationError('').code,
      new RateLimitError('', '').code,
      new PathTraversalError('', '', '').code,
    ];

    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('should have descriptive error codes', () => {
    expect(new ValidationError('').code).toBe('VALIDATION_ERROR');
    expect(new FileOperationError('', '', 'read').code).toBe('FILE_OPERATION_ERROR');
    expect(new ProviderError('', '').code).toBe('PROVIDER_ERROR');
    expect(new PhaseExecutionError('', '').code).toBe('PHASE_EXECUTION_ERROR');
    expect(new ConfigurationError('').code).toBe('CONFIGURATION_ERROR');
    expect(new RateLimitError('', '').code).toBe('RATE_LIMIT_ERROR');
    expect(new PathTraversalError('', '', '').code).toBe('PATH_TRAVERSAL_ERROR');
  });
});

describe('Error Names', () => {
  it('should have correct error names', () => {
    expect(new ValidationError('').name).toBe('ValidationError');
    expect(new FileOperationError('', '', 'read').name).toBe('FileOperationError');
    expect(new ProviderError('', '').name).toBe('ProviderError');
    expect(new PhaseExecutionError('', '').name).toBe('PhaseExecutionError');
    expect(new ConfigurationError('').name).toBe('ConfigurationError');
    expect(new RateLimitError('', '').name).toBe('RateLimitError');
    expect(new PathTraversalError('', '', '').name).toBe('PathTraversalError');
  });
});
