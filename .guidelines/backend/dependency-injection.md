# Backend - Dependency Injection

> **Summary**: This guideline documents the existing dependency injection patterns in the backend codebase, focusing on the use of Inversify for managing services and providers.
> 
> The codebase utilizes Inversify, a lightweight inversion of control (IoC) container for TypeScript and JavaScript, to manage dependencies between services and providers. This guideline will explore how services are registered, retrieved, and used throughout the application.

---

## When to Use This Guide

Use this guide when:
- Implementing new services or providers in the backend codebase.
- Integrating existing services or providers with the dependency injection container.
- Troubleshooting issues related to service registration or retrieval.

---

## Overview

The backend codebase employs Inversify for dependency injection, which enables loose coupling between services and providers. This approach facilitates easier testing, maintenance, and extension of the application. The `createContainer` function in `src\di\container.ts` is responsible for setting up the Inversify container, registering services, and providing a global instance for accessing services.

### Service Registration

Services are registered in the container using the `bind` method, specifying the service identifier, implementation, and scope. For example:
```typescript
container.bind<IRateLimiter>(TYPES.IRateLimiter).to(RateLimiter).inSingletonScope();
```
This registers the `RateLimiter` service as a singleton instance, bound to the `TYPES.IRateLimiter` identifier.

### Service Retrieval

Services can be retrieved from the container using the `get` method, passing the service identifier. For instance:
```typescript
const rateLimiter = container.get<IRateLimiter>(TYPES.IRateLimiter);
```
This retrieves the registered `RateLimiter` service instance from the container.

### Provider Services

Provider services, such as `ProviderManager` and `ProviderConfigManager`, are also registered in the container and can be retrieved using their respective identifiers.

### Claude Artifacts Services

Claude artifacts services, including `ArtifactFileManager`, `SkillGeneratorService`, and `AgentGeneratorService`, are registered and can be used to generate Claude artifacts.

---

## Key Rules

### ✅ DO

- **Register services in the container**: Use the `bind` method to register services, specifying the service identifier, implementation, and scope.
  ```typescript
container.bind<IRateLimiter>(TYPES.IRateLimiter).to(RateLimiter).inSingletonScope();
```
- **Retrieve services from the container**: Use the `get` method to retrieve registered services, passing the service identifier.
  ```typescript
const rateLimiter = container.get<IRateLimiter>(TYPES.IRateLimiter);
```

### ❌ NEVER

- **Do not use `new` keyword for services**: Avoid instantiating services directly using the `new` keyword. Instead, register and retrieve services through the container.
  ```typescript
// ❌ Bad
const rateLimiter = new RateLimiter();

// ✅ Good
const rateLimiter = container.get<IRateLimiter>(TYPES.IRateLimiter);
```

---

## Complete Example

The following example demonstrates how to register and retrieve services using the Inversify container:
```typescript
// Register services in the container
container.bind<IRateLimiter>(TYPES.IRateLimiter).to(RateLimiter).inSingletonScope();
container.bind<IInputValidator>(TYPES.IInputValidator).to(InputValidator).inSingletonScope();

// Retrieve services from the container
const rateLimiter = container.get<IRateLimiter>(TYPES.IRateLimiter);
const inputValidator = container.get<IInputValidator>(TYPES.IInputValidator);

// Use the retrieved services
rateLimiter.limit();
inputValidator.validate();
```
This example showcases the registration of `RateLimiter` and `InputValidator` services, followed by their retrieval and usage.