# all - vitest-testing

> **Summary**: This guideline documents the existing testing patterns in the codebase, specifically focusing on Vitest as the testing framework. It outlines how tests are structured, written, and executed within the project.
> 
> Detailed context about why this exists and when to use it: The codebase utilizes Vitest for unit and integration testing, ensuring the reliability and stability of the application. Understanding the testing patterns is crucial for maintaining and extending the codebase.

---

## When to Use This Guide

Use this guide when:
- Writing new tests for the application
- Refactoring existing tests to align with the project's standards
- Troubleshooting test failures or inconsistencies

---

## Overview

The codebase employs Vitest as its testing framework, leveraging its features for unit and integration testing. The tests are written in TypeScript, utilizing the `describe`, `it`, and `expect` functions from Vitest. Mocking is achieved using `vi.mock` and `vi.fn` from the `vitest` package.

## Key Rules

### ✅ DO

- ✅ **Use Vitest for testing**: The codebase uses Vitest for all testing needs. Ensure that all new tests are written using Vitest.
  ```typescript
  import { describe, it, expect } from 'vitest';
  ```
- ✅ **Write descriptive test names**: Test names should clearly describe the scenario being tested.
  ```typescript
  it('should generate guidelines when none exist', async () => {
    // Test implementation
  });
  ```
- ✅ **Use mocking for dependencies**: Utilize `vi.mock` and `vi.fn` to mock dependencies and isolate the unit being tested.
  ```typescript
  vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
    generateAllGuidelines: vi.fn(),
  }));
  ```

### ❌ NEVER

- ❌ **Use Jest or other testing frameworks**: The codebase is set up to use Vitest. Avoid introducing other testing frameworks.
  ```typescript
  // ❌ Bad: Using Jest
  import { test, expect } from '@jest/globals';
  ```
- ❌ **Write tests without mocking dependencies**: Failing to mock dependencies can lead to tests that are not isolated and potentially fragile.
  ```typescript
  // ❌ Bad: Not mocking dependencies
  import { generateAllGuidelines } from '../../../../src/core/phases/guidelines/generator.js';
  ```

---

## Complete Example

A complete example of a test suite for the `GuidelinesWorkflow` can be seen in the `tests/unit/core/workflows/guidelines-update.test.ts` file:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runGuidelinesWorkflow } from '../../../../src/core/workflows/guidelines-update.js';
import type { TechProfile, PatternReport, GeneratedGuideline } from '../../../../src/types/index.js';

// Mock dependencies
vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
  generateAllGuidelines: vi.fn(),
}));

// Test suite
describe('Guidelines Workflow', () => {
  // Test cases
  it('should generate guidelines when none exist', async () => {
    // Test implementation
  });
});
```
This example demonstrates how to structure a test suite, mock dependencies, and write test cases using Vitest.