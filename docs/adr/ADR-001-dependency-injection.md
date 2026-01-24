# ADR-001: Dependency Injection with InversifyJS

**Status:** Accepted

**Date:** 2026-01-22

## Context

The codebase initially used direct instantiation and singleton patterns for service management, leading to:
- Tight coupling between components
- Difficulty in unit testing (hard to mock dependencies)
- Hidden dependencies (unclear what a class needs)
- Singleton anti-patterns throughout the codebase

We needed a robust dependency injection (DI) solution that:
- Supports TypeScript decorators
- Provides compile-time type safety
- Allows easy service registration and retrieval
- Enables constructor injection for clear dependencies
- Facilitates testing through easy mocking

## Decision

We adopted **InversifyJS** as our dependency injection container framework.

### Why InversifyJS?

1. **TypeScript-first**: Built specifically for TypeScript with full type safety
2. **Decorator support**: Uses `@injectable()` and `@inject()` decorators matching our codebase style
3. **Mature & stable**: Production-ready with active maintenance
4. **Minimal overhead**: Lightweight container with excellent performance
5. **IoC container**: Proper inversion of control pattern implementation

### Implementation Structure

```typescript
// Service definition with decorator
@injectable()
export class RateLimiter implements IRateLimiter {
  constructor(
    @inject(TYPES.ILogger) private logger: ILogger
  ) {}
}

// Container configuration
const container = new Container();
container.bind<IRateLimiter>(TYPES.IRateLimiter)
  .to(RateLimiter)
  .inSingletonScope();

// Service retrieval
const rateLimiter = container.get<IRateLimiter>(TYPES.IRateLimiter);
```

### Key Components

1. **Container** (`src/di/container.ts`): Centralized service registration
2. **Identifiers** (`src/di/identifiers.ts`): Symbol-based type-safe service identifiers
3. **Injectable services**: All services marked with `@injectable()` decorator
4. **Interface-based contracts**: Services implement interfaces for abstraction

## Consequences

### Positive

- **Testability**: Easy to inject mock implementations in tests
- **Loose coupling**: Components depend on interfaces, not concrete implementations
- **Explicit dependencies**: Constructor injection makes dependencies visible
- **Single responsibility**: Services have clear, focused purposes
- **Lifecycle management**: Container manages singleton scope automatically
- **Type safety**: Compile-time validation of dependency types

### Negative

- **Learning curve**: Team needs to understand DI patterns and InversifyJS
- **Boilerplate**: Requires decorator annotations and container configuration
- **Reflection requirement**: Needs `reflect-metadata` polyfill
- **Build-time dependency**: Requires TypeScript decorator support

### Neutral

- **Migration effort**: Existing code needed refactoring to adopt DI pattern
- **Container overhead**: Minimal runtime cost for service resolution
- **Testing approach**: Tests now mock at container level, not instance level

## Alternatives Considered

### 1. Manual Dependency Injection (Constructor Injection)
**Pros:** No framework dependency, simple to understand
**Cons:** No centralized container, manual lifetime management, verbose composition roots
**Rejected because:** Doesn't scale well for complex dependency graphs

### 2. TSyringe
**Pros:** Smaller bundle size, simpler API
**Cons:** Less mature, fewer features, less active maintenance
**Rejected because:** InversifyJS has better TypeScript integration and community support

### 3. NestJS DI
**Pros:** Rich ecosystem, extensive features
**Cons:** Full framework lock-in, heavyweight for our use case
**Rejected because:** Too opinionated and heavyweight for a CLI tool

### 4. Custom DI Implementation
**Pros:** Full control, no external dependencies
**Cons:** Significant maintenance burden, likely to have bugs
**Rejected because:** Reinventing the wheel, InversifyJS is battle-tested

## Related Decisions

- [ADR-002: Elimination of Singleton Pattern](ADR-002-elimination-of-singletons.md)
- [ADR-003: Service Layer Architecture](ADR-003-service-layer-architecture.md)

## References

- [InversifyJS Documentation](https://inversify.io/)
- [SOLID Principles: Dependency Inversion](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- [Martin Fowler on Inversion of Control](https://martinfowler.com/articles/injection.html)
