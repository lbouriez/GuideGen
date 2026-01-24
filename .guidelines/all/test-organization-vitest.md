# all - test-organization-vitest

> **Summary**: This guideline documents the test organization patterns found in the codebase, specifically focusing on the use of Vitest as the testing framework. It outlines how tests are structured, how mocking is handled, and provides examples of test patterns.
> 
> The codebase utilizes Vitest for unit testing, with a focus on descriptive test names, mocking of dependencies, and clear assertions. This guideline aims to document these patterns to ensure consistency across the codebase.

---

## When to Use This Guide

Use this guide when:
- Writing new unit tests for the codebase
- Refactoring existing tests to improve clarity and consistency
- Ensuring test organization and structure align with the existing codebase standards

---

## Overview

The codebase uses Vitest for unit testing, with a strong emphasis on clear and descriptive test names, effective mocking of dependencies, and concise assertions. Tests are organized in a way that reflects the structure of the codebase, making it easier to locate and maintain tests related to specific features or components.

### Test Structure

Tests are typically structured using the `describe` function from Vitest, which groups related tests together. Each test within a `describe` block is defined using the `it` function, which takes a descriptive string as its first argument, followed by the test function.

```typescript
describe('Guidelines Workflow', () => {
  it('should generate and write guidelines when none exist', async () => {
    // Test implementation
  });
});
```

### Mocking Dependencies

The codebase uses `vi.mock` from Vitest to mock dependencies. This allows for isolating the component or function being tested from its dependencies, making tests more reliable and efficient.

```typescript
vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
  generateAllGuidelines: vi.fn(),
}));
```

### Assertions

Assertions are made using the `expect` function from Vitest, which provides a fluent API for asserting the expected behavior of the code under test.

```typescript
expect(result.success).toBe(true);
expect(result.guidelinesGenerated).toBe(2);
```

### Test Patterns

The codebase exhibits several test patterns, including testing for successful execution, error handling, and edge cases. Tests often verify the output of functions, the state of objects, and the behavior of components under various conditions.

```typescript
describe('error handling - validation failures', () => {
  it('should fail when validation detects invalid guidelines', async () => {
    // Test implementation
  });
});
```

### Complete Example

A complete example of a test suite for the `GuidelinesWorkflow` class demonstrates how tests are organized and structured:

```typescript
describe('Guidelines Workflow', () => {
  let mockClient: any;
  let mockTechProfile: TechProfile;
  let mockPatterns: PatternReport;
  // ...

  beforeEach(async () => {
    // Setup mocks and test data
  });

  describe('new generation mode', () => {
    it('should generate and write guidelines when none exist', async () => {
      // Test implementation
    });
  });

  describe('override mode', () => {
    it('should delete existing guidelines and create new ones', async () => {
      // Test implementation
    });
  });

  // ...
});
```

---

## Key Rules

### ✅ DO

- **Use descriptive test names**: Test names should clearly indicate what is being tested.
  ```typescript
  it('should generate and write guidelines when none exist', async () => {
    // Test implementation
  });
  ```
- **Mock dependencies**: Use `vi.mock` to isolate dependencies and make tests more efficient.
  ```typescript
  vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
    generateAllGuidelines: vi.fn(),
  }));
  ```
- **Use assertions**: Verify the expected behavior of the code under test using `expect`.
  ```typescript
  expect(result.success).toBe(true);
  expect(result.guidelinesGenerated).toBe(2);
  ```

### ❌ NEVER

- **Do not use generic test names**: Avoid test names that do not provide clear information about what is being tested.
  ```typescript
  // ❌ Bad
  it('test', async () => {
    // Test implementation
  });
  ```
- **Do not forget to clear mocks**: Ensure that mocks are cleared after each test to prevent interference between tests.
  ```typescript
  // ❌ Bad
  vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
    generateAllGuidelines: vi.fn(),
  }));
  // Forget to clear the mock
  ```