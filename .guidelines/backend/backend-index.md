# Backend Guidelines

> Overview of backend development guidelines for this project, focusing on best practices for dependency management, error handling, and code organization.

## Quick Reference

Critical rules for backend development:

- ✅ **Use the `@injectable` decorator on all service classes**
- ✅ **Separate concerns into distinct layers**: Use separate classes or modules for each layer, such as data access, business logic, and presentation.
- ❌ **Do not use the `new` keyword to create service instances**
- ✅ **Use the `@inject` decorator to inject services**
- ❌ **Mix concerns in a single layer**: Avoid mixing data access, business logic, and presentation concerns in a single class or module.

## Guidelines

- **[Dependency Injection](./dependency-injection.md)** - Guidelines for managing dependencies between services and classes using dependency injection.
- **[Error Handling](./error-handling.md)** - Best practices for handling and logging errors in the backend codebase.
- **[Layer Separation Pattern](./layer-separation-pattern.md)** - Principles for separating concerns into distinct layers, such as data access, business logic, and presentation.
- **[Logging Pattern](./logging-pattern.md)** - Standards for logging events and errors in the backend application.

## Related Indexes

- [Root Index](../index.md) - Main project guidelines index
- [All Index](../all/all-index.md) - All guidelines