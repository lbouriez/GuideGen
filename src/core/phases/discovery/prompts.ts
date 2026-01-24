/**
 * Discovery phase prompts
 * Phase 1: Detect tech stack and project structure
 */

export const DISCOVERY_SYSTEM_PROMPT = `You are an expert software architect analyzing a codebase to understand its tech stack and structure.

Your task is to analyze the provided configuration files and folder structure to create a comprehensive tech profile.

## Analysis Focus

1. **Languages**: Identify primary and secondary programming languages
2. **Frameworks**: Detect web frameworks, mobile frameworks, etc.
3. **Build Tools**: Bundlers, compilers, task runners
   - Detect from package.json scripts (e.g., "tsc" = typescript, "webpack" = webpack, "vite" = vite)
   - Detect from devDependencies (e.g., typescript, @babel/core, esbuild)
4. **Testing**: Testing frameworks and tools
   - Detect from package.json scripts (e.g., "vitest", "jest", "mocha")
   - Detect from devDependencies (e.g., vitest, jest, @testing-library)
5. **Linting**: Code quality tools
   - Detect from devDependencies (e.g., eslint, prettier)
6. **Package Manager**: npm, yarn, pnpm, bun
   - Check for package-lock.json (npm), yarn.lock (yarn), pnpm-lock.yaml (pnpm), bun.lockb (bun)

## Monorepo Detection

Look for signs of a monorepo:
- Multiple package.json files at any nesting level
- Workspace configurations (workspaces in package.json, pnpm-workspace.yaml, nx.json, turbo.json, etc.)
- Common monorepo folder patterns: apps/, packages/, libs/, tools/, services/, backend/, frontend/, mobile/
- Nested project structures where different frameworks/technologies are used in subfolders
- Docker compose files that orchestrate multiple services
- Different build tools or languages in subdirectories indicating separate projects

## Project Type Classification

Classify each project/package as:
- 'frontend': React, Vue, Angular, Svelte apps, Next.js, Nuxt.js
- 'backend': Express, Fastify, NestJS, Django, Rails, Spring Boot, .NET APIs
- 'mobile': React Native, Flutter, native mobile, Expo apps
- 'website': Static sites, documentation (Docusaurus, Jekyll, Hugo, etc.)
- 'shared': Shared libraries, utilities, common packages
- 'fullstack': Projects that combine frontend and backend in one package
- 'unknown': Cannot determine

## Nested Project Detection

Look for projects in nested folder structures:
- backend/, frontend/, mobile/ subdirectories often indicate separate projects
- Different package.json files with different framework dependencies
- Apps using different languages or build tools
- Docker compose files orchestrating multiple services

## Output Format

Return a JSON object matching the TechProfile type.`;

export const DISCOVERY_USER_PROMPT = (
  folderStructure: string,
  configFiles: Array<{ path: string; content: string }>,
  testPatterns?: {
    testFolders: string[];
    testFiles: string[];
    testScripts: Record<string, string>;
    testDependencies: string[];
  }
): string => {
  const configSections = configFiles
    .map(
      (f) => `### ${f.path}
\`\`\`
${f.content.slice(0, 3000)}${f.content.length > 3000 ? '\n... (truncated)' : ''}
\`\`\``
    )
    .join('\n\n');

  // Create test evidence section if patterns detected
  let testEvidenceSection = '';
  if (testPatterns && (
    testPatterns.testFolders.length > 0 ||
    testPatterns.testFiles.length > 0 ||
    Object.keys(testPatterns.testScripts).length > 0 ||
    testPatterns.testDependencies.length > 0
  )) {
    const parts: string[] = ['## Testing Evidence Detected'];
    parts.push('');
    parts.push('The following test-related patterns were found in the codebase:');
    parts.push('');

    if (testPatterns.testFolders.length > 0) {
      parts.push('**Test Folders:**');
      testPatterns.testFolders.forEach(folder => {
        parts.push(`- ${folder}`);
      });
      parts.push('');
    }

    if (testPatterns.testFiles.length > 0) {
      parts.push('**Test Files:**');
      testPatterns.testFiles.slice(0, 5).forEach(file => {
        parts.push(`- ${file}`);
      });
      if (testPatterns.testFiles.length > 5) {
        parts.push(`- ... and ${testPatterns.testFiles.length - 5} more test files`);
      }
      parts.push('');
    }

    if (Object.keys(testPatterns.testScripts).length > 0) {
      parts.push('**Test Scripts in package.json:**');
      Object.entries(testPatterns.testScripts).forEach(([name, command]) => {
        parts.push(`- "${name}": "${command}"`);
      });
      parts.push('');
    }

    if (testPatterns.testDependencies.length > 0) {
      parts.push('**Test-Related Dependencies:**');
      testPatterns.testDependencies.forEach(dep => {
        parts.push(`- ${dep}`);
      });
      parts.push('');
    }

    parts.push('⚠️ IMPORTANT: Based on the above evidence, identify the testing framework(s) used and include them in testingFrameworks array.');
    parts.push('');

    testEvidenceSection = parts.join('\n');
  }

  return `Analyze this codebase and create a tech profile.

## Folder Structure
\`\`\`
${folderStructure}
\`\`\`

## Configuration Files

${configSections}

${testEvidenceSection}
## Required Output

Return a JSON object with this exact structure (example values - replace with actual detected values):
{
  "stack": {
    "languages": ["typescript"],
    "frameworks": [],
    "buildTools": ["typescript", "tsx"],
    "testingFrameworks": ["vitest"],
    "linters": [],
    "packageManager": "npm"
  },
  "structure": {
    "root": "/path/to/project",
    "directories": ["src", "tests"],
    "keyFiles": ["README.md", "src/index.ts"],
    "configFiles": ["package.json", "tsconfig.json"]
  },
  "isMonorepo": false,
  "projects": [
    {
      "name": "main",
      "path": ".",
      "type": "backend",
      "stack": { "frameworks": ["framework1"] }
    }
  ]
}

CRITICAL DETECTION RULES:
- ALWAYS check package.json scripts and dependencies/devDependencies thoroughly
- Do NOT use empty arrays [] or leave fields empty if tools are present in package.json

BUILD TOOLS DETECTION:
- If "typescript" in devDependencies → include "typescript" in buildTools
- If "tsc" in scripts → include "typescript" in buildTools
- If "webpack", "vite", "esbuild", "rollup", "@babel/core" → include them in buildTools
- If "tsx", "ts-node" in devDependencies → include "typescript" in buildTools

TESTING FRAMEWORKS DETECTION (VERY IMPORTANT):
- ALWAYS check both scripts AND devDependencies for testing tools
- Example: If scripts has "test": "vitest" → include "vitest" in testingFrameworks
- Example: If devDependencies has "vitest": "^4.0.17" → include "vitest" in testingFrameworks
- Example: If devDependencies has "jest": "^29.0.0" → include "jest" in testingFrameworks
- If "vitest" appears ANYWHERE in package.json → include "vitest"
- If "jest" appears ANYWHERE in package.json → include "jest"
- If "@testing-library" in devDependencies → include the testing framework it's used with
- NEVER return empty array for testingFrameworks if test tools are present in package.json

LINTERS DETECTION:
- If "eslint" in devDependencies → include "eslint" in linters
- If "prettier" in devDependencies → include "prettier" in linters

IMPORTANT: Be thorough - check ALL scripts, dependencies, and devDependencies.
Do NOT return empty arrays if tools are clearly present in the configuration files.`;
};