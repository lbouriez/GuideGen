/**
 * Test Mocks
 * Centralized mock implementations for testing
 */

import { vi } from 'vitest';
import type { Dirent, Stats } from 'fs';
import type { IFileSystem } from '../../src/interfaces/services/IFileService.js';
import type { ILogger } from '../../src/interfaces/services/ILogger.js';
import type { IRateLimiter, IProviderClient } from '../../src/interfaces/services/IProviderService.js';
import type { IInputValidator, ValidationResult } from '../../src/interfaces/services/IValidator.js';

/**
 * Mock file system implementation
 */
export const mockFileSystem: IFileSystem = {
  readFile: vi.fn().mockResolvedValue(''),
  writeFile: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(true),
  stat: vi.fn().mockResolvedValue({
    isFile: () => true,
    isDirectory: () => false,
    size: 100,
  } as Stats),
  readdir: vi.fn().mockResolvedValue([]),
  readdirWithFileTypes: vi.fn().mockResolvedValue([]),
  mkdir: vi.fn().mockResolvedValue(undefined),
  readFileSync: vi.fn().mockReturnValue(''),
  writeFileSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  readdirSync: vi.fn().mockReturnValue([]),
  readdirSyncWithFileTypes: vi.fn().mockReturnValue([]),
};

/**
 * Mock logger implementation
 */
export const mockLogger: ILogger = {
  debug: vi.fn(),
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

/**
 * Mock rate limiter implementation
 */
export const mockRateLimiter: IRateLimiter = {
  throttle: vi.fn().mockImplementation((fn) => fn()),
  setMaxConcurrent: vi.fn(),
  setMinDelay: vi.fn(),
  getQueueSize: vi.fn().mockReturnValue(0),
};

/**
 * Mock input validator implementation
 */
export const mockInputValidator: IInputValidator = {
  validate: vi.fn().mockImplementation((schema, data) => data),
  validateSafe: vi.fn().mockImplementation((schema, data) => ({
    success: true,
    data,
  })),
  validatePath: vi.fn().mockImplementation((path) => path),
  validateConfig: vi.fn().mockImplementation((config) => config),
};

/**
 * Mock provider client implementation
 */
export const mockProviderClient: IProviderClient = {
  setDepth: vi.fn(),
  getModelType: vi.fn().mockReturnValue('standard'),
  complete: vi.fn().mockResolvedValue('Mock AI response'),
  completeWithJson: vi.fn().mockResolvedValue({ success: true }),
  sendMessage: vi.fn().mockResolvedValue({ content: 'Mock message response' }),
};

/**
 * Reset all mocks
 */
export function resetAllMocks(): void {
  vi.clearAllMocks();
}

/**
 * Create a mock file system with initial files
 */
export function createMockFileSystemWithFiles(
  files: Record<string, string>
): IFileSystem {
  const fileMap = new Map(Object.entries(files));

  return {
    readFile: vi.fn().mockImplementation((path: string) => {
      const content = fileMap.get(path);
      if (content === undefined) {
        return Promise.reject(new Error(`ENOENT: no such file: ${path}`));
      }
      return Promise.resolve(content);
    }),
    writeFile: vi.fn().mockImplementation((path: string, content: string) => {
      fileMap.set(path, content);
      return Promise.resolve();
    }),
    exists: vi.fn().mockImplementation((path: string) => {
      return Promise.resolve(fileMap.has(path));
    }),
    stat: vi.fn().mockImplementation((path: string) => {
      if (!fileMap.has(path)) {
        return Promise.reject(new Error(`ENOENT: no such file: ${path}`));
      }
      return Promise.resolve({
        isFile: () => true,
        isDirectory: () => false,
        size: fileMap.get(path)?.length || 0,
      } as Stats);
    }),
    readdir: vi.fn().mockResolvedValue([]),
    readdirWithFileTypes: vi.fn().mockResolvedValue([]),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFileSync: vi.fn().mockImplementation((path: string) => {
      const content = fileMap.get(path);
      if (content === undefined) {
        throw new Error(`ENOENT: no such file: ${path}`);
      }
      return content;
    }),
    writeFileSync: vi.fn().mockImplementation((path: string, content: string) => {
      fileMap.set(path, content);
    }),
    existsSync: vi.fn().mockImplementation((path: string) => {
      return fileMap.has(path);
    }),
    readdirSync: vi.fn().mockReturnValue([]),
    readdirSyncWithFileTypes: vi.fn().mockReturnValue([]),
  };
}

/**
 * Create a mock provider client with custom responses
 */
export function createMockProviderClientWithResponses(
  responses: {
    complete?: string;
    completeWithJson?: unknown;
    sendMessage?: { content: string };
  }
): IProviderClient {
  return {
    setDepth: vi.fn(),
    getModelType: vi.fn().mockReturnValue('standard'),
    complete: vi.fn().mockResolvedValue(responses.complete || 'Mock response'),
    completeWithJson: vi.fn().mockResolvedValue(responses.completeWithJson || { success: true }),
    sendMessage: vi.fn().mockResolvedValue(responses.sendMessage || { content: 'Mock message' }),
  };
}

/**
 * Create mock AI response for specific test scenarios
 */
export function mockAIJsonResponse<T>(client: IProviderClient, response: T): void {
  vi.mocked(client.completeWithJson).mockResolvedValue(response);
}

/**
 * Create mock AI text response
 */
export function mockAITextResponse(client: IProviderClient, response: string): void {
  vi.mocked(client.complete).mockResolvedValue(response);
}
