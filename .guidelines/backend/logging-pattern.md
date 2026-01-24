---
title: Logging Patterns in Backend Code
description: Documenting existing logging patterns and practices in the backend codebase
---

# Backend - Logging Patterns

> This guideline covers the existing logging practices and patterns found in the backend codebase.
> It documents how logging is currently implemented and provides examples from the code.

## When to Use This Guide

Use this guide when:
- You need to add logging to a new backend feature
- You want to understand the current logging practices in the codebase
- You need to troubleshoot an issue and want to know where to look for logs

## Overview

Logging is an essential part of any application, providing valuable insights into its behavior, performance, and errors. In the backend codebase, logging is primarily used for debugging, error tracking, and monitoring.

The codebase uses a custom logging solution, with log messages being written to the console. The logging mechanism is implemented using the `console.log`, `console.info`, `console.warn`, and `console.error` functions.

## Key Rules

### ✅ DO

- ✅ **Use `console.log` for debug messages**
  ```typescript
  console.log(`[DEBUG] ${message}`);
  ```
- ✅ **Use `console.info` for informational messages**
  ```typescript
  console.info(`[INFO] ${message}`);
  ```
- ✅ **Use `console.warn` for warning messages**
  ```typescript
  console.warn(`[WARN] ${message}`);
  ```
- ✅ **Use `console.error` for error messages**
  ```typescript
  console.error(`[ERROR] ${message}`);
  ```

### ❌ NEVER

- ❌ **Do not use a logging library not found in the codebase**
  ```typescript
  // ❌ Bad example using a non-existent logging library
  const logger = new Logger();
  logger.log(message);
  // ✅ Good example using console.log
  console.log(`[DEBUG] ${message}`);
  ```

## Complete Example

The following example demonstrates how logging is used in the `GuidelineFileService` class:
```typescript
// From src/services/GuidelineFileService.ts
@injectable()
export class GuidelineFileService {
  async writeAll(guidelines: GeneratedGuideline[]): Promise<void> {
    console.info(`[INFO] Writing guidelines to disk...`);
    try {
      await Promise.all(
        guidelines.map(g => this.write(g.domain, g.fileName, g.content))
      );
      console.log(`[DEBUG] Guidelines written successfully`);
    } catch (error) {
      console.error(`[ERROR] Failed to write guidelines: ${error.message}`);
    }
  }
}
```
In this example, logging is used to provide informational messages about the progress of the `writeAll` method, as well as error messages in case of failures.