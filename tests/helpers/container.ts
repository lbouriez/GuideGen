/**
 * Test DI Container
 * Creates containers with mock dependencies for testing
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../../src/di/identifiers.js';
import {
  mockFileSystem,
  mockLogger,
  mockRateLimiter,
  mockInputValidator,
  mockProviderClient,
} from './mocks.js';

import type { IFileSystem } from '../../src/interfaces/services/IFileService.js';
import type { ILogger } from '../../src/interfaces/services/ILogger.js';
import type { IRateLimiter, IProviderClient } from '../../src/interfaces/services/IProviderService.js';
import type { IInputValidator } from '../../src/interfaces/services/IValidator.js';

/**
 * Create a test container with all mocks bound
 */
export function createTestContainer(): Container {
  const container = new Container({
    defaultScope: 'Singleton',
  });

  // Bind all mocks
  container.bind<IFileSystem>(TYPES.IFileSystem).toConstantValue(mockFileSystem);
  container.bind<ILogger>(TYPES.ILogger).toConstantValue(mockLogger);
  container.bind<IRateLimiter>(TYPES.IRateLimiter).toConstantValue(mockRateLimiter);
  container.bind<IInputValidator>(TYPES.IInputValidator).toConstantValue(mockInputValidator);
  container.bind<IProviderClient>(TYPES.IProviderClient).toConstantValue(mockProviderClient);

  return container;
}

/**
 * Create a test container with specific overrides
 */
export function createTestContainerWithOverrides(
  overrides: Partial<{
    fileSystem: IFileSystem;
    logger: ILogger;
    rateLimiter: IRateLimiter;
    inputValidator: IInputValidator;
    providerClient: IProviderClient;
  }>
): Container {
  const container = new Container({
    defaultScope: 'Singleton',
  });

  container.bind<IFileSystem>(TYPES.IFileSystem)
    .toConstantValue(overrides.fileSystem || mockFileSystem);
  container.bind<ILogger>(TYPES.ILogger)
    .toConstantValue(overrides.logger || mockLogger);
  container.bind<IRateLimiter>(TYPES.IRateLimiter)
    .toConstantValue(overrides.rateLimiter || mockRateLimiter);
  container.bind<IInputValidator>(TYPES.IInputValidator)
    .toConstantValue(overrides.inputValidator || mockInputValidator);
  container.bind<IProviderClient>(TYPES.IProviderClient)
    .toConstantValue(overrides.providerClient || mockProviderClient);

  return container;
}

/**
 * Reset container and all mocks
 */
export function resetTestContainer(container: Container): void {
  container.unbindAll();
}
