# GuideGen Guidelines
> Comprehensive development guidelines for GuideGen, an AI-powered guideline generator that analyzes your codebase and generates intelligent documentation, Claude Code skills, and enforcement agents.

## Quick Start
1. Review [Critical Rules](#critical-rules) for cross-cutting guidelines.
2. Explore domain-specific guidelines for your work area:
   - [All Index](./all/all-index.md) for general guidelines.
   - [Backend Index](./backend/backend-index.md) for backend development.
3. Familiarize yourself with the project structure and available commands.

## Available Commands
### Development
- `npm run build` - Compile TypeScript code.
- `npm run build:exe` - Package the application for distribution.
- `npm run dev` - Start the development server.
- `npm run setup` - Initialize the project setup.
- `npm run analyze` - Run code analysis.
- `npm run guidelines` - Generate guidelines.
- `npm run indexes` - Generate indexes.
- `npm run claude` - Run Claude-related commands.
### Testing
- `npm run test` - Run Vitest tests.

## Critical Rules
- ✅ **Use `console.log` for logging purposes**.
- ❌ **Do not use other logging libraries or frameworks**.
- ✅ **Use path aliases for imports starting with `@/`**.
- ✅ **Use relative imports for local dependencies**.
- ❌ **Do not use `require()` for imports**.
- ✅ **Use Vitest for testing**: The codebase uses Vitest for all testing needs. Ensure that all new tests are written using Vitest.
- ✅ **Write descriptive test names**: Test names should clearly describe the scenario being tested.
- ❌ **Use Jest or other testing frameworks**: The codebase is set up to use Vitest. Avoid introducing other testing frameworks.
- ❌ **Write tests without mocking dependencies**: Failing to mock dependencies can lead to tests that are not isolated and potentially fragile.
- ✅ **Extend the base `Error` class**: When creating a custom error class, extend the base `Error` class to inherit its properties and methods.

## Domain Guidelines
### 📁 All
**[All Index](./all/all-index.md)** - General guidelines for all domains.
Key guidelines:
- [Console Logging](./all/console-logging.md) - Guidelines for console logging.
- [Mocking Strategies Vitest](./all/mocking-strategies-vitest.md) - Strategies for mocking dependencies in Vitest.
- [Test Organization Vitest](./all/test-organization-vitest.md) - Best practices for organizing tests in Vitest.

### 🖥️ Backend
**[Backend Index](./backend/backend-index.md)** - Guidelines for backend development.
Key guidelines:
- [Custom Error Classes](./backend/custom-error-classes.md) - Creating custom error classes.
- [Dependency Injection](./backend/dependency-injection.md) - Using dependency injection in backend code.
- [Error Handling Try Catch](./backend/error-handling-try-catch.md) - Best practices for error handling using try-catch blocks.

## Project Structure
```
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
📖 [Project README](../README.md) - Full project documentation