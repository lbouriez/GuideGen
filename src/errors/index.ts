/**
 * Custom Error Classes
 * Standardized error types for consistent error handling
 */

/**
 * Base error class for GuideGen errors
 */
export abstract class GuideGenError extends Error {
  public readonly timestamp: Date;
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends GuideGenError {
  public readonly details?: Record<string, unknown>;
  public readonly field?: string;

  constructor(message: string, details?: Record<string, unknown>, field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.details = details;
    this.field = field;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      details: this.details,
      field: this.field,
    };
  }
}

/**
 * File operation error for file system failures
 */
export class FileOperationError extends GuideGenError {
  public readonly filePath: string;
  public readonly operation: 'read' | 'write' | 'delete' | 'mkdir' | 'stat';
  public readonly cause?: Error;

  constructor(
    message: string,
    filePath: string,
    operation: 'read' | 'write' | 'delete' | 'mkdir' | 'stat',
    cause?: Error
  ) {
    super(message, 'FILE_OPERATION_ERROR');
    this.filePath = filePath;
    this.operation = operation;
    this.cause = cause;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      filePath: this.filePath,
      operation: this.operation,
      cause: this.cause?.message,
    };
  }
}

/**
 * Provider error for AI provider failures
 */
export class ProviderError extends GuideGenError {
  public readonly provider: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly cause?: Error;

  constructor(
    message: string,
    provider: string,
    statusCode?: number,
    retryable: boolean = false,
    cause?: Error
  ) {
    super(message, 'PROVIDER_ERROR');
    this.provider = provider;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.cause = cause;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      provider: this.provider,
      statusCode: this.statusCode,
      retryable: this.retryable,
      cause: this.cause?.message,
    };
  }
}

/**
 * Phase execution error for workflow phase failures
 */
export class PhaseExecutionError extends GuideGenError {
  public readonly phase: string;
  public readonly cause?: Error;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    phase: string,
    cause?: Error,
    recoverable: boolean = false
  ) {
    super(message, 'PHASE_EXECUTION_ERROR');
    this.phase = phase;
    this.cause = cause;
    this.recoverable = recoverable;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      phase: this.phase,
      recoverable: this.recoverable,
      cause: this.cause?.message,
    };
  }
}

/**
 * Configuration error for invalid or missing configuration
 */
export class ConfigurationError extends GuideGenError {
  public readonly configKey?: string;
  public readonly expectedType?: string;
  public readonly actualValue?: unknown;

  constructor(
    message: string,
    configKey?: string,
    expectedType?: string,
    actualValue?: unknown
  ) {
    super(message, 'CONFIGURATION_ERROR');
    this.configKey = configKey;
    this.expectedType = expectedType;
    this.actualValue = actualValue;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      configKey: this.configKey,
      expectedType: this.expectedType,
      actualValue: this.actualValue,
    };
  }
}

/**
 * Rate limit error for API throttling
 */
export class RateLimitError extends GuideGenError {
  public readonly retryAfter?: number;
  public readonly provider: string;

  constructor(message: string, provider: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR');
    this.provider = provider;
    this.retryAfter = retryAfter;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      provider: this.provider,
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Path traversal error for security violations
 */
export class PathTraversalError extends GuideGenError {
  public readonly requestedPath: string;
  public readonly basePath: string;

  constructor(message: string, requestedPath: string, basePath: string) {
    super(message, 'PATH_TRAVERSAL_ERROR');
    this.requestedPath = requestedPath;
    this.basePath = basePath;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      requestedPath: this.requestedPath,
      basePath: this.basePath,
    };
  }
}

/**
 * Helper function to get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Helper function to wrap unknown errors
 */
export function wrapError(error: unknown, context: string): Error {
  if (error instanceof GuideGenError) {
    return error;
  }
  if (error instanceof Error) {
    return new Error(`${context}: ${error.message}`);
  }
  return new Error(`${context}: ${String(error)}`);
}

/**
 * Type guard for GuideGenError
 */
export function isGuideGenError(error: unknown): error is GuideGenError {
  return error instanceof GuideGenError;
}
