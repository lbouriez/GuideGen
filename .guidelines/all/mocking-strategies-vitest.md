# all - mocking-strategies-vitest

> **Summary**: This guideline documents the existing mocking strategies used in the codebase with Vitest. It covers how dependencies are mocked and how these mocks are used in tests.
> 
> The codebase utilizes Vitest for testing and employs mocking to isolate dependencies. This guideline provides an overview of the mocking patterns found in the code, focusing on how `vi.mock` is used to mock out dependencies.

---

## When to Use This Guide

Use this guide when:
- Writing unit tests for components or services that have external dependencies.
- You need to isolate dependencies to ensure tests are reliable and fast.
- You want to understand how mocking is currently implemented in the codebase.

---

## Overview

The codebase uses Vitest for testing, and `vi.mock` is utilized to mock out dependencies. This approach allows for isolating external dependencies, making tests more reliable and faster. The mocking strategy is crucial for ensuring that tests are not affected by the state of external systems.

Mocking in the codebase is primarily used for services and utilities that have external dependencies, such as file system interactions or network requests. By mocking these dependencies, tests can focus on the logic of the component or service being tested, without worrying about the complexities of the external systems.

### Key Concepts

- **Mocking**: The process of creating mock implementations of dependencies to isolate them during testing.
- **`vi.mock`**: A function from Vitest used to mock out modules or functions.
- **Isolation**: Ensuring that tests do not interfere with each other or with external systems.

### Existing Mocking Patterns

The codebase demonstrates a consistent approach to mocking dependencies. For instance, when testing the `GuidelineFileService`, dependencies like `fs` are mocked to prevent actual file system interactions during tests.

```typescript
// Example of mocking fs to prevent actual file system interactions
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readdirSync: vi.fn(() => []),
}));
```

### Best Practices

While this guideline focuses on documenting existing patterns, it's essential to follow best practices when implementing mocking in tests:
- **Keep mocks simple**: Avoid complex mock implementations that might hide bugs in the code being tested.
- **Use `vi.mock` consistently**: Ensure that all mocks are created using `vi.mock` for consistency and ease of maintenance.
- **Reset mocks**: After each test, reset mocks to their original state to prevent interference between tests.

---

## Key Rules

### ✅ DO

- **Use `vi.mock` for mocking dependencies**: Ensure all mocks are created using `vi.mock` for consistency.
  ```typescript
  // Good example of using vi.mock
  vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
    generateAllGuidelines: vi.fn(),
  }));
  ```
- **Mock dependencies to isolate them**: Use mocking to prevent tests from interacting with external systems.
  ```typescript
  // Example of mocking a dependency to isolate it
  vi.mock('../../../src/utils/interactive.js', () => ({
    promptUpdateMode: vi.fn(),
  }));
  ```

### ❌ NEVER

- **Do not mix mocking frameworks**: Stick to `vi.mock` from Vitest for all mocking needs.
  ```typescript
  // Bad example: Using jest.mock instead of vi.mock
  // jest.mock('../../../src/utils/interactive.js', () => ({
  //   promptUpdateMode: jest.fn(),
  // }));
  // Good alternative
  vi.mock('../../../src/utils/interactive.js', () => ({
    promptUpdateMode: vi.fn(),
  }));
  ```

---

## Complete Example

A complete example of how mocking is used in the context of testing a service can be seen in the `GuidelinesWorkflow` tests. Here, various dependencies are mocked to isolate the service being tested.

```typescript
// Complete example from tests/unit/core/workflows/guidelines-update.test.ts
describe('Guidelines Workflow', () => {
  // Mock dependencies
  vi.mock('../../../../src/core/phases/guidelines/generator.js', () => ({
    generateAllGuidelines: vi.fn(),
  }));

  // ... other mocks and test logic
});
```

This approach ensures that the tests are reliable, fast, and do not interfere with external systems.