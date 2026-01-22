# GuideGen v1.0 - Refactoring Plan

**Current Assessment**: 6.5/10 - Production-Adjacent, Not Production-Ready
**Target Assessment**: 8.5/10 - Production-Ready
**Estimated Effort**: 3-4 weeks (120-160 hours)

---

## Part 1: Code Quality Assessment Prompt

Use this prompt to re-run comprehensive code analysis at any time:

```
Analyze the GuideGen codebase at C:\GIT\GuideGen and provide a comprehensive assessment covering:

1. **Architecture Issues:**
   - Identify god classes (files > 200 lines or functions > 50 lines)
   - Find circular dependencies using dependency graph analysis
   - Assess separation of concerns (are workflows mixed with I/O, validation, UI?)
   - Evaluate coupling (count direct imports, identify singleton dependencies)
   - Check for layered architecture violations

2. **Code Quality Issues:**
   - Find functions with cyclomatic complexity > 5
   - Identify functions longer than 50 lines
   - Look for duplicated code blocks (> 5 lines repeated)
   - Check error handling consistency (count throw vs return patterns)
   - Find missing error handling (async calls without try-catch)

3. **Type Safety Issues:**
   - Search for remaining `any` types: grep -r ": any" src/
   - Find implicit any: grep -r "= any" src/
   - Check for unsafe type casts: grep -r "as any" src/
   - Validate Zod schemas cover all external inputs
   - Ensure discriminated unions are properly narrowed

4. **Test Coverage:**
   - Calculate file coverage: (test files / source files) * 100
   - Identify untested modules by comparing src/ and tests/ directories
   - Check critical paths have integration tests
   - Verify all public functions have unit tests
   - Run coverage report if available

5. **Production Readiness:**
   - Validate environment variables are validated with Zod
   - Check API keys are never written to disk in plain text
   - Verify rate limiting exists for API calls
   - Ensure input validation exists for all public functions
   - Check file paths are validated/sanitized
   - Look for security vulnerabilities (SQL injection, XSS, path traversal)

6. **Dependency Management:**
   - Check for dependency injection usage vs direct imports
   - Identify singletons that should be injected
   - Look for circular dependencies
   - Verify abstraction layers exist between modules

Provide:
- Specific file:line references for each issue
- Severity rating (Critical/High/Medium/Low)
- Concrete code examples showing the problem
- Recommended fix with code example
- Overall score out of 10 for each category
- Final production-readiness verdict

Be brutally honest. Production-ready means you'd deploy this to production serving real users.
```

---

## Part 2: Detailed Remediation Plan

### Phase 1: Foundation & Testing Infrastructure (Week 1)
**Goal**: Set up DI, establish testing patterns, baseline coverage
**Effort**: 35-40 hours

---

#### Task 1.1: Implement Dependency Injection with InversifyJS
**Priority**: CRITICAL
**Effort**: 12-16 hours
**Pattern Reference**: `C:\GIT\ReKindle\App\backend\src\di`

**Steps:**

1. **Install Dependencies**
   ```bash
   cd C:\GIT\GuideGen
   npm install inversify reflect-metadata @types/node
   ```

2. **Create DI Infrastructure** (`src/di/`)

   **File**: `src/di/identifiers.ts`
   ```typescript
   /**
    * DI Container Identifiers
    * Pattern: C:\GIT\ReKindle\App\backend\src\di\identifiers.ts
    */
   export const TYPES = {
     // File Services
     IFileService: Symbol.for('IFileService'),
     IFileReader: Symbol.for('IFileReader'),
     IFileWriter: Symbol.for('IFileWriter'),
     ITreeGenerator: Symbol.for('ITreeGenerator'),

     // Provider Services
     IProviderFactory: Symbol.for('IProviderFactory'),
     IProviderClient: Symbol.for('IProviderClient'),
     IProviderConfigManager: Symbol.for('IProviderConfigManager'),

     // Phase Executors
     IDiscoveryPhase: Symbol.for('IDiscoveryPhase'),
     IAnalysisPhase: Symbol.for('IAnalysisPhase'),
     IGuidelinesPhase: Symbol.for('IGuidelinesPhase'),
     IIndexesPhase: Symbol.for('IIndexesPhase'),
     IClaudeArtifactsPhase: Symbol.for('IClaudeArtifactsPhase'),

     // Workflows
     ISetupWorkflow: Symbol.for('ISetupWorkflow'),
     IGuidelinesWorkflow: Symbol.for('IGuidelinesWorkflow'),
     IIndexesWorkflow: Symbol.for('IIndexesWorkflow'),
     IClaudeWorkflow: Symbol.for('IClaudeWorkflow'),

     // Utils
     ILogger: Symbol.for('ILogger'),
     IValidator: Symbol.for('IValidator'),
     IConfigLoader: Symbol.for('IConfigLoader'),
   } as const;
   ```

   **File**: `src/di/container.ts`
   ```typescript
   /**
    * DI Container Configuration
    * Pattern: C:\GIT\ReKindle\App\backend\src\di\container.ts
    */
   import { Container } from 'inversify';
   import { TYPES } from './identifiers';

   // Services
   import { FileService } from '@/services/file/FileService';
   import { FileReader } from '@/services/file/FileReader';
   import { FileWriter } from '@/services/file/FileWriter';
   import { TreeGenerator } from '@/services/file/TreeGenerator';

   // Providers
   import { ProviderFactory } from '@/services/provider/ProviderFactory';
   import { ProviderConfigManager } from '@/services/provider/ConfigManager';

   // Phases
   import { DiscoveryPhase } from '@/phases/DiscoveryPhase';
   import { AnalysisPhase } from '@/phases/AnalysisPhase';
   import { GuidelinesPhase } from '@/phases/GuidelinesPhase';
   import { IndexesPhase } from '@/phases/IndexesPhase';
   import { ClaudeArtifactsPhase } from '@/phases/ClaudeArtifactsPhase';

   // Workflows
   import { SetupWorkflow } from '@/workflows/SetupWorkflow';
   import { GuidelinesWorkflow } from '@/workflows/GuidelinesWorkflow';

   // Utils
   import { logger } from '@/utils/logger';

   export function createContainer(): Container {
     const container = new Container();

     // File Services
     container.bind(TYPES.IFileService).to(FileService).inSingletonScope();
     container.bind(TYPES.IFileReader).to(FileReader).inSingletonScope();
     container.bind(TYPES.IFileWriter).to(FileWriter).inSingletonScope();
     container.bind(TYPES.ITreeGenerator).to(TreeGenerator);

     // Provider Services
     container.bind(TYPES.IProviderFactory).to(ProviderFactory).inSingletonScope();
     container.bind(TYPES.IProviderConfigManager).to(ProviderConfigManager).inSingletonScope();

     // Phases
     container.bind(TYPES.IDiscoveryPhase).to(DiscoveryPhase);
     container.bind(TYPES.IAnalysisPhase).to(AnalysisPhase);
     container.bind(TYPES.IGuidelinesPhase).to(GuidelinesPhase);
     container.bind(TYPES.IIndexesPhase).to(IndexesPhase);
     container.bind(TYPES.IClaudeArtifactsPhase).to(ClaudeArtifactsPhase);

     // Workflows
     container.bind(TYPES.ISetupWorkflow).to(SetupWorkflow);
     container.bind(TYPES.IGuidelinesWorkflow).to(GuidelinesWorkflow);

     // Utils
     container.bind(TYPES.ILogger).toConstantValue(logger);

     return container;
   }

   // Global container instance
   export const container = createContainer();
   ```

3. **Create Interface Definitions** (`src/interfaces/`)

   **File**: `src/interfaces/services/IFileService.ts`
   ```typescript
   export interface IFileService {
     readFile(path: string): Promise<string>;
     writeFile(path: string, content: string): Promise<void>;
     readJsonFile<T>(path: string): Promise<T>;
     writeJsonFile<T>(path: string, data: T): Promise<void>;
     fileExists(path: string): Promise<boolean>;
     ensureDir(path: string): Promise<void>;
   }

   export interface IFileReader {
     readFileSafe(path: string): Promise<string | null>;
     readMultipleFiles(paths: string[]): Promise<Array<{
       path: string;
       content: string;
       size: number;
     }>>;
   }

   export interface IFileWriter {
     writeFileSafe(path: string, content: string): Promise<boolean>;
     writeMultipleFiles(files: Array<{
       path: string;
       content: string;
     }>): Promise<void>;
   }

   export interface ITreeGenerator {
     generateTree(rootPath: string, maxDepth?: number, maxItems?: number): Promise<string>;
   }
   ```

4. **Refactor First Service as Example** (`src/services/file/FileService.ts`)

   ```typescript
   import { injectable } from 'inversify';
   import { readFile, writeFile, stat, mkdir } from 'fs/promises';
   import { dirname } from 'path';
   import type { IFileService } from '@/interfaces/services/IFileService';

   @injectable()
   export class FileService implements IFileService {
     async readFile(path: string): Promise<string> {
       return await readFile(path, 'utf-8');
     }

     async writeFile(path: string, content: string): Promise<void> {
       await this.ensureDir(dirname(path));
       await writeFile(path, content, 'utf-8');
     }

     async readJsonFile<T>(path: string): Promise<T> {
       const content = await this.readFile(path);
       return JSON.parse(content) as T;
     }

     async writeJsonFile<T>(path: string, data: T): Promise<void> {
       const content = JSON.stringify(data, null, 2);
       await this.writeFile(path, content);
     }

     async fileExists(path: string): Promise<boolean> {
       try {
         await stat(path);
         return true;
       } catch {
         return false;
       }
     }

     async ensureDir(path: string): Promise<void> {
       try {
         await mkdir(path, { recursive: true });
       } catch (error: any) {
         if (error.code !== 'EEXIST') throw error;
       }
     }
   }
   ```

5. **Update tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "experimentalDecorators": true,
       "emitDecoratorMetadata": true,
       // ... existing config
     }
   }
   ```

6. **Update Entry Point** (`src/index.ts`)
   ```typescript
   import 'reflect-metadata';
   import { container } from '@/di/container';
   import { TYPES } from '@/di/identifiers';

   // Example usage
   const setupWorkflow = container.get<ISetupWorkflow>(TYPES.ISetupWorkflow);
   ```

**Acceptance Criteria**:
- [ ] All services registered in DI container
- [ ] No direct `new ClassName()` instantiations in workflows
- [ ] All dependencies injected via constructor
- [ ] Build passes with `npm run build`

---

#### Task 1.2: Establish Testing Patterns & Infrastructure
**Priority**: CRITICAL
**Effort**: 8-10 hours

**Steps:**

1. **Create Test Utilities** (`tests/helpers/`)

   **File**: `tests/helpers/container.ts`
   ```typescript
   /**
    * Test DI Container
    * Pattern: C:\GIT\ReKindle\App\backend\tests\helpers\testContainer.ts
    */
   import { Container } from 'inversify';
   import { TYPES } from '@/di/identifiers';

   export function createTestContainer(): Container {
     const container = new Container();

     // Bind mocks instead of real services
     container.bind(TYPES.IFileService).toConstantValue(mockFileService);
     container.bind(TYPES.IProviderClient).toConstantValue(mockProviderClient);
     // ... etc

     return container;
   }
   ```

   **File**: `tests/helpers/mocks.ts`
   ```typescript
   import { vi } from 'vitest';
   import type { IFileService } from '@/interfaces/services/IFileService';
   import type { IProviderClient } from '@/providers/types';

   export const mockFileService: IFileService = {
     readFile: vi.fn(),
     writeFile: vi.fn(),
     readJsonFile: vi.fn(),
     writeJsonFile: vi.fn(),
     fileExists: vi.fn(),
     ensureDir: vi.fn(),
   };

   export const mockProviderClient: IProviderClient = {
     complete: vi.fn(),
     completeWithJson: vi.fn(),
   };

   export function resetAllMocks() {
     vi.clearAllMocks();
   }
   ```

2. **Create Test Template**

   **File**: `tests/unit/_template.test.ts`
   ```typescript
   import { describe, it, expect, beforeEach } from 'vitest';
   import { createTestContainer } from '../helpers/container';
   import { resetAllMocks } from '../helpers/mocks';
   import { TYPES } from '@/di/identifiers';

   describe('ModuleName', () => {
     let container: Container;
     let service: IServiceType;

     beforeEach(() => {
       resetAllMocks();
       container = createTestContainer();
       service = container.get<IServiceType>(TYPES.IServiceType);
     });

     describe('functionName', () => {
       it('should do X when Y', async () => {
         // Arrange
         const input = { /* test data */ };

         // Act
         const result = await service.functionName(input);

         // Assert
         expect(result).toEqual(expectedOutput);
       });

       it('should throw error when invalid input', async () => {
         // Arrange
         const invalidInput = { /* bad data */ };

         // Act & Assert
         await expect(service.functionName(invalidInput))
           .rejects.toThrow('Expected error message');
       });
     });
   });
   ```

3. **Add Coverage Scripts** (`package.json`)
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:coverage": "vitest --coverage",
       "test:ui": "vitest --ui"
     },
     "devDependencies": {
       "@vitest/coverage-v8": "^1.0.0",
       "@vitest/ui": "^1.0.0"
     }
   }
   ```

4. **Configure Coverage** (`vitest.config.ts`)
   ```typescript
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         include: ['src/**/*.ts'],
         exclude: [
           'src/**/*.test.ts',
           'src/types/**',
           'src/di/**',
           'src/index.ts',
         ],
         lines: 60,
         functions: 60,
         branches: 60,
         statements: 60,
       },
     },
   });
   ```

**Acceptance Criteria**:
- [ ] Test helpers created and working
- [ ] Template test file documented
- [ ] Coverage reporting configured
- [ ] `npm run test:coverage` produces report

---

#### Task 1.3: Write Core Service Tests (Target: 30% coverage)
**Priority**: CRITICAL
**Effort**: 12-16 hours

**Tests to Write**:

1. **File Services** (`tests/unit/services/file/`)
   - [ ] `FileService.test.ts` - 20 tests
   - [ ] `FileReader.test.ts` - 15 tests
   - [ ] `FileWriter.test.ts` - 15 tests
   - [ ] `TreeGenerator.test.ts` - 10 tests

2. **Provider Services** (`tests/unit/services/provider/`)
   - [ ] `ProviderFactory.test.ts` - 12 tests
   - [ ] `ConfigManager.test.ts` - 18 tests
   - [ ] `ErrorRecovery.test.ts` - 10 tests

3. **Validation** (`tests/unit/validation/`)
   - [ ] `InputValidator.test.ts` - 15 tests (NEW)
   - [ ] `PathValidator.test.ts` - 12 tests (NEW)
   - [ ] `ConfigValidator.test.ts` - 10 tests (NEW)

**Example Test** (`tests/unit/services/file/FileService.test.ts`):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileService } from '@/services/file/FileService';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('FileService', () => {
  let fileService: FileService;

  beforeEach(() => {
    vi.clearAllMocks();
    fileService = new FileService();
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      const mockContent = 'file content';
      vi.mocked(fs.readFile).mockResolvedValue(mockContent as any);

      const result = await fileService.readFile('/path/to/file.txt');

      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8');
    });

    it('should throw error when file does not exist', async () => {
      const error = new Error('ENOENT: no such file');
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(fileService.readFile('/nonexistent.txt'))
        .rejects.toThrow('ENOENT');
    });
  });

  describe('writeFile', () => {
    it('should create directory and write file', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined as any);

      await fileService.writeFile('/path/to/file.txt', 'content');

      expect(fs.mkdir).toHaveBeenCalledWith('/path/to', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith('/path/to/file.txt', 'content', 'utf-8');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      vi.mocked(fs.stat).mockResolvedValue({} as any);

      const result = await fileService.fileExists('/existing.txt');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

      const result = await fileService.fileExists('/missing.txt');

      expect(result).toBe(false);
    });
  });
});
```

**Acceptance Criteria**:
- [ ] 80+ new tests written
- [ ] All tests passing
- [ ] Coverage reaches 30%+

---

### Phase 2: Refactor Architecture (Week 2)
**Goal**: Break up god classes, implement proper separation of concerns
**Effort**: 35-40 hours

---

#### Task 2.1: Refactor claude-update.ts (453 lines → 7 modules)
**Priority**: CRITICAL
**Effort**: 12-14 hours

**Current Issues**:
- Single file with 10 responsibilities
- Direct file system calls
- Mixed business logic with I/O
- Untestable due to tight coupling

**Refactoring Plan**:

**New Structure**:
```
src/workflows/claude-artifacts/
├── ClaudeArtifactsWorkflow.ts          # Orchestrator (80 lines)
├── services/
│   ├── SkillGenerator.ts               # Generate skills (60 lines)
│   ├── AgentGenerator.ts               # Generate agents (60 lines)
│   ├── ClaudeMdGenerator.ts            # Generate CLAUDE.md (40 lines)
│   └── ArtifactMerger.ts               # Handle merging (80 lines)
├── validators/
│   ├── SkillValidator.ts               # Validate skills (50 lines)
│   └── AgentValidator.ts               # Validate agents (50 lines)
└── ClaudeArtifactsWorkflow.test.ts     # Tests (120 lines)
```

**Implementation**:

1. **Create Orchestrator** (`src/workflows/claude-artifacts/ClaudeArtifactsWorkflow.ts`):
   ```typescript
   import { injectable, inject } from 'inversify';
   import { TYPES } from '@/di/identifiers';
   import type { IClaudeArtifactsWorkflow } from '@/interfaces/workflows/IClaudeArtifactsWorkflow';
   import type { ISkillGenerator } from '@/interfaces/services/ISkillGenerator';
   import type { IAgentGenerator } from '@/interfaces/services/IAgentGenerator';
   import type { IClaudeMdGenerator } from '@/interfaces/services/IClaudeMdGenerator';
   import type { IArtifactMerger } from '@/interfaces/services/IArtifactMerger';
   import type { ILogger } from '@/interfaces/utils/ILogger';

   @injectable()
   export class ClaudeArtifactsWorkflow implements IClaudeArtifactsWorkflow {
     constructor(
       @inject(TYPES.ISkillGenerator) private skillGenerator: ISkillGenerator,
       @inject(TYPES.IAgentGenerator) private agentGenerator: IAgentGenerator,
       @inject(TYPES.IClaudeMdGenerator) private claudeMdGenerator: IClaudeMdGenerator,
       @inject(TYPES.IArtifactMerger) private artifactMerger: IArtifactMerger,
       @inject(TYPES.ILogger) private logger: ILogger
     ) {}

     async execute(
       client: IProviderClient,
       targetPath: string,
       guidelines: GeneratedGuideline[],
       interactive: boolean = true
     ): Promise<ClaudeArtifactsResult> {
       this.logger.info('Starting Claude artifacts generation');

       // 1. Generate skills
       const skills = await this.skillGenerator.generate(client, guidelines, targetPath);
       this.logger.info(`Generated ${skills.length} skills`);

       // 2. Generate agents
       const agents = await this.agentGenerator.generate(client, guidelines, targetPath);
       this.logger.info(`Generated ${agents.length} agents`);

       // 3. Generate CLAUDE.md
       const claudeMd = await this.claudeMdGenerator.generate(skills, agents, guidelines);
       this.logger.info('Generated CLAUDE.md');

       // 4. Handle merging if needed
       const mergeResult = await this.artifactMerger.merge(
         targetPath,
         { skills, agents, claudeMd },
         interactive
       );

       return {
         success: true,
         data: {
           skillsGenerated: skills.length,
           agentsGenerated: agents.length,
           mergeAction: mergeResult.action,
         }
       };
     }
   }
   ```

2. **Extract Skill Generator** (`src/workflows/claude-artifacts/services/SkillGenerator.ts`):
   ```typescript
   import { injectable, inject } from 'inversify';
   import { TYPES } from '@/di/identifiers';
   import type { ISkillGenerator } from '@/interfaces/services/ISkillGenerator';
   import type { IFileService } from '@/interfaces/services/IFileService';
   import type { IProviderClient } from '@/providers/types';

   @injectable()
   export class SkillGenerator implements ISkillGenerator {
     constructor(
       @inject(TYPES.IFileService) private fileService: IFileService
     ) {}

     async generate(
       client: IProviderClient,
       guidelines: GeneratedGuideline[],
       targetPath: string
     ): Promise<GeneratedSkill[]> {
       // Single responsibility: generate skills from guidelines
       // No file I/O mixed in - uses injected fileService
       // Easy to test - can mock fileService
     }
   }
   ```

3. **Write Tests** (`src/workflows/claude-artifacts/ClaudeArtifactsWorkflow.test.ts`):
   ```typescript
   describe('ClaudeArtifactsWorkflow', () => {
     let workflow: ClaudeArtifactsWorkflow;
     let mockSkillGenerator: ISkillGenerator;
     let mockAgentGenerator: IAgentGenerator;

     beforeEach(() => {
       mockSkillGenerator = {
         generate: vi.fn().mockResolvedValue([/* mock skills */])
       };
       mockAgentGenerator = {
         generate: vi.fn().mockResolvedValue([/* mock agents */])
       };

       workflow = new ClaudeArtifactsWorkflow(
         mockSkillGenerator,
         mockAgentGenerator,
         mockClaudeMdGenerator,
         mockArtifactMerger,
         mockLogger
       );
     });

     it('should generate skills, agents, and CLAUDE.md', async () => {
       const result = await workflow.execute(
         mockClient,
         '/target/path',
         mockGuidelines,
         true
       );

       expect(result.success).toBe(true);
       expect(mockSkillGenerator.generate).toHaveBeenCalledWith(
         mockClient,
         mockGuidelines,
         '/target/path'
       );
     });
   });
   ```

**Acceptance Criteria**:
- [ ] 7 new modules created
- [ ] All dependencies injected
- [ ] 30+ tests written
- [ ] Original functionality preserved
- [ ] Build and tests passing

---

#### Task 2.2: Refactor setup.ts (248 lines → Orchestrator pattern)
**Priority**: HIGH
**Effort**: 8-10 hours

**Current Issues**:
- Orchestrates 5 phases inline
- Error handling mixed with orchestration
- Progress display mixed with logic

**New Structure**:
```
src/workflows/setup/
├── SetupWorkflow.ts                    # Orchestrator (100 lines)
├── orchestration/
│   ├── PhaseExecutor.ts                # Execute single phase (40 lines)
│   └── ErrorHandler.ts                 # Handle errors (30 lines)
└── SetupWorkflow.test.ts               # Tests (80 lines)
```

**Implementation**:

```typescript
@injectable()
export class SetupWorkflow implements ISetupWorkflow {
  constructor(
    @inject(TYPES.IPhaseExecutor) private phaseExecutor: IPhaseExecutor,
    @inject(TYPES.IDiscoveryPhase) private discoveryPhase: IDiscoveryPhase,
    @inject(TYPES.IAnalysisPhase) private analysisPhase: IAnalysisPhase,
    @inject(TYPES.IGuidelinesPhase) private guidelinesPhase: IGuidelinesPhase,
    @inject(TYPES.IIndexesPhase) private indexesPhase: IIndexesPhase,
    @inject(TYPES.IClaudeArtifactsPhase) private claudePhase: IClaudeArtifactsPhase,
    @inject(TYPES.ILogger) private logger: ILogger
  ) {}

  async execute(
    targetPath: string,
    options: SetupOptions
  ): Promise<SetupWorkflowResult> {
    const phases = [
      { name: 'Discovery', executor: () => this.discoveryPhase.execute(targetPath) },
      { name: 'Analysis', executor: () => this.analysisPhase.execute(targetPath, data.techProfile) },
      { name: 'Guidelines', executor: () => this.guidelinesPhase.execute(targetPath, data) },
      { name: 'Indexes', executor: () => this.indexesPhase.execute(targetPath, data) },
      { name: 'Claude Artifacts', executor: () => this.claudePhase.execute(targetPath, data) },
    ];

    for (const phase of phases) {
      const result = await this.phaseExecutor.execute(phase);
      if (!result.success) {
        return this.handlePhaseFailure(phase.name, result.error);
      }
      data = { ...data, ...result.data };
    }

    return { success: true, data };
  }
}
```

**Acceptance Criteria**:
- [ ] Orchestrator pattern implemented
- [ ] Each phase injected as dependency
- [ ] 20+ tests written
- [ ] Error handling separated

---

#### Task 2.3: Refactor filesystem.ts (306 lines → 3 modules)
**Priority**: HIGH
**Effort**: 6-8 hours

**Current Issues**:
- Real FS + Mock FS + Tree generation in one file
- Poor separation of concerns

**New Structure**:
```
src/services/file/
├── FileSystem.ts                       # Real FS operations (100 lines)
├── MockFileSystem.ts                   # Mock FS operations (100 lines)
└── TreeGenerator.ts                    # Tree generation (80 lines)
```

**Acceptance Criteria**:
- [ ] 3 separate modules
- [ ] Both implement IFileSystem interface
- [ ] 25+ tests written

---

#### Task 2.4: Extract Long Functions (Functions > 50 lines)
**Priority**: MEDIUM
**Effort**: 8-10 hours

**Functions to Refactor**:

1. **discovery.ts:runDiscoveryPhase** (140 lines → 4 functions)
   - `executeDiscovery()` - main logic (40 lines)
   - `handleProviderSetup()` - provider init (30 lines)
   - `handleExclusions()` - exclusion logic (40 lines)
   - `buildDiscoveryResult()` - result assembly (20 lines)

2. **analysis.ts:runAnalysisPhase** (97 lines → 3 functions)
   - `executeAnalysis()` - main logic (40 lines)
   - `selectFiles()` - file selection (30 lines)
   - `analyzePatterns()` - pattern analysis (20 lines)

3. **guidelines-update.ts:runGuidelinesWorkflow** (84 lines → 3 functions)
   - `executeGuidelinesWorkflow()` - orchestration (40 lines)
   - `determineUpdateMode()` - mode selection (25 lines)
   - `performMerge()` - merge logic (15 lines)

**Acceptance Criteria**:
- [ ] All functions < 50 lines
- [ ] Single responsibility per function
- [ ] Tests written for each

---

### Phase 3: Comprehensive Test Coverage (Week 3)
**Goal**: Achieve 60%+ test coverage
**Effort**: 35-40 hours

---

#### Task 3.1: Workflow Tests (Currently 0%)
**Priority**: CRITICAL
**Effort**: 14-16 hours

**Tests to Write**:

1. **SetupWorkflow.test.ts** - 25 tests
   - Happy path (all phases succeed)
   - Phase failures at each step
   - Error recovery
   - Progress reporting

2. **GuidelinesWorkflow.test.ts** - 20 tests
   - New guidelines generation
   - Update mode (merge vs override)
   - Validation failures
   - User cancellation

3. **IndexesWorkflow.test.ts** - 18 tests
   - Index generation
   - Cross-reference validation
   - Merge with existing indexes

4. **ClaudeArtifactsWorkflow.test.ts** - 22 tests
   - Skill generation
   - Agent generation
   - CLAUDE.md generation
   - Merge handling

**Example Test Structure**:
```typescript
describe('SetupWorkflow', () => {
  describe('execute', () => {
    it('should execute all phases successfully', async () => {
      // Mock each phase to succeed
      mockDiscoveryPhase.execute.mockResolvedValue({
        success: true,
        data: mockTechProfile
      });
      mockAnalysisPhase.execute.mockResolvedValue({
        success: true,
        data: mockPatternReport
      });

      const result = await workflow.execute('/target/path', {});

      expect(result.success).toBe(true);
      expect(result.data.phasesCompleted).toBe(5);
    });

    it('should stop and return error when discovery fails', async () => {
      mockDiscoveryPhase.execute.mockResolvedValue({
        success: false,
        error: 'Discovery failed'
      });

      const result = await workflow.execute('/target/path', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Discovery failed');
      expect(mockAnalysisPhase.execute).not.toHaveBeenCalled();
    });
  });
});
```

**Acceptance Criteria**:
- [ ] 85+ workflow tests written
- [ ] All workflows have >80% coverage
- [ ] Integration tests for happy path

---

#### Task 3.2: Phase Tests (Currently 0%)
**Priority**: CRITICAL
**Effort**: 14-16 hours

**Tests to Write**:

1. **DiscoveryPhase.test.ts** - 22 tests
2. **AnalysisPhase.test.ts** - 20 tests
3. **GuidelinesPhase.test.ts** - 18 tests
4. **IndexesPhase.test.ts** - 16 tests
5. **ClaudeArtifactsPhase.test.ts** - 20 tests
6. **IntelligentMerge.test.ts** - 18 tests

**Coverage Areas**:
- Happy path execution
- Error handling
- Edge cases (empty inputs, large inputs)
- AI response parsing
- Validation failures

**Acceptance Criteria**:
- [ ] 114+ phase tests written
- [ ] All phases have >70% coverage
- [ ] Critical paths tested

---

#### Task 3.3: Integration Tests
**Priority**: HIGH
**Effort**: 8-10 hours

**Tests to Write**:

1. **End-to-End Setup** (`tests/integration/setup.e2e.test.ts`)
   ```typescript
   describe('Setup Workflow E2E', () => {
     it('should complete full setup for sample project', async () => {
       // Use real file system with temp directory
       const tempDir = await createTempProject();

       const result = await setupWorkflow.execute(tempDir, {
         depth: 'quick',
         interactive: false
       });

       expect(result.success).toBe(true);

       // Verify files created
       const guidelinesExist = await fileExists(
         path.join(tempDir, '.guidelines')
       );
       expect(guidelinesExist).toBe(true);
     });
   });
   ```

2. **Provider Integration** (`tests/integration/providers.test.ts`)
   - Test real API calls (with rate limiting)
   - Test error recovery
   - Test retry logic

3. **File Operations** (`tests/integration/file-operations.test.ts`)
   - Real file reads/writes
   - Tree generation on real directories
   - Merge operations

**Acceptance Criteria**:
- [ ] 15+ integration tests
- [ ] Tests use real dependencies (not mocks)
- [ ] Tests clean up after themselves

---

### Phase 4: Security & Production Hardening (Week 4)
**Goal**: Fix security issues, add validation
**Effort**: 30-35 hours

---

#### Task 4.1: Input Validation with Zod
**Priority**: CRITICAL
**Effort**: 10-12 hours

**Implementation**:

1. **Create Validation Schemas** (`src/validation/schemas.ts`)
   ```typescript
   import { z } from 'zod';
   import { resolve, isAbsolute } from 'path';

   export const PathSchema = z.string()
     .min(1, 'Path cannot be empty')
     .refine(
       (path) => !path.includes('..'),
       'Path cannot contain parent directory references'
     )
     .refine(
       (path) => isAbsolute(path) || path.startsWith('.'),
       'Path must be absolute or relative'
     );

   export const TargetPathSchema = PathSchema
     .transform((path) => resolve(path));

   export const SetupOptionsSchema = z.object({
     targetPath: TargetPathSchema,
     depth: z.enum(['quick', 'standard', 'thorough']),
     interactive: z.boolean().default(true),
     outputDir: z.string().optional(),
   });

   export const ProviderConfigSchema = z.object({
     provider: z.enum(['anthropic', 'groq']),
     apiKey: z.string().min(1, 'API key required'),
     model: z.string().optional(),
   });

   export const FilePathArraySchema = z.array(PathSchema)
     .max(1000, 'Too many files (max 1000)');
   ```

2. **Create Validator Service** (`src/services/validation/InputValidator.ts`)
   ```typescript
   import { injectable } from 'inversify';
   import { ZodSchema } from 'zod';
   import type { IInputValidator } from '@/interfaces/services/IInputValidator';

   @injectable()
   export class InputValidator implements IInputValidator {
     validate<T>(schema: ZodSchema<T>, data: unknown): T {
       const result = schema.safeParse(data);

       if (!result.success) {
         const errors = result.error.errors
           .map(e => `${e.path.join('.')}: ${e.message}`)
           .join('; ');
         throw new ValidationError(`Invalid input: ${errors}`);
       }

       return result.data;
     }

     validatePath(path: string): string {
       return this.validate(TargetPathSchema, path);
     }

     validateConfig(config: unknown): ProviderConfig {
       return this.validate(ProviderConfigSchema, config);
     }
   }
   ```

3. **Apply Validation at Entry Points**
   ```typescript
   @injectable()
   export class SetupWorkflow implements ISetupWorkflow {
     constructor(
       @inject(TYPES.IInputValidator) private validator: IInputValidator,
       // ... other dependencies
     ) {}

     async execute(targetPath: string, options: SetupOptions) {
       // Validate inputs FIRST
       const validatedPath = this.validator.validatePath(targetPath);
       const validatedOptions = this.validator.validate(
         SetupOptionsSchema,
         { targetPath, ...options }
       );

       // Now proceed with validated data
       return this.executeInternal(validatedOptions);
     }
   }
   ```

**Acceptance Criteria**:
- [ ] All public function parameters validated
- [ ] Path validation prevents traversal
- [ ] Config validation with Zod schemas
- [ ] 30+ validation tests written

---

#### Task 4.2: Secure Secrets Management
**Priority**: CRITICAL
**Effort**: 6-8 hours

**Implementation**:

1. **Remove Plain-Text Writing** (`src/services/provider/ConfigManager.ts`)
   ```typescript
   // BEFORE (INSECURE):
   fs.writeFileSync('.env', `ANTHROPIC_API_KEY=${apiKey}`);

   // AFTER (SECURE):
   // Option 1: Use environment variables only (don't write to disk)
   process.env.ANTHROPIC_API_KEY = apiKey;

   // Option 2: Use encrypted storage
   await secureStorage.set('ANTHROPIC_API_KEY', apiKey);

   // Option 3: Reference external credential manager
   // Document that users should set env vars themselves
   ```

2. **Update Documentation**
   ```markdown
   # Configuration

   Set your API key via environment variable:

   ```bash
   export ANTHROPIC_API_KEY=your_key_here
   # Or create .env file (add to .gitignore!)
   echo "ANTHROPIC_API_KEY=your_key" > .env
   ```

   **NEVER commit .env files to git!**
   ```

3. **Add .gitignore Check**
   ```typescript
   async validateGitignore(targetPath: string): Promise<void> {
     const gitignorePath = path.join(targetPath, '.gitignore');
     const content = await this.fileService.readFile(gitignorePath);

     if (!content.includes('.env')) {
       this.logger.warn('⚠️  .env not in .gitignore! Add it to prevent leaking secrets');
     }
   }
   ```

**Acceptance Criteria**:
- [ ] No API keys written to disk in plain text
- [ ] Documentation updated
- [ ] Warning if .env not in .gitignore
- [ ] Tests verify secrets not leaked

---

#### Task 4.3: Rate Limiting for API Calls
**Priority**: HIGH
**Effort**: 6-8 hours

**Implementation**:

1. **Create Rate Limiter** (`src/services/provider/RateLimiter.ts`)
   ```typescript
   import { injectable } from 'inversify';
   import type { IRateLimiter } from '@/interfaces/services/IRateLimiter';

   @injectable()
   export class RateLimiter implements IRateLimiter {
     private queue: Array<() => Promise<any>> = [];
     private running = 0;
     private lastCallTime = 0;

     constructor(
       private maxConcurrent: number = 3,
       private minDelayMs: number = 1000
     ) {}

     async throttle<T>(fn: () => Promise<T>): Promise<T> {
       return new Promise((resolve, reject) => {
         this.queue.push(async () => {
           try {
             const result = await fn();
             resolve(result);
           } catch (error) {
             reject(error);
           }
         });

         this.processQueue();
       });
     }

     private async processQueue() {
       if (this.running >= this.maxConcurrent || this.queue.length === 0) {
         return;
       }

       const now = Date.now();
       const timeSinceLastCall = now - this.lastCallTime;

       if (timeSinceLastCall < this.minDelayMs) {
         setTimeout(() => this.processQueue(), this.minDelayMs - timeSinceLastCall);
         return;
       }

       const fn = this.queue.shift();
       if (!fn) return;

       this.running++;
       this.lastCallTime = Date.now();

       await fn();

       this.running--;
       this.processQueue();
     }
   }
   ```

2. **Apply to Provider Calls**
   ```typescript
   @injectable()
   export class ProviderClient implements IProviderClient {
     constructor(
       @inject(TYPES.IRateLimiter) private rateLimiter: IRateLimiter,
       private client: Anthropic
     ) {}

     async complete(prompt: string): Promise<string> {
       return this.rateLimiter.throttle(() =>
         this.client.messages.create({ /* ... */ })
       );
     }
   }
   ```

**Acceptance Criteria**:
- [ ] Rate limiter implemented
- [ ] Applied to all API calls
- [ ] Configurable limits
- [ ] 15+ tests for rate limiting

---

#### Task 4.4: Error Handling Standardization
**Priority**: HIGH
**Effort**: 8-10 hours

**Implementation**:

1. **Create Error Classes** (`src/errors/index.ts`)
   ```typescript
   export class ValidationError extends Error {
     constructor(message: string, public details?: Record<string, any>) {
       super(message);
       this.name = 'ValidationError';
     }
   }

   export class FileOperationError extends Error {
     constructor(
       message: string,
       public filePath: string,
       public operation: 'read' | 'write' | 'delete'
     ) {
       super(message);
       this.name = 'FileOperationError';
     }
   }

   export class ProviderError extends Error {
     constructor(
       message: string,
       public provider: string,
       public statusCode?: number
     ) {
       super(message);
       this.name = 'ProviderError';
     }
   }

   export class PhaseExecutionError extends Error {
     constructor(
       message: string,
       public phase: string,
       public cause?: Error
     ) {
       super(message);
       this.name = 'PhaseExecutionError';
     }
   }
   ```

2. **Standardize Error Handling Pattern**
   ```typescript
   // Use PhaseResult for workflow/phase boundaries
   async executePhase(): Promise<PhaseResult<T>> {
     try {
       const data = await this.performWork();
       return { success: true, data };
     } catch (error) {
       this.logger.error('Phase execution failed', error);
       return {
         success: false,
         error: error instanceof Error ? error.message : String(error),
         humanReviewRequired: false
       };
     }
   }

   // Throw custom errors for exceptional cases
   async validateInput(input: unknown): Promise<void> {
     if (!isValid(input)) {
       throw new ValidationError('Invalid input', { input });
     }
   }
   ```

**Acceptance Criteria**:
- [ ] Custom error classes created
- [ ] Error handling pattern documented
- [ ] All phases use PhaseResult
- [ ] All utils throw custom errors
- [ ] Error context preserved

---

### Phase 5: Documentation & Final Polish (Throughout all weeks)
**Effort**: 8-10 hours

#### Task 5.1: Code Documentation
- [ ] JSDoc comments for all public functions
- [ ] README updated with architecture diagram
- [ ] CONTRIBUTING.md with development setup

#### Task 5.2: Architecture Documentation
- [ ] Document DI container structure
- [ ] Document workflow → phase → service layers
- [ ] Create dependency diagram

#### Task 5.3: Testing Documentation
- [ ] Document testing strategy
- [ ] Provide test examples
- [ ] Document mock usage patterns

---

## Success Criteria

### Coverage Targets
- [ ] **Overall test coverage**: 60%+
- [ ] **Workflows**: 80%+
- [ ] **Phases**: 70%+
- [ ] **Services**: 80%+
- [ ] **Utils**: 70%+

### Architecture Quality
- [ ] **No god classes**: All files < 200 lines
- [ ] **No long functions**: All functions < 50 lines
- [ ] **Dependency injection**: 100% of services use DI
- [ ] **Separation of concerns**: Clear layer boundaries

### Security & Validation
- [ ] **Input validation**: 100% of public functions
- [ ] **No plain-text secrets**: Zero API keys in files
- [ ] **Rate limiting**: All API calls throttled
- [ ] **Path validation**: No traversal vulnerabilities

### Code Quality
- [ ] **Type safety**: Zero `any` types
- [ ] **Error handling**: Consistent patterns
- [ ] **Testing**: All critical paths tested
- [ ] **Documentation**: All public APIs documented

### Final Assessment Target
- [ ] **Overall Score**: 8.5/10 (Production-Ready)
- [ ] **Architecture**: 8/10
- [ ] **Code Quality**: 8/10
- [ ] **Type Safety**: 9/10
- [ ] **Test Coverage**: 8/10
- [ ] **Security**: 8/10

---

## Timeline Summary

| Week | Focus | Hours | Deliverables |
|------|-------|-------|--------------|
| Week 1 | Foundation & Testing | 35-40 | DI setup, test infrastructure, 30% coverage |
| Week 2 | Architecture Refactor | 35-40 | God classes split, workflows refactored |
| Week 3 | Test Coverage | 35-40 | 60%+ coverage, integration tests |
| Week 4 | Security & Polish | 30-35 | Input validation, rate limiting, docs |
| **Total** | **4 weeks** | **135-155** | **Production-ready v1.0** |

---

## Notes

- This plan is aggressive but achievable
- Prioritize tasks marked CRITICAL first
- Run assessment prompt weekly to track progress
- Adjust timeline based on actual velocity
- Get code reviews for architectural changes
- Keep tests green at all times (never commit broken tests)

---

**Created**: 2026-01-22
**Last Updated**: 2026-01-22
**Target Completion**: 2026-02-19
