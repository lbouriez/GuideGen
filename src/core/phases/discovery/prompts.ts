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
4. **Testing**: Testing frameworks and tools
5. **Linting**: Code quality tools
6. **Package Manager**: npm, yarn, pnpm, bun

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
  configFiles: Array<{ path: string; content: string }>
): string => {
  const configSections = configFiles
    .map(
      (f) => `### ${f.path}
\`\`\`
${f.content.slice(0, 3000)}${f.content.length > 3000 ? '\n... (truncated)' : ''}
\`\`\``
    )
    .join('\n\n');

  return `Analyze this codebase and create a tech profile.

## Folder Structure
\`\`\`
${folderStructure}
\`\`\`

## Configuration Files

${configSections}

## Required Output

Return a JSON object with this exact structure:
{
  "stack": {
    "languages": ["typescript", "javascript"],
    "frameworks": ["react", "express"],
    "buildTools": ["vite", "tsc"],
    "testingFrameworks": ["vitest", "jest"],
    "linters": ["eslint", "prettier"],
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
      "type": "fullstack",
      "stack": { "frameworks": ["react", "express"] }
    }
  ]
}`;
};