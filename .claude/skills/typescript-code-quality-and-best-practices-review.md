---
name: code-quality-review
description: During code review or before committing significant changes
---

# TypeScript Code Quality and Best Practices Review

## When to Use
During code review or before committing significant changes, especially when:
- Adding new features
- Refactoring existing code
- Merging significant pull requests
- Preparing for a major release

## Code Quality Checklist

### Complexity & Maintainability
**Guideline**: Refer to `all/typescript-imports.md` for import organization

**Check for**:
- [ ] Functions have fewer than 50 lines of code
- [ ] Cyclomatic complexity is less than 10
- [ ] Code is modular, with each module having a single responsibility

**Examples**:
❌ BAD:
```typescript
function processData(data: any) {
  // 100 lines of complex logic
}
```
✅ GOOD:
```typescript
function processData(data: any) {
  const validatedData = validateData(data);
  const transformedData = transformData(validatedData);
  return transformedData;
}

function validateData(data: any) {
  // validation logic
}

function transformData(data: any) {
  // transformation logic
}
```
**Why It Matters**: Simple, modular code is easier to understand, test, and maintain, reducing the likelihood of bugs and improving overall code quality.

### Type Safety
**Guideline**: Refer to `all/typescript-imports.md` for type import best practices

**Check for**:
- [ ] All variables, function parameters, and return types are explicitly typed
- [ ] Type guards are used to narrow types in conditional statements
- [ ] Type inference is used where possible to reduce explicit type annotations

**Examples**:
❌ BAD:
```typescript
function add(a, b) {
  return a + b;
}
```
✅ GOOD:
```typescript
function add(a: number, b: number): number {
  return a + b;
}
```
**Why It Matters**: Explicit types help catch type-related errors at compile-time, preventing runtime errors and making the code more maintainable.

### Error Handling
**Guideline**: Refer to `backend/custom-error-classes.md` and `backend/error-handling-try-catch.md`

**Check for**:
- [ ] Custom error classes are used to provide context about errors
- [ ] Try-catch blocks are used to handle errors and provide meaningful error messages
- [ ] Error messages are specific and provide enough information for debugging

**Examples**:
❌ BAD:
```typescript
try {
  // code that might throw an error
} catch (error) {
  console.error('An error occurred');
}
```
✅ GOOD:
```typescript
try {
  // code that might throw an error
} catch (error) {
  if (error instanceof CustomError) {
    console.error(`Custom error: ${error.message}`);
  } else {
    console.error(`Unknown error: ${error.message}`);
  }
}
```
**Why It Matters**: Proper error handling helps diagnose and fix issues quickly, improving the overall reliability and user experience of the application.

### Testing
**Guideline**: Refer to `all/test-organization-vitest.md` and `all/vitest-testing.md`

**Check for**:
- [ ] Tests are organized and follow a consistent naming convention
- [ ] Each test has a clear and descriptive name
- [ ] Tests cover different scenarios and edge cases

**Examples**:
❌ BAD:
```typescript
test('it works', () => {
  // test code
});
```
✅ GOOD:
```typescript
test('should return success when input is valid', () => {
  // test code
});

test('should return error when input is invalid', () => {
  // test code
});
```
**Why It Matters**: Well-organized and descriptive tests make it easier to understand the code's behavior, identify issues, and maintain the test suite.

## Common Code Smells
- Deeply nested conditional statements
- Long functions with multiple responsibilities
- Unused or redundant code

## Automated Tools
These tools already catch many issues automatically:
No linters/formatters detected.

Focus manual review on issues tools can't catch:
- Business logic correctness
- Architectural concerns
- Performance optimization opportunities

## Resources
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- [Vitest documentation](https://vitest.dev/)
- [Best practices for TypeScript and Vitest](https://github.com/microsoft/TypeScript/wiki/Best-Practices)