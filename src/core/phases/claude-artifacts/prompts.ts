/**
 * Prompts for Claude skills and agents generation
 */

export const SKILL_SYSTEM_PROMPT = `You are creating Claude Code skills - workflow automation for common development tasks.

A skill must:
1. **Reference guidelines** - Don't duplicate content, link to relevant guidelines
2. **Define clear steps** - Numbered workflow with clear inputs/outputs
3. **Be actionable** - Each step should be concrete and executable
4. **Handle edge cases** - Common issues and how to resolve them

## Skill Structure

\`\`\`markdown
---
name: skill-name
description: Brief description (one line)
---

# Skill Name

> Brief overview of what this skill does and when to use it

## When to Use

Use this skill when:
- [Scenario 1]
- [Scenario 2]

## Prerequisites

- [Required tool/knowledge 1]
- [Required tool/knowledge 2]

## Workflow

### Step 1: [Action]

**Guideline**: [Link to relevant guideline](../../.guidelines/domain/file.md)

**Actions**:
1. Specific action 1
2. Specific action 2

**Verification**:
- [ ] Check that X is true
- [ ] Verify Y works

### Step 2: [Action]

**Guideline**: [Link to relevant guideline](../../.guidelines/domain/file.md)

**Actions**:
1. Specific action 1

### Step N: [Final Action]

**Verification**:
- [ ] All tests pass
- [ ] Build succeeds

## Common Issues

### Issue: [Problem]
**Solution**: [How to fix]

### Issue: [Problem]
**Solution**: [How to fix]

## Related Skills

- [Other Skill](./other-skill.md) - When you need to do X instead
\`\`\`
`;

export const AGENT_SYSTEM_PROMPT = `You are creating Claude Code agents - enforcement agents that validate code against project rules.

An agent must:
1. **Reference guidelines** - Link to the guideline that defines the rule
2. **Define verification steps** - Clear, executable checks
3. **Provide helpful feedback** - Show violations and suggest fixes
4. **Be non-intrusive** - Run automatically without blocking workflow

## Agent Structure

\`\`\`markdown
---
name: agent-name
description: Brief description (one line)
model: haiku  # or sonnet for complex analysis
trigger: on_edit  # or on_save, on_commit
---

# Agent Name

> Brief overview of what this agent enforces and why it matters

## Rule Reference

**Guideline**: [Link to guideline](../../.guidelines/domain/file.md)

**Rule**: [Quote the specific rule from the guideline]

## Why This Matters

[1-2 sentences explaining why this rule is important]

## Verification Steps

1. **Check for X**
   - Look for pattern Y
   - Validate condition Z

2. **Verify Y**
   - Scan for anti-pattern A
   - Report violations

## Example Violations

### ❌ Bad
\`\`\`language
// Code that violates the rule
\`\`\`

### ✅ Good
\`\`\`language
// Correct implementation
\`\`\`

## Auto-Fix

Can this violation be auto-fixed? [Yes/No]

If yes, describe the transformation:
- Replace X with Y
- Add Z

## Related Agents

- [Other Agent](./other-agent.md) - Enforces related rule
\`\`\`
`;

export function SKILL_USER_PROMPT(
  skillName: string,
  workflow: string,
  relatedGuidelines: string[]
): string {
  return `Generate a Claude Code skill for: **${skillName}**

## Workflow Description

${workflow}

## Related Guidelines

${relatedGuidelines.map(g => `- ${g}`).join('\n')}

## Instructions

1. Break the workflow into clear, numbered steps
2. For each step, reference the relevant guideline
3. Include verification checkpoints
4. Add common issues and solutions
5. Keep it actionable and specific
6. Link to related skills if relevant

Generate the complete skill in markdown format with proper frontmatter.`;
}

export function AGENT_USER_PROMPT(
  agentName: string,
  rule: string,
  guidelineReference: string,
  examples: string,
  techStackSummary: string
): string {
  return `Generate a Claude Code agent for: **${agentName}**

## Project Tech Stack

${techStackSummary}

## Rule to Enforce

${rule}

## Guideline Reference

${guidelineReference}

## Code Examples

${examples}

## CRITICAL - Tech Stack Validation

**IMPORTANT**: All example code in this agent MUST match the project's tech stack listed above.

- Use the EXACT languages, frameworks, and tools from the tech stack
- DO NOT use examples from different languages (e.g., Python in a TypeScript project)
- Example violations and corrections must be executable in this project's environment
- Match the syntax and conventions of the detected languages

## Instructions

1. Clearly reference the guideline that defines this rule
2. Define verification steps that can be automated
3. Show example violations and correct implementations **using the tech stack languages**
4. Indicate if auto-fix is possible
5. Choose appropriate model (haiku for simple, sonnet for complex)
6. Set trigger (on_edit, on_save, on_commit)

Generate the complete agent in markdown format with proper frontmatter.`;
}
