/**
 * Prompts for index generation
 */

/**
 * Format guideline type into readable name
 */
function formatGuidelineName(type: string): string {
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const INDEX_SYSTEM_PROMPT = `You are creating navigation indexes for coding guidelines. Your indexes must:

1. **Be navigational** - Help users find relevant guidelines quickly
2. **Be descriptive** - Each link should explain what the guideline covers
3. **Be organized** - Group related guidelines logically
4. **Be concise** - Short descriptions (1-2 sentences max)

## Index Structure

### Domain Index (backend-index.md, frontend-index.md, etc.)

\`\`\`markdown
# [Domain] Guidelines

> Overview of [domain] development guidelines for this project.

## Quick Reference

Critical rules for [domain] development:

- ✅ DO: [Key rule 1]
- ✅ DO: [Key rule 2]
- ❌ NEVER: [Key anti-pattern 1]
- ❌ NEVER: [Key anti-pattern 2]

## Guidelines

- **[Guideline Name](./file.md)** - Brief description of what it covers and when to use it
- **[Guideline Name](./file.md)** - Brief description

CRITICAL: ONLY list guidelines that were provided to you. Do NOT suggest or reference non-existent files.

## Related Indexes

- [Root Index](../index.md) - Main project guidelines index
- [Other Domain Index](../other/index.md) - Only if that domain actually exists
\`\`\`

### Root Index (index.md)

\`\`\`markdown
# Project Guidelines

> Comprehensive development guidelines for [Project Name]. These guidelines are extracted from actual codebase patterns and are optimized for AI agents and developers.

## Quick Start

**New to this project?** Start here:
1. Review [Critical Rules](#critical-rules)
2. Check domain-specific guidelines for your work area
3. Reference the [CLAUDE.md](../CLAUDE.md) for quick commands

## Critical Rules

Rules that apply across the entire codebase:

- ✅ **Rule 1** - Description
- ❌ **Anti-pattern 1** - Description

## Domain Guidelines

### [Domain 1 Icon] Backend
**[Domain 1 Index](./domain1/index.md)** - Brief overview of what's covered

Key guidelines:
- [Guideline 1](./domain1/file1.md) - Description
- [Guideline 2](./domain1/file2.md) - Description

### [Domain 2 Icon] Frontend
**[Domain 2 Index](./domain2/index.md)** - Brief overview

Key guidelines:
- [Guideline 1](./domain2/file1.md) - Description

## Project Structure

\`\`\`
[Show ACTUAL project directory structure here - not just guidelines folder]
\`\`\`

Note: The project structure should show the entire codebase layout, not just the .guidelines folder.
\`\`\`
`;

export function DOMAIN_INDEX_USER_PROMPT(
  domain: string,
  guidelines: Array<{ fileName: string; type: string }>,
  criticalRules: string[],
  existingDomains: string[]
): string {
  const guidelinesList = guidelines.map(g => `- **[${formatGuidelineName(g.type)}](./${g.fileName})** - ${g.type}`).join('\n');

  // Build related indexes - only for domains that actually exist (excluding current domain)
  const otherDomains = existingDomains.filter(d => d !== domain);
  const relatedIndexes = otherDomains.length > 0
    ? `## Related Indexes

- [Root Index](../index.md) - Main project guidelines index
${otherDomains.map(d => `- [${d.charAt(0).toUpperCase() + d.slice(1)} Index](../${d}/${d}-index.md) - ${d.charAt(0).toUpperCase() + d.slice(1)} guidelines`).join('\n')}`
    : `## Related Indexes

- [Root Index](../index.md) - Main project guidelines index`;

  return `Generate a domain index for: **${domain}**

## CRITICAL RULES - READ CAREFULLY

1. ONLY reference the guidelines listed below - DO NOT invent or suggest additional files
2. DO NOT create "Additional Guidelines", "Suggested Guidelines", or similar sections
3. DO NOT reference files that don't exist in the list below
4. If a guideline is listed below, you MUST include it in your output
5. Use the EXACT filenames provided

## Guidelines to Index (COMPLETE LIST - use ALL of these)

${guidelinesList}

## Critical Rules for Quick Reference

${criticalRules.slice(0, 5).join('\n')}

## Instructions

1. Create a clear overview of the ${domain} guidelines
2. List ALL guidelines provided above with helpful descriptions
3. Include 3-5 critical rules in the quick reference section
4. Add a "Related Indexes" section using the template below

${relatedIndexes}

Generate the complete domain index in markdown format. Remember: ONLY use the guidelines listed above.`;
}

export function ROOT_INDEX_USER_PROMPT(
  projectName: string,
  domains: Array<{ name: string; guidelineCount: number }>,
  techStack: string,
  criticalRules: string[],
  projectInfo: {
    description?: string;
    scripts?: Record<string, string>;
    hasReadme: boolean;
    projectTree: string;
  },
  guidelinesByDomain: Map<string, Array<{ type: string; fileName: string }>>,
  domainIndexes: Map<string, string> // domain -> filename mapping
): string {
  const scriptsSection = projectInfo.scripts && Object.keys(projectInfo.scripts).length > 0
    ? `## Available Commands

${Object.entries(projectInfo.scripts || {})
  .slice(0, 10) // Limit to top 10 commands
  .map(([name, cmd]) => `- \`npm run ${name}\` - ${cmd}`)
  .join('\n')}`
    : '';

  const readmeLink = projectInfo.hasReadme
    ? '- 📖 [Project README](../README.md) - Full project documentation'
    : '';

  // Build guidelines list for each domain
  const guidelinesSection = Array.from(guidelinesByDomain.entries())
    .map(([domain, guidelines]) => {
      const list = guidelines
        .map(g => `- [${formatGuidelineName(g.type)}](./${domain}/${g.fileName}) - ${g.type}`)
        .join('\n');
      return `### ${domain}\n${list}`;
    })
    .join('\n\n');

  return `Generate the root guidelines index for: **${projectName}**

## Project Info

${projectInfo.description ? `**Description:** ${projectInfo.description}\n` : ''}**Tech Stack:** ${techStack}

## Domains and Guidelines

${guidelinesSection}

${scriptsSection}

## Critical Rules

${criticalRules.join('\n')}

## CRITICAL: Use ACTUAL guideline names

You MUST use the exact guideline names provided above. For example:
- ✅ CORRECT: [Architecture](./backend/architecture.md)
- ❌ WRONG: [Guideline 1](./backend/guideline1.md)

Use the ACTUAL filenames like architecture.md, testing.md, error-handling.md, etc.

## Instructions

Create a comprehensive project guide that includes:

1. **Project Overview Section:**
   - Project name and description (if provided)
   - Brief explanation of what these guidelines are for
   - Link to README if available: ${readmeLink}

2. **Quick Start Section:**
   - Step-by-step onboarding for new developers
   - Point to Critical Rules first
   - Guide to domain-specific guidelines

3. **Available Commands Section (if scripts exist):**
   - List npm/yarn commands with descriptions
   - Group by category if possible (build, dev, test, etc.)

4. **Critical Rules Section:**
   - List cross-cutting rules that apply across all domains
   - Keep to 5-10 most important rules

5. **Domain Guidelines Section:**
   - For each domain, use the EXACT domain index filenames provided below:
${Array.from(domainIndexes.entries()).map(([domain, filename]) => `     * ${domain}: [${domain.charAt(0).toUpperCase() + domain.slice(1)} Index](./${domain}/${filename})`).join('\n')}
   - Include icon/emoji for the domain
   - Brief overview
   - 2-3 key guidelines listed with links

6. **Project Structure:**
   - Show the ACTUAL project structure (not just .guidelines folder)
   - Use the project tree provided below

## Project Structure (Use This Exact Tree)

\`\`\`
${projectInfo.projectTree}
\`\`\`

IMPORTANT: Use the project tree above in your "Project Structure" section, not just the guidelines folder.

Keep it scannable, well-organized, and helpful for both AI agents and human developers.

Generate the complete root index in markdown format.`;
}
