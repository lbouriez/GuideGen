# Backend - Layer Separation Core Phases

> The backend codebase utilizes a layer separation approach, dividing the core logic into distinct phases for better maintainability and scalability.
> 
> This guideline documents the existing patterns and structures found in the codebase, focusing on the core phases and their interactions.

---

## When to Use This Guide

Use this guide when:
- Developing new features or components within the backend codebase
- Refactoring existing code to improve maintainability and performance
- Integrating new technologies or libraries into the backend stack

---

## Overview

The backend codebase is structured around a set of core phases, each responsible for a specific aspect of the application's functionality. These phases include:

1. **Analysis Phase**: Responsible for detecting code patterns, conventions, and architectural structures within the project.
2. **Claude Artifacts Generation Phase**: Generates Claude artifacts, including skills, agents, and CLAUDE.md files, based on the project's structure and guidelines.
3. **Guidelines Workflow**: Orchestrates the generation of guidelines from codebase patterns, including intelligent merging with existing content.

These phases are designed to work together seamlessly, ensuring that the application's core logic is well-organized, efficient, and easy to maintain.

---

## Key Rules

### ✅ DO

- ✅ **Use the `runAnalysisPhase` function to analyze codebase patterns**:
  ```typescript
  import { runAnalysisPhase } from '@/core/phases/analysis';

  const result = await runAnalysisPhase(
    '/path/to/project',
    techProfile,
    'standard',
    false  // no debug output
  );
  ```
- ✅ **Utilize the `runClaudeArtifactsPhase` function to generate Claude artifacts**:
  ```typescript
  import { runClaudeArtifactsPhase } from '@/core/phases/claude-artifacts';

  const result = await runClaudeArtifactsPhase(
    client,
    '/path/to/project',
    techProfile,
    rules,
    guidelines,
    (msg) => console.log(msg)
  );
  ```
- ✅ **Follow the guidelines workflow for generating and updating guidelines**:
  ```typescript
  import { runGuidelinesWorkflow } from '@/core/workflows/guidelines-update';

  const result = await runGuidelinesWorkflow(
    client,
    '/path/to/project',
    techProfile,
    patterns,
    true,  // interactive mode
    (msg) => console.log(msg)
  );
  ```

### ❌ NEVER

- ❌ **Do not modify the core phases or workflows directly**:
  ```typescript
  // ❌ Bad
  // import { runAnalysisPhase } from '@/core/phases/analysis';
  // runAnalysisPhase = () => { /* custom implementation */ };
  // ✅ Good
  // import { runAnalysisPhase } from '@/core/phases/analysis';
  // const result = await runAnalysisPhase(
  //   '/path/to/project',
  //   techProfile,
  //   'standard',
  //   false  // no debug output
  // );
  ```

---

## Complete Example

The following example demonstrates how to use the `runAnalysisPhase` function to analyze codebase patterns and generate guidelines:
```typescript
import { runAnalysisPhase } from '@/core/phases/analysis';
import { runGuidelinesWorkflow } from '@/core/workflows/guidelines-update';

const techProfile = {
  stack: {
    languages: ['TypeScript'],
    frameworks: [],
    buildTools: [],
    testingFrameworks: [],
    packageManager: 'npm',
  },
  isMonorepo: false,
  structure: {
    root: '/test/project',
    directories: ['src'],
    keyFiles: [],
    configFiles: [],
  },
};

const patterns = {
  importPatterns: [{ name: 'ES6', frequency: 'common', examples: [] }],
  namingConventions: [{ name: 'camelCase', frequency: 'common', examples: [] }],
  architecturePatterns: [],
  stateManagement: [],
  errorHandling: [],
  loggingPatterns: [],
};

const result = await runAnalysisPhase(
  '/path/to/project',
  techProfile,
  'standard',
  false  // no debug output
);

if (result.success && result.data) {
  const guidelinesResult = await runGuidelinesWorkflow(
    client,
    '/path/to/project',
    techProfile,
    patterns,
    true,  // interactive mode
    (msg) => console.log(msg)
  );

  if (guidelinesResult.success) {
    console.log(`Guidelines generated: ${guidelinesResult.guidelinesGenerated}`);
  }
}
```
This example showcases the interaction between the analysis phase and the guidelines workflow, demonstrating how to generate guidelines from codebase patterns.