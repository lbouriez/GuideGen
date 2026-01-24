/**
 * Claude Artifacts Services Tests
 * Tests for the refactored modular services
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Claude Artifacts Services', () => {
  describe('SkillGeneratorService', () => {
    it('should export SkillGeneratorService class', async () => {
      const { SkillGeneratorService } = await import('../../../../src/workflows/claude-artifacts/services/SkillGeneratorService.js');
      expect(SkillGeneratorService).toBeDefined();
    });

    it('should have generate and validate methods', async () => {
      const { SkillGeneratorService } = await import('../../../../src/workflows/claude-artifacts/services/SkillGeneratorService.js');
      expect(SkillGeneratorService.prototype.generate).toBeDefined();
      expect(SkillGeneratorService.prototype.validate).toBeDefined();
    });
  });

  describe('AgentGeneratorService', () => {
    it('should export AgentGeneratorService class', async () => {
      const { AgentGeneratorService } = await import('../../../../src/workflows/claude-artifacts/services/AgentGeneratorService.js');
      expect(AgentGeneratorService).toBeDefined();
    });

    it('should have generate and validate methods', async () => {
      const { AgentGeneratorService } = await import('../../../../src/workflows/claude-artifacts/services/AgentGeneratorService.js');
      expect(AgentGeneratorService.prototype.generate).toBeDefined();
      expect(AgentGeneratorService.prototype.validate).toBeDefined();
    });
  });

  describe('ClaudeMdGeneratorService', () => {
    it('should export ClaudeMdGeneratorService class', async () => {
      const { ClaudeMdGeneratorService } = await import('../../../../src/workflows/claude-artifacts/services/ClaudeMdGeneratorService.js');
      expect(ClaudeMdGeneratorService).toBeDefined();
    });

    it('should have generate method', async () => {
      const { ClaudeMdGeneratorService } = await import('../../../../src/workflows/claude-artifacts/services/ClaudeMdGeneratorService.js');
      expect(ClaudeMdGeneratorService.prototype.generate).toBeDefined();
    });
  });

  describe('ArtifactFileManager', () => {
    it('should export ArtifactFileManager class', async () => {
      const { ArtifactFileManager } = await import('../../../../src/workflows/claude-artifacts/services/ArtifactFileManager.js');
      expect(ArtifactFileManager).toBeDefined();
    });

    it('should have all required methods', async () => {
      const { ArtifactFileManager } = await import('../../../../src/workflows/claude-artifacts/services/ArtifactFileManager.js');
      expect(ArtifactFileManager.prototype.artifactsExist).toBeDefined();
      expect(ArtifactFileManager.prototype.deleteArtifacts).toBeDefined();
      expect(ArtifactFileManager.prototype.readExistingArtifacts).toBeDefined();
      expect(ArtifactFileManager.prototype.writeArtifacts).toBeDefined();
    });
  });

  describe('ArtifactMergerService', () => {
    it('should export ArtifactMergerService class', async () => {
      const { ArtifactMergerService } = await import('../../../../src/workflows/claude-artifacts/services/ArtifactMergerService.js');
      expect(ArtifactMergerService).toBeDefined();
    });

    it('should have merge method', async () => {
      const { ArtifactMergerService } = await import('../../../../src/workflows/claude-artifacts/services/ArtifactMergerService.js');
      expect(ArtifactMergerService.prototype.merge).toBeDefined();
    });
  });

  describe('GuidelineExtractor', () => {
    it('should export GuidelineExtractor class', async () => {
      const { GuidelineExtractor } = await import('../../../../src/workflows/claude-artifacts/services/GuidelineExtractor.js');
      expect(GuidelineExtractor).toBeDefined();
    });

    it('should have all required methods', async () => {
      const { GuidelineExtractor } = await import('../../../../src/workflows/claude-artifacts/services/GuidelineExtractor.js');
      expect(GuidelineExtractor.prototype.readGuidelines).toBeDefined();
      expect(GuidelineExtractor.prototype.extractRules).toBeDefined();
      expect(GuidelineExtractor.prototype.getPackageJsonScripts).toBeDefined();
    });
  });

  describe('ClaudeArtifactsWorkflow', () => {
    it('should export ClaudeArtifactsWorkflow class', async () => {
      const { ClaudeArtifactsWorkflow } = await import('../../../../src/workflows/claude-artifacts/ClaudeArtifactsWorkflow.js');
      expect(ClaudeArtifactsWorkflow).toBeDefined();
    });

    it('should have execute method', async () => {
      const { ClaudeArtifactsWorkflow } = await import('../../../../src/workflows/claude-artifacts/ClaudeArtifactsWorkflow.js');
      expect(ClaudeArtifactsWorkflow.prototype.execute).toBeDefined();
    });
  });

  describe('Module Exports', () => {
    it('should export all services from index', async () => {
      const exports = await import('../../../../src/workflows/claude-artifacts/index.js');
      expect(exports.ClaudeArtifactsWorkflow).toBeDefined();
      expect(exports.ArtifactFileManager).toBeDefined();
      expect(exports.SkillGeneratorService).toBeDefined();
      expect(exports.AgentGeneratorService).toBeDefined();
      expect(exports.ClaudeMdGeneratorService).toBeDefined();
      expect(exports.ArtifactMergerService).toBeDefined();
      expect(exports.GuidelineExtractor).toBeDefined();
    });
  });
});

describe('DI Identifiers', () => {
  it('should have Claude artifacts identifiers', async () => {
    const { TYPES } = await import('../../../../src/di/identifiers.js');
    expect(TYPES.IArtifactFileManager).toBeDefined();
    expect(TYPES.ISkillGeneratorService).toBeDefined();
    expect(TYPES.IAgentGeneratorService).toBeDefined();
    expect(TYPES.IClaudeMdGeneratorService).toBeDefined();
    expect(TYPES.IArtifactMergerService).toBeDefined();
    expect(TYPES.IGuidelineExtractor).toBeDefined();
  });
});

describe('Error Classes', () => {
  it('should export all error classes', async () => {
    const errors = await import('../../../../src/errors/index.js');
    expect(errors.ValidationError).toBeDefined();
    expect(errors.FileOperationError).toBeDefined();
    expect(errors.ProviderError).toBeDefined();
    expect(errors.PhaseExecutionError).toBeDefined();
    expect(errors.ConfigurationError).toBeDefined();
    expect(errors.RateLimitError).toBeDefined();
    expect(errors.PathTraversalError).toBeDefined();
  });

  it('should create ValidationError with details', async () => {
    const { ValidationError } = await import('../../../../src/errors/index.js');
    const error = new ValidationError('Invalid input', { field: 'email' }, 'email');
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual({ field: 'email' });
    expect(error.field).toBe('email');
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should create FileOperationError with path and operation', async () => {
    const { FileOperationError } = await import('../../../../src/errors/index.js');
    const error = new FileOperationError('File not found', '/path/to/file', 'read');
    expect(error.message).toBe('File not found');
    expect(error.filePath).toBe('/path/to/file');
    expect(error.operation).toBe('read');
    expect(error.code).toBe('FILE_OPERATION_ERROR');
  });

  it('should create ProviderError with provider details', async () => {
    const { ProviderError } = await import('../../../../src/errors/index.js');
    const error = new ProviderError('API rate limit', 'anthropic', 429, true);
    expect(error.message).toBe('API rate limit');
    expect(error.provider).toBe('anthropic');
    expect(error.statusCode).toBe(429);
    expect(error.retryable).toBe(true);
  });

  it('should create RateLimitError with retry info', async () => {
    const { RateLimitError } = await import('../../../../src/errors/index.js');
    const error = new RateLimitError('Too many requests', 'anthropic', 60);
    expect(error.message).toBe('Too many requests');
    expect(error.provider).toBe('anthropic');
    expect(error.retryAfter).toBe(60);
  });

  it('should serialize errors to JSON', async () => {
    const { ValidationError } = await import('../../../../src/errors/index.js');
    const error = new ValidationError('Test error', { key: 'value' });
    const json = error.toJSON();
    expect(json.name).toBe('ValidationError');
    expect(json.message).toBe('Test error');
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.details).toEqual({ key: 'value' });
    expect(json.timestamp).toBeDefined();
  });
});

describe('Validation Schemas', () => {
  it('should export validation schemas', async () => {
    const schemas = await import('../../../../src/validation/schemas.js');
    expect(schemas.PathSchema).toBeDefined();
    expect(schemas.SafePathSchema).toBeDefined();
    expect(schemas.ProviderConfigSchema).toBeDefined();
  });

  it('should validate safe paths', async () => {
    const { SafePathSchema } = await import('../../../../src/validation/schemas.js');

    // Valid paths
    expect(SafePathSchema.safeParse('/valid/path').success).toBe(true);
    expect(SafePathSchema.safeParse('./relative/path').success).toBe(true);
    expect(SafePathSchema.safeParse('simple').success).toBe(true);

    // Invalid paths (traversal attempts)
    expect(SafePathSchema.safeParse('../traversal').success).toBe(false);
    expect(SafePathSchema.safeParse('/path/../escape').success).toBe(false);
  });
});

describe('Rate Limiter', () => {
  it('should export RateLimiter class', async () => {
    const { RateLimiter } = await import('../../../../src/services/rate-limiter.js');
    expect(RateLimiter).toBeDefined();
  });

  it('should have throttle method', async () => {
    const { RateLimiter } = await import('../../../../src/services/rate-limiter.js');
    expect(RateLimiter.prototype.throttle).toBeDefined();
  });
});
