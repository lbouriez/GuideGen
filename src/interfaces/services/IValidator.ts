/**
 * Validator Service Interfaces
 * Abstractions for input validation
 */

import { z, ZodSchema } from 'zod';

/**
 * Validation result
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationErrorDetail[];
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  path: string;
  message: string;
  code?: string;
}

/**
 * Input validator interface
 */
export interface IInputValidator {
  validate<T>(schema: ZodSchema<T>, data: unknown): T;
  validateSafe<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T>;
  validatePath(path: string, basePath?: string): string;
  validateConfig(config: unknown): ProviderConfigValidated;
}

/**
 * Validated provider config type
 */
export interface ProviderConfigValidated {
  provider: 'anthropic' | 'groq';
  apiKey: string;
  models?: {
    quick?: string;
    standard?: string;
    thorough?: string;
  };
  excludedProjects?: string[];
}

/**
 * Path validator interface
 */
export interface IPathValidator {
  isAbsolute(path: string): boolean;
  isRelative(path: string): boolean;
  normalize(path: string): string;
  isWithinBase(path: string, basePath: string): boolean;
  hasTraversalAttempt(path: string): boolean;
  sanitize(path: string): string;
}
