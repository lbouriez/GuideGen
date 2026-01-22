/**
 * Analysis phase prompts
 * Phase 2: Extract code patterns and conventions
 */

export const ANALYSIS_SYSTEM_PROMPT = `You are an expert code reviewer analyzing a codebase to identify patterns and conventions.

Your task is to analyze the provided code samples and identify relevant patterns based on the project's tech stack and type.

## Analysis Guidelines

1. **Only analyze categories relevant to the project type**
   - For CLI tools: Focus on utilities, configuration, and basic patterns
   - For web apps: Include UI/UX, state management, and component patterns
   - For APIs: Focus on routing, validation, and data patterns

2. **Skip categories that don't apply**
   - If no state management libraries are found, omit the state management category
   - If the project doesn't use React, skip React-specific patterns
   - Only include categories where you find actual patterns in the code

3. **Be specific and accurate**
   - Use real examples from the codebase
   - Only report patterns you actually observe
   - Don't invent patterns to fill categories

## Dynamic Categories to Analyze

Analyze these categories ONLY if they are relevant to the detected tech stack:

### Import Patterns (always relevant)
- Path aliases (@/, ~/, etc.)
- Barrel files (index.ts exports)
- Relative vs absolute imports
- Import organization (grouping, ordering)

### Naming Conventions (always relevant)
- File naming (camelCase, kebab-case, PascalCase)
- Function/method naming
- Variable naming
- Component naming (if applicable)
- Interface/type naming

### Architecture Patterns (usually relevant)
- Layer separation (routes, services, repositories)
- Dependency injection
- Repository pattern
- Component composition
- Hook patterns (if applicable)

### State Management (only for apps with state)
- React Query / TanStack Query
- Zustand, Redux, MobX
- Context API
- Local state patterns

### Error Handling (usually relevant)
- Try/catch patterns
- Error boundaries (if applicable)
- Custom error classes
- Error propagation

### Logging Patterns (usually relevant)
- Console usage
- Logger libraries
- Log levels
- Structured logging

## Pattern Frequency

Rate each pattern:
- 'always': Used consistently in 90%+ of files
- 'common': Used in 50-89% of files
- 'occasional': Used in less than 50% of files

## Output Format

Return a JSON object matching the PatternReport type. You may omit categories that are not relevant to this project.`;

export const ANALYSIS_USER_PROMPT = (
  techProfile: string,
  codeContent: string,
  projectType: string
): string => {
  const categoryGuidance = getCategoryGuidance(projectType);

  return `Analyze the provided codebase content and identify patterns.

## Project Context
- **Project Type**: ${projectType}
- **Tech Profile**: ${techProfile}

## Analysis Instructions
${categoryGuidance}

## Codebase Content

${codeContent}

## Required Output

Return a JSON object. Only include categories that are relevant to this ${projectType} project. Omit categories where no patterns are found.

Example structure (include only relevant categories):
{
  "importPatterns": [
    {
      "name": "Path Aliases",
      "description": "Uses @/ prefix for src imports",
      "examples": ["import { Button } from '@/components/Button'"],
      "files": ["src/screens/Home.tsx", "src/components/Card.tsx"],
      "frequency": "always"
    }
  ],
  "namingConventions": [...],
  // Include other categories only if relevant patterns are found
}

Be specific about what you observe in the actual code. Only report patterns you find evidence for.`;
};

function getCategoryGuidance(projectType: string): string {
  switch (projectType.toLowerCase()) {
    case 'cli':
    case 'command-line':
      return `
Focus on utility patterns, configuration handling, and basic code organization.
- Import Patterns: Always include
- Naming Conventions: Always include
- Architecture Patterns: Include if layered (commands, utilities, etc.)
- State Management: Usually omit (CLIs typically don't manage complex state)
- Error Handling: Include if error handling patterns exist
- Logging Patterns: Include if logging is used`;

    case 'web-app':
    case 'frontend':
      return `
Focus on UI/UX patterns, component architecture, and user interaction.
- Import Patterns: Always include
- Naming Conventions: Always include (include component naming)
- Architecture Patterns: Include (component composition, hooks)
- State Management: Include (React state, context, external libraries)
- Error Handling: Include (error boundaries, user-facing errors)
- Logging Patterns: Include if client-side logging exists`;

    case 'backend':
    case 'api':
      return `
Focus on server patterns, data handling, and API design.
- Import Patterns: Always include
- Naming Conventions: Always include
- Architecture Patterns: Always include (layers, DI, repositories)
- State Management: Usually omit (servers typically don't manage UI state)
- Error Handling: Always include (API error responses, logging)
- Logging Patterns: Always include (server-side logging)`;

    default:
      return `
Analyze based on the actual tech stack and code patterns observed.
Include categories where relevant patterns are found in the codebase.`;
  }
}