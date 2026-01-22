/**
 * Input Validator Service
 * Centralized input validation using Zod schemas
 */

import { injectable } from 'inversify';
import { ZodSchema, ZodError } from 'zod';
import { resolve, isAbsolute, normalize, relative } from 'path';
import {
  TargetPathSchema,
  ProviderConfigSchema,
  SafePathSchema,
} from './schemas.js';
import { ValidationError, PathTraversalError } from '../errors/index.js';
import type {
  IInputValidator,
  ValidationResult,
  ValidationErrorDetail,
  ProviderConfigValidated,
} from '../interfaces/services/IValidator.js';

@injectable()
export class InputValidator implements IInputValidator {
  /**
   * Validate data against a Zod schema (throws on failure)
   */
  validate<T>(schema: ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = this.formatZodErrors(result.error);
      const errorMessages = errors.map(e => `${e.path}: ${e.message}`).join('; ');
      throw new ValidationError(`Invalid input: ${errorMessages}`, { errors }, errors[0]?.path);
    }

    return result.data;
  }

  /**
   * Validate data against a Zod schema (returns result object)
   */
  validateSafe<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    const result = schema.safeParse(data);

    if (!result.success) {
      return {
        success: false,
        errors: this.formatZodErrors(result.error),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Validate and resolve a file path
   */
  validatePath(path: string, basePath?: string): string {
    // First, validate the path format
    this.validate(SafePathSchema, path);

    // Normalize and resolve the path
    const normalizedPath = normalize(path);
    const resolvedPath = isAbsolute(normalizedPath)
      ? normalizedPath
      : resolve(basePath || process.cwd(), normalizedPath);

    // If basePath is provided, ensure the resolved path is within it
    if (basePath) {
      const normalizedBase = resolve(basePath);
      const relativePath = relative(normalizedBase, resolvedPath);

      // Check if the path escapes the base directory
      if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
        throw new PathTraversalError(
          'Path escapes the allowed directory',
          path,
          basePath
        );
      }
    }

    return resolvedPath;
  }

  /**
   * Validate provider configuration
   */
  validateConfig(config: unknown): ProviderConfigValidated {
    return this.validate(ProviderConfigSchema, config);
  }

  /**
   * Format Zod errors into our error detail format
   */
  private formatZodErrors(error: ZodError): ValidationErrorDetail[] {
    // Zod v4 uses 'issues' instead of 'errors'
    const issues = error.issues || [];
    return issues.map((issue) => ({
      path: issue.path.map(String).join('.') || 'root',
      message: issue.message,
      code: issue.code,
    }));
  }
}

/**
 * Path validator implementation
 */
@injectable()
export class PathValidator {
  /**
   * Check if path is absolute
   */
  isAbsolute(path: string): boolean {
    return isAbsolute(path);
  }

  /**
   * Check if path is relative
   */
  isRelative(path: string): boolean {
    return !isAbsolute(path);
  }

  /**
   * Normalize path
   */
  normalize(path: string): string {
    return normalize(path);
  }

  /**
   * Check if path is within base directory
   */
  isWithinBase(path: string, basePath: string): boolean {
    const normalizedBase = resolve(basePath);
    const normalizedPath = resolve(basePath, path);
    const relativePath = relative(normalizedBase, normalizedPath);

    return !relativePath.startsWith('..') && !isAbsolute(relativePath);
  }

  /**
   * Check for path traversal attempts
   */
  hasTraversalAttempt(path: string): boolean {
    // Check for common traversal patterns
    const patterns = [
      /\.\./,                    // Parent directory
      /%2e%2e/i,                 // URL encoded ..
      /%252e%252e/i,             // Double URL encoded ..
      /\0/,                      // Null byte
      /^[\\\/]{2}/,              // UNC path
    ];

    return patterns.some(pattern => pattern.test(path));
  }

  /**
   * Sanitize path by removing dangerous characters
   */
  sanitize(path: string): string {
    return path
      .replace(/\0/g, '')                    // Remove null bytes
      .replace(/[<>:"|?*]/g, '')             // Remove invalid chars (Windows)
      .replace(/\.{2,}/g, '.')               // Replace multiple dots
      .replace(/^[\\\/]+/, '')               // Remove leading slashes
      .trim();
  }
}
