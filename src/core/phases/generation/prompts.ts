/**
 * Generation phase prompts
 * Phase 4: Generate CLAUDE.md, guidelines, skills, and agents
 */

import type { ILogger } from '../../../interfaces/services/ILogger';

interface ParsedRule {
  title: string;
  description: string;
}

interface ParsedPattern {
  description?: string;
  [key: string]: unknown;
}

export const CLAUDE_MD_SYSTEM_PROMPT = `You are generating a CLAUDE.md file for a project.

CLAUDE.md should be:
1. **Lightweight** - Quick reference, not comprehensive documentation
2. **Critical rules focused** - Only the most important rules
3. **Reference-based** - Point to guidelines for details

## Structure

\`\`\`markdown
# Project Development Guidelines

## Critical Rules (Always Apply)

**Backend:**
- ❌ Never X → ✅ Always Y
- ...

**Frontend:**
- ❌ Never X → ✅ Always Y
- ...

## Quick Commands

\`\`\`bash
# Common commands
\`\`\`

## Full Guidelines

See \`.guidelines/index.md\` for complete documentation.

## Skills & Agents

**Skills** (invoke with \`/skillname\`):
- \`/skill\` - Description

**Agents** (automatic enforcement):
- \`agent-name\` - Description
\`\`\``;

export const CLAUDE_MD_USER_PROMPT = (
  projectName: string,
  rules: string,
  workflows: string,
  techProfile: string
): string => {
  return `Generate a CLAUDE.md file for this project.

## Project: ${projectName}

## Tech Profile
${techProfile}

## Rules
${rules}

## Workflows
${workflows}

Generate a lightweight CLAUDE.md that:
1. Lists only critical rules (do/don't format)
2. Includes quick commands for common tasks
3. References .guidelines/index.md for full documentation
4. Lists generated skills and agents

Return ONLY the markdown content, no code blocks.`;
};

export const GUIDELINE_SYSTEM_PROMPT = `You are generating a guideline document for a specific domain (backend, frontend, etc.).

Guidelines should:
1. **Be comprehensive** - Cover patterns, examples, common mistakes
2. **Include code examples** - Real, working examples from the detected patterns
3. **Be actionable** - Clear do/don't instructions
4. **Context-aware** - Only include content relevant to the actual codebase patterns

## IMPORTANT Link Rules:
- ❌ **DO NOT create links to non-existent documents**
- ❌ **DO NOT reference external or unrelated guidelines**
- ❌ **DO NOT use placeholder links like "link" or "here"**
- ✅ **Only reference other guidelines in the same domain if they exist**
- ✅ **Use relative links like "../architecture/architecture.md" for domain references**
- ✅ **Avoid links entirely if unsure about their existence**

## Structure

1. Overview section (what this guideline covers based on detected patterns)
2. Key Patterns (explain actual patterns found in the codebase)
3. Implementation (step-by-step guidance with real examples)
4. Common Mistakes (issues seen in the codebase patterns)
5. Checklist (practical verification steps)
6. Related Guidelines (only if they actually exist and are relevant)`;

export const PRACTICAL_GUIDELINE_SYSTEM_PROMPT = `You are generating a practical coding guideline for AI agents and developers.

The guideline must be:
1. **Actionable** - Clear do/don't rules that AI agents can follow
2. **Code-Focused** - Include real code examples from the project
3. **Pattern-Based** - Show established patterns and anti-patterns
4. **Comprehensive** - Cover implementation, testing, and best practices

## Required Structure

# [Topic] Guidelines

## Overview
Brief description of what this guideline covers.

## Do's ✅
- **Specific Rule**: Explanation with code example
- **Another Rule**: More examples and reasoning

## Don'ts ❌
- **Anti-Pattern**: Why to avoid, with bad example
- **Another Anti-Pattern**: Correct alternative

## Code Examples

### Good Implementation
\`\`\`typescript
// Actual working code from the project
function example() {
  // Implementation following best practices
}
\`\`\`

### Anti-Pattern (Avoid)
\`\`\`typescript
// Bad example with explanation of why
function badExample() {
  // Problematic implementation
}
\`\`\`

## Testing Guidelines
How to test implementations following these patterns.

## Related Patterns
Links to other relevant guidelines (if they exist).

## AI Agent Instructions
Specific instructions for AI assistants following these guidelines.`;

export const INDEX_SYSTEM_PROMPT = `You are generating an index file for development guidelines.

The index should:
1. **Be navigational** - Provide clear links to guideline files
2. **Be comprehensive** - Reference ALL available guidelines in the domain
3. **Be organized** - Group related guidelines logically with clear sections
4. **Be practical** - Include quick navigation sections and common workflows
5. **Be scannable** - Easy to find specific topics quickly

Structure the index with:
- Clear section headers with emojis for visual navigation
- Descriptive link text with brief explanations
- Logical grouping of related guidelines
- Quick navigation sections ("Start Here", "Common Workflows")
- Core rules summary section
- Cross-references between related guidelines

For domain indexes, include:
- Domain overview and purpose
- Links to all category-specific guidelines
- Quick reference to critical rules
- Common development workflows
- Links to relevant skills and agents

For the main index, include:
- Project overview with tech stack summary
- Navigation by domain (backend, frontend, shared, etc.)
- Navigation by category (database, API, components, etc.)
- Quick reference links to critical rules, skills, and agents
- Development workflow guidance

Return ONLY the markdown content with proper formatting.`;

export const INDEX_USER_PROMPT = (
  techProfile: string,
  domains: string[]
): string => {
  const domainList = domains.map(d => `- **${d}**: ${d}-index.md`).join('\n');

  return `Generate a main guidelines index for this project.

## Tech Profile
${techProfile}

## Available Domains
${domainList}

Create a concise index that provides navigation to all guideline domains without duplicating their content. Focus on:
1. Brief project overview
2. Links to domain-specific guidelines
3. Quick reference to important resources
4. Organized categorization of guidelines

Return ONLY the markdown content.`;
};

export const GUIDELINE_USER_PROMPT = (
  domain: string,
  patterns: string,
  rules: string,
  logger?: ILogger
): string => {
  let patternsData: Record<string, ParsedPattern> = {};
  let rulesData: ParsedRule[] = [];

  // Safely parse patterns with error handling
  try {
    patternsData = JSON.parse(patterns || '{}') as Record<string, ParsedPattern>;
  } catch (error) {
    if (logger) {
      logger.warn(`Failed to parse patterns for domain ${domain}`, error);
    }
  }

  // Safely parse rules with error handling
  try {
    rulesData = JSON.parse(rules || '[]') as ParsedRule[];
  } catch (error) {
    if (logger) {
      logger.warn(`Failed to parse rules for domain ${domain}`, error);
    }
  }

  const hasPatterns = Object.keys(patternsData).length > 0;
  const hasRules = rulesData.length > 0;

  let prompt = `Generate a comprehensive guideline document for: ${domain}

`;

  if (hasPatterns) {
    prompt += `## Detected Patterns in Codebase:
${Object.entries(patternsData).map(([key, value]) =>
  `- **${key}**: ${value.description || 'Pattern detected in codebase'}`
).join('\n')}

`;
  }

  if (hasRules) {
    prompt += `## Established Rules:
${rulesData.map((rule) =>
  `- **${rule.title}**: ${rule.description}`
).join('\n')}

`;
  }

  prompt += `## Requirements:
1. **Codebase-Specific**: Only discuss patterns and technologies actually detected in this codebase
2. **Real Examples**: Use concrete code patterns from the analysis above
3. **Practical Focus**: Provide immediately actionable guidance
4. **No Broken Links**: Do not reference any documents or guidelines that don't exist
5. **Self-Contained**: This guideline should stand alone without external references

## Content Guidelines:
- Focus ONLY on technologies and patterns present in the codebase
- Use actual code examples from the detected patterns
- Avoid generic advice not supported by the codebase analysis
- Do not mention or link to technologies not found in the patterns
- Keep content concise and focused on what was actually detected

## Output Format:
Return ONLY the markdown content. Do not include any links to non-existent documents. Focus on providing value through concrete, actionable content based on the real codebase analysis.

If there are no significant patterns or rules for this category in the codebase, generate a brief overview explaining that this area may need more development or standardization.`;

  return prompt;
};

export const SKILL_SYSTEM_PROMPT = `You are generating a Claude Code skill file.

Skills should:
1. **Define workflow** - Step-by-step process
2. **Reference guidelines** - Point to docs, don't duplicate content
3. **Be actionable** - Clear instructions

## Skill Format

\`\`\`markdown
---
name: skill-name
description: When to use this skill
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
model: claude-sonnet-4-5-20250929
---

# Skill Title

## When to Use

Brief description of when this skill applies.

## Workflow

### Step 1: Action
**Guideline**: \`.guidelines/path/to/file.md\`

Brief description and reference to guideline.

### Step 2: ...

## Checklist

- [ ] Item 1
- [ ] Item 2

## Related Guidelines

| Topic | Guideline |
|-------|-----------|
| Name | \`file.md\` |
\`\`\``;

export const SKILL_USER_PROMPT = (
  skillName: string,
  workflow: string,
  guidelines: string[]
): string => {
  return `Generate a Claude Code skill for: ${skillName}

## Workflow
${workflow}

## Available Guidelines to Reference
${guidelines.map((g) => `- ${g}`).join('\n')}

Generate a skill that:
1. Defines clear steps
2. References guidelines (don't duplicate content)
3. Includes a verification checklist

Return ONLY the markdown content including the frontmatter.`;
};

export const AGENT_SYSTEM_PROMPT = `You are generating a Claude Code agent file.

Agents should:
1. **Enforce rules** - Check for violations
2. **Reference guidelines** - Point to the "why"
3. **Provide fixes** - Show correct replacement

## Agent Format

\`\`\`markdown
---
name: agent-name
description: When to use this agent with examples
model: haiku
color: yellow
---

# Agent description

## Rule Reference

**Guideline**: \`.guidelines/path/to/file.md\`

## Quick Reference

Brief rule summary.

## Verification Workflow

1. Scan for violations
2. Report with fix suggestions
3. Apply fixes if requested

## Output Format

How to report violations.
\`\`\``;

export const AGENT_USER_PROMPT = (
  agentName: string,
  rule: string,
  guidelinePath: string
): string => {
  return `Generate a Claude Code agent for: ${agentName}

## Rule to Enforce
${rule}

## Guideline to Reference
${guidelinePath}

Generate an agent that:
1. Describes when to trigger (with examples)
2. References the guideline for the rule details
3. Defines a clear verification workflow
4. Shows expected output format

Return ONLY the markdown content including the frontmatter.`;
};
