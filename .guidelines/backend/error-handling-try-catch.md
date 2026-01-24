---
title: Error Handling Patterns
description: Try-catch patterns and custom error classes for backend error handling
---

# Backend - Error Handling Try-Catch

> Error handling is crucial for robust backend development, and this codebase utilizes try-catch blocks along with custom error classes for comprehensive error management.
>
> The codebase demonstrates a structured approach to error handling, ensuring that errors are caught, logged, and propagated appropriately to maintain application stability.

---

## When to Use This Guide

Use this guide when:
- Implementing error handling in backend services
- Creating custom error classes for specific error types
- Integrating error handling with logging mechanisms

---

## Overview

Error handling in this codebase is primarily achieved through the use of try-catch blocks. These blocks are strategically placed around code segments that could potentially throw errors, ensuring that the application remains stable and informative error messages are provided.

Custom error classes are also defined to handle specific types of errors, such as validation errors, file operation errors, and provider errors. These classes extend a base error class and provide additional details about the error, such as error codes and causes.

The codebase also utilizes a logging mechanism to record errors, which aids in debugging and monitoring application health.

### Error Handling with Try-Catch Blocks

Try-catch blocks are used to catch and handle errors that occur during the execution of code. The `try` block contains the code that might throw an error, while the `catch` block contains the code that handles the error.

```typescript
try {
  // Code that might throw an error
  const result = await runGuidelinesWorkflow(
    client,
    validatedPath,
    techProfile,
    patterns,
    false,
    onProgress,
    logger
  );
} catch (error) {
  // Handle the error
  return {
    success: false,
    guidelinesGenerated: 0,
    error: error instanceof Error ? error.message : String(error)
  };
}
```

### Custom Error Classes

Custom error classes are defined to handle specific types of errors. These classes provide additional details about the error, such as error codes and causes.

```typescript
export abstract class GuideGenError extends Error {
  public readonly timestamp: Date;
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}
```

### Logging Errors

Errors are logged using a logging mechanism to record error details. This aids in debugging and monitoring application health.

```typescript
this.logger.error('Agent generation failed', { error: message });
```

---

## Key Rules

### ✅ DO

- ✅ **Use try-catch blocks to catch and handle errors**: Try-catch blocks should be used to catch and handle errors that occur during the execution of code.
  ```typescript
  try {
    // Code that might throw an error
  } catch (error) {
    // Handle the error
  }
  ```
- ✅ **Define custom error classes for specific error types**: Custom error classes should be defined to handle specific types of errors, providing additional details about the error.
  ```typescript
  export class ValidationError extends GuideGenError {
    public readonly details?: Record<string, unknown>;
    public readonly field?: string;

    constructor(message: string, details?: Record<string, unknown>, field?: string) {
      super(message, 'VALIDATION_ERROR');
      this.details = details;
      this.field = field;
    }

    toJSON(): Record<string, unknown> {
      return {
        ...super.toJSON(),
        details: this.details,
        field: this.field,
      };
    }
  }
  ```
- ✅ **Log errors using a logging mechanism**: Errors should be logged using a logging mechanism to record error details.
  ```typescript
  this.logger.error('Agent generation failed', { error: message });
  ```

### ❌ NEVER

- ❌ **Do not use generic error messages**: Error messages should be specific and informative, providing details about the error.
  ```typescript
  // Bad example
  throw new Error('An error occurred');
  ```
  ```typescript
  // Good example
  throw new ValidationError('Invalid input data', { field: 'name' });
  ```
- ❌ **Do not ignore errors**: Errors should not be ignored, and should be handled and logged appropriately.
  ```typescript
  // Bad example
  try {
    // Code that might throw an error
  } catch (error) {
    // Ignore the error
  }
  ```
  ```typescript
  // Good example
  try {
    // Code that might throw an error
  } catch (error) {
    // Handle the error
    this.logger.error('An error occurred', { error: error.message });
  }
  ```

---

## Complete Example

The following example demonstrates how to use try-catch blocks, custom error classes, and logging to handle errors in a backend service.

```typescript
export async function runGuidelinesWorkflow(
  client: IProviderClient,
  targetPath: string,
  techProfile: TechProfile,
  patterns: PatternReport,
  interactive: boolean = true,
  onProgress?: (message: string) => void,
  logger?: ILogger
): Promise<GuidelinesWorkflowResult> {
  try {
    // Code that might throw an error
    const result = await generateAllGuidelines(
      client,
      patterns,
      targetPath,
      techProfile.structure,
      techProfile,
      logger,
      (current, total, name) => {
        if (onProgress) onProgress(`Generating ${current}/${total}: ${name}`);
      }
    );

    // Handle the result
    return {
      success: true,
      guidelinesGenerated: result.length,
    };
  } catch (error) {
    // Handle the error
    if (error instanceof ValidationError) {
      // Handle validation error
      return {
        success: false,
        guidelinesGenerated: 0,
        error: error.message,
      };
    } else {
      // Log the error and return a generic error message
      logger.error('An error occurred', { error: error.message });
      return {
        success: false,
        guidelinesGenerated: 0,
        error: 'An unexpected error occurred',
      };
    }
  }
}
```