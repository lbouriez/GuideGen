/**
 * Test utilities for mocking and test setup
 */

import { vi } from 'vitest';

export const mockCLIArgs = (args: string[]) => {
  process.argv = ['node', 'dist/index.js', ...args];
};

export const resetCLIArgs = () => {
  process.argv = ['node', 'dist/index.js'];
};

export const createMockEnvFile = (config: Record<string, string>) => {
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';

  return { '.env': envContent };
};

export const mockConsoleOutput = () => {
  const originalConsole = { ...console };
  const output: string[] = [];

  console.log = vi.fn((...args) => {
    output.push(args.join(' '));
    originalConsole.log(...args);
  });

  console.error = vi.fn((...args) => {
    output.push(`ERROR: ${args.join(' ')}`);
    originalConsole.error(...args);
  });

  console.warn = vi.fn((...args) => {
    output.push(`WARN: ${args.join(' ')}`);
    originalConsole.warn(...args);
  });

  return {
    getOutput: () => output,
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
    },
  };
};

export const waitForAsync = (ms: number = 100) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};