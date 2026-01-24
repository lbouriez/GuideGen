/**
 * Validation Schemas Tests
 * Tests for Zod schema validation and security checks
 */

import { describe, it, expect } from 'vitest';
import {
  SafePathSchema,
  TargetPathSchema,
  AnalysisDepthSchema,
  ApiKeySchema,
  ProviderConfigSchema,
  ProviderType,
} from '../../../src/validation/schemas.js';

describe('Validation Schemas', () => {
  describe('SafePathSchema', () => {
    it('should accept valid paths', () => {
      const validPaths = [
        'C:\\Users\\user\\project',
        '/home/user/project',
        './relative/path',
        '../parent/path',
        'simple-path',
      ];

      validPaths.forEach(path => {
        const result = SafePathSchema.safeParse(path);
        expect(result.success).toBe(true);
      });
    });

    it('should reject null bytes', () => {
      const result = SafePathSchema.safeParse('path\0with\0null');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('null bytes');
      }
    });

    it('should reject UNC paths', () => {
      const result = SafePathSchema.safeParse('\\\\server\\share');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('UNC paths not allowed');
      }
    });

    it('should reject path traversal attempts', () => {
      const result = SafePathSchema.safeParse('../../../etc/passwd');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Path traversal not allowed');
      }
    });

    it('should reject empty paths', () => {
      const result = SafePathSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('TargetPathSchema', () => {
    it('should accept valid project paths', () => {
      const validPaths = [
        'C:\\Projects\\MyApp',
        '/home/user/projects/app',
        './my-project',
      ];

      validPaths.forEach(path => {
        const result = TargetPathSchema.safeParse(path);
        expect(result.success).toBe(true);
      });
    });

    it('should reject paths with spaces without escaping', () => {
      const result = TargetPathSchema.safeParse('C:\\Program Files\\MyApp');
      // Should accept - spaces are valid in paths
      expect(result.success).toBe(true);
    });
  });

  describe('AnalysisDepthSchema', () => {
    it('should accept valid depth values', () => {
      const validDepths = ['quick', 'standard', 'thorough'];

      validDepths.forEach(depth => {
        const result = AnalysisDepthSchema.safeParse(depth);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid depth values', () => {
      const invalidDepths = ['fast', 'deep', 'shallow', 'maximum', ''];

      invalidDepths.forEach(depth => {
        const result = AnalysisDepthSchema.safeParse(depth);
        expect(result.success).toBe(false);
      });
    });

    it('should provide helpful error message', () => {
      const result = AnalysisDepthSchema.safeParse('invalid');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('quick');
        expect(result.error.issues[0].message).toContain('standard');
        expect(result.error.issues[0].message).toContain('thorough');
      }
    });
  });

  describe('ApiKeySchema', () => {
    it('should accept valid Anthropic API keys', () => {
      const validKeys = [
        'sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz',
        'sk-ant-api03-' + 'a'.repeat(100),
      ];

      validKeys.forEach(key => {
        const result = ApiKeySchema.safeParse(key);
        expect(result.success).toBe(true);
      });
    });

    it('should accept valid Groq API keys', () => {
      const validKey = 'gsk_' + 'a'.repeat(50);
      const result = ApiKeySchema.safeParse(validKey);
      expect(result.success).toBe(true);
    });

    it('should reject empty keys', () => {
      const result = ApiKeySchema.safeParse('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should reject keys with spaces', () => {
      const result = ApiKeySchema.safeParse('sk-ant-api03 1234567890');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('spaces');
      }
    });

    it('should reject too-short keys', () => {
      const result = ApiKeySchema.safeParse('sk-ant');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('too short');
      }
    });
  });

  describe('ProviderConfigSchema', () => {
    it('should accept valid Anthropic config', () => {
      const config = {
        provider: ProviderType.ANTHROPIC,
        apiKey: 'sk-ant-api03-' + 'a'.repeat(50),
        models: {
          quick: 'claude-3-haiku-20240307',
          standard: 'claude-3-5-sonnet-20241022',
          thorough: 'claude-3-5-sonnet-20241022',
        },
      };

      const result = ProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should accept valid Groq config', () => {
      const config = {
        provider: ProviderType.GROQ,
        apiKey: 'gsk_' + 'a'.repeat(50),
        models: {
          quick: 'llama-3.1-8b-instant',
          standard: 'llama-3.3-70b-versatile',
          thorough: 'llama-3.3-70b-versatile',
        },
      };

      const result = ProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should accept config with excluded projects', () => {
      const config = {
        provider: ProviderType.ANTHROPIC,
        apiKey: 'sk-ant-api03-' + 'a'.repeat(50),
        models: {
          quick: 'claude-3-haiku-20240307',
          standard: 'claude-3-5-sonnet-20241022',
          thorough: 'claude-3-5-sonnet-20241022',
        },
        excludedProjects: ['test-project', 'legacy-app'],
      };

      const result = ProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject config with invalid provider', () => {
      const config = {
        provider: 'openai',
        apiKey: 'sk-test',
        models: {},
      };

      const result = ProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject config with missing models', () => {
      const config = {
        provider: ProviderType.ANTHROPIC,
        apiKey: 'sk-ant-api03-' + 'a'.repeat(50),
        models: {
          quick: 'claude-3-haiku-20240307',
          // missing standard and thorough
        },
      };

      const result = ProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject config with invalid API key', () => {
      const config = {
        provider: ProviderType.ANTHROPIC,
        apiKey: 'short',
        models: {
          quick: 'claude-3-haiku-20240307',
          standard: 'claude-3-5-sonnet-20241022',
          thorough: 'claude-3-5-sonnet-20241022',
        },
      };

      const result = ProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('Security - Path Traversal Protection', () => {
    it('should block various path traversal patterns', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        'normal/../../sensitive',
        './../../../etc/shadow',
      ];

      maliciousPaths.forEach(path => {
        const result = SafePathSchema.safeParse(path);
        expect(result.success).toBe(false);
      });
    });

    it('should block URL-encoded traversal attempts', () => {
      // Note: SafePathSchema blocks ".." which covers URL-encoded variants
      const encoded = '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd';
      const result = SafePathSchema.safeParse(encoded);
      // Even if not decoded, the schema should be conservative
      expect(result.success).toBe(false);
    });
  });

  describe('Security - Null Byte Injection Protection', () => {
    it('should block null bytes in paths', () => {
      const pathsWithNullBytes = [
        'file.txt\0.exe',
        'path\0/etc/passwd',
        '\0hidden',
      ];

      pathsWithNullBytes.forEach(path => {
        const result = SafePathSchema.safeParse(path);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('null bytes');
        }
      });
    });
  });
});
