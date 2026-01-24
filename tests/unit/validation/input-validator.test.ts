/**
 * Input Validator Tests
 * Tests for InputValidator and PathValidator services
 */

import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { z } from 'zod';
import { normalize, sep } from 'path';
import { InputValidator, PathValidator } from '../../../src/validation/input-validator.js';
import { ValidationError, PathTraversalError } from '../../../src/errors/index.js';
import { SafePathSchema, PathSchema, ProviderConfigSchema } from '../../../src/validation/schemas.js';

describe('InputValidator', () => {
  let validator: InputValidator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe('validate', () => {
    const TestSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    });

    describe('success cases', () => {
      it('should validate valid data', () => {
        const data = { name: 'John', age: 30 };
        const result = validator.validate(TestSchema, data);

        expect(result).toEqual(data);
      });

      it('should coerce types when possible', () => {
        const NumberSchema = z.coerce.number();
        const result = validator.validate(NumberSchema, '42');

        expect(result).toBe(42);
      });

      it('should return transformed data', () => {
        const TransformSchema = z.string().transform((s) => s.toUpperCase());
        const result = validator.validate(TransformSchema, 'hello');

        expect(result).toBe('HELLO');
      });

      it('should handle optional fields', () => {
        const OptionalSchema = z.object({
          required: z.string(),
          optional: z.string().optional(),
        });

        const result = validator.validate(OptionalSchema, { required: 'value' });
        expect(result).toEqual({ required: 'value' });
      });
    });

    describe('error cases', () => {
      it('should throw ValidationError for invalid data', () => {
        const data = { name: '', age: -5 };

        expect(() => validator.validate(TestSchema, data)).toThrow(ValidationError);
      });

      it('should include error details in ValidationError', () => {
        const data = { name: '', age: -5 };

        try {
          validator.validate(TestSchema, data);
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          const validationError = error as ValidationError;
          expect(validationError.details).toBeDefined();
          expect(validationError.details.errors).toBeInstanceOf(Array);
        }
      });

      it('should throw for missing required fields', () => {
        const data = { name: 'John' };

        expect(() => validator.validate(TestSchema, data)).toThrow(ValidationError);
      });

      it('should throw for wrong types', () => {
        const data = { name: 123, age: 'thirty' };

        expect(() => validator.validate(TestSchema, data)).toThrow(ValidationError);
      });
    });
  });

  describe('validateSafe', () => {
    const TestSchema = z.object({
      name: z.string().min(1),
      value: z.number(),
    });

    it('should return success result for valid data', () => {
      const data = { name: 'Test', value: 42 };
      const result = validator.validateSafe(TestSchema, data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.errors).toBeUndefined();
    });

    it('should return failure result for invalid data', () => {
      const data = { name: '', value: 'not-a-number' };
      const result = validator.validateSafe(TestSchema, data);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should include error path in failure result', () => {
      const NestedSchema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      const result = validator.validateSafe(NestedSchema, {
        user: { email: 'invalid' },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].path).toContain('email');
    });

    it('should not throw on invalid data', () => {
      const data = { invalid: true };

      expect(() => validator.validateSafe(TestSchema, data)).not.toThrow();
    });
  });

  describe('validatePath', () => {
    describe('valid paths', () => {
      it('should validate absolute path', () => {
        // Use platform-specific paths
        const testPath = process.platform === 'win32' ? 'C:\\usr\\local\\bin' : '/usr/local/bin';
        const result = validator.validatePath(testPath);
        expect(normalize(result)).toBe(normalize(testPath));
      });

      it('should validate relative path', () => {
        const result = validator.validatePath('src/index.ts');
        // Result should be absolute and contain the relative path components
        expect(result).toContain('src');
        expect(result).toContain('index.ts');
      });

      it('should resolve relative path to absolute', () => {
        const basePath = process.platform === 'win32' ? 'C:\\home\\user' : '/home/user';
        const result = validator.validatePath('file.txt', basePath);
        // Result should contain both base and file
        expect(result).toContain('file.txt');
        expect(normalize(result)).toContain(normalize(basePath));
      });

      it('should accept path with allowed characters', () => {
        const testPath = process.platform === 'win32' ? 'C:\\path\\to\\file-name_123.txt' : '/path/to/file-name_123.txt';
        const result = validator.validatePath(testPath);
        expect(normalize(result)).toBe(normalize(testPath));
      });
    });

    describe('path traversal prevention', () => {
      it('should throw for path traversal attempt', () => {
        expect(() => validator.validatePath('../etc/passwd')).toThrow(ValidationError);
      });

      it('should throw for nested traversal', () => {
        expect(() => validator.validatePath('/valid/../../../etc/passwd')).toThrow();
      });

      it('should throw for path escaping base directory', () => {
        // The SafePathSchema rejects '..' first, so this throws ValidationError
        expect(() => validator.validatePath('../../escape', '/home/user/project')).toThrow(
          ValidationError
        );
      });

      it('should allow paths within base directory', () => {
        const basePath = process.platform === 'win32' ? 'C:\\home\\user\\project' : '/home/user/project';
        const result = validator.validatePath('subdir/file.txt', basePath);
        // Check that result contains both base and relative path
        expect(result).toContain('subdir');
        expect(result).toContain('file.txt');
        expect(normalize(result)).toContain(normalize(basePath));
      });
    });
  });

  describe('validateConfig', () => {
    it('should validate valid provider config', () => {
      const config = {
        provider: 'anthropic',
        apiKey: 'sk-test-key-that-is-long-enough-12345',
      };

      const result = validator.validateConfig(config);
      expect(result.provider).toBe('anthropic');
      expect(result.apiKey).toBe('sk-test-key-that-is-long-enough-12345');
    });

    it('should accept all valid providers', () => {
      const providers = ['anthropic', 'groq'];

      for (const provider of providers) {
        const config = {
          provider,
          apiKey: 'sk-test-key-that-is-long-enough-12345',
        };
        const result = validator.validateConfig(config);
        expect(result.provider).toBe(provider);
      }
    });

    it('should throw for invalid provider', () => {
      const config = { provider: 'invalid-provider', apiKey: 'sk-test-key-1234567890123' };

      expect(() => validator.validateConfig(config)).toThrow(ValidationError);
    });
  });
});

describe('PathValidator', () => {
  let validator: PathValidator;

  beforeEach(() => {
    validator = new PathValidator();
  });

  describe('isAbsolute', () => {
    it('should return true for absolute paths', () => {
      expect(validator.isAbsolute('/usr/local')).toBe(true);
      expect(validator.isAbsolute('/home/user/file.txt')).toBe(true);
    });

    it('should return false for relative paths', () => {
      expect(validator.isAbsolute('relative/path')).toBe(false);
      expect(validator.isAbsolute('./local')).toBe(false);
      expect(validator.isAbsolute('../parent')).toBe(false);
    });
  });

  describe('isRelative', () => {
    it('should return true for relative paths', () => {
      expect(validator.isRelative('relative/path')).toBe(true);
      expect(validator.isRelative('./local')).toBe(true);
    });

    it('should return false for absolute paths', () => {
      expect(validator.isRelative('/absolute/path')).toBe(false);
    });
  });

  describe('normalize', () => {
    it('should normalize path with double slashes', () => {
      const testPath = process.platform === 'win32' ? 'C:\\path\\\\to\\\\\\file' : '/path//to///file';
      const expected = process.platform === 'win32' ? 'C:\\path\\to\\file' : '/path/to/file';
      const result = validator.normalize(testPath);
      expect(normalize(result)).toBe(normalize(expected));
    });

    it('should resolve . in path', () => {
      const testPath = process.platform === 'win32' ? 'C:\\path\\.\\to\\.\\file' : '/path/./to/./file';
      const expected = process.platform === 'win32' ? 'C:\\path\\to\\file' : '/path/to/file';
      const result = validator.normalize(testPath);
      expect(normalize(result)).toBe(normalize(expected));
    });

    it('should keep trailing slash behavior consistent', () => {
      const testPath = process.platform === 'win32' ? 'C:\\path\\to\\' : '/path/to/';
      const result = validator.normalize(testPath);
      // Just check that path is normalized and contains the expected parts
      expect(result).toContain('path');
      expect(result).toContain('to');
    });
  });

  describe('isWithinBase', () => {
    it('should return true for path within base', () => {
      expect(validator.isWithinBase('subdir/file.txt', '/home/user')).toBe(true);
      expect(validator.isWithinBase('./file.txt', '/home/user')).toBe(true);
    });

    it('should return false for path escaping base', () => {
      expect(validator.isWithinBase('../escape', '/home/user')).toBe(false);
      expect(validator.isWithinBase('../../etc/passwd', '/home/user')).toBe(false);
    });

    it('should handle nested paths correctly', () => {
      expect(validator.isWithinBase('deep/nested/path/file.txt', '/base')).toBe(true);
    });
  });

  describe('hasTraversalAttempt', () => {
    it('should detect .. traversal', () => {
      expect(validator.hasTraversalAttempt('../etc/passwd')).toBe(true);
      expect(validator.hasTraversalAttempt('/path/../escape')).toBe(true);
    });

    it('should detect URL encoded traversal', () => {
      expect(validator.hasTraversalAttempt('%2e%2e/etc/passwd')).toBe(true);
      expect(validator.hasTraversalAttempt('%252e%252e/etc/passwd')).toBe(true);
    });

    it('should detect null byte injection', () => {
      expect(validator.hasTraversalAttempt('/path/file.txt\0.jpg')).toBe(true);
    });

    it('should detect UNC paths', () => {
      expect(validator.hasTraversalAttempt('//server/share')).toBe(true);
      expect(validator.hasTraversalAttempt('\\\\server\\share')).toBe(true);
    });

    it('should return false for safe paths', () => {
      expect(validator.hasTraversalAttempt('/safe/path')).toBe(false);
      expect(validator.hasTraversalAttempt('relative/path')).toBe(false);
      expect(validator.hasTraversalAttempt('./local')).toBe(false);
    });
  });

  describe('sanitize', () => {
    it('should remove null bytes', () => {
      expect(validator.sanitize('file\0.txt')).toBe('file.txt');
    });

    it('should remove Windows invalid characters', () => {
      expect(validator.sanitize('file<>:"|?*.txt')).toBe('file.txt');
    });

    it('should replace multiple dots', () => {
      expect(validator.sanitize('file...txt')).toBe('file.txt');
    });

    it('should remove leading slashes', () => {
      expect(validator.sanitize('///path/to/file')).toBe('path/to/file');
      expect(validator.sanitize('\\\\\\path\\to\\file')).toBe('path\\to\\file');
    });

    it('should trim whitespace', () => {
      expect(validator.sanitize('  file.txt  ')).toBe('file.txt');
    });

    it('should handle multiple issues', () => {
      // Input without leading spaces to test all sanitization steps
      const result = validator.sanitize('///file<>...\0.txt');
      // After: null removed, invalid chars removed, multiple dots -> one dot, leading slashes removed
      expect(result).toBe('file.txt');
    });

    it('should preserve valid characters', () => {
      expect(validator.sanitize('valid-file_name.txt')).toBe('valid-file_name.txt');
    });
  });
});

describe('Validation Schemas', () => {
  describe('PathSchema', () => {
    it('should accept valid paths', () => {
      expect(PathSchema.safeParse('/valid/path').success).toBe(true);
      expect(PathSchema.safeParse('relative/path').success).toBe(true);
      expect(PathSchema.safeParse('./local').success).toBe(true);
    });

    it('should reject empty string', () => {
      expect(PathSchema.safeParse('').success).toBe(false);
    });
  });

  describe('SafePathSchema', () => {
    it('should accept safe paths', () => {
      expect(SafePathSchema.safeParse('/valid/path').success).toBe(true);
      expect(SafePathSchema.safeParse('relative/path').success).toBe(true);
      expect(SafePathSchema.safeParse('./local/file.txt').success).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      expect(SafePathSchema.safeParse('../traversal').success).toBe(false);
      expect(SafePathSchema.safeParse('/path/../escape').success).toBe(false);
    });
  });

  describe('ProviderConfigSchema', () => {
    it('should accept valid provider config', () => {
      const result = ProviderConfigSchema.safeParse({
        provider: 'anthropic',
        apiKey: 'sk-test-key-that-is-long-enough-12345',
      });
      expect(result.success).toBe(true);
    });

    it('should accept all valid providers', () => {
      const providers = ['anthropic', 'groq'];
      for (const provider of providers) {
        const result = ProviderConfigSchema.safeParse({
          provider,
          apiKey: 'sk-test-key-that-is-long-enough-12345',
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid provider', () => {
      const result = ProviderConfigSchema.safeParse({
        provider: 'invalid',
        apiKey: 'sk-test-key-that-is-long-enough-12345',
      });
      expect(result.success).toBe(false);
    });
  });
});
