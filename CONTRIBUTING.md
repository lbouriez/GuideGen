# Contributing to GuideGen

Thank you for your interest in contributing to GuideGen! This document provides guidelines and information for contributors.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Security Best Practices](#security-best-practices)
- [Pull Request Process](#pull-request-process)

## Architecture Overview

GuideGen follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│           CLI Entry Points              │
│  (src/index.ts - commands & validation) │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          Workflow Layer                 │
│  (Orchestrators - setup, guidelines)    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           Phase Layer                   │
│  (discovery, analysis, guidelines)      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Service Layer                   │
│  (providers, validation, rate limiting) │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        Infrastructure Layer             │
│  (filesystem, IO, utilities)            │
└─────────────────────────────────────────┘
```

### Key Principles

1. **Dependency Injection**: All services use InversifyJS for DI
2. **Single Responsibility**: Each module has one clear purpose
3. **Interface-Based**: Dependencies are injected via interfaces
4. **Testability**: All components are designed to be easily tested
5. **Type Safety**: Zero `any` types - strict TypeScript

### Directory Structure

```
src/
├── core/
│   ├── io/              # File system abstraction
│   ├── phases/          # Workflow phases
│   └── workflows/       # High-level orchestrators
├── providers/           # AI provider abstraction
│   ├── anthropic.ts     # Anthropic Claude implementation
│   ├── groq.ts          # Groq implementation
│   ├── manager.ts       # Provider manager
│   └── types.ts         # Provider interfaces
├── services/            # Business logic services
│   └── rate-limiter.ts  # Rate limiting with retry
├── validation/          # Input validation
│   ├── schemas.ts       # Zod schemas
│   └── input-validator.ts
├── errors/              # Custom error classes
├── di/                  # Dependency injection
│   ├── container.ts     # DI container
│   └── identifiers.ts   # DI tokens
└── utils/               # Shared utilities

tests/
├── unit/                # Unit tests
│   ├── _template.test.ts
│   └── ...
├── integration/         # Integration tests
└── helpers/             # Test helpers
    ├── container.ts     # Test DI container
    └── mocks.ts         # Mock implementations
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- An Anthropic API key or Groq API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/GuideGen.git
cd GuideGen

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Setting Up API Keys

For security, use environment variables instead of `.env` files:

```bash
export AI_PROVIDER=anthropic
export ANTHROPIC_API_KEY=your_key_here
```

Or use the interactive setup:

```bash
npm start -- setup /path/to/project
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Follow the code standards below and write tests for new functionality.

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts
```

### 4. Build and Verify

```bash
# Type check
npm run build

# Run the CLI
npm start -- analyze /path/to/project
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Test changes
- `chore:` - Build/tooling changes

## Code Standards

### TypeScript

- **Zero `any` types** - Always use proper types
- **Strict mode** - Enable all strict TypeScript checks
- **Interfaces over types** - Use interfaces for object shapes
- **Explicit return types** - Always declare function return types

### Functions

- **Keep functions small** - Target < 50 lines
- **Single responsibility** - One clear purpose per function
- **Pure when possible** - Minimize side effects
- **JSDoc comments** - Document all public APIs

Example:

```typescript
/**
 * Validates a target path and ensures it's safe
 *
 * @param inputPath - The path to validate
 * @returns The resolved absolute path
 * @throws {ValidationError} If path is invalid or unsafe
 *
 * @example
 * ```typescript
 * const safePath = validateTargetPath('./my-project');
 * ```
 */
export function validateTargetPath(inputPath: string): string {
  const resolvedPath = resolve(inputPath);
  const parseResult = TargetPathSchema.safeParse(inputPath);

  if (!parseResult.success) {
    throw new ValidationError(
      `Invalid path: ${parseResult.error.issues.map(i => i.message).join(', ')}`,
      { path: inputPath },
      'path'
    );
  }

  return resolvedPath;
}
```

### File Organization

- **One class per file** - Exception: related helper functions
- **Barrel exports** - Use index.ts for clean imports
- **Co-location** - Keep related files together

### Dependency Injection

Always use DI for services:

```typescript
import { injectable, inject } from 'inversify';
import { TYPES } from '@/di/identifiers';
import type { IFileSystem } from '@/core/io/filesystem';

@injectable()
export class MyService {
  constructor(
    @inject(TYPES.FileSystem) private fileSystem: IFileSystem
  ) {}

  async doSomething(): Promise<void> {
    const content = await this.fileSystem.readFile('path', 'utf-8');
    // ...
  }
}
```

### Error Handling

Use custom error classes:

```typescript
import { ValidationError, FileOperationError } from '@/errors';

// Validation errors
if (!isValid) {
  throw new ValidationError(
    'Invalid input',
    { field: 'name', value: input },
    'name'
  );
}

// File operation errors
try {
  await fs.readFile(path, 'utf-8');
} catch (error) {
  throw new FileOperationError(
    'Failed to read file',
    path,
    'read',
    error instanceof Error ? error : undefined
  );
}
```

## Testing Guidelines

### Test Structure

Use the template from `tests/unit/_template.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MyService } from '@/path/to/service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      const result = service.methodName('input');
      expect(result).toBe('expected');
    });

    it('should throw on invalid input', () => {
      expect(() => service.methodName('')).toThrow(ValidationError);
    });
  });
});
```

### Test Coverage Goals

- **Overall**: 60%+
- **Services**: 80%+
- **Utils**: 70%+
- **Critical paths**: 100%

### Mocking

Use the test helpers:

```typescript
import { createTestContainer } from '@test/helpers/container';
import { MockFileSystem } from '@/core/io/filesystem';

const container = createTestContainer();
const mockFs = new MockFileSystem({
  '/test/file.txt': 'content',
});

container.rebind(TYPES.FileSystem).toConstantValue(mockFs);
```

## Security Best Practices

### Input Validation

**Always validate at system boundaries:**

```typescript
import { TargetPathSchema } from '@/validation/schemas';

function handleUserInput(path: string): void {
  // Validate first
  const result = TargetPathSchema.safeParse(path);
  if (!result.success) {
    throw new ValidationError('Invalid path', { path });
  }

  // Use validated value
  processPath(result.data);
}
```

### Path Traversal Prevention

```typescript
import { resolve, relative } from 'path';

function validatePathWithinProject(targetPath: string, basePath: string): void {
  const resolved = resolve(basePath, targetPath);
  const rel = relative(basePath, resolved);

  if (rel.startsWith('..')) {
    throw new PathTraversalError(
      'Path traversal detected',
      targetPath,
      basePath
    );
  }
}
```

### API Key Security

- **Never commit API keys** - Use environment variables
- **Check .gitignore** - Ensure .env is ignored
- **Use loadFromEnvironment()** - Prefer env vars over .env files

### Rate Limiting

All API calls are automatically rate-limited:

```typescript
// Rate limiting is applied in ProviderManager
const client = await createProviderClient('standard');
// All calls are automatically throttled and retried
const result = await client.complete(systemPrompt, userPrompt);
```

## Pull Request Process

1. **Update Documentation** - If you change public APIs
2. **Add Tests** - For new functionality
3. **Run Full Test Suite** - Ensure all tests pass
4. **Update CHANGELOG** - Document your changes
5. **Create PR** - With clear description

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No new TypeScript errors
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

Thank you for contributing to GuideGen! 🚀
