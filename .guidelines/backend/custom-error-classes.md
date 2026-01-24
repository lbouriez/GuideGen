# Backend - Custom Error Classes

> **Summary**: The codebase utilizes custom error classes for standardized error handling, ensuring consistency across the application. These classes extend the base `Error` class and provide additional properties for better error management.
> 
> Detailed context about why this exists and when to use it: Custom error classes are essential in the codebase for handling specific error scenarios, such as validation errors, file operation errors, and provider errors. They allow for more informative error messages and easier error handling.

---

## When to Use This Guide

Use this guide when:
- Implementing error handling mechanisms in the backend
- Creating custom error classes for specific error scenarios
- Extending the base `Error` class for additional error properties

---

## Overview

The codebase includes several custom error classes, each designed to handle specific types of errors. These classes inherit from the base `Error` class and provide additional properties to facilitate better error management. The custom error classes include:
- `GuideGenError`: The base error class for all custom errors, providing a `code` property and a `timestamp` property.
- `ValidationError`: Extends `GuideGenError` and includes properties for validation error details, such as `details` and `field`.
- `FileOperationError`: Extends `GuideGenError` and includes properties for file operation errors, such as `filePath` and `operation`.
- `ProviderError`: Extends `GuideGenError` and includes properties for provider errors, such as `provider` and `statusCode`.
- `PhaseExecutionError`: Extends `GuideGenError` and includes properties for phase execution errors, such as `phase` and `recoverable`.
- `ConfigurationError`: Extends `GuideGenError` and includes properties for configuration errors, such as `configKey` and `expectedType`.
- `RateLimitError`: Extends `GuideGenError` and includes properties for rate limit errors, such as `retryAfter`.
- `PathTraversalError`: Extends `GuideGenError` and includes properties for path traversal errors, such as `requestedPath` and `basePath`.

These custom error classes are used throughout the codebase to handle specific error scenarios and provide more informative error messages.

---

## Key Rules

### ✅ DO

- ✅ **Extend the base `Error` class**: When creating a custom error class, extend the base `Error` class to inherit its properties and methods.
  ```typescript
  export abstract class GuideGenError extends Error {
    // ...
  }
  ```
- ✅ **Provide additional properties**: Include additional properties in the custom error class to provide more context about the error.
  ```typescript
  export class ValidationError extends GuideGenError {
    public readonly details?: Record<string, unknown>;
    public readonly field?: string;
    // ...
  }
  ```
- ✅ **Use the `toJSON()` method**: Implement the `toJSON()` method to return a JSON representation of the error object.
  ```typescript
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
  ```

### ❌ NEVER

- ❌ **Do not use generic error messages**: Avoid using generic error messages that do not provide any context about the error.
  ```typescript
  // ❌ Bad
  throw new Error('Something went wrong');
  ```
  ```typescript
  // ✅ Good
  throw new ValidationError('Invalid input data', { field: 'username' });
  ```

---

## Complete Example

Here is an example of how to use the custom error classes in the codebase:
```typescript
try {
  // Code that may throw an error
  const fileService = new GuidelineFileService();
  fileService.writeAll(targetPath, guidelines);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation error: ${error.message}`);
    console.error(`Details: ${JSON.stringify(error.details)}`);
  } else if (error instanceof FileOperationError) {
    console.error(`File operation error: ${error.message}`);
    console.error(`File path: ${error.filePath}`);
  } else {
    console.error(`Unknown error: ${error.message}`);
  }
}
```
In this example, we catch any errors that occur during the execution of the code and check if they are instances of the custom error classes. If they are, we log the error message and any additional properties provided by the custom error class.