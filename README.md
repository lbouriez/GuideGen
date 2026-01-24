# GuideGen

**AI-Powered Guideline Generator** - Analyzes your codebase and generates intelligent documentation, Claude Code skills, and enforcement agents.

## What It Generates

- **.guidelines/** - Comprehensive domain-specific coding guidelines with real code examples
- **Index files** - Navigation structure for easy discovery
- **.claude/skills/** - Workflow automation skills (including auto-generated security and code quality skills)
- **.claude/agents/** - Rule enforcement agents
- **CLAUDE.md** - Quick reference for Claude Code

## Why GuideGen?

### The Problem

Setting up documentation and Claude Code for a project is tedious:

1. **Manual effort** - Writing guidelines, skills, and agents from scratch takes hours
2. **Inconsistency** - Each developer sets things up differently
3. **Missing patterns** - Hard to capture all codebase conventions manually
4. **Stale docs** - Guidelines become outdated as code evolves

### The Solution

GuideGen automates the entire process:

1. **Analyzes your codebase** using AI to detect patterns and conventions
2. **Generates optimized artifacts** with smart filtering and validation
3. **Intelligent updates** - AI-powered merging preserves your customizations
4. **Modular phases** - Run only what you need (guidelines, indexes, or Claude artifacts)

## Installation

```bash
git clone https://github.com/lbouriez/GuideGen
cd guidegen
npm install
npm run build
```

## Quick Start

### Initial Setup (First Time)

Generate everything for your project:

```bash
npm run setup -- /path/to/your/project
```

**What happens:**
1. 🔍 **Discovery** - Detects tech stack and project structure
2. 📊 **Analysis** - Identifies code patterns and conventions
3. 📝 **Guidelines** - Generates domain-specific guidelines with examples
4. 📑 **Indexes** - Creates navigation structure
5. 🤖 **Claude Artifacts** - Generates skills and agents

**Output:**
```
✓ Generated 10 guidelines
✓ Generated 3 indexes
✓ Generated 3 skills (1 workflow + 2 auto-generated)
✓ Generated 1 agent
✓ Created CLAUDE.md
```

### Updating Existing Guidelines

As your project evolves, intelligently update your documentation:

```bash
npm run guidelines -- /path/to/your/project
npm run indexes -- /path/to/your/project
npm run claude -- /path/to/your/project
```

**Interactive update mode:**
```
⚠️  Existing files detected in: /project/.guidelines

What would you like to do?

  [O] Override  - Delete and regenerate (destructive)
  [U] Update    - Intelligently merge (recommended)
  [C] Cancel    - Exit

Your choice [O/U/C]: U

📋 Dry-Run Preview:
──────────────────────────────────────────

backend/api-design.md:

✅ Added:
  + Rate Limiting: New pattern detected

📝 Modified:
  ~ Error Handling: Updated with new patterns

✓ Kept 5 sections unchanged

──────────────────────────────────────────

Proceed with these changes? (Y/n)
```

See [UPDATING.md](./UPDATING.md) for complete update workflow documentation.

## Commands

### Full Setup

```bash
# Initial setup - generate everything
npm run setup -- /path/to/project

# Force AI provider reconfiguration
npm run setup -- /path/to/project --force-setup
```

### Individual Phases

Run only what you need:

```bash
# Generate/update guidelines
npm run guidelines -- /path/to/project

# Generate/update indexes (requires guidelines)
npm run indexes -- /path/to/project

# Generate/update Claude artifacts (requires guidelines)
npm run claude -- /path/to/project

# Analysis only (no file generation)
npm run analyze -- /path/to/project
```

### Local Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Run tests
npm test
```

## The 5-Phase Architecture

```
Discovery → Analysis → Guidelines → Indexes → Claude Artifacts
```

Each phase is independent and can be run separately.

### Phase 1: Discovery

Detects your tech stack and project structure:
- Languages (TypeScript, JavaScript, Python, etc.)
- Frameworks (React, Express, NestJS, etc.)
- Build tools and package managers
- Monorepo detection
- Project classification

### Phase 2: Pattern Analysis

Analyzes code to identify patterns:
- Import/export patterns
- Naming conventions
- Architecture patterns
- State management
- Error handling
- Logging patterns

### Phase 3: Guidelines Generation

Creates domain-specific guidelines with real code examples:

**Domains:**
- **Backend** - database, api-design, auth-security, error-handling, testing, architecture
- **Frontend** - components, state-management, routing, styling, performance, testing
- **Shared** - organization, types, utilities, configuration

**Smart features:**
- ✅ Extracts actual code patterns from your codebase
- ✅ Includes DO/NEVER rules with examples
- ✅ **Intelligent merging** - preserves manual edits on updates
- ✅ Validates structure before writing

### Phase 4: Indexes Generation

Creates navigation structure:
- **Root index** - Overview with links to all domains
- **Domain indexes** - Per-domain navigation
- **Cross-reference validation** - Ensures all links work

**Smart features:**
- ✅ Detects broken links
- ✅ Identifies missing references
- ✅ Preserves custom sections
- ✅ **Intelligent merging** on updates

### Phase 5: Claude Artifacts

Generates skills and agents:
- **Workflow Skills** - Step-by-step guides (from guidelines)
- **Tech-Stack Skills** - Auto-generated security and code quality checklists (based on detected tech stack)
- **Agents** - Rule enforcement (critical rules only)
- **CLAUDE.md** - Quick reference file

**Smart features:**
- ✅ Adaptive limits based on project complexity
- ✅ Auto-detects applicable security/quality concerns (Express → SQL injection prevention, TypeScript → type safety checks)
- ✅ Quality over quantity
- ✅ Skills reference guidelines (no duplication)
- ✅ **Intelligent merging** preserves customizations

## Generated Structure

```
your-project/
├── .guidelines/
│   ├── index.md                 # Root navigation
│   ├── backend/
│   │   ├── backend-index.md
│   │   ├── api-design.md
│   │   ├── database.md
│   │   ├── error-handling.md
│   │   └── testing.md
│   ├── frontend/
│   │   ├── frontend-index.md
│   │   ├── components.md
│   │   └── state-management.md
│   └── shared/
│       ├── shared-index.md
│       └── organization.md
├── .claude/
│   ├── skills/
│   │   ├── browse-guidelines.md
│   │   ├── typescript-application-security-review.md    # Auto-generated
│   │   └── typescript-code-quality-review.md            # Auto-generated
│   └── agents/
│       └── critical-rules-enforcer.md
└── CLAUDE.md                    # Quick reference
```

## Intelligent Update Mode

GuideGen uses AI to intelligently merge existing content with newly generated content.

**How it works:**
1. Runs full analysis **in memory** (no writes yet)
2. Reads all existing files
3. Sends both to AI: "Merge these intelligently, preserve manual edits"
4. Shows **dry-run preview** of all changes
5. Asks for confirmation
6. Writes only if approved

**AI decides what to:**
- ✅ **Keep** - Existing content that's still relevant
- ➕ **Add** - New patterns detected in codebase
- 📝 **Update** - Outdated sections that need refreshing
- ❌ **Remove** - Obsolete content (asks confirmation if significant)

**Example workflow:**

```bash
# Your code evolved - update guidelines
npm run guidelines

# [O/U/C]? → U (Update mode)
# Shows dry-run preview with changes
# Proceed? → Y

# Update indexes and Claude artifacts
npm run indexes
npm run claude

# Review changes
git diff .guidelines .claude CLAUDE.md

# Commit
git commit -m "docs: update guidelines after auth refactor"
```

See [UPDATING.md](./UPDATING.md) for complete documentation.

## AI Provider Setup

### First Run

On first run, you'll configure:
1. **Provider** - Anthropic or Groq
2. **API Key** - Your API key
3. **Model** - AI model to use

Configuration is saved to `.env`.

### Supported Providers

| Provider | Best For | Cost |
|----------|----------|------|
| **Anthropic Claude** | High-quality analysis | $$$ |
| **Groq** | Fast, cost-effective | $ |

### Environment Variables

After setup, `.env` contains:

```bash
AI_PROVIDER=anthropic|groq
AI_API_KEY=your-key-here
AI_MODEL=claude-3-5-sonnet-latest
```

### Re-running Setup

```bash
npm run setup -- --force-setup
```

## Quality Over Quantity

**Adaptive Limits** - Scale with project complexity:

| Project Type | Skills | Agents |
|--------------|--------|--------|
| Small (1 project) | max 5 | max 5 |
| Medium (2 projects) | max 7 | max 7 |
| Large (monorepo 3+) | max 10 | max 10 |

**Smart Filters:**
- Skills: Only multi-step workflows
- Agents: Only critical/important enforceable rules
- Guidelines: No limits (comprehensive documentation)

## Smart Features

### 🔒 Auto-Generated Security & Code Quality Skills

GuideGen automatically detects and generates tech-stack-specific skills:
- **Security Review Skills** - Tailored to your frameworks (Express → SQL injection, React → XSS)
- **Code Quality Skills** - Language-specific best practices (TypeScript → type safety, Python → PEP 8)
- **AI-Powered Detection** - Uses AI to determine which skills are applicable to your project
- **Preventive Checklists** - Catch vulnerabilities before commit, not after
- **Always Up-to-Date** - Reflects latest vulnerabilities from AI model's knowledge

**Example:** TypeScript + Express project automatically gets:
- SQL/NoSQL injection prevention checklist
- TypeScript type safety verification
- Authentication best practices
- Error handling security

### 🤖 AI-Powered Merging

When regenerating:
- Detects manual edits
- Preserves custom sections
- Merges AI updates intelligently
- Reports changes with dry-run preview

### ✅ Cross-Reference Validation

Before writing:
- Validates all guideline links
- Checks for broken references
- Ensures skills/agents point to existing guidelines
- Reports missing paths

### 📊 Adaptive Generation

Scales with complexity:
- Small projects get focused essentials (3-6 guidelines)
- Medium projects get balanced coverage (5-10 guidelines)
- Large monorepos get comprehensive documentation (8-15 guidelines)
- Quality always prioritized over quantity

## Example Output

### Generated Guideline

```markdown
# Backend - API Design

> REST API patterns for this project

## Key Rules

### ✅ DO

- ✅ **Use consistent route patterns**
  ```typescript
  // Good - follows /api/v1/{resource} pattern
  router.get('/api/v1/users/:id', getUser);
  ```

### ❌ NEVER

- ❌ **Mix route patterns**
  ```typescript
  // ❌ Bad - inconsistent
  router.get('/users/:id', getUser);
  router.get('/api/user/:id', getUser);

  // ✅ Good - consistent
  router.get('/api/v1/users/:id', getUser);
  ```

## Complete Example

[Full walkthrough with actual code from your codebase]
```

### Generated Skill

```markdown
---
name: browse-guidelines
description: Browse project guidelines and conventions
---

# Browse Guidelines

> Browse and search project guidelines

## When to Use

- Finding specific documentation
- Understanding project conventions
- Exploring available guidelines

## Workflow

### Step 1: Identify Guideline Type

**Guideline**: [General Guidelines](../../.guidelines/index.md)

**Actions**:
1. Determine category (backend, frontend, shared)
2. Browse relevant section

### Step 2: Search Specific Guidelines

**Actions**:
1. Use index files to navigate
2. Find relevant guideline

**Verification**:
- [ ] Found the guideline
- [ ] Understood the conventions
```

## Architecture

GuideGen follows a clean, layered architecture with dependency injection:

```
┌─────────────────────────────────────────┐
│           CLI Entry Points              │
│  (src/index.ts - commands & validation) │
└──────────────┬──────────────────────────┘
               │ Input Validation
               │ (Zod schemas)
┌──────────────▼──────────────────────────┐
│          Workflow Layer                 │
│  (Orchestrators - setup, guidelines)    │
│  - High-level business logic            │
│  - Phase coordination                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           Phase Layer                   │
│  (discovery, analysis, guidelines)      │
│  - Independent, reusable phases         │
│  - Single responsibility                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Service Layer                   │
│  (providers, validation, rate limiting) │
│  - AI provider abstraction              │
│  - Rate limiting with retry             │
│  - Input validation                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        Infrastructure Layer             │
│  (filesystem, IO, utilities)            │
│  - File system abstraction              │
│  - Dependency injection container       │
└─────────────────────────────────────────┘
```

### Architecture Principles

1. **Dependency Injection** - Uses InversifyJS for loose coupling and testability
2. **Interface-Based Design** - All dependencies injected via interfaces
3. **Single Responsibility** - Each module has one clear purpose
4. **Layer Separation** - Clear boundaries between layers
5. **Type Safety** - Zero `any` types, strict TypeScript
6. **Testability** - All components designed for easy testing

### Directory Structure

```
src/
├── index.ts                   # CLI entry point with validation
├── core/
│   ├── io/                   # File system abstraction
│   │   └── filesystem.ts     # IFileSystem interface + implementations
│   ├── phases/               # Independent phase implementations
│   │   ├── discovery/        # Tech stack detection
│   │   ├── analysis/         # Pattern analysis
│   │   ├── guidelines/       # Guideline generation
│   │   ├── indexes/          # Index generation
│   │   └── intelligent-merge/# AI-powered merging
│   └── workflows/            # Workflow orchestration
│       ├── setup.ts          # Full setup workflow
│       ├── guidelines-update.ts
│       ├── indexes-update.ts
│       └── claude-artifacts/ # Skills & agents generation
├── providers/                # AI provider abstraction
│   ├── types.ts              # IProviderClient interface
│   ├── anthropic.ts          # Anthropic implementation
│   ├── groq.ts               # Groq implementation
│   └── manager.ts            # Provider manager with rate limiting
├── services/                 # Business services
│   └── rate-limiter.ts       # Rate limiting with exponential backoff
├── validation/               # Input validation
│   ├── schemas.ts            # Zod schemas
│   └── input-validator.ts    # Path & input validation
├── errors/                   # Custom error classes
│   └── index.ts              # GuideGenError hierarchy
├── di/                       # Dependency injection
│   ├── container.ts          # InversifyJS container
│   └── identifiers.ts        # DI tokens
├── types/                    # TypeScript interfaces
└── utils/                    # Utilities and helpers
```

### Security Features

1. **Input Validation** - All CLI inputs validated with Zod schemas
2. **Path Traversal Prevention** - Strict path validation prevents directory escaping
3. **Rate Limiting** - All API calls throttled with exponential backoff
4. **Secrets Management** - Environment variables preferred over `.env` files
5. **Custom Error Classes** - Structured error handling with context

### Key Design Principles

1. **Modular Phases** - Each phase independent and testable
2. **Intelligent Merging** - AI-powered update mode preserves edits
3. **Validation** - Input, structure, and cross-reference validation
4. **Provider Abstraction** - Support multiple AI providers
5. **Quality Over Quantity** - Adaptive limits scale with complexity
6. **Separation of Concerns** - Guidelines ≠ Skills ≠ Agents
7. **Type Safety** - Zero `any` types, strict TypeScript
8. **Security First** - Input validation, rate limiting, safe file operations

## Troubleshooting

### Build Errors

```bash
npm run build
```

All TypeScript should compile with zero errors.

### Provider Issues

```bash
npm run setup -- --force-setup
```

Re-runs provider configuration.

### Missing Guidelines

Generate guidelines first:

```bash
npm run guidelines -- /path/to/project
npm run indexes -- /path/to/project
```

### Update Mode Not Working

Make sure you're running commands on a project with existing `.guidelines/`:

```bash
# First time - creates files
npm run setup

# Later - updates files
npm run guidelines  # Will prompt for update mode
```

## Documentation

- [UPDATING.md](./UPDATING.md) - Complete update workflow guide
- [CLAUDE.md](./CLAUDE.md) - Development guidelines for this project
- [Tech-Stack Skills Architecture](./src/core/phases/claude-artifacts/tech-stack-skills/README.md) - Auto-generated security & code quality skills (for contributors)

## Contributing

We welcome contributions! The codebase follows clean architecture principles with dependency injection.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Complete architecture documentation
- Development workflow and guidelines
- Code standards and best practices
- Testing guidelines
- Security best practices
- Pull request process

**Quick start:**

```bash
# Clone and install
git clone https://github.com/lbouriez/GuideGen
cd GuideGen
npm install

# Run tests
npm test

# Build
npm run build

# Run locally
npm start -- setup /path/to/test/project
```

**Adding features:**

1. **New phase** - Add to `src/core/phases/` with tests
2. **New workflow** - Add to `src/core/workflows/`
3. **New provider** - Implement `IProviderClient` interface
4. **New service** - Use `@injectable()` decorator and add to DI container
5. **New tech-stack skill** - See [Tech-Stack Skills Architecture](./src/core/phases/claude-artifacts/tech-stack-skills/README.md) for extensibility guide

All code must:
- ✅ Have zero `any` types
- ✅ Include unit tests
- ✅ Follow existing patterns
- ✅ Include JSDoc for public APIs

## License

MIT

---

**GuideGen** - AI-powered documentation that evolves with your code.
