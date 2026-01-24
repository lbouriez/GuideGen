---
title: Logging Patterns with Console
description: Console logging patterns and best practices in the codebase
---
# Logging - Console Logging

> Console logging is used throughout the codebase for debugging and informational purposes.
> The `console.log` function is the primary method for logging messages.

Detailed context about why this exists and when to use it:
The codebase utilizes console logging to provide insights into the execution flow, variable values, and error messages. This approach simplifies the debugging process and helps developers understand the application's behavior.

## When to Use This Guide

Use this guide when:
- You need to log messages for debugging purposes
- You want to understand how console logging is used in the codebase
- You are looking for best practices on logging with console

## Overview

Console logging is a straightforward and efficient way to output messages during the execution of the application. The codebase employs `console.log` for various purposes, including:
- Debugging: to inspect variable values and understand the flow of the program
- Informational messages: to provide feedback to the user or developer about the application's state
- Error handling: to log error messages and exceptions

## Key Rules

### ✅ DO

- ✅ **Use `console.log` for logging messages**
  ```typescript
  console.log('Message to be logged');
  ```
- ✅ **Use template literals for formatting log messages**
  ```typescript
  const name = 'John';
  console.log(`Hello, ${name}!`);
  ```
- ✅ **Log errors and exceptions**
  ```typescript
  try {
    // Code that might throw an error
  } catch (error) {
    console.error('Error occurred:', error);
  }
  ```

### ❌ NEVER

- ❌ **Do not use `console.log` for sensitive information**
  ```typescript
  // ❌ Bad practice: logging sensitive data
  const password = 'secret';
  console.log(`Password: ${password}`);
  // ✅ Good practice: avoid logging sensitive information
  ```

## Complete Example

Here's an example of how console logging is used in the codebase:
```typescript
// From src/core/workflows/guidelines-update.ts
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
    // ...
    console.log(`[INFO] Found ${existingMetadata.length} existing guidelines with metadata`);
    // ...
  } catch (error) {
    console.error('Error occurred:', error);
    // ...
  }
}
```
In this example, `console.log` is used to log an informational message, and `console.error` is used to log an error message.