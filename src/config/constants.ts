/**
 * Application Constants
 * Centralized configuration values
 */

import type { AnalysisDepth } from '../types';

/**
 * File reading limits based on analysis depth
 */
export const FILE_LIMITS = {
  quick: {
    maxFilesPerProject: 3,
    maxFilesPerGuideline: 5,
    maxFileSize: 50000,
    maxContentLength: 10000,
  },
  standard: {
    maxFilesPerProject: 5,
    maxFilesPerGuideline: 10,
    maxFileSize: 50000,
    maxContentLength: 10000,
  },
  thorough: {
    maxFilesPerProject: 10,
    maxFilesPerGuideline: 15,
    maxFileSize: 50000,
    maxContentLength: 10000,
  },
} as const;

/**
 * Get file limits for a given depth
 */
export function getFileLimits(depth: AnalysisDepth) {
  return FILE_LIMITS[depth];
}

/**
 * Ignore patterns for file operations
 */
export const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.expo',
  'coverage',
  '.cache',
  '__pycache__',
  'venv',
  '.venv',
  'vendor',
  'target',
  'claude-bootstrap',
] as const;

/**
 * Config file patterns to detect
 */
export const CONFIG_FILE_PATTERNS = [
  '**/package.json',
  '**/tsconfig.json',
  '**/tsconfig.*.json',
  '**/.eslintrc*',
  '**/eslint.config.*',
  '**/.prettierrc*',
  '**/prettier.config.*',
  '**/vite.config.*',
  '**/webpack.config.*',
  '**/next.config.*',
  '**/tailwind.config.*',
  '**/jest.config.*',
  '**/vitest.config.*',
  '**/.env.example',
  '**/docker-compose.yml',
  '**/Dockerfile',
  '**/Makefile',
  '**/Cargo.toml',
  '**/pyproject.toml',
  '**/requirements.txt',
  '**/go.mod',
] as const;

/**
 * Knowledge system constants
 */
export const KNOWLEDGE_LIMITS = {
  maxFiles: 100,
  maxFileSize: 50000,
  maxContentPerFile: 10000,
} as const;

/**
 * Validation constants
 */
export const VALIDATION = {
  minGuidelineLength: 500,
  minIndexLength: 100,
  maxGuidelineSize: 50000,
} as const;
