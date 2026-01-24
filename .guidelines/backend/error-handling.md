---
title: Error Handling Patterns
description: Try-catch patterns and custom error classes for backend error handling
---

# Backend - Error Handling

> Error handling is crucial for robust and reliable backend applications. This guideline documents the existing error handling patterns in the codebase, including try-catch blocks and custom error classes.
>
> The codebase uses a combination of try-catch blocks and custom error classes to handle errors in a centralized and consistent manner.

---

## When to Use This Guide

Use this guide when:
- Implementing error handling in backend services
- Creating custom error classes for specific error types
- Using try-catch blocks to handle errors in synchronous and asynchronous code

---

## Overview

Error handling is an essential aspect of backend development, and the codebase uses a combination of try-catch blocks and custom error classes to handle errors in a centralized and consistent manner. The `src/errors/index.ts` file defines a set of custom error classes that inherit from the `GuideGenError` class, which provides a basic structure for error handling.

The custom error classes include `ValidationError`, `FileOperationError`, `ProviderError`, `PhaseExecutionError`, `ConfigurationError`, `RateLimitError`, and `PathTraversalError`. Each error class has its own set of properties and methods that provide additional context and information about the error.

Try-catch blocks are used throughout the codebase to handle errors in synchronous and asynchronous code. The `try` block contains the code that may throw an error, and the `catch` block contains the code that handles the error.

### Custom Error Classes

The codebase defines a set of custom error classes that inherit from the `GuideGenError` class. These error classes provide a way to handle specific types of errors in a centralized and consistent manner.

```typescript
// src/errors/index.ts
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

### Try-Catch Blocks

Try-catch blocks are used throughout the codebase to handle errors in synchronous and asynchronous code. The `try` block contains the code that may throw an error, and the `catch` block contains the code that handles the error.

```typescript
// src/services/rate-limiter.ts
async throttle<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    this.queue.push({
      fn: fn as () => Promise<unknown>,
      resolve: resolve as (value: unknown) => void,
      reject,
    });

    this.processQueue();
  });
}

private async processQueue(): Promise<void> {
  if (this.running >= this.maxConcurrent || this.queue.length === 0) {
    return;
  }

  const now = Date.now();
  const timeSinceLastCall = now - this.lastCallTime;

  if (timeSinceLastCall < this.minDelayMs) {
    setTimeout(() => this.processQueue(), this.minDelayMs - timeSinceLastCall);
    return;
  }

  const item = this.queue.shift();
  if (!item) return;

  this.running++;
  this.lastCallTime = Date.now();

  try {
    const result = await item.fn();
    item.resolve(result);
  } catch (error) {
    item.reject(error);
  } finally {
    this.running--;
    this.processQueue();
  }
}
```

---

## Key Rules

### ✅ DO

- Use custom error classes to handle specific types of errors
- Use try-catch blocks to handle errors in synchronous and asynchronous code
- Provide additional context and information about the error using error properties and methods

```typescript
// src/errors/index.ts
export class RateLimitError extends GuideGenError {
  public readonly retryAfter?: number;
  public readonly provider: string;

  constructor(message: string, provider: string, retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR');
    this.provider = provider;
    this.retryAfter = retryAfter;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      provider: this.provider,
      retryAfter: this.retryAfter,
    };
  }
}
```

### ❌ NEVER

- Do not use generic error messages or error codes
- Do not use try-catch blocks without providing a meaningful error message or handling the error

```typescript
// src/services/rate-limiter.ts
// ❌ Bad example
try {
  // code that may throw an error
} catch (error) {
  // do nothing
}
```

```typescript
// src/services/rate-limiter.ts
// ✅ Good example
try {
  // code that may throw an error
} catch (error) {
  throw new RateLimitError('Rate limit exceeded', 'unknown', 60);
}
```

---

## Complete Example

The `RateLimiter` class is an example of how to use try-catch blocks and custom error classes to handle errors in a centralized and consistent manner.

```typescript
// src/services/rate-limiter.ts
@injectable()
export class RateLimiter {
  private queue: QueueItem<unknown>[] = [];
  private running = 0;
  private lastCallTime = 0;
  private maxConcurrent: number;
  private minDelayMs: number;

  constructor(maxConcurrent: number = 3, minDelayMs: number = 1000) {
    this.maxConcurrent = maxConcurrent;
    this.minDelayMs = minDelayMs;
  }

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.minDelayMs) {
      setTimeout(() => this.processQueue(), this.minDelayMs - timeSinceLastCall);
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.running++;
    this.lastCallTime = Date.now();

    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}
```