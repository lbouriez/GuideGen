# Backend - Service Naming Convention

> This guideline documents the naming convention for services in the backend codebase.
> 
> The service naming convention is crucial for maintaining consistency and readability throughout the codebase.

---

## When to Use This Guide

Use this guide when:
- Creating a new service class in the backend codebase
- Refactoring existing service classes to follow the established naming convention

---

## Overview

The backend codebase uses a specific naming convention for service classes. This convention is essential for maintaining consistency and readability throughout the codebase. The naming convention is based on the type of service and its purpose.

The service classes in the backend codebase are named using PascalCase with a suffix indicating the type of service. For example, `GuidelineFileService` is a service class that handles file operations for guidelines.

### Service Class Naming Convention

The service class naming convention is as follows:

* Use PascalCase for the class name
* Include a suffix indicating the type of service (e.g., `Service`, `Manager`, `Repository`)

### Examples

```typescript
// From src\core\workflows\services\guideline-file-service.ts
export class GuidelineFileService {
  // ...
}
```

```typescript
// From src\services\rate-limiter.ts
@injectable()
export class RateLimiter implements IRateLimiter {
  // ...
}
```

### Interface Naming Convention

The interface naming convention for services is as follows:

* Use PascalCase for the interface name
* Include a suffix indicating the type of interface (e.g., `IFileService`, `IRateLimiter`)

### Examples

```typescript
// From src\interfaces\services\IFileService.ts
export interface IFileService {
  // ...
}
```

```typescript
// From src\interfaces\services\IProviderService.js
export interface IRateLimiter {
  // ...
}
```

---

## Key Rules

### ✅ DO

- ✅ **Use PascalCase for service class names**
  ```typescript
  // Good example
  export class GuidelineFileService {
    // ...
  }
  ```
- ✅ **Include a suffix indicating the type of service**
  ```typescript
  // Good example
  export class RateLimiter implements IRateLimiter {
    // ...
  }
  ```
- ✅ **Use PascalCase for interface names**
  ```typescript
  // Good example
  export interface IFileService {
    // ...
  }
  ```

### ❌ NEVER

- ❌ **Use camelCase for service class names**
  ```typescript
  // Bad example
  export class guidelineFileService {
    // ...
  }
  ```
- ❌ **Omit the suffix indicating the type of service**
  ```typescript
  // Bad example
  export class RateLimiter {
    // ...
  }
  ```
- ❌ **Use camelCase for interface names**
  ```typescript
  // Bad example
  export interface iFileService {
    // ...
  }
  ```

---

## Complete Example

The `GuidelineFileService` class is an example of a service class that follows the naming convention:
```typescript
// From src\core\workflows\services\guideline-file-service.ts
export class GuidelineFileService {
  /**
   * Check if .guidelines folder exists
   */
  exists(targetPath: string): boolean {
    return fs.existsSync(path.join(targetPath, '.guidelines'));
  }

  /**
   * Delete all guidelines (for override mode)
   */
  deleteAll(targetPath: string): void {
    const guidelinesPath = path.join(targetPath, '.guidelines');
    if (fs.existsSync(guidelinesPath)) {
      fs.rmSync(guidelinesPath, { recursive: true, force: true });
    }
  }

  // ...
}
```
This class follows the naming convention by using PascalCase and including a suffix indicating the type of service (`Service`).