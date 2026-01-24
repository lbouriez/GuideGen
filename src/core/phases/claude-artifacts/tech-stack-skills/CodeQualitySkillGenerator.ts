/**
 * Code Quality Skill Generator
 *
 * Uses AI to:
 * 1. Analyze tech stack and determine if code quality skill is applicable
 * 2. Identify relevant quality standards for the specific languages/frameworks used
 * 3. Generate project-specific code quality checklist skill
 *
 * NO HARDCODED STANDARDS - All knowledge comes from AI model's current understanding
 */

import type { IProviderClient } from '../../../../providers/types';
import type { TechProfile, GeneratedGuideline } from '../../../../types';
import type {
  ITechStackSkillGenerator,
  TechStackSkillMetadata,
  SkillCategory,
} from './types';

export class CodeQualitySkillGenerator implements ITechStackSkillGenerator {
  readonly category: SkillCategory = 'code-quality';

  /**
   * Use AI to determine if code quality skill is applicable to this project
   */
  async checkApplicability(
    client: IProviderClient,
    techProfile: TechProfile,
    packageJson?: Record<string, any>
  ): Promise<TechStackSkillMetadata> {
    const techStackSummary = this.buildTechStackSummary(techProfile, packageJson);

    const systemPrompt = `You are a code quality expert analyzing a project's tech stack to determine if a code quality review skill would be valuable.`;

    const userPrompt = `**Project Tech Stack**:
${techStackSummary}

**Your Task**:
Analyze this tech stack and determine:
1. Is a code quality review skill applicable? (Answer: yes/no)
2. Priority level (critical, high, medium, low)
3. Brief reason explaining why it is or isn't applicable
4. What should the skill be called? (e.g., "TypeScript Code Quality Review", "React Component Standards")

Consider:
- Typed languages (TypeScript, Java) benefit from type safety checks
- Large codebases benefit more from quality enforcement
- Simple scripts may not need extensive quality skills
- Projects with existing linters/formatters may need lighter touch

Respond in JSON format:
{
  "isApplicable": boolean,
  "priority": "critical" | "high" | "medium" | "low",
  "reason": "Brief explanation (1-2 sentences)",
  "skillName": "Descriptive skill name"
}`;

    const response = await client.completeWithJson<{
      isApplicable: boolean;
      priority: 'critical' | 'high' | 'medium' | 'low';
      reason: string;
      skillName: string;
    }>(systemPrompt, userPrompt);

    return {
      id: 'code-quality-review',
      name: response.skillName,
      category: 'code-quality',
      whenToUse: 'During code review or before committing significant changes',
      priority: response.priority,
      isApplicable: response.isApplicable,
      applicabilityReason: response.reason,
    };
  }

  /**
   * Use AI to generate code quality skill content based on tech stack
   */
  async generateSkill(
    client: IProviderClient,
    metadata: TechStackSkillMetadata,
    techProfile: TechProfile,
    guidelines: GeneratedGuideline[],
    packageJson?: Record<string, any>
  ): Promise<string> {
    const techStackSummary = this.buildTechStackSummary(techProfile, packageJson);
    const guidelineReferences = this.buildGuidelineReferences(guidelines);
    const linterConfig = this.detectLinterConfig(packageJson);

    const systemPrompt = `You are a code quality expert creating a code quality review skill for Claude Code.`;

    const userPrompt = `**Project Tech Stack**:
${techStackSummary}

**Existing Project Guidelines**:
${guidelineReferences}

**Existing Linters/Formatters**:
${linterConfig}

**Your Task**:
Generate a comprehensive code quality review skill as a CHECKLIST (not a workflow).

The skill should:
1. Be specific to this tech stack (not generic)
2. Include the most important quality standards for these languages/frameworks
3. Reference existing project guidelines where relevant
4. Provide BAD (❌) and GOOD (✅) code examples
5. Explain WHY each standard matters
6. Complement (not duplicate) existing linters/formatters

**Structure** - CRITICAL: Include frontmatter at the very beginning:

\`\`\`markdown
---
name: ${metadata.id}
description: ${metadata.whenToUse}
---

# ${metadata.name}

## When to Use
During code review or before committing significant changes, especially when:
[List specific scenarios - e.g., "adding new features", "refactoring existing code"]

## Code Quality Checklist

### [Category 1 - e.g., Complexity & Maintainability]
**Guideline**: [Reference relevant guideline if exists, or omit this line]

**Check for**:
- [ ] [Specific check 1 - e.g., "Functions < 50 lines"]
- [ ] [Specific check 2 - e.g., "Cyclomatic complexity < 10"]

**Examples**:
❌ BAD: [Show overly complex code example]
✅ GOOD: [Show refactored, cleaner version]

**Why It Matters**: [Brief explanation of the impact on maintainability]

### [Category 2 - e.g., Type Safety]
[Repeat structure - focus on type-related issues for typed languages]

### [Category 3 - e.g., Error Handling]
[Repeat structure]

### [Category 4 - e.g., Performance]
[Repeat structure - avoid premature optimization advice]

## Common Code Smells
- [Code smell 1 specific to this tech stack]
- [Code smell 2 specific to this tech stack]

## Automated Tools
These tools already catch many issues automatically:
${linterConfig ? linterConfig : '- Consider adding ESLint/Prettier or equivalent'}

Focus manual review on issues tools can't catch:
- [Issue type 1 - e.g., "Business logic correctness"]
- [Issue type 2 - e.g., "Architectural concerns"]

## Resources
- [Language-specific style guide]
- [Framework best practices]
\`\`\`

**Important Constraints**:
- MUST include frontmatter (---...---) at the very beginning
- The frontmatter must have name and description fields
- Focus on top 4-6 most important quality categories for THIS tech stack
- Use actual code examples matching the project's languages/frameworks
- If no relevant guideline exists, omit the "Guideline:" line
- Don't duplicate what linters already check (focus on higher-level concerns)
- Keep it actionable and specific, not generic
- Balance rigor with pragmatism (avoid perfectionism)
- Use markdown format throughout

Generate the code quality skill now:`;

    return await client.complete(systemPrompt, userPrompt);
  }

  /**
   * Build a concise summary of the tech stack for AI prompt
   */
  private buildTechStackSummary(
    techProfile: TechProfile,
    packageJson?: Record<string, any>
  ): string {
    const parts: string[] = [];

    if (techProfile.stack.languages && techProfile.stack.languages.length > 0) {
      parts.push(`**Languages**: ${techProfile.stack.languages.join(', ')}`);
    }

    if (techProfile.stack.frameworks && techProfile.stack.frameworks.length > 0) {
      parts.push(`**Frameworks**: ${techProfile.stack.frameworks.join(', ')}`);
    }

    if (techProfile.stack.buildTools && techProfile.stack.buildTools.length > 0) {
      parts.push(`**Build Tools**: ${techProfile.stack.buildTools.join(', ')}`);
    }

    if (techProfile.stack.testingFrameworks && techProfile.stack.testingFrameworks.length > 0) {
      parts.push(`**Testing**: ${techProfile.stack.testingFrameworks.join(', ')}`);
    }

    if (techProfile.stack.linters && techProfile.stack.linters.length > 0) {
      parts.push(`**Linters**: ${techProfile.stack.linters.join(', ')}`);
    }

    if (packageJson?.dependencies) {
      const keyDeps = Object.keys(packageJson.dependencies).slice(0, 15);
      parts.push(`**Key Dependencies**: ${keyDeps.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Build guideline references AND extract code quality patterns from content
   */
  private buildGuidelineReferences(guidelines: GeneratedGuideline[]): string {
    if (guidelines.length === 0) {
      return 'No existing guidelines yet.';
    }

    // Focus on quality-related guidelines
    const relevantGuidelines = guidelines.filter((g) =>
      /quality|standard|convention|pattern|error|test|performance|naming|style|complexity|refactor|architecture|typescript|code|class|function/i.test(
        g.fileName || g.type || g.content.substring(0, 1000)
      )
    );

    if (relevantGuidelines.length === 0) {
      return `${guidelines.length} guidelines exist. You may reference any relevant guidelines.`;
    }

    // Extract quality patterns from guideline content
    const patterns = this.extractQualityPatterns(relevantGuidelines);

    const refs = relevantGuidelines
      .map((g) => `- ${g.domain}/${g.fileName}`)
      .slice(0, 10)
      .join('\n');

    let result = `Quality-related guidelines:\n${refs}`;

    if (patterns.length > 0) {
      result += '\n\n**Project-Specific Quality Patterns Found:**\n' + patterns.join('\n');
    }

    return result;
  }

  /**
   * Extract code quality patterns from guideline content
   * Looks for naming conventions, complexity limits, testing patterns
   */
  private extractQualityPatterns(guidelines: GeneratedGuideline[]): string[] {
    const patterns: string[] = [];
    const allContent = guidelines.map((g) => g.content).join('\n');

    // Detect naming conventions
    if (/camelCase|PascalCase|snake_case|kebab-case/i.test(allContent)) {
      const namingMatches = allContent.match(
        /(?:use|prefer|always|must)\s+(camelCase|PascalCase|snake_case|kebab-case)/gi
      );
      if (namingMatches) {
        const conventions = [...new Set(namingMatches.map((m) => m.split(/\s+/).pop()))];
        patterns.push(`- **Naming convention:** ${conventions.join(', ')}`);
      }
    }

    // Detect error handling patterns
    if (/try[-\s]?catch|error handler|custom error|error class/i.test(allContent)) {
      patterns.push('- **Error handling:** Project has custom error handling patterns');
    }

    // Detect testing patterns
    if (/\b(jest|vitest|mocha|chai|cypress|playwright|testing-library)\b/i.test(allContent)) {
      const match = allContent.match(
        /\b(jest|vitest|mocha|chai|cypress|playwright|testing-library)\b/i
      );
      if (match) {
        patterns.push(`- **Testing:** Project uses **${match[1]}** for testing`);
      }
    }

    // Detect complexity limits
    const complexityMatch = allContent.match(
      /(?:max(?:imum)?|limit)\s+(?:function\s+)?(?:length|lines?|complexity)\s*[:\-]?\s*(\d+)/i
    );
    if (complexityMatch) {
      patterns.push(
        `- **Complexity limit:** Functions should be < ${complexityMatch[1]} lines/complexity`
      );
    }

    // Detect type safety preferences
    if (/strict.*null.*check|no.*any.*type|prefer.*explicit.*type/i.test(allContent)) {
      patterns.push('- **Type safety:** Project enforces strict TypeScript typing');
    }

    // Detect specific quality rules
    const qualityRules = this.extractQualityRules(allContent);
    patterns.push(...qualityRules);

    return patterns.slice(0, 10); // Limit to top 10 patterns
  }

  /**
   * Extract explicit code quality rules from guideline content
   * Looks for ✅/❌ patterns or "MUST/SHOULD/NEVER" statements
   */
  private extractQualityRules(content: string): string[] {
    const rules: string[] = [];

    // Find "MUST/SHOULD" quality rules - more flexible matching
    const shouldMatches = content.matchAll(
      /(?:MUST|SHOULD|ALWAYS|PREFER):?\s+([^\n]{15,200})/gi
    );
    for (const match of shouldMatches) {
      const rule = match[1].trim();
      // Check if rule is quality-related
      if (/function|class|variable|component|test|error|type|interface|return|inject|constructor|export|import/i.test(rule)) {
        if (rule.length > 15 && rule.length < 200) {
          rules.push(`- **Project rule:** ${rule}`);
        }
      }
    }

    // Find "AVOID/NEVER" quality rules - more flexible matching
    const avoidMatches = content.matchAll(
      /(?:AVOID|NEVER|DO NOT|DON'T):?\s+([^\n]{15,200})/gi
    );
    for (const match of avoidMatches) {
      const rule = match[1].trim();
      // Check if rule is quality-related
      if (/function|class|variable|component|any|magic|duplicate|nest|container|singleton|hardcode|string|throw/i.test(rule)) {
        if (rule.length > 15 && rule.length < 200) {
          rules.push(`- **Project rule:** ${rule}`);
        }
      }
    }

    return rules.slice(0, 5); // Limit to 5 explicit rules
  }

  /**
   * Detect existing linters/formatters from package.json
   */
  private detectLinterConfig(packageJson?: Record<string, any>): string {
    if (!packageJson?.devDependencies && !packageJson?.dependencies) {
      return 'No linters/formatters detected.';
    }

    const allDeps = {
      ...(packageJson.devDependencies || {}),
      ...(packageJson.dependencies || {}),
    };

    const linters: string[] = [];

    if ('eslint' in allDeps) linters.push('ESLint');
    if ('prettier' in allDeps) linters.push('Prettier');
    if ('typescript' in allDeps) linters.push('TypeScript compiler');
    if ('stylelint' in allDeps) linters.push('Stylelint');
    if ('pylint' in allDeps || 'flake8' in allDeps || 'black' in allDeps) {
      linters.push('Python linters');
    }
    if ('rubocop' in allDeps) linters.push('RuboCop');

    if (linters.length === 0) {
      return 'No common linters detected in dependencies.';
    }

    return linters.join(', ');
  }
}
