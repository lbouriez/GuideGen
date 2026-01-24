/**
 * Improved skills generation logic
 * Two-phase approach: 1) AI selects guidelines, 2) AI generates skills from selected guidelines
 */

import type { IProviderClient } from '@/providers/types';
import type { GeneratedGuideline } from '@/types';
import { SKILL_SYSTEM_PROMPT } from './prompts';

export interface GeneratedSkill {
  name: string;
  fileName: string;
  content: string;
  referencedGuidelines: string[];
}

interface GuidelineSelection {
  guidelinePath: string;
  guidelineTitle: string;
  skillName: string;
  reason: string;
}

const SKILL_SELECTION_SYSTEM_PROMPT = `You are a Claude Code expert helping identify which guidelines deserve dedicated skills.

A skill should be created when:
- The guideline describes a multi-step workflow (3+ steps)
- The guideline covers a complex process that developers will repeat
- The guideline would benefit from step-by-step automation guidance

DO NOT create skills for:
- Simple rules or conventions (these belong in guidelines only)
- Trivial patterns that are self-explanatory
- Single-step processes

Respond with valid JSON only.`;

/**
 * Phase 1: Ask AI which guidelines deserve skills
 */
export async function selectGuidelinesForSkills(
  client: IProviderClient,
  guidelines: GeneratedGuideline[],
  maxSkills: number = 5
): Promise<GuidelineSelection[]> {
  // Build guideline summary
  const guidelineSummary = guidelines.map(g => {
    // Extract title from frontmatter
    const titleMatch = g.content.match(/^---\s*\ntitle:\s*([^\n]+)/m);
    const title = titleMatch ? titleMatch[1].trim() : g.fileName.replace('.md', '');

    // Extract description from frontmatter
    const descMatch = g.content.match(/description:\s*([^\n]+)/m);
    const description = descMatch ? descMatch[1].trim() : 'No description';

    return {
      path: `${g.domain}/${g.fileName}`,
      title,
      description
    };
  });

  const prompt = `You are selecting which guidelines deserve dedicated Claude Code skills.

## Available Guidelines

${guidelineSummary.map(g => `
### ${g.title}
- **Path**: .guidelines/${g.path}
- **Description**: ${g.description}
`).join('\n')}

## Your Task

Select up to ${maxSkills} guidelines that would benefit from having a dedicated skill.

For each selected guideline:
1. Determine a good skill name (kebab-case, e.g., "setup-dependency-injection")
2. Explain why this guideline deserves a skill

**Selection Criteria:**
- Multi-step workflows (e.g., "setting up DI", "creating new phase")
- Complex processes developers will repeat
- Patterns that benefit from step-by-step guidance

**Skip:**
- Simple conventions (import styles, naming patterns)
- Single-step processes
- Trivial rules

Return JSON:
{
  "selections": [
    {
      "guidelinePath": ".guidelines/backend/dependency-injection.md",
      "guidelineTitle": "Dependency Injection Patterns",
      "skillName": "setup-dependency-injection",
      "reason": "Multi-step process: create service, add decorator, register in container, inject into consumers"
    }
  ]
}

Respond with valid JSON only.`;

  const response = await client.completeWithJson<{
    selections: GuidelineSelection[];
  }>(SKILL_SELECTION_SYSTEM_PROMPT, prompt);

  return response.selections.slice(0, maxSkills);
}

/**
 * Phase 2: Generate skill from selected guideline
 */
export async function generateSkillFromGuideline(
  client: IProviderClient,
  guideline: GeneratedGuideline,
  skillName: string,
  reason: string
): Promise<GeneratedSkill> {
  const guidelinePath = `.guidelines/${guideline.domain}/${guideline.fileName}`;

  const userPrompt = `Generate a Claude Code skill for the following guideline.

## Guideline to Create Skill From

**Path**: ${guidelinePath}
**Skill Name**: ${skillName}
**Why This Needs a Skill**: ${reason}

## Guideline Content

${guideline.content}

## Your Task

Create a skill that:
1. References the guideline (don't duplicate content, link to it)
2. Provides step-by-step workflow for implementing the pattern
3. Includes verification checklist
4. Handles common issues

**CRITICAL - Frontmatter Requirement:**

Your skill MUST start with:

\`\`\`yaml
---
name: ${skillName}
description: Brief one-line description of what this skill helps with
---
\`\`\`

**CRITICAL - Reference the Guideline:**

Include this in your skill:

**Guideline**: [Guideline Title](../../${guidelinePath})

**Structure:**

# Skill Title

> Brief overview

## When to Use

- Scenario 1
- Scenario 2

## Workflow

### Step 1: Action

**Guideline**: [Title](../../${guidelinePath})

**Actions**:
1. Specific action
2. Another action

**Verification**:
- [ ] Check X
- [ ] Verify Y

### Step 2: Next Action

...

## Common Issues

### Issue: Problem
**Solution**: How to fix

Generate the complete skill now.`;

  const response = await client.sendMessage(SKILL_SYSTEM_PROMPT, userPrompt);

  // Extract referenced guidelines from content (for validation)
  const guidelineLinks = response.content.match(/\[.*?\]\(\.\.\/\.\.\/\.guidelines\/.*?\.md\)/g) || [];
  const extractedPaths = guidelineLinks.map(link => {
    const match = link.match(/\(\.\.\/\.\.\/(.+?)\)/);
    return match ? match[1] : guidelinePath;
  });

  return {
    name: skillName,
    fileName: `${skillName}.md`,
    content: response.content,
    referencedGuidelines: extractedPaths.length > 0 ? extractedPaths : [guidelinePath]
  };
}

/**
 * Generate all skills using the two-phase approach
 */
export async function generateAllSkillsV2(
  client: IProviderClient,
  guidelines: GeneratedGuideline[],
  maxSkills: number = 5,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<GeneratedSkill[]> {
  // Phase 1: Select which guidelines deserve skills
  if (onProgress) onProgress(0, maxSkills, 'Selecting guidelines for skills...');

  const selections = await selectGuidelinesForSkills(client, guidelines, maxSkills);

  if (selections.length === 0) {
    // No guidelines selected, return empty
    return [];
  }

  // Phase 2: Generate skills for selected guidelines
  const results: GeneratedSkill[] = [];

  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];
    if (onProgress) {
      onProgress(i + 1, selections.length, selection.skillName);
    }

    // Find the guideline object
    const guideline = guidelines.find(
      g => `.guidelines/${g.domain}/${g.fileName}` === selection.guidelinePath
    );

    if (!guideline) {
      console.warn(`[WARN] Guideline not found for skill: ${selection.guidelinePath}`);
      continue;
    }

    const generated = await generateSkillFromGuideline(
      client,
      guideline,
      selection.skillName,
      selection.reason
    );

    results.push(generated);
  }

  return results;
}
