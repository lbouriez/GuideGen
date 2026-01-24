---
name: code-quality-review
description: During code review or before committing significant changes
---

# TypeScript Code Quality and Best Practices Review

## When to Use
During code review or before committing significant changes, especially when:
* Adding new features
* Refactoring existing code
* Merging significant pull requests
* Preparing for a major release

## Code Quality Checklist

### Complexity & Maintainability
**Guideline**: all/typescript-imports.md

**Check for**:
- [ ] Functions have fewer than 50 lines of code
- [ ] Cyclomatic complexity is less than 10
- [ ] Modules have a single, well-defined responsibility

**Examples**:
❌ BAD:
```typescript
function processData(data: any) {
  if (data.type === 'user') {
    // 20 lines of user-specific logic
  } else if (data.type === 'product') {
    // 30 lines of product-specific logic
  }
  // ...
}
```
✅ GOOD:
```typescript
function processUserData(data: User) {
  // 10 lines of user-specific logic
}

function processProductData(data: Product) {
  // 10 lines of product-specific logic
}
```
**Why It Matters**: Simple, focused functions are easier to understand, test, and maintain. High cyclomatic complexity can lead to bugs and make code harder to reason about.

### Type Safety
**Guideline**: all/typescript-imports.md

**Check for**:
- [ ] Types are explicitly defined for function parameters and return types
- [ ] Type guards are used to narrow types in conditional statements
- [ ] Interfaces are used to define complex data structures

**Examples**:
❌ BAD:
```typescript
function greet(name: any) {
  console.log(`Hello, ${name}!`);
}
```
✅ GOOD:
```typescript
interface User {
  name: string;
}

function greet(user: User) {
  console.log(`Hello, ${user.name}!`);
}
```
**Why It Matters**: Strong type safety helps catch errors at compile-time, reducing the likelihood of runtime errors and making code more maintainable.

### Error Handling
**Guideline**: backend/error-handling.md

**Check for**:
- [ ] Custom error classes are used to handle specific error cases
- [ ] Errors are properly propagated and handled in async functions
- [ ] Error messages are descriptive and helpful for debugging

**Examples**:
❌ BAD:
```typescript
async function fetchData() {
  try {
    const data = await fetch('https://example.com/data');
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}
```
✅ GOOD:
```typescript
class FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

async function fetchData() {
  try {
    const data = await fetch('https://example.com/data');
    return data;
  } catch (error) {
    throw new FetchError('Failed to fetch data');
  }
}
```
**Why It Matters**: Proper error handling helps ensure that errors are caught and handled in a way that is consistent with the application's requirements, making it easier to debug and maintain.

### Layer Separation
**Guideline**: backend/layer-separation-pattern.md

**Check for**:
- [ ] Data access, business logic, and presentation concerns are separated into distinct layers
- [ ] Each layer has a single, well-defined responsibility
- [ ] Dependencies between layers are minimized

**Examples**:
❌ BAD:
```typescript
// UserComponent.tsx
import axios from 'axios';

function UserComponent() {
  const [user, setUser] = useState({});

  useEffect(() => {
    axios.get('https://example.com/user')
      .then(response => {
        setUser(response.data);
      })
      .catch(error => {
        console.error('Error fetching user:', error);
      });
  }, []);

  return <div>Hello, {user.name}!</div>;
}
```
✅ GOOD:
```typescript
// UserService.ts
import axios from 'axios';

class UserService {
  async getUser() {
    const response = await axios.get('https://example.com/user');
    return response.data;
  }
}

// UserComponent.tsx
import { UserService } from './UserService';

function UserComponent() {
  const [user, setUser] = useState({});

  useEffect(() => {
    const userService = new UserService();
    userService.getUser()
      .then(user => {
        setUser(user);
      })
      .catch(error => {
        console.error('Error fetching user:', error);
      });
  }, []);

  return <div>Hello, {user.name}!</div>;
}
```
**Why It Matters**: Separating concerns into distinct layers makes it easier to maintain, test, and scale the application, as each layer can be modified or replaced independently.

## Common Code Smells
- God objects (classes with too many responsibilities)
- Long methods (functions with too many lines of code)
- Primitive obsession (using primitive types instead of custom types)

## Automated Tools
These tools already catch many issues automatically:
No linters/formatters detected.

Focus manual review on issues tools can't catch:
- Business logic correctness
- Architectural concerns
- Performance optimization

## Resources
- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- [Vitest documentation](https://vitest.dev/)
- [Layer separation pattern](https://en.wikipedia.org/wiki/Layered_architecture)