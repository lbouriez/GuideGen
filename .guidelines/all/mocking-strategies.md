---
title: Mocking Strategies in Vitest
description: Patterns for mocking dependencies in Vitest tests
---

# Mocking Dependencies - Vitest

> Vitest provides a robust mocking system to isolate dependencies in unit tests.
> This guideline documents the existing mocking strategies used in the codebase.

Mocking is essential for writing efficient and reliable unit tests. By isolating dependencies, you can focus on testing the specific functionality of a module without worrying about the complexities of its dependencies.

## When to Use This Guide

Use this guide when:
- Writing unit tests for modules with external dependencies
- Isolating dependencies to improve test reliability and performance
- Using Vitest as the testing framework

## Overview

The codebase utilizes Vitest for unit testing, which includes a built-in mocking system. This system allows for mocking dependencies using `vi.mock()` and `vi.fn()`.

### Mocking Modules

To mock a module, use `vi.mock()` and specify the module path. For example:
```typescript
// src/services/GuidelineFileService.ts
import { GuidelineFileService } from './GuidelineFileService';

// src/tests/GuidelineFileService.test.ts
import { vi, expect } from 'vitest';
import { GuidelineFileService } from './GuidelineFileService';

vi.mock('./GuidelineFileService');

describe('GuidelineFileService', () => {
  it('should write guidelines to disk', async () => {
    const service = new GuidelineFileService();
    await service.writeAll([]);
    expect(service.write).toHaveBeenCalledTimes(1);
  });
});
```

### Mocking Functions

To mock a function, use `vi.fn()` and specify the function implementation. For example:
```typescript
// src/utils/file-io.ts
export function readFileSafe(path: string): Promise<string | null> {
  // implementation
}

// src/tests/file-io.test.ts
import { vi, expect } from 'vitest';
import { readFileSafe } from './file-io';

vi.fn(readFileSafe).mockImplementation(() => Promise.resolve('mocked content'));

describe('readFileSafe', () => {
  it('should return mocked content', async () => {
    const content = await readFileSafe('path/to/file');
    expect(content).toBe('mocked content');
  });
});
```

## Key Rules

### ✅ DO

- ✅ **Use `vi.mock()` to mock modules**: Isolate dependencies by mocking entire modules.
  ```typescript
  vi.mock('./GuidelineFileService');
  ```
- ✅ **Use `vi.fn()` to mock functions**: Mock specific functions to control their behavior.
  ```typescript
  vi.fn(readFileSafe).mockImplementation(() => Promise.resolve('mocked content'));
  ```

### ❌ NEVER

- ❌ **Do not use `jest.mock()`**: Vitest has its own mocking system, so avoid using Jest's mocking functions.
  ```typescript
  // ❌ Bad
  jest.mock('./GuidelineFileService');
  // ✅ Good
  vi.mock('./GuidelineFileService');
  ```

## Complete Example

Here's a complete example of mocking a module and a function:
```typescript
// src/services/GuidelineFileService.ts
import { readFileSafe } from '../utils/file-io';

export class GuidelineFileService {
  async writeAll(guidelines: any[]): Promise<void> {
    await Promise.all(
      guidelines.map(g => this.write(g.domain, g.fileName, g.content))
    );
  }

  private async write(domain: string, fileName: string, content: string): Promise<void> {
    const fileContent = await readFileSafe(`path/to/${domain}/${fileName}`);
    // implementation
  }
}

// src/tests/GuidelineFileService.test.ts
import { vi, expect } from 'vitest';
import { GuidelineFileService } from './GuidelineFileService';
import { readFileSafe } from '../utils/file-io';

vi.mock('./GuidelineFileService');
vi.fn(readFileSafe).mockImplementation(() => Promise.resolve('mocked content'));

describe('GuidelineFileService', () => {
  it('should write guidelines to disk', async () => {
    const service = new GuidelineFileService();
    await service.writeAll([]);
    expect(service.write).toHaveBeenCalledTimes(1);
    expect(readFileSafe).toHaveBeenCalledTimes(1);
  });
});
```