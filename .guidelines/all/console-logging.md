# all - console-logging

> **Summary**: This guideline documents the existing console logging patterns in the codebase. It provides examples of how console logging is used in different contexts.
> 
> The codebase uses `console.log` for logging purposes. This guideline will explore the various ways `console.log` is utilized throughout the code.

---

## When to Use This Guide

Use this guide when:
- You need to understand how console logging is implemented in the codebase.
- You want to know the best practices for logging in the project.

---

## Overview

The codebase uses `console.log` for logging purposes. This is evident in the provided code examples, where `console.log` is used to print messages to the console.

For example, in the `GuidelineFileService` class, `console.log` is used to print a success message after writing guidelines to disk:
```typescript
printSuccess(`\n✓ Guidelines created: ${guidelines.length} files`);
```
Similarly, in the `runClaudeArtifactsWorkflow` function, `console.log` is used to print a message indicating the number of skills and agents generated:
```typescript
console.log(`Generated ${result.skillsGenerated} skills and ${result.agentsGenerated} agents`);
```
These examples demonstrate how `console.log` is used in different contexts to provide feedback to the user.

## Key Rules

### ✅ DO

- ✅ **Use `console.log` for logging purposes**:
  ```typescript
  console.log(`Generated ${result.skillsGenerated} skills and ${result.agentsGenerated} agents`);
  ```

### ❌ NEVER

- ❌ **Do not use other logging libraries or frameworks**:
  ```typescript
  // ❌ Bad
  // import winston from 'winston';
  // winston.log('info', 'Message');
  // ✅ Good
  console.log('Message');
  ```

---

## Complete Example

The `runClaudeArtifactsWorkflow` function provides a complete example of how console logging is used in the codebase:
```typescript
export async function runClaudeArtifactsWorkflow(
  client: IProviderClient,
  targetPath: string,
  techProfile: TechProfile,
  workflow: ClaudeArtifactsWorkflow,
  interactive: boolean = true,
  onProgress?: (message: string) => void
): Promise<ClaudeArtifactsWorkflowResult> {
  // ...
  console.log(`Generated ${result.skillsGenerated} skills and ${result.agentsGenerated} agents`);
  // ...
}
```
This example demonstrates how `console.log` is used to provide feedback to the user after generating Claude artifacts.