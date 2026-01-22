/**
 * DI Container Configuration
 * Centralized dependency injection container setup
 */

import { Container } from 'inversify';
import { TYPES } from './identifiers.js';

// Services
import { RateLimiter } from '../services/rate-limiter.js';
import { InputValidator, PathValidator } from '../validation/input-validator.js';

// File System (from existing code)
import { RealFileSystem } from '../core/io/filesystem.js';

// Logger (from existing code)
import { logger } from '../utils/logger.js';

// Interfaces
import type { IFileSystem } from '../interfaces/services/IFileService.js';
import type { IRateLimiter } from '../interfaces/services/IProviderService.js';
import type { IInputValidator } from '../interfaces/services/IValidator.js';
import type { ILogger } from '../interfaces/services/ILogger.js';

/**
 * Create and configure a new DI container
 */
export function createContainer(): Container {
  const container = new Container({
    defaultScope: 'Singleton',
  });

  // File System Services
  container.bind<IFileSystem>(TYPES.IFileSystem).to(RealFileSystem).inSingletonScope();

  // Rate Limiter
  container.bind<IRateLimiter>(TYPES.IRateLimiter).to(RateLimiter).inSingletonScope();

  // Validators
  container.bind<IInputValidator>(TYPES.IInputValidator).to(InputValidator).inSingletonScope();

  // Logger (constant value - already exists)
  container.bind<ILogger>(TYPES.ILogger).toConstantValue(logger);

  return container;
}

/**
 * Global container instance
 */
export const container = createContainer();

/**
 * Get a service from the container
 */
export function getService<T>(identifier: symbol): T {
  return container.get<T>(identifier);
}

/**
 * Check if a service is bound
 */
export function isServiceBound(identifier: symbol): boolean {
  return container.isBound(identifier);
}

/**
 * Rebind a service (useful for testing)
 */
export async function rebindService<T>(identifier: symbol, implementation: T): Promise<void> {
  if (container.isBound(identifier)) {
    container.unbind(identifier);
  }
  container.bind<T>(identifier).toConstantValue(implementation);
}

/**
 * Unbind a service
 */
export function unbindService(identifier: symbol): void {
  if (container.isBound(identifier)) {
    container.unbind(identifier);
  }
}

/**
 * Unbind all services
 */
export function unbindAll(): void {
  container.unbindAll();
}
