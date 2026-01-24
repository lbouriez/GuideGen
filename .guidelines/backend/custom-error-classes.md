---
title: Custom Error Classes in Backend
description: Standardized error types for consistent error handling in the backend.
---

# Backend - Custom Error Classes

> Custom error classes are used throughout the backend to handle and propagate errors in a standardized manner.
> These classes provide a way to categorize and describe errors, making it easier to handle and log them.

## When to Use This Guide

Use this guide when:
- You need to handle errors in a backend service or module.
- You want to create a custom error class for a specific error type.
- You need to understand how to use existing custom error classes in the codebase.

## Overview

The backend codebase uses a set of custom error classes to handle different types of errors. These classes are designed to provide a standardized way of handling and propagating errors throughout the application.

The custom error classes are defined in the `src/errors/index.ts` file and include classes such as `GuideGenError`, `ValidationError`, `FileOperationError`, `ProviderError`, `PhaseExecutionError`, `ConfigurationError`, `RateLimitError`, and `PathTraversalError`.

Each custom error class has its own set of properties and methods that provide additional information about the error. For example, the `ValidationError` class has a `details` property that contains information about the validation error.

## Key Rules

### ✅ DO

- ✅ **Use custom error classes to handle specific error types**:
  ```typescript
  // Good example
  throw new ValidationError('Invalid input data', { field: 'username', value: 'invalid' });
  ```
- ✅ **Extend the `GuideGenError` class to create custom error classes**:
  ```typescript
  // Good example
  export class CustomError extends GuideGenError {
    constructor(message: string) {
      super(message, 'CUSTOM_ERROR');
    }
  }
  ```

### ❌ NEVER

- ❌ **Use generic error classes or throw plain error messages**:
  ```typescript
  // Bad example
  throw new Error('Something went wrong');
  ```
  ```typescript
  // Good alternative
  throw new GuideGenError('Something went wrong', 'GENERIC_ERROR');
  ```

## Complete Example

Here is an example of how to use the `ValidationError` class to handle a validation error:
```typescript
// Example usage of ValidationError
try {
  // Validate user input
  if (!username || !password) {
    throw new ValidationError('Invalid input data', { field: 'username', value: 'invalid' });
  }
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation error: ${error.message}`);
    console.error(`Details: ${JSON.stringify(error.details)}`);
  } else {
    console.error(`Unknown error: ${error.message}`);
  }
}
```
Note that this example uses the `ValidationError` class to handle a validation error and provides additional information about the error using the `details` property.