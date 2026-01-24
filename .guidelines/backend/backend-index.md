# Backend Guidelines

> Overview of backend development guidelines for this project, focusing on best practices for error handling, dependency injection, and layer separation.

## Quick Reference

Critical rules for backend development:

- ✅ **Extend the base `Error` class**: When creating a custom error class, extend the base `Error` class to inherit its properties and methods.
- ✅ **Use try-catch blocks to handle errors**: The codebase uses try-catch blocks to catch and handle errors in various workflows, ensuring that the application does not crash unexpectedly.
- ❌ **Do not use generic error messages**: Avoid using generic error messages that do not provide any context about the error.
- ✅ **Provide informative error messages**: The codebase provides informative error messages to help with debugging and error handling.
- ✅ **Provide additional properties**: Include additional properties in the custom error class to provide more context about the error.

## Guidelines

- **[Custom Error Classes](./custom-error-classes.md)** - Guidelines for creating custom error classes, including extending the base `Error` class and providing additional properties.
- **[Dependency Injection](./dependency-injection.md)** - Best practices for implementing dependency injection in the backend codebase.
- **[Error Handling Try Catch](./error-handling-try-catch.md)** - Guidelines for using try-catch blocks to handle errors and exceptions in the backend codebase.
- **[Layer Separation Core Phases](./layer-separation-core-phases.md)** - Principles for separating the backend codebase into distinct layers and phases.
- **[Service Naming Convention](./service-naming-convention.md)** - Naming conventions for services in the backend codebase.

## Related Indexes

- [Root Index](../index.md) - Main project guidelines index
- [All Index](../all/all-index.md) - All guidelines