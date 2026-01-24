# All Guidelines

> Comprehensive guidelines for development, covering mocking strategies, TypeScript imports, and Vitest testing.

## Quick Reference

Critical rules for development:

- ✅ **Use `vi.mock()` to mock modules**: Isolate dependencies by mocking entire modules.
- ✅ **Use `vi.fn()` to mock functions**: Mock specific functions to control their behavior.
- ❌ **Do not use `jest.mock()`**: Vitest has its own mocking system, so avoid using Jest's mocking functions.
- ✅ **Use `describe` and `it` to write tests**: Use `describe` and `it` to write unit tests and integration tests.
- ✅ **Use `vi.mock()` to mock dependencies**: Use `vi.mock()` to mock dependencies and isolate the component or function being tested.

## Guidelines

- **[Mocking Strategies](./mocking-strategies.md)** - Strategies for mocking dependencies and modules in tests.
- **[Typescript Imports](./typescript-imports.md)** - Best practices for importing TypeScript modules and files.
- **[Vitest Testing](./vitest-testing.md)** - Guidelines for writing tests using Vitest, including setup and assertions.

## Related Indexes

- [Root Index](../index.md) - Main project guidelines index
- [Backend Index](../backend/backend-index.md) - Backend guidelines