# Tech Stack Skills Module

**AI-powered security and code quality skills for Claude Code**

## Overview

This module provides an extensible framework for generating tech-stack-specific skills that differ from regular workflow skills by being **preventive checklists** rather than procedural guides.

### Key Features

- ✅ **100% AI-Generated** - No hardcoded threat databases or quality standards
- ✅ **Tech Stack Aware** - Analyzes project's languages, frameworks, and dependencies
- ✅ **Automatically Applicable** - AI determines if skills are relevant to the project
- ✅ **Easy to Extend** - Registry pattern makes adding new skill types trivial
- ✅ **Guideline Integration** - References existing project guidelines when available

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  ClaudeArtifactsWorkflow                │
│                                                         │
│  1. Generate workflow skills (from guidelines)          │
│  2. Generate tech-stack skills (via orchestrator) ← NEW │
│  3. Generate agents                                     │
│  4. Generate CLAUDE.md                                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              TechStackSkillOrchestrator                 │
│                                                         │
│  For each registered generator:                         │
│    1. Check applicability (AI-based)                    │
│    2. Generate skill content (AI-based)                 │
│    3. Convert to GeneratedSkill format                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────┬────────────────────┬──────────────┐
│  SecuritySkillGen  │ CodeQualitySkillGen│  Future...   │
│                    │                    │              │
│  • Analyzes stack  │  • Analyzes stack  │  • Performance│
│  • Identifies      │  • Identifies      │  • A11y      │
│    threats via AI  │    standards via AI│  • Testing   │
│  • Generates       │  • Generates       │  • Docs      │
│    checklist       │    checklist       │              │
└────────────────────┴────────────────────┴──────────────┘
```

## How It Works

### 1. Applicability Detection (AI-Powered)

Each skill generator uses AI to determine if the skill is relevant:

```typescript
// Example: SecuritySkillGenerator
const response = await client.completeWithJson({
  systemPrompt: "You are a security expert...",
  userPrompt: `
    Tech Stack: Express, MongoDB, JWT

    Is a security review skill applicable?
    Priority level?
    Why or why not?
  `
});
```

**AI Response:**
```json
{
  "isApplicable": true,
  "priority": "critical",
  "reason": "Express with MongoDB and JWT requires SQL/NoSQL injection prevention, auth best practices",
  "skillName": "Express API Security Review"
}
```

### 2. Content Generation (AI-Powered)

If applicable, AI generates the full skill content:

```typescript
const skillContent = await client.complete({
  systemPrompt: "You are a security expert...",
  userPrompt: `
    Generate a security checklist for Express + MongoDB + JWT

    Include:
    - Top 5-7 security threats
    - BAD (❌) and GOOD (✅) examples
    - References to project guidelines
    - Actionable checks
  `
});
```

**Result:** Full markdown checklist skill tailored to the project's tech stack

## Built-In Generators

### 1. SecuritySkillGenerator

**Purpose:** Generates security review checklist based on tech stack

**Triggers For:**
- Backend frameworks (Express, Fastify, Django, Rails)
- Frontend frameworks with user input (React, Vue, Angular)
- Projects with authentication/database dependencies

**Does Not Trigger For:**
- Simple CLI tools without network-facing code
- Static site generators without user input
- Low-risk utility libraries

**Example Output (Express + Mongoose):**
```markdown
# Express API Security Review

## When to Use
Before committing code or during PR review, especially when:
- Modifying API endpoints
- Handling user input
- Working with authentication/authorization

## Security Checklist

### Input Validation
- [ ] All user inputs validated with Zod/Joi
- [ ] No direct interpolation into queries
- [ ] File upload size limits enforced

❌ BAD: `db.query('SELECT * FROM users WHERE id = ' + req.params.id)`
✅ GOOD: `db.query('SELECT * FROM users WHERE id = ?', [req.params.id])`

**Why It Matters:** SQL injection is the #1 OWASP threat

### Authentication
- [ ] JWT tokens expire (max 24h)
- [ ] Refresh tokens properly rotated
- [ ] No sensitive data in tokens

[...]
```

### 2. CodeQualitySkillGenerator

**Purpose:** Generates code quality checklist based on tech stack

**Triggers For:**
- Typed languages (TypeScript, Java, Rust)
- Large codebases (>10k LOC)
- Projects with complex business logic

**Does Not Trigger For:**
- Simple scripts (<500 LOC)
- Projects with extensive linter configs (lighter touch)
- Prototypes or experimental code

**Example Output (TypeScript):**
```markdown
# TypeScript Code Quality Review

## When to Use
During code review or before committing significant changes

## Code Quality Checklist

### Complexity & Maintainability
- [ ] Functions < 50 lines
- [ ] Cyclomatic complexity < 10
- [ ] Max nesting depth: 3

❌ BAD: [200-line function with 8 nested ifs]
✅ GOOD: [Refactored into 4 smaller functions]

### Type Safety
- [ ] No `any` types (except documented escape hatches)
- [ ] All functions have return types
- [ ] Strict null checks enabled

[...]
```

## Adding New Skill Generators

The architecture is designed for easy extensibility. Here's how to add a new skill type:

### Example: PerformanceSkillGenerator

```typescript
// src/core/phases/claude-artifacts/tech-stack-skills/PerformanceSkillGenerator.ts

import type { ITechStackSkillGenerator, TechStackSkillMetadata } from './types';

export class PerformanceSkillGenerator implements ITechStackSkillGenerator {
  readonly category: SkillCategory = 'performance';

  async checkApplicability(
    client: IProviderClient,
    techProfile: TechProfile,
    packageJson?: Record<string, any>
  ): Promise<TechStackSkillMetadata> {
    const systemPrompt = `You are a performance expert analyzing tech stacks.`;

    const userPrompt = `
      Tech Stack: ${JSON.stringify(techProfile)}

      Is a performance optimization skill applicable?
      Consider: database queries, large datasets, real-time features, etc.
    `;

    const response = await client.completeWithJson(systemPrompt, userPrompt);

    return {
      id: 'performance-optimization',
      name: response.skillName,
      category: 'performance',
      whenToUse: 'Before deploying performance-critical features',
      priority: response.priority,
      isApplicable: response.isApplicable,
      applicabilityReason: response.reason,
    };
  }

  async generateSkill(
    client: IProviderClient,
    metadata: TechStackSkillMetadata,
    techProfile: TechProfile,
    guidelines: GeneratedGuideline[],
    packageJson?: Record<string, any>
  ): Promise<string> {
    const systemPrompt = `You are a performance expert...`;

    const userPrompt = `
      Generate a performance optimization checklist for ${techProfile.frameworks.join(', ')}

      Include:
      - Common performance bottlenecks
      - Optimization techniques
      - Profiling tools
      - Benchmarking strategies
    `;

    return await client.complete(systemPrompt, userPrompt);
  }
}
```

### Register the Generator

```typescript
// src/core/phases/claude-artifacts/tech-stack-skills/index.ts

import { PerformanceSkillGenerator } from './PerformanceSkillGenerator';

export function createDefaultTechStackSkillRegistry(): TechStackSkillRegistry {
  const registry = new TechStackSkillRegistry();

  registry.register(new SecuritySkillGenerator());
  registry.register(new CodeQualitySkillGenerator());
  registry.register(new PerformanceSkillGenerator()); // ← Add here

  return registry;
}
```

**That's it!** The new skill will automatically:
- Be checked for applicability
- Generate content if applicable
- Integrate into the Claude artifacts workflow

## Design Principles

### 1. AI-First, No Hardcoding

**❌ BAD (Hardcoded):**
```typescript
const SECURITY_THREATS = {
  express: ['SQL injection', 'XSS', 'CSRF', ...]
};
```

**✅ GOOD (AI-Generated):**
```typescript
const threats = await ai.identifyThreats(techProfile);
```

**Why:** AI models are updated with latest vulnerabilities; hardcoded lists become stale.

### 2. Tech Stack Specific, Not Generic

**❌ BAD (Generic):**
```markdown
## Security Checklist
- Validate all inputs
- Use HTTPS
- Encrypt passwords
```

**✅ GOOD (Tech-Specific):**
```markdown
## Security Checklist (Express + Mongoose)
- Validate with Zod (already in dependencies)
- Use helmet.js for security headers
- Sanitize MongoDB queries against NoSQL injection
```

### 3. Preventive, Not Reactive

| Regular Skills | Tech-Stack Skills |
|---------------|-------------------|
| "How to create API endpoint" | "Before committing, check for SQL injection" |
| Procedural workflows | Preventive checklists |
| During development | During review/before commit |

### 4. Complement, Don't Duplicate

If project already has:
- ESLint → Code quality skill focuses on **higher-level concerns** (architecture, complexity)
- Security linters → Security skill focuses on **threat modeling** (what to look for)

## Integration Points

### Workflow Integration

```typescript
// src/workflows/claude-artifacts/ClaudeArtifactsWorkflow.ts

private async generateArtifacts(...) {
  // 1. Generate workflow skills
  const workflowSkills = await this.skillGenerator.generate(...);

  // 2. Generate tech-stack skills (NEW)
  const techStackSkills = await this.generateTechStackSkills(
    client,
    techProfile,  // ← Uses tech profile from discovery phase
    guidelines,
    packageJson
  );

  // 3. Combine all skills
  const allSkills = [...workflowSkills, ...techStackSkills];

  // 4. Generate agents, CLAUDE.md, etc.
  // ...
}
```

### Skills Count

- **Workflow skills:** Max 5 (from guidelines)
- **Tech-stack skills:** Typically 1-2 (security + code quality)
- **Total:** Usually 6-7 skills per project

Tech-stack skills don't count toward the workflow skill limit.

## Benefits

### For Developers

- ✅ **Catch vulnerabilities before commit** (proactive security co-pilot)
- ✅ **Learn best practices through examples** (educational)
- ✅ **Consistent code quality** across team
- ✅ **Reduced code review time** (automated checks)

### For GuideGen Project

- ✅ **Unique differentiator** (no competitor does this)
- ✅ **Increases perceived value** of generated artifacts
- ✅ **Positions GuideGen as security-conscious**
- ✅ **Easy to extend** with new skill types

## Future Skill Types

The abstraction supports these future generators:

1. **PerformanceSkillGenerator** - Query optimization, caching, profiling
2. **AccessibilitySkillGenerator** - WCAG compliance, ARIA, screen readers
3. **TestingSkillGenerator** - Coverage, test strategies, mocking patterns
4. **DocumentationSkillGenerator** - API docs, README, JSDoc standards

**To add a new skill type:**
1. Create `XSkillGenerator.ts` implementing `ITechStackSkillGenerator`
2. Register in `createDefaultTechStackSkillRegistry()`
3. Done! No other changes needed.

## Testing

### Unit Tests

```typescript
// tests/unit/core/phases/claude-artifacts/tech-stack-skills/SecuritySkillGenerator.test.ts

describe('SecuritySkillGenerator', () => {
  it('should detect security skill is applicable for Express projects', async () => {
    const generator = new SecuritySkillGenerator();
    const techProfile = {
      frameworks: ['express'],
      languages: ['typescript']
    };

    const metadata = await generator.checkApplicability(
      mockClient,
      techProfile,
      {}
    );

    expect(metadata.isApplicable).toBe(true);
    expect(metadata.priority).toBe('critical');
  });

  it('should not apply security skill to simple CLI tools', async () => {
    // ...
  });
});
```

### Integration Tests

```typescript
// tests/integration/claude-artifacts-workflow.test.ts

it('should generate security and code quality skills for TypeScript/Express project', async () => {
  const result = await workflow.execute(
    client,
    projectPath,
    techProfile, // Express + TypeScript
    false
  );

  expect(result.success).toBe(true);
  expect(result.skillsGenerated).toBeGreaterThanOrEqual(2); // At least workflow + security

  const securitySkill = result.skills.find(s => s.name.includes('Security'));
  expect(securitySkill).toBeDefined();
  expect(securitySkill.content).toContain('SQL injection');
});
```

## FAQ

### Q: Will this replace professional security audits?

**A:** No. Tech-stack skills are a **first line of defense**, not comprehensive security. They help catch common vulnerabilities during development but don't replace:
- Penetration testing
- Security code review by experts
- Threat modeling
- Compliance audits

We include a disclaimer in generated skills recommending professional audits.

### Q: What if AI generates false positives?

**A:** Skills are **guidance, not enforcement**. Claude Code users can:
- Ignore checks that don't apply to their use case
- Add comments explaining exceptions
- Provide feedback to improve future generations

Skills complement (not replace) developer judgment.

### Q: How often is the knowledge updated?

**A:** Every skill generation queries the AI model's **current knowledge**. As AI models are updated with new vulnerabilities (e.g., Log4Shell, new OWASP Top 10), skills automatically reflect latest threats without code changes.

### Q: Can I customize the generated skills?

**A:** Yes! Generated skills are markdown files in `.claude/skills/`. You can:
- Edit them directly
- Add project-specific checks
- Remove irrelevant sections

Future updates will intelligently merge changes (preserving your customizations).

## Performance

- **Applicability Check:** ~1-2 seconds per generator (parallel)
- **Skill Generation:** ~5-10 seconds per applicable skill (parallel)
- **Total Overhead:** ~10-20 seconds added to Claude artifacts workflow

This is a **one-time cost** during initial setup. Updates only regenerate if tech stack changes.

## Debugging

Enable debug logging to see applicability decisions:

```typescript
const orchestrator = new TechStackSkillOrchestrator(registry, logger);

// Logs:
// ✓ Security skill applicable: Express with MongoDB requires injection prevention (critical)
// ✗ Performance skill not applicable: Small codebase (<1000 LOC) with no performance bottlenecks (low)
```

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Implementation Status:** ✅ Complete (2026-01-23)

**Contributors:** Claude Code (AI) + User Guidance
