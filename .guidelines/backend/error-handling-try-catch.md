# Backend - Error Handling Try-Catch

> **1-2 sentence summary**: The codebase utilizes try-catch blocks for error handling in various workflows, including the `runGuidelinesWorkflow` and `runClaudeArtifactsWorkflow` functions. These blocks ensure that errors are caught and handled properly, providing informative error messages and preventing the application from crashing unexpectedly.

## When to Use This Guide

Use this guide when:
- Implementing error handling in backend workflows
- Using try-catch blocks to catch and handle errors
- Needing to provide informative error messages

## Overview

Error handling is a crucial aspect of backend development, and the codebase employs try-catch blocks to handle errors in various workflows. The `runGuidelinesWorkflow` and `runClaudeArtifactsWorkflow` functions are examples of this, where try-catch blocks are used to catch and handle errors that may occur during the execution of these workflows.

## Key Rules

### ✅ DO

- ✅ **Use try-catch blocks to handle errors**: The codebase uses try-catch blocks to catch and handle errors in various workflows, ensuring that the application does not crash unexpectedly.
  ```typescript
  try {
    // Code that may throw an error
  } catch (error) {
    // Handle the error
  }
  ```
- ✅ **Provide informative error messages**: The codebase provides informative error messages to help with debugging and error handling.
  ```typescript
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  ```

### ❌ NEVER

- ❌ **Do not use generic error handling**: The codebase does not use generic error handling, instead opting for specific error handling mechanisms.
  ```typescript
  // ❌ Bad example
  try {
    // Code that may throw an error
  } catch (error) {
    console.error(error);
  }
  ```
- ❌ **Do not ignore errors**: The codebase does not ignore errors, instead handling them properly to prevent unexpected behavior.
  ```typescript
  // ❌ Bad example
  try {
    // Code that may throw an error
  } catch (error) {
    // Ignore the error
  }
  ```

## Complete Example

The `runGuidelinesWorkflow` function is an example of how try-catch blocks are used to handle errors in the codebase:
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
    // Code that may throw an error
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```
This example demonstrates how try-catch blocks are used to catch and handle errors, providing informative error messages and preventing the application from crashing unexpectedly.