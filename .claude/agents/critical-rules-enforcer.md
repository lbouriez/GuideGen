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

**Rule**: "All code must adhere to the guidelines outlined in the project's .guidelines directory, including but not limited to, syntax, naming conventions, and best practices for TypeScript, Vitest, and TypeScript build tools."

## Why This Matters

Adhering to the project guidelines is crucial for maintaining consistency, readability, and reliability across the codebase. It ensures that all team members are on the same page, making it easier to collaborate, review, and maintain the code.

## Verification Steps

1. **Syntax and Naming Conventions Check**
   - Scan TypeScript files for adherence to the project's naming conventions and syntax guidelines.
   - Validate that all variables, functions, and classes are named according to the guidelines.

2. **Testing Framework Compliance**
   - Verify that all tests are written using Vitest and follow the testing guidelines outlined in the project guidelines.
   - Check that tests cover all critical paths and functionalities.

3. **Build Tools Configuration**
   - Ensure that TypeScript, TSX, and TSC are configured correctly according to the project guidelines.
   - Validate that the build process follows the outlined best practices.

## Example Violations

### ❌ Bad
```typescript
// Violation of naming convention
let myVariable = 'example';

// Incorrect test structure
test('example test', () => {
  // Test implementation
});
```

### ✅ Good
```typescript
// Adherence to naming convention
let myVariableName = 'example';

// Correct test structure using Vitest
it('should pass example test', () => {
  // Test implementation
});
```

## Auto-Fix

Can this violation be auto-fixed? Yes

If yes, describe the transformation:
- Rename variables to follow the naming convention guidelines.
- Update test structures to comply with Vitest and the project's testing guidelines.

## Related Agents

- [Code Formatter](./code-formatter.md) - Enforces consistent code formatting across the project.
- [Test Coverage Agent](./test-coverage-agent.md) - Ensures that all code paths are adequately covered by tests.