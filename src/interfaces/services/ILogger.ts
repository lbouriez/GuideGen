/**
 * Logger Interface
 * Abstraction for logging operations
 */

export type LogMessage = string | number | Record<string, unknown> | unknown;
export type LogContext = Record<string, unknown>;

/**
 * Logger interface for consistent logging
 */
export interface ILogger {
  debug(message: LogMessage, context?: LogContext): void;
  log(message: LogMessage, context?: LogContext): void;
  info(message: LogMessage, context?: LogContext): void;
  warn(message: LogMessage, errorOrContext?: unknown, context?: unknown): void;
  error(message: LogMessage, errorOrContext?: unknown, context?: unknown): void;
}
