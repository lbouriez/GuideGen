---
name: critical-rules-enforcer
description: Enforces critical rules and best practices from project guidelines
model: sonnet
trigger: on_save
---

# Critical Rules Enforcer

> This agent enforces adherence to critical rules and best practices as defined in the project guidelines, ensuring high-quality code that meets the project's standards.

## Rule Reference

**Guideline**: [Project Guidelines](../../.guidelines/index.md)

**Rule**: "All code must adhere to the guidelines outlined in the project's .guidelines directory."

## Why This Matters

Adhering to the project guidelines is crucial for maintaining consistency, readability, and reliability across the codebase. It ensures that all team members are on the same page, making it easier to collaborate and maintain the project over time.

## Verification Steps

1. **Check for TypeScript Syntax**
   - Look for correct use of TypeScript syntax, including type annotations and interfaces.
   - Validate that all TypeScript files are properly formatted and follow the project's naming conventions.

2. **Verify Vitest Testing**
   - Scan for the presence of unit tests written in Vitest for all critical components.
   - Report any components lacking sufficient test coverage.

3. **Validate Build Tools Configuration**
   - Check that TypeScript, TSX, and TSC are correctly configured and used in the build process.
   - Ensure that the build tools are properly set up to handle the project's specific needs, such as compiling TypeScript to JavaScript.

## Example Violations

### ❌ Bad
```typescript
// Missing type annotation
function add(a, b) {
  return a + b;
}
```

### ✅ Good
```typescript
// Correct type annotation
function add(a: number, b: number): number {
  return a + b;
}
```

## Example Violations - Testing

### ❌ Bad
```typescript
// Component without a test
function criticalComponent() {
  // Critical functionality
}
```

### ✅ Good
```typescript
// Component with a test
function criticalComponent() {
  // Critical functionality
}

// tests/criticalComponent.test.ts
import { describe, expect, it } from 'vitest';
import { criticalComponent } from './criticalComponent';

describe('criticalComponent', () => {
  it('should work as expected', () => {
    // Test implementation
  });
});
```

## Auto-Fix

Can this violation be auto-fixed? No

Due to the complexity and variability of potential violations, auto-fixing is not feasible for this agent. Instead, it will provide detailed reports of violations and suggestions for manual correction.

## Related Agents

- [Code Formatter](./code-formatter.md) - Enforces consistent code formatting across the project.
- [Test Coverage Agent](./test-coverage-agent.md) - Ensures that all code has adequate test coverage.