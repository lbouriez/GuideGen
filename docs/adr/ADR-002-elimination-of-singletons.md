# ADR-002: Elimination of Singleton Pattern

**Status:** Accepted

**Date:** 2026-01-22

## Context

The codebase contained multiple singleton anti-patterns:

1. **`globalFileSystem`** (RealFileSystem): Global instance created at module load
2. **`ProviderManager.getInstance()`**: Singleton with static instance management
3. **`ToolRegistry.getInstance()`**: Singleton managing tool registration

### Problems with Singletons

1. **Hidden dependencies**: Classes accessing `globalFileSystem` didn't declare the dependency
2. **Testing difficulty**: Hard to inject mocks, singletons persist across tests
3. **Tight coupling**: Direct references to global state throughout codebase
4. **Initialization order**: Module load order affected singleton availability
5. **Thread safety**: Potential issues in concurrent scenarios (less relevant for Node.js)
6. **Violation of SRP**: Singletons manage both business logic and lifecycle

### Example of the Problem

```typescript
// Old code - hidden dependency
import { globalFileSystem } from '../io/filesystem';

class SomeService {
  async readFile(path: string) {
    return globalFileSystem.readFile(path); // Hidden dependency!
  }
}

// Hard to test - can't inject mock
const service = new SomeService(); // What dependencies does it need?
```

## Decision

**Eliminate all singleton patterns** in favor of dependency injection through InversifyJS container.

### Migration Strategy

#### 1. Convert Singletons to Injectable Services

**Before:**
```typescript
export class RealFileSystem {
  private static instance: RealFileSystem;

  static getInstance(): RealFileSystem {
    if (!this.instance) {
      this.instance = new RealFileSystem();
    }
    return this.instance;
  }
}

export const globalFileSystem = RealFileSystem.getInstance();
```

**After:**
```typescript
@injectable()
export class RealFileSystem implements IFileSystem {
  constructor() {}

  async readFile(path: string): Promise<string> {
    // Implementation
  }
}

// In container.ts
container.bind<IFileSystem>(TYPES.IFileSystem)
  .to(RealFileSystem)
  .inSingletonScope();
```

#### 2. Explicit Dependency Declaration

**Before:**
```typescript
class WorkflowOrchestrator {
  async run() {
    const fs = globalFileSystem; // Hidden!
    await fs.readFile('...');
  }
}
```

**After:**
```typescript
@injectable()
class WorkflowOrchestrator {
  constructor(
    @inject(TYPES.IFileSystem) private fs: IFileSystem
  ) {}

  async run() {
    await this.fs.readFile('...'); // Explicit dependency!
  }
}
```

#### 3. Test-Friendly Mocking

**Before:**
```typescript
// Test - hard to mock globalFileSystem
it('should read file', async () => {
  // globalFileSystem is already initialized globally!
  // Can't easily inject mock
});
```

**After:**
```typescript
// Test - easy to mock through DI
it('should read file', async () => {
  const mockFs = { readFile: vi.fn() };
  container.rebind(TYPES.IFileSystem).toConstantValue(mockFs);

  const orchestrator = container.get(WorkflowOrchestrator);
  // Clean, mockable test
});
```

## Consequences

### Positive

- **Explicit dependencies**: Constructor injection makes all dependencies visible
- **Testability**: Easy to inject mocks in unit tests
- **Loose coupling**: Components depend on interfaces, not concrete singletons
- **Lifecycle control**: Container manages instance creation and scope
- **No global state**: Reduced global namespace pollution
- **Module independence**: No module load order dependencies

### Negative

- **Migration effort**: Required refactoring across ~15 files
- **More verbose**: Constructor injection adds boilerplate
- **Container dependency**: All instantiation must go through container

### Neutral

- **Singleton behavior preserved**: Using `.inSingletonScope()` maintains single instance behavior
- **Performance**: Negligible overhead from container resolution

## Migration Results

### Singleton Elimination Checklist

- [x] **RealFileSystem / globalFileSystem**: Converted to injectable, bound in DI container
- [x] **ProviderManager**: Converted to injectable, removed `getInstance()` static method
- [x] **ToolRegistry**: Converted to injectable, removed `getInstance()` static method
- [x] All direct references updated to use DI container
- [x] Tests updated to use container-based mocking

### Architecture Score Impact

- **Before**: 7.0/10 (2 singleton anti-patterns, hidden dependencies)
- **After**: 8.5/10 (0 singletons, explicit dependencies, better testability)

## Alternatives Considered

### 1. Keep Singletons, Add Factory Methods
**Pros:** Minimal changes, backward compatible
**Cons:** Doesn't solve core testability and coupling issues
**Rejected because:** Doesn't address root cause of problems

### 2. Module Exports Instead of Singletons
**Pros:** Simple, no framework needed
**Cons:** Still global state, still hard to mock
**Rejected because:** Doesn't improve testability significantly

### 3. Service Locator Pattern
**Pros:** Central registry, runtime resolution
**Cons:** Hidden dependencies (same problem as singletons)
**Rejected because:** Anti-pattern that doesn't solve coupling issues

## Implementation Notes

### Container Configuration

All services configured in `src/di/container.ts`:

```typescript
// File System Services
container.bind<IFileSystem>(TYPES.IFileSystem)
  .to(RealFileSystem)
  .inSingletonScope();

// Provider Services
container.bind<ProviderManager>(TYPES.IProviderManager)
  .to(ProviderManager)
  .inSingletonScope();

// Tool Registry
container.bind<IToolRegistry>(TYPES.IToolRegistry)
  .to(ToolRegistry)
  .inSingletonScope();
```

### Backward Compatibility

For legacy code that can't be immediately updated:

```typescript
// Temporary bridge for gradual migration
export function getFileSystem(): IFileSystem {
  return container.get<IFileSystem>(TYPES.IFileSystem);
}
```

## Related Decisions

- [ADR-001: Dependency Injection with InversifyJS](ADR-001-dependency-injection.md)
- [ADR-003: Service Layer Architecture](ADR-003-service-layer-architecture.md)

## References

- [Singleton Pattern Criticism](https://stackoverflow.com/questions/137975/what-are-drawbacks-or-disadvantages-of-singleton-pattern)
- [Why Singletons are Bad for Testing](https://testing.googleblog.com/2008/08/root-cause-of-singletons.html)
- [Martin Fowler on Singleton](https://martinfowler.com/bliki/Singleton.html)
