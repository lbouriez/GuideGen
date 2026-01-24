/**
 * Discovery phase analysis logic
 * Simplified tech stack detection
 */

import type { TechProfile, FolderStructure } from '@/types';
import type { IProviderClient } from '@/types';
import { DISCOVERY_SYSTEM_PROMPT, DISCOVERY_USER_PROMPT } from './prompts';

/**
 * Detect test-related patterns in the codebase
 * This helps the AI identify testing frameworks without hardcoding specific tools
 */
function detectTestPatterns(
  directories: string[],
  keyFiles: string[],
  allConfigFiles: string[],
  configContents: Array<{ path: string; content: string }>
): {
  testFolders: string[];
  testFiles: string[];
  testScripts: Record<string, string>;
  testDependencies: string[];
} {
  const testFolders: string[] = [];
  const testFiles: string[] = [];
  const testScripts: Record<string, string> = {};
  const testDependencies: string[] = [];

  // Detect test folders using common patterns
  const testFolderPatterns = [
    /^tests?\//,           // tests/ or test/
    /__tests__\//,         // __tests__/
    /\/tests?\//,          // any/path/tests/
    /\/__tests__\//,       // any/path/__tests__/
    /\.test\//,            // .test/
    /e2e\//,               // e2e/
    /integration\//,       // integration/
    /^tests?$/,            // tests or test (root level)
    /^__tests__$/,         // __tests__ (root level)
  ];

  for (const dir of directories) {
    const normalizedDir = dir.replace(/\\/g, '/');
    if (testFolderPatterns.some(pattern => pattern.test(normalizedDir))) {
      testFolders.push(dir);
    }
  }

  // Detect test files using common patterns
  const testFilePatterns = [
    /\.test\.(ts|js|tsx|jsx)$/,
    /\.spec\.(ts|js|tsx|jsx)$/,
    /_test\.(ts|js|tsx|jsx)$/,
    /\.e2e\.(ts|js|tsx|jsx)$/,
  ];

  const allFiles = [...keyFiles, ...allConfigFiles];
  for (const file of allFiles) {
    const normalizedFile = file.replace(/\\/g, '/');
    if (testFilePatterns.some(pattern => pattern.test(normalizedFile))) {
      testFiles.push(file);
    }
  }

  // Extract test-related scripts and dependencies from package.json
  const packageJson = configContents.find(f => f.path === 'package.json');
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content);

      // Extract test-related scripts
      if (pkg.scripts) {
        for (const [key, value] of Object.entries(pkg.scripts)) {
          if (key.includes('test') || key.includes('spec') ||
              key.includes('coverage') || key.includes('e2e')) {
            testScripts[key] = value as string;
          }
        }
      }

      // Extract test-related dependencies (both dev and regular)
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      };

      // Common testing framework patterns
      const testDepPatterns = [
        /vitest/i,
        /jest/i,
        /mocha/i,
        /jasmine/i,
        /karma/i,
        /playwright/i,
        /cypress/i,
        /puppeteer/i,
        /@testing-library/i,
        /test/i,
        /spec/i,
        /chai/i,
        /sinon/i,
        /ava/i,
      ];

      for (const [dep, version] of Object.entries(allDeps)) {
        if (testDepPatterns.some(pattern => pattern.test(dep))) {
          testDependencies.push(`${dep}@${version}`);
        }
      }
    } catch (error) {
      // Ignore JSON parse errors
    }
  }

  return {
    testFolders,
    testFiles: testFiles.slice(0, 10), // Limit to first 10 to avoid clutter
    testScripts,
    testDependencies
  };
}

export async function analyzeTechStack(
  client: IProviderClient,
  folderTree: string,
  configContents: Array<{ path: string; content: string }>,
  structure?: { directories: string[]; keyFiles: string[]; configFiles: string[] }
): Promise<TechProfile> {
  // Detect test patterns if structure is provided
  let testPatterns;
  if (structure) {
    testPatterns = detectTestPatterns(
      structure.directories,
      structure.keyFiles,
      structure.configFiles,
      configContents
    );
  }

  return await client.completeWithJson<TechProfile>(
    DISCOVERY_SYSTEM_PROMPT,
    DISCOVERY_USER_PROMPT(folderTree, configContents, testPatterns)
  );
}
