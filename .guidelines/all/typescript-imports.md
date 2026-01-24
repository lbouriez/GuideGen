# all - typescript-imports

> **Summary**: This guideline documents the existing TypeScript import patterns in the codebase, including the use of path aliases and relative imports.
> 
> The codebase utilizes a combination of path aliases and relative imports to manage dependencies between modules. Path aliases are configured in the `tsconfig.json` file, allowing for imports starting with `@/`. Relative imports are used for local dependencies within the same directory or subdirectories.

---

## When to Use This Guide

Use this guide when:
- Working with existing code that uses TypeScript imports
- Adding new dependencies or modules to the project
- Refactoring code to improve import organization

---

## Overview

The codebase uses TypeScript imports to manage dependencies between modules. The `tsconfig.json` file configures path aliases, enabling imports starting with `@/`. Relative imports are used for local dependencies within the same directory or subdirectories.

### Path Aliases

Path aliases are configured in the `tsconfig.json` file as follows:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```
This configuration allows for imports starting with `@/`, which are resolved to the `src/` directory.

### Relative Imports

Relative imports are used for local dependencies within the same directory or subdirectories. For example:
```typescript
import { GuidelineFileService } from './services/GuidelineFileService';
```
This import statement imports the `GuidelineFileService` class from a local file within the same directory.

### Importing Types

Types are imported using the `import type` statement, which allows for better tree-shaking:
```typescript
import type { IProviderClient } from '../../providers/types';
```
This import statement imports the `IProviderClient` type from a separate file, without importing any implementation details.

---

## Key Rules

### ✅ DO

- ✅ **Use path aliases for imports starting with `@/`**:
  ```typescript
  import { GuidelineFileService } from '@/core/workflows/services';
  ```
- ✅ **Use relative imports for local dependencies**:
  ```typescript
  import { GuidelineFileService } from './services/GuidelineFileService';
  ```
- ✅ **Import types with `import type` for better tree-shaking**:
  ```typescript
  import type { IProviderClient } from '../../providers/types';
  ```

### ❌ NEVER

- ❌ **Do not use `require()` for imports**:
  ```typescript
  // ❌ Bad
  const GuidelineFileService = require('./services/GuidelineFileService');
  // ✅ Good
  import { GuidelineFileService } from './services/GuidelineFileService';
  ```

---

## Complete Example

The following example demonstrates the use of path aliases and relative imports:
```typescript
// File: src/core/workflows/claude-update.ts
import { GuidelineFileService } from '@/core/workflows/services';
import type { IProviderClient } from '../../providers/types';

// ...

export async function runClaudeArtifactsWorkflow(
  client: IProviderClient,
  targetPath: string,
  techProfile: TechProfile,
  workflow: ClaudeArtifactsWorkflow,
  interactive: boolean = true,
  onProgress?: (message: string) => void
): Promise<ClaudeArtifactsWorkflowResult> {
  // ...
}
```
This example uses a path alias to import the `GuidelineFileService` class and a relative import to import the `IProviderClient` type.