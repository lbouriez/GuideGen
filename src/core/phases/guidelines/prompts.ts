/**
 * Prompts for guidelines generation
 */

import type { TechProfile } from '../../../types';

export const GUIDELINE_SYSTEM_PROMPT = `You are an expert technical writer creating coding guidelines that DOCUMENT existing code patterns.

CRITICAL: Your guidelines must ONLY document what EXISTS in the codebase. Do NOT:
- Recommend technologies/frameworks not found in the code
- Suggest "better" alternatives to existing patterns
- Invent examples using libraries that aren't imported
- Propose architectural changes
- Write generic advice that applies to any codebase

Your guidelines must be:
1. **Descriptive** - Document how the code currently works
2. **Evidence-based** - Every rule must have real code evidence
3. **Pattern-based** - Show actual patterns found in the codebase
4. **Factual** - No recommendations, only documentation
5. **Specific** - Document concrete implementations, not abstract concepts

AVOID GENERIC ADVICE (This is CRITICAL - do NOT include these):
- ❌ "Use the import statement to import modules" (obvious, applies everywhere)
- ❌ "Do not use require()" (NEVER include this unless project is mixed CommonJS/ESM)
- ❌ "Do not use var" (obvious for modern JavaScript)
- ❌ "Use const/let instead of var" (too trivial)
- ❌ "Follow the naming convention" (not specific enough)
- ❌ "Use camelCase for variables" or "Use PascalCase for classes" (too generic unless documenting specific project conventions)
- ❌ "Use the existing directory structure" (not specific enough)
- ❌ "Add semicolons at end of statements" (too trivial)

PROVIDE CONCRETE, PROJECT-SPECIFIC DOCUMENTATION:
- ✅ "Use @injectable() decorator on all service classes for DI"
- ✅ "Providers must implement IProviderClient interface with completeWithJson method"
- ✅ "Phase functions return PhaseResult<T> with success/error states"

## Guideline Structure

Use this structure for every guideline:

# [Domain] - [Concept]

> **1-2 sentence summary**
> 
> Detailed context about why this exists and when to use it.

---

## When to Use This Guide

Use this guide when:
- [Condition 1]
- [Condition 2]

---

## Overview

[2-3 paragraphs explaining the concept]

---

## Key Rules

### ✅ DO

- ✅ **[Rule with example]**
  \`\`\`typescript
  // Good example
  \`\`\`

### ❌ NEVER

- ❌ **[Anti-pattern]**
  \`\`\`typescript
  // ❌ Bad
  // ✅ Good alternative
  \`\`\`

---

## Complete Example

[Real feature walkthrough with actual code from the codebase]

---

NOTE: Do NOT include a "Related Documents" section - this will be generated separately after all guidelines are created.
`;

export function GUIDELINE_USER_PROMPT(
  domain: string,
  guidelineType: string,
  patterns: string,
  codeExamples: string,
  techProfile: TechProfile
): string {
  // Build tech stack summary for validation
  const techStackInfo = buildTechStackSummary(techProfile);

  return `Document the coding patterns for: **${domain} - ${guidelineType}**

## Context

**Domain**: ${domain}
**Guideline Type**: ${guidelineType}

## Detected Tech Stack

${techStackInfo}

## Detected Patterns

${patterns}

## Code Examples from Codebase

${codeExamples}

## CRITICAL - Tech Stack Validation

**BEFORE finalizing each code example, verify it matches the DETECTED tech stack above:**

1. **Testing Framework Check**:
   ${techProfile.stack.testingFrameworks && techProfile.stack.testingFrameworks.length > 0
     ? `- Detected: ${techProfile.stack.testingFrameworks.join(', ')}
   - If Vitest is detected: Use \`vi.fn()\`, \`vi.mock()\`, import from 'vitest'
   - If Jest is detected: Use \`jest.fn()\`, \`jest.mock()\`, import from '@jest/globals'
   - NEVER mix frameworks - if Vitest is detected, DO NOT use Jest syntax`
     : '- No testing framework detected in tech stack'}

2. **Language/Framework Check**:
   ${techProfile.stack.languages && techProfile.stack.languages.length > 0
     ? `- Languages: ${techProfile.stack.languages.join(', ')}
   - Ensure examples use the correct language syntax`
     : ''}
   ${techProfile.stack.frameworks && techProfile.stack.frameworks.length > 0
     ? `- Frameworks: ${techProfile.stack.frameworks.join(', ')}
   - Ensure examples reference these frameworks, not alternatives`
     : ''}

3. **Self-Validation Process**:
   - After writing each code example, ask yourself: "Does this use the tech stack listed above?"
   - If you catch yourself using a framework NOT in the detected list, STOP and correct it
   - Examples must use ACTUAL libraries/frameworks from the codebase, not similar alternatives

**Why This Matters**: We detected the project uses ${techProfile.stack.testingFrameworks?.join(', ') || 'specific technologies'}.
Examples using different technologies would confuse developers and won't work in this codebase.

## CRITICAL - Real Code Examples Only

**ABSOLUTELY FORBIDDEN - Generic/Placeholder Code**:

You are STRICTLY PROHIBITED from writing generic examples like these:
- ❌ \`function example() { }\` (placeholder function name)
- ❌ \`class MyService { }\` (generic service name)
- ❌ \`const foo = 'bar'\` (meaningless variable names)
- ❌ \`// Do something\` (vague comments)
- ❌ \`return result\` (without context from real code)
- ❌ Any code that looks like a textbook example

**REQUIRED - Copy-Paste Real Code**:

Every code example MUST be directly traceable to the "Code Examples from Codebase" section above:

1. **Before writing ANY code example**:
   - Identify the EXACT file/section it comes from in the code examples above
   - Copy the relevant snippet directly (with minor formatting adjustments if needed)
   - Preserve actual class names, function names, variable names, import paths

2. **Validation Checklist** (ask yourself before including an example):
   - ✅ "Can I point to where this code appears in the examples above?"
   - ✅ "Does this use the actual class/function names from the codebase?"
   - ✅ "Are these the real imports used in the project?"
   - ❌ "Did I just make this up because it seems like a good example?" - FORBIDDEN

3. **Good vs Bad Examples**:

   ❌ **BAD - Generic placeholder**:
   \`\`\`typescript
   // Generic example - NOT from codebase
   class UserService {
     async getUser(id: string) {
       return await db.query('SELECT * FROM users WHERE id = ?', [id]);
     }
   }
   \`\`\`

   ✅ **GOOD - Real code from codebase**:
   \`\`\`typescript
   // From src/services/GuidelineFileService.ts
   @injectable()
   export class GuidelineFileService {
     async writeAll(guidelines: GeneratedGuideline[]): Promise<void> {
       await Promise.all(
         guidelines.map(g => this.write(g.domain, g.fileName, g.content))
       );
     }
   }
   \`\`\`

4. **If you need to show a pattern but lack a perfect example**:
   - Use the CLOSEST real example from the code
   - Add a comment: "// Adapted from src/path/to/file.ts"
   - Modify minimally - preserve class names, imports, structure
   - NEVER create fictional examples from scratch

**Enforcement**: If you write generic code like \`function example()\` or \`const foo = 'bar'\`,
this guideline will FAIL validation and must be regenerated.

## STRICT Instructions

1. **ONLY use code/patterns shown above** - Do NOT invent or recommend alternatives
2. **If a technology is not mentioned above, do NOT include it** - No Winston, no libraries not imported
3. **Document what IS, not what SHOULD BE** - Descriptive, not prescriptive
4. **Every rule must have evidence from the code examples** - No generic best practices
5. **Use ACTUAL imports and code from the examples** - Copy real patterns directly, preserve names
6. **NO GENERIC ADVICE** - Avoid obvious statements like "use import", "use export", "follow naming"
7. **EVERY code example must be real** - Traceable to code examples above, not invented

Examples of GOOD vs BAD rules:
- ❌ BAD: "Use Winston for logging" (Winston not found in code)
- ✅ GOOD: "Use console.log for logging" (if that's what the code actually does)
- ❌ BAD: "Use the import statement to import modules" (obvious, generic)
- ✅ GOOD: "Import types with 'import type' for better tree-shaking"
- ❌ BAD: "Follow the naming convention" (not specific)
- ✅ GOOD: "Service classes use PascalCase with 'Service' suffix (e.g., SkillGeneratorService)"
- ❌ BAD: "Do not use require()" (NEVER include this - it's obvious for ES modules)
- ✅ GOOD: "All modules use ES6 imports with .js extensions for Node.js ESM compatibility"
- ❌ BAD: "Use camelCase for variables" (too generic, obvious)
- ✅ GOOD: "Private fields use leading underscore: _rateLimitQueue, _maxConcurrent"

SPECIAL INSTRUCTIONS FOR SPECIFIC GUIDELINE TYPES:

**For TypeScript imports / module imports guidelines:**
- Document BOTH path aliases (e.g., import from '@/types', '@/providers/*') AND relative imports if both exist
- Check the code examples for imports starting with '@/' - these are path aliases configured in tsconfig.json
- Show examples of both patterns and when each is used
- Include the tsconfig.json paths configuration if relevant

Generate the complete guideline documenting ONLY what exists in this codebase.
Focus on CONCRETE, TECHNICAL patterns, not generic organizational advice.`;
}

/**
 * Build a concise summary of the tech stack for prompt context
 */
function buildTechStackSummary(techProfile: TechProfile): string {
  const parts: string[] = [];

  if (techProfile.stack.languages && techProfile.stack.languages.length > 0) {
    parts.push(`**Languages**: ${techProfile.stack.languages.join(', ')}`);
  }

  if (techProfile.stack.frameworks && techProfile.stack.frameworks.length > 0) {
    parts.push(`**Frameworks**: ${techProfile.stack.frameworks.join(', ')}`);
  }

  if (techProfile.stack.testingFrameworks && techProfile.stack.testingFrameworks.length > 0) {
    parts.push(`**Testing**: ${techProfile.stack.testingFrameworks.join(', ')}`);
  }

  if (techProfile.stack.buildTools && techProfile.stack.buildTools.length > 0) {
    parts.push(`**Build Tools**: ${techProfile.stack.buildTools.join(', ')}`);
  }

  if (techProfile.stack.linters && techProfile.stack.linters.length > 0) {
    parts.push(`**Linters**: ${techProfile.stack.linters.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'No tech stack information available';
}
