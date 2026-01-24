# GuideGen Guidelines
> Comprehensive development guidelines for GuideGen, an AI-powered guideline generator that analyzes your codebase and generates intelligent documentation, Claude Code skills, and enforcement agents.

## Quick Start
**New to GuideGen?** Start here:
1. Review [Critical Rules](#critical-rules) for essential guidelines.
2. Explore domain-specific guidelines for your work area:
   - [All Index](./all/all-index.md) for general guidelines.
   - [Backend Index](./backend/backend-index.md) for backend development.
3. Refer to the [Project README](../README.md) for full project documentation.

## Available Commands
### Development
- `npm run build` - Compile TypeScript code.
- `npm run build:exe` - Package the application for distribution.
- `npm run dev` - Run the application in development mode.
- `npm run setup` - Initialize the project setup.
- `npm run analyze` - Analyze the codebase.
- `npm run guidelines` - Generate guidelines.
- `npm run indexes` - Generate indexes.
- `npm run claude` - Generate Claude Code skills.

### Testing
- `npm run test` - Run unit tests and integration tests using Vitest.

## Critical Rules
Rules that apply across the entire codebase:
- ✅ **Use `vi.mock()` to mock modules**: Isolate dependencies by mocking entire modules.
- ✅ **Use `vi.fn()` to mock functions**: Mock specific functions to control their behavior.
- ❌ **Do not use `jest.mock()`**: Vitest has its own mocking system, so avoid using Jest's mocking functions.
- ✅ **Use `vi.mock()` to mock dependencies**: Use `vi.mock()` to mock dependencies and isolate the component or function being tested.
- ✅ **Use the `@injectable` decorator on all service classes**:
- ✅ **Use the `@inject` decorator to inject services**:
- ❌ **Do not use the `new` keyword to create service instances**:

## Domain Guidelines
### 📊 Backend
**[Backend Index](./backend/backend-index.md)** - Guidelines for backend development, including dependency injection, error handling, and layer separation.
Key guidelines:
- [Dependency Injection](./backend/dependency-injection.md) - Implement dependency injection for loose coupling.
- [Error Handling](./backend/error-handling.md) - Handle errors effectively to ensure robustness.
- [Layer Separation Pattern](./backend/layer-separation-pattern.md) - Separate concerns into distinct layers for maintainability.

### 🌐 All
**[All Index](./all/all-index.md)** - General guidelines applicable to all domains.
Key guidelines:
- [Mocking Strategies](./all/mocking-strategies.md) - Strategies for mocking dependencies.
- [Typescript Imports](./all/typescript-imports.md) - Best practices for TypeScript imports.
- [Vitest Testing](./all/vitest-testing.md) - Guidelines for testing with Vitest.

## Project Structure
```markdown
GuideGen/
├── docs/
│   └── adr/
├── logs/
├── src/
│   ├── config/
│   ├── core/
│   │   ├── io/
│   │   ├── knowledge/
│   │   ├── phases/
│   │   │   ├── analysis/
│   │   │   ├── claude-artifacts/
│   │   │   ├── discovery/
│   │   │   ├── guidelines/
│   │   │   └── indexes/
│   │   ├── utils/
│   │   ├── validation/
│   │   └── workflows/
│   │       └── services/
│   ├── di/
│   ├── errors/
│   ├── interfaces/
│   │   └── services/
│   ├── providers/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── validation/
│   └── ... (1 more items)
└── tests/
    ├── fixtures/
    ├── helpers/
    ├── integration/
    │   └── workflows/
    ├── unit/
    │   ├── core/
    │   │   ├── io/
    │   │   ├── phases/
    │   │   ├── utils/
    │   │   └── workflows/
    │   ├── errors/
    │   ├── providers/
    │   ├── services/
    │   ├── types/
    │   ├── utils/
    │   ├── validation/
    │   └── workflows/
    │       ├── claude-artifacts/
    │       └── services/
    └── utils/
```