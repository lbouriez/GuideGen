---
title: Vitest Testing Patterns
description: Patterns for writing unit tests and integration tests using Vitest
---

# Vitest Testing - Unit and Integration Tests

> Vitest is used for unit and integration testing in this project.
> The testing framework provides a lot of features out of the box, including mocking, code coverage, and parallel testing.

## When to Use This Guide

Use this guide when:
- Writing unit tests for individual components or functions
- Writing integration tests for larger parts of the application
- Using Vitest for testing

## Overview

Vitest is a fast and efficient testing framework that is used in this project. It provides a lot of features out of the box, including mocking, code coverage, and parallel testing.

### Mocking Dependencies

In Vitest, dependencies can be mocked using the `vi.mock` function. This function takes a module path as an argument and returns a mock implementation of the module.

```typescript
// File: tests/unit/core/workflows/guidelines-update.test.ts
vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
  generateAllGuidelines: vi.fn(),
}));
```

### Writing Unit Tests

Unit tests in Vitest are written using the `describe` and `it` functions. The `describe` function is used to group related tests together, and the `it` function is used to define a single test.

```typescript
// File: tests/unit/core/workflows/guidelines-update.test.ts
describe('Guidelines Workflow', () => {
  it('should fail when project structure is missing', async () => {
    const invalidProfile = { ...mockTechProfile, structure: undefined };

    const result = await runGuidelinesWorkflow(
      mockClient,
      '/test/project',
      invalidProfile,
      mockPatterns,
      false
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Project structure not found');
    expect(result.guidelinesGenerated).toBe(0);
  });
});
```

### Writing Integration Tests

Integration tests in Vitest are written using the same `describe` and `it` functions as unit tests. However, integration tests typically involve more complex scenarios and may involve multiple components or modules.

```typescript
// File: tests/integration/workflows/setup.workflow.integration.test.ts
describe('Setup Workflow Integration', () => {
  it('should complete all phases successfully', async () => {
    // Mock successful responses
    mockRunDiscoveryPhase.mockResolvedValue({
      success: true,
      data: {
        stack: {
          languages: ['TypeScript'],
          frameworks: ['React'],
          buildTools: ['Vite'],
          testingFrameworks: ['Vitest'],
          packageManager: 'npm',
        },
        isMonorepo: false,
        structure: {
          root: '/test/project',
          directories: ['src', 'tests'],
          keyFiles: ['package.json'],
          configFiles: ['package.json', 'tsconfig.json'],
        },
      },
    });

    // ...
  });
});
```

## Key Rules

### ✅ DO

- ✅ **Use `vi.mock` to mock dependencies**: Use `vi.mock` to mock dependencies in your tests.
  ```typescript
  vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
    generateAllGuidelines: vi.fn(),
  }));
  ```
- ✅ **Use `describe` and `it` to write tests**: Use `describe` and `it` to write unit tests and integration tests.
  ```typescript
  describe('Guidelines Workflow', () => {
    it('should fail when project structure is missing', async () => {
      // ...
    });
  });
  ```

### ❌ NEVER

- ❌ **Do not use `jest` syntax**: Do not use `jest` syntax in your tests. Instead, use `vi` functions provided by Vitest.
  ```typescript
  // ❌ Bad
  jest.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
    generateAllGuidelines: jest.fn(),
  }));

  // ✅ Good
  vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
    generateAllGuidelines: vi.fn(),
  }));
  ```

## Complete Example

Here is a complete example of a unit test written using Vitest:
```typescript
// File: tests/unit/core/workflows/guidelines-update.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runGuidelinesWorkflow } from '../../../../src/core/workflows/guidelines-update.js';
import type { TechProfile, PatternReport, GeneratedGuideline } from '../../../../src/types/index.js';

// Mock dependencies
vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
  generateAllGuidelines: vi.fn(),
}));

// ...

describe('Guidelines Workflow', () => {
  it('should fail when project structure is missing', async () => {
    const invalidProfile = { ...mockTechProfile, structure: undefined };

    const result = await runGuidelinesWorkflow(
      mockClient,
      '/test/project',
      invalidProfile,
      mockPatterns,
      false
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Project structure not found');
    expect(result.guidelinesGenerated).toBe(0);
  });
});
```