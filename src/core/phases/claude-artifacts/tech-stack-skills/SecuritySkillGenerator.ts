/**
 * Security Skill Generator
 *
 * Uses AI to:
 * 1. Analyze tech stack and determine if security skill is applicable
 * 2. Identify relevant security threats for the specific frameworks/libraries used
 * 3. Generate project-specific security checklist skill
 *
 * NO HARDCODED THREAT DATABASES - All knowledge comes from AI model's current understanding
 */

import type { IProviderClient } from '../../../../providers/types';
import type { TechProfile, GeneratedGuideline } from '../../../../types';
import type {
  ITechStackSkillGenerator,
  TechStackSkillMetadata,
  SkillCategory,
} from './types';

export class SecuritySkillGenerator implements ITechStackSkillGenerator {
  readonly category: SkillCategory = 'security';

  /**
   * Use AI to determine if security skill is applicable to this project
   */
  async checkApplicability(
    client: IProviderClient,
    techProfile: TechProfile,
    packageJson?: Record<string, any>
  ): Promise<TechStackSkillMetadata> {
    const techStackSummary = this.buildTechStackSummary(techProfile, packageJson);

    const systemPrompt = `You are a security expert analyzing a project's tech stack to determine if a security review skill would be valuable.`;

    const userPrompt = `**Project Tech Stack**:
${techStackSummary}

**Your Task**:
Analyze this tech stack and determine:
1. Is a security review skill applicable? (Answer: yes/no)
2. Priority level (critical, high, medium, low)
3. Brief reason explaining why it is or isn't applicable
4. What should the skill be called? (e.g., "Express API Security Review", "React XSS Prevention")

Consider:
- Backend frameworks often need security skills (SQL injection, auth, rate limiting)
- Frontend frameworks with user input need XSS prevention
- Projects without network-facing code may not need security skills
- Simple CLI tools may have lower security priority

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
      id: 'security-review',
      name: response.skillName,
      category: 'security',
      whenToUse: 'Before committing code or during pull request review',
      priority: response.priority,
      isApplicable: response.isApplicable,
      applicabilityReason: response.reason,
    };
  }

  /**
   * Use AI to generate security skill content based on tech stack
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

    const systemPrompt = `You are a security expert creating a security review skill for Claude Code.`;

    const userPrompt = `**Project Tech Stack**:
${techStackSummary}

**Existing Project Guidelines**:
${guidelineReferences}

**Your Task**:
Generate a comprehensive security review skill as a CHECKLIST (not a workflow).

The skill should:
1. Be specific to this tech stack (not generic)
2. Include the most critical security threats for these frameworks/libraries
3. Reference existing project guidelines where relevant
4. Provide BAD (❌) and GOOD (✅) code examples
5. Explain WHY each check matters
6. Focus on preventive detection - catch vulnerabilities before they're committed

**Structure** - CRITICAL: Include frontmatter at the very beginning:

\`\`\`markdown
---
name: ${metadata.id}
description: ${metadata.whenToUse}
---

# ${metadata.name}

## When to Use
Before committing code or during pull request review, especially when:
[List specific scenarios - e.g., "modifying API endpoints", "handling user input"]

## Security Checklist

### [Category 1 - e.g., Input Validation]
**Guideline**: [Reference relevant guideline if exists, or omit this line]

**Check for**:
- [ ] [Specific check 1]
- [ ] [Specific check 2]

**Common Vulnerabilities**:
❌ BAD: [Show vulnerable code example specific to this tech stack]
✅ GOOD: [Show secure code example]

**Why It Matters**: [Brief explanation of the security impact]

### [Category 2 - e.g., Authentication & Authorization]
[Repeat structure]

### [Category 3 - e.g., Data Protection]
[Repeat structure]

## Common Pitfalls
- [Pitfall 1 specific to this tech stack]
- [Pitfall 2 specific to this tech stack]

## Automated Tools
Recommend running these security scanners:
- [Tool 1 relevant to this stack - e.g., npm audit for Node.js]
- [Tool 2 relevant to this stack - e.g., Snyk, Bearer, etc.]

## Resources
- [OWASP Top 10]
- [Framework-specific security guide]
\`\`\`

**Important Constraints**:
- MUST include frontmatter (---...---) at the very beginning
- The frontmatter must have name and description fields
- Focus on top 5-7 most critical security categories for THIS tech stack
- Use actual code examples matching the project's languages/frameworks
- If no relevant guideline exists, omit the "Guideline:" line
- Keep it actionable and specific, not generic
- Use markdown format throughout

Generate the security skill now:`;

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
      const keyDeps = Object.keys(packageJson.dependencies)
        .filter((dep) =>
          // Focus on security-relevant dependencies
          /express|fastify|koa|mongoose|mysql|postgres|pg|jwt|passport|bcrypt|helmet|cors/i.test(
            dep
          )
        )
        .slice(0, 10); // Limit to avoid token bloat

      if (keyDeps.length > 0) {
        parts.push(`**Key Dependencies**: ${keyDeps.join(', ')}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Build guideline references AND extract security patterns from content
   */
  private buildGuidelineReferences(guidelines: GeneratedGuideline[]): string {
    if (guidelines.length === 0) {
      return 'No existing guidelines yet.';
    }

    // Focus on security-related guidelines
    const relevantGuidelines = guidelines.filter((g) =>
      /security|auth|validation|input|sanitize|xss|injection|cors|csrf|encrypt|password|token|api[-_]?key/i.test(
        g.fileName || g.type || g.content.substring(0, 500)
      )
    );

    if (relevantGuidelines.length === 0) {
      return `${guidelines.length} guidelines exist, but none appear to be security-focused. You may still reference other relevant guidelines if applicable.`;
    }

    // Extract security patterns from guideline content
    const patterns = this.extractSecurityPatterns(relevantGuidelines);

    const refs = relevantGuidelines
      .map((g) => `- ${g.domain}/${g.fileName}`)
      .slice(0, 10)
      .join('\n');

    let result = `Security-related guidelines:\n${refs}`;

    if (patterns.length > 0) {
      result += '\n\n**Project-Specific Security Patterns Found:**\n' + patterns.join('\n');
    }

    return result;
  }

  /**
   * Extract security patterns from guideline content
   * Looks for validation libraries, auth patterns, security tools mentioned
   */
  private extractSecurityPatterns(guidelines: GeneratedGuideline[]): string[] {
    const patterns: string[] = [];
    const allContent = guidelines.map((g) => g.content).join('\n');

    // Detect validation libraries
    if (/\b(zod|joi|yup|ajv|validator\.js)\b/i.test(allContent)) {
      const match = allContent.match(/\b(zod|joi|yup|ajv|validator\.js)\b/i);
      if (match) {
        patterns.push(`- Project uses **${match[1]}** for input validation`);
      }
    }

    // Detect auth libraries/patterns
    if (/\b(passport|jwt|jsonwebtoken|bcrypt|argon2|auth0|oauth)\b/i.test(allContent)) {
      const matches = allContent.match(/\b(passport|jwt|jsonwebtoken|bcrypt|argon2|auth0|oauth)\b/gi);
      if (matches) {
        const uniqueMatches = [...new Set(matches.map((m) => m.toLowerCase()))];
        patterns.push(
          `- Project uses **${uniqueMatches.join(', ')}** for authentication/authorization`
        );
      }
    }

    // Detect security middleware
    if (/\b(helmet|cors|express-rate-limit|csurf)\b/i.test(allContent)) {
      const matches = allContent.match(/\b(helmet|cors|express-rate-limit|csurf)\b/gi);
      if (matches) {
        const uniqueMatches = [...new Set(matches.map((m) => m.toLowerCase()))];
        patterns.push(`- Project uses **${uniqueMatches.join(', ')}** for security middleware`);
      }
    }

    // Detect ORM/query builders (SQL injection prevention)
    if (/\b(prisma|typeorm|sequelize|knex|mongoose)\b/i.test(allContent)) {
      const match = allContent.match(/\b(prisma|typeorm|sequelize|knex|mongoose)\b/i);
      if (match) {
        patterns.push(
          `- Project uses **${match[1]}** ORM (helps prevent SQL/NoSQL injection)`
        );
      }
    }

    // Detect path traversal protection
    if (/SafePathSchema|path.*traversal|path.*security|\.\.\/|normalize.*path/i.test(allContent)) {
      patterns.push('- **Path security:** Project has path traversal protection');
    }

    // Detect specific security rules from guidelines
    const securityRules = this.extractSecurityRules(allContent);
    patterns.push(...securityRules);

    return patterns.slice(0, 10); // Limit to top 10 patterns
  }

  /**
   * Extract explicit security rules from guideline content
   * Looks for ✅/❌ patterns or "MUST/NEVER" statements
   */
  private extractSecurityRules(content: string): string[] {
    const rules: string[] = [];

    // Find "MUST" security rules - more flexible matching
    const mustMatches = content.matchAll(
      /(?:MUST|REQUIRED|ALWAYS):?\s+([^\n]{15,200})/gi
    );
    for (const match of mustMatches) {
      const rule = match[1].trim();
      // Check if rule is security-related
      if (/security|auth|encrypt|validat|sanitiz|inject|xss|csrf|password|token|api.*key|path|file|input|user/i.test(rule)) {
        if (rule.length > 15 && rule.length < 200) {
          rules.push(`- **Project rule:** ${rule}`);
        }
      }
    }

    // Find "NEVER" security rules - more flexible matching
    const neverMatches = content.matchAll(
      /(?:NEVER|MUST NOT|DO NOT):?\s+([^\n]{15,200})/gi
    );
    for (const match of neverMatches) {
      const rule = match[1].trim();
      // Check if rule is security-related
      if (/security|auth|encrypt|validat|sanitiz|inject|xss|csrf|password|token|api.*key|path|file|input|user|log|error|hardcode/i.test(rule)) {
        if (rule.length > 15 && rule.length < 200) {
          rules.push(`- **Project rule:** ${rule}`);
        }
      }
    }

    return rules.slice(0, 5); // Limit to 5 explicit rules
  }
}
