---
title: Vitest Mocking Patterns
description: Documenting existing Vitest mocking strategies in the codebase
---

# Vitest - Mocking

> This guideline covers the existing Vitest mocking patterns found in the codebase.
> It provides examples of how to mock dependencies, modules, and functions using Vitest's mocking capabilities.

## When to Use This Guide

Use this guide when:
- Writing unit tests for modules with dependencies
- Mocking external modules or functions to isolate test subjects
- Using Vitest as the testing framework

## Overview

The codebase utilizes Vitest for unit testing and employs various mocking strategies to isolate dependencies and test subjects. The primary mocking functions used are `vi.mock()` and `vi.fn()`.

## Key Rules

### ✅ DO

- ✅ **Use `vi.mock()` to mock modules**
  ```typescript
  // Good example
  vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
    generateAllGuidelines: vi.fn(),
  }));
  ```
- ✅ **Use `vi.fn()` to create mock functions**
  ```typescript
  // Good example
  const mockGenerateAllGuidelines = vi.fn();
  ```

### ❌ NEVER

- ❌ **Do not use `jest.mock()` or `jest.fn()`**
  ```typescript
  // Bad example
  // jest.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
  //   generateAllGuidelines: jest.fn(),
  // }));
  // ✅ Good alternative
  vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
    generateAllGuidelines: vi.fn(),
  }));
  ```

## Complete Example

The following example demonstrates how to mock a module and its functions using `vi.mock()` and `vi.fn()`:
```typescript
// File: tests/unit/core/workflows/guidelines-update.test.ts
import { describe, it, expect, vi } from 'vitest';
import { runGuidelinesWorkflow } from '../../../../src/core/workflows/guidelines-update.js';

// Mock dependencies
vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
  generateAllGuidelines: vi.fn(),
}));

// ...

describe('Guidelines Workflow', () => {
  // ...
});
```
In this example, the `generateAllGuidelines` function from the `guidelines/generator.js` module is mocked using `vi.mock()` and `vi.fn()`. This allows for isolation of the test subject and control over the mock's behavior.