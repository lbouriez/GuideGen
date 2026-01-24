---
title: TypeScript Import Conventions
description: Documenting existing TypeScript import patterns in the codebase
---

# TypeScript Imports - Conventions

> This guideline documents the existing import conventions used in the codebase.
> It covers both relative imports and path aliases configured in `tsconfig.json`.

The codebase uses a combination of relative imports and path aliases for importing modules. Path aliases are configured in `tsconfig.json` to simplify imports and make the code more readable.

## When to Use This Guide

Use this guide when:
- Importing modules within the project
- Configuring `tsconfig.json` for path aliases

## Overview

The codebase uses the following import conventions:

* Relative imports for modules within the same directory or nearby directories
* Path aliases for imports from other parts of the project, configured in `tsconfig.json`

### Relative Imports

Relative imports are used for modules within the same directory or nearby directories. For example:

```typescript
// File: src/core/workflows/claude-update.ts
import type { IProviderClient } from '../../providers/types';
```

### Path Aliases

Path aliases are configured in `tsconfig.json` to simplify imports. The codebase uses the following path aliases:

* `@/types` for type definitions
* `@/providers` for provider modules
* `@/core` for core modules

For example:

```typescript
// File: src/core/workflows/claude-update.ts
import type { TechProfile } from '@/types';
import type { IProviderClient } from '@/providers/types';
```

## Key Rules

### ✅ DO

* Use relative imports for modules within the same directory or nearby directories
* Use path aliases for imports from other parts of the project, configured in `tsconfig.json`

### ❌ NEVER

* Use absolute imports without configuring path aliases in `tsconfig.json`
* Use `require` statements for importing modules (use ES6 imports instead)

## Complete Example

The following example shows how to import a module using a path alias:

```typescript
// File: src/core/workflows/claude-update.ts
import type { TechProfile } from '@/types';
import type { IProviderClient } from '@/providers/types';

// Use the imported types
export async function runClaudeArtifactsWorkflow(
  client: IProviderClient,
  targetPath: string,
  techProfile: TechProfile,
  // ...
) {
  // ...
}
```

Note that the `tsconfig.json` file contains the following configuration for path aliases:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/types": ["src/types"],
      "@/providers": ["src/providers"],
      "@/core": ["src/core"]
    }
  }
}
```

This configuration allows the codebase to use path aliases for importing modules from other parts of the project.