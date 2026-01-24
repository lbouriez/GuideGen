/**
 * Improved agents generation logic
 * Two-phase approach: 1) AI selects guidelines with enforceable rules, 2) AI generates agents
 */

import type { IProviderClient } from '@/providers/types';
import type { GeneratedGuideline } from '@/types';
import { AGENT_SYSTEM_PROMPT } from './prompts';

export interface GeneratedAgent {
  name: string;
  fileName: string;
  content: string;
  referencedGuideline: string;  // Primary guideline this agent references
  rule: string;                 // Brief description of what rules this enforces
  referencedGuidelines?: string[];  // Optional: Additional guidelines (for backward compatibility)
}

interface GuidelineSelection {
  guidelinePath: string;
  guidelineTitle: string;
  agentName: string;
  enforceableRules: string[];
  reason: string;
}

const AGENT_SELECTION_SYSTEM_PROMPT = `You are a Claude Code expert helping identify which guidelines have enforceable rules that deserve dedicated agents.

An agent should be created when:
- The guideline contains CRITICAL rules that are commonly violated
- The rules can be automatically detected (e.g., missing decorator, wrong import pattern)
- Violations would cause bugs or architectural problems

DO NOT create agents for:
- Stylistic preferences (formatting, naming conventions handled by linters)
- Non-critical best practices
- Rules that cannot be automatically detected

Respond with valid JSON only.`;

/**
 * Phase 1: Ask AI which guidelines have enforceable rules deserving agents
 */
export async function selectGuidelinesForAgents(
  client: IProviderClient,
  guidelines: GeneratedGuideline[],
  maxAgents: number = 3
): Promise<GuidelineSelection[]> {
  // Build guideline summary
  const guidelineSummary = guidelines.map(g => {
    // Extract title from frontmatter
    const titleMatch = g.content.match(/^---\s*\ntitle:\s*([^\n]+)/m);
    const title = titleMatch ? titleMatch[1].trim() : g.fileName.replace('.md', '');

    // Extract description from frontmatter
    const descMatch = g.content.match(/description:\s*([^\n]+)/m);
    const description = descMatch ? descMatch[1].trim() : 'No description';

    // Extract DO rules (enforceable)
    const doSection = g.content.match(/### ✅ DO\s*\n([\s\S]*?)(?=###|$)/);
    const doRules = doSection ? doSection[1].split('\n').filter(l => l.trim().startsWith('- ✅')).slice(0, 3) : [];

    // Extract NEVER rules (enforceable)
    const neverSection = g.content.match(/### ❌ NEVER\s*\n([\s\S]*?)(?=###|$)/);
    const neverRules = neverSection ? neverSection[1].split('\n').filter(l => l.trim().startsWith('- ❌')).slice(0, 3) : [];

    return {
      path: `${g.domain}/${g.fileName}`,
      title,
      description,
      doRules: doRules.map(r => r.replace(/^- ✅\s*\*\*/, '').replace(/\*\*.*$/, '').trim()),
      neverRules: neverRules.map(r => r.replace(/^- ❌\s*\*\*/, '').replace(/\*\*.*$/, '').trim())
    };
  });

  const prompt = `You are selecting which guidelines have enforceable rules that deserve dedicated Claude Code agents.

## Available Guidelines with Rules

${guidelineSummary.map(g => `
### ${g.title}
- **Path**: .guidelines/${g.path}
- **Description**: ${g.description}
${g.doRules.length > 0 ? `- **DO Rules**: ${g.doRules.join('; ')}` : ''}
${g.neverRules.length > 0 ? `- **NEVER Rules**: ${g.neverRules.join('; ')}` : ''}
`).join('\n')}

## Your Task

Select up to ${maxAgents} guidelines that have CRITICAL, ENFORCEABLE rules deserving an agent.

For each selected guideline:
1. Determine a good agent name (kebab-case, e.g., "dependency-injection-enforcer")
2. List the specific rules the agent will enforce (max 5 most critical)
3. Explain why these rules need enforcement

**Selection Criteria:**
- CRITICAL rules (cause bugs or architectural problems if violated)
- AUTOMATICALLY DETECTABLE (missing decorator, wrong pattern, etc.)
- COMMONLY VIOLATED (developers often forget)

**Skip:**
- Stylistic rules (handled by linters/formatters)
- Non-critical best practices
- Rules that cannot be detected automatically

**Examples of Good Agent Rules:**
- ✅ "Service classes must have @injectable decorator" (detectable, critical)
- ✅ "Use vi.mock() not jest.mock()" (detectable, causes test failures)
- ❌ "Use meaningful variable names" (not automatically detectable)
- ❌ "Add comments to complex code" (subjective, not critical)

Return JSON:
{
  "selections": [
    {
      "guidelinePath": ".guidelines/backend/dependency-injection.md",
      "guidelineTitle": "Dependency Injection Patterns",
      "agentName": "dependency-injection-enforcer",
      "enforceableRules": [
        "Service classes must have @injectable() decorator",
        "Dependencies must use @inject(TYPES.XXX) decorator",
        "Avoid direct 'new ServiceClass()' instantiation"
      ],
      "reason": "DI violations cause runtime injection failures and break the architecture"
    }
  ]
}

Respond with valid JSON only.`;

  const response = await client.completeWithJson<{
    selections: GuidelineSelection[];
  }>(AGENT_SELECTION_SYSTEM_PROMPT, prompt);

  return response.selections.slice(0, maxAgents);
}

/**
 * Phase 2: Generate agent from selected guideline
 */
export async function generateAgentFromGuideline(
  client: IProviderClient,
  guideline: GeneratedGuideline,
  agentName: string,
  enforceableRules: string[],
  reason: string
): Promise<GeneratedAgent> {
  const guidelinePath = `.guidelines/${guideline.domain}/${guideline.fileName}`;

  const userPrompt = `Generate a Claude Code agent that enforces critical rules from the following guideline.

## Guideline to Create Agent From

**Path**: ${guidelinePath}
**Agent Name**: ${agentName}
**Why Enforcement Needed**: ${reason}

## Rules This Agent Will Enforce

${enforceableRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Guideline Content

${guideline.content}

## Your Task

Create an agent that:
1. References the guideline for full context
2. Defines clear verification steps for each rule
3. Provides helpful feedback when violations are found
4. Suggests how to fix violations

**CRITICAL - Frontmatter Requirement:**

Your agent MUST start with:

\`\`\`yaml
---
name: ${agentName}
description: Brief one-line description of what this agent enforces
model: haiku  # Use 'haiku' for simple checks, 'sonnet' for complex analysis
trigger: on_save  # or on_edit, on_commit
---
\`\`\`

**CRITICAL - Reference the Guideline:**

Include this in your agent:

**Rule Reference**: [Guideline Title](../../${guidelinePath})

**Structure:**

# Agent Name

> Brief overview of what rules this enforces and why they matter

## Rule Reference

This agent enforces critical rules from:
[Guideline Title](../../${guidelinePath})

## Enforced Rules

${enforceableRules.map((r, i) => `### ${i + 1}. ${r}

**Verification**:
- Check for [specific pattern]
- Look for [violation indicator]

**Common Violations**:
\`\`\`typescript
// ❌ Bad
[example violation]

// ✅ Good
[correct pattern]
\`\`\`

**Auto-fixable**: Yes/No
`).join('\n')}

## Verification Process

When this agent runs:
1. [Step 1 - what to check]
2. [Step 2 - what to verify]
3. [Step 3 - report violations]

## Feedback Format

When violations are found, report:
- **File**: path/to/file.ts
- **Line**: 42
- **Rule**: Which rule was violated
- **Suggestion**: How to fix

Generate the complete agent now.`;

  const response = await client.sendMessage(AGENT_SYSTEM_PROMPT, userPrompt);

  return {
    name: agentName,
    fileName: `${agentName}.md`,
    content: response.content,
    referencedGuideline: guidelinePath,
    rule: enforceableRules.join('; '),
    referencedGuidelines: [guidelinePath]
  };
}

/**
 * Generate all agents using the two-phase approach
 */
export async function generateAllAgentsV2(
  client: IProviderClient,
  guidelines: GeneratedGuideline[],
  maxAgents: number = 3,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<GeneratedAgent[]> {
  // Phase 1: Select which guidelines have enforceable rules
  if (onProgress) onProgress(0, maxAgents, 'Selecting guidelines for agents...');

  const selections = await selectGuidelinesForAgents(client, guidelines, maxAgents);

  if (selections.length === 0) {
    // No guidelines selected, return empty
    return [];
  }

  // Phase 2: Generate agents for selected guidelines
  const results: GeneratedAgent[] = [];

  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];
    if (onProgress) {
      onProgress(i + 1, selections.length, selection.agentName);
    }

    // Find the guideline object
    const guideline = guidelines.find(
      g => `.guidelines/${g.domain}/${g.fileName}` === selection.guidelinePath
    );

    if (!guideline) {
      console.warn(`[WARN] Guideline not found for agent: ${selection.guidelinePath}`);
      continue;
    }

    const generated = await generateAgentFromGuideline(
      client,
      guideline,
      selection.agentName,
      selection.enforceableRules,
      selection.reason
    );

    results.push(generated);
  }

  return results;
}
