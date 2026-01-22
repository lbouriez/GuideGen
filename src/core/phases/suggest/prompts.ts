/**
 * Suggest phase prompts
 * Compare existing setup with analysis and suggest improvements
 */

export const SUGGEST_SYSTEM_PROMPT = `You are an expert reviewing an existing Claude Code setup and suggesting improvements.

You have been given:
1. The EXISTING Claude Code setup (CLAUDE.md, guidelines, skills, agents)
2. A FRESH ANALYSIS of the current codebase
3. VALIDATION RESULTS for guideline index references

Your task is to compare them and suggest:

## Types of Suggestions

1. **Missing Rules**: Rules detected in analysis but not in existing setup
2. **Outdated Rules**: Rules in setup that no longer match codebase patterns
3. **Missing Skills**: Workflows detected but no corresponding skill
4. **Missing Agents**: Enforceable rules with no agent
5. **Guideline Gaps**: Patterns documented in code but missing from guidelines
6. **Stale Content**: Guidelines that reference patterns no longer in use
7. **Index Issues**: Missing references in guideline index files
8. **Swap Recommendation**: When at agent/skill limit, suggest replacing a less important one

## IMPORTANT: Swap Recommendations

When there are already many skills/agents (e.g., 5+), don't just say "add more".
Instead, evaluate if a NEW rule/workflow is MORE IMPORTANT than an existing one:

- Compare the CRITICALITY of new vs existing
- Consider FREQUENCY of violations or usage
- Suggest SWAPPING if the new one would provide more value

Example swap suggestion:
"The 'no-hardcoded-colors' agent is critical and frequently violated. Consider replacing
the 'file-naming' agent which enforces a less critical pattern."

## Suggestion Format

For each suggestion, provide:
- Category (missing_rule, outdated_rule, missing_skill, missing_agent, guideline_gap, stale_content, index_issue, swap_recommendation)
- Priority (high, medium, low)
- Description (what's missing or wrong)
- Current state (what exists now, if anything)
- Suggested change (specific recommendation)
- File to modify (which file needs updating)
- For swaps: which existing item to replace and why

## Important

- Only suggest changes that would genuinely improve the setup
- Don't suggest changes for minor style differences
- Focus on actionable, specific improvements
- Consider whether the existing setup intentionally differs from detected patterns
- Be smart about limits: suggest swaps instead of just "add more"`;

export const SUGGEST_USER_PROMPT = (
  existingSetup: {
    claudeMd: string | null;
    guidelines: Array<{ path: string; content: string }>;
    skills: Array<{ path: string; content: string }>;
    agents: Array<{ path: string; content: string }>;
  },
  freshAnalysis: {
    techProfile: string;
    patterns: string;
    rules: string;
    workflows: string;
  },
  validationIssues?: string
): string => {
  const existingGuidelines = existingSetup.guidelines
    .map((g) => `### ${g.path}\n${g.content.slice(0, 1000)}...`)
    .join('\n\n');

  const existingSkills = existingSetup.skills
    .map((s) => `### ${s.path}\n${s.content.slice(0, 500)}...`)
    .join('\n\n');

  const existingAgents = existingSetup.agents
    .map((a) => `### ${a.path}\n${a.content.slice(0, 500)}...`)
    .join('\n\n');

  const skillCount = existingSetup.skills.length;
  const agentCount = existingSetup.agents.length;

  return `Compare the existing setup with fresh analysis and suggest improvements.

## EXISTING SETUP

### CLAUDE.md
${existingSetup.claudeMd || 'Not found'}

### Guidelines (${existingSetup.guidelines.length} files)
${existingGuidelines || 'None found'}

### Skills (${skillCount} files) ${skillCount >= 5 ? '⚠️ AT OR NEAR RECOMMENDED LIMIT' : ''}
${existingSkills || 'None found'}

### Agents (${agentCount} files) ${agentCount >= 5 ? '⚠️ AT OR NEAR RECOMMENDED LIMIT' : ''}
${existingAgents || 'None found'}

---

## VALIDATION ISSUES

${validationIssues || 'No validation issues found'}

---

## FRESH ANALYSIS

### Tech Profile
${freshAnalysis.techProfile}

### Detected Patterns
${freshAnalysis.patterns}

### Extracted Rules
${freshAnalysis.rules}

### Detected Workflows
${freshAnalysis.workflows}

---

## Required Output

Return a JSON object with this structure:
{
  "suggestions": [
    {
      "category": "missing_agent",
      "priority": "high",
      "description": "No agent enforces the 'use path aliases' rule",
      "currentState": "Rule mentioned in CLAUDE.md but no agent exists",
      "suggestedChange": "Create path-import-enforcer.md agent",
      "fileToModify": ".claude/agents/path-import-enforcer.md",
      "suggestedContent": "---\\nname: path-import-enforcer\\n..."
    },
    {
      "category": "swap_recommendation",
      "priority": "high",
      "description": "Consider swapping 'file-naming-enforcer' for 'no-hardcoded-colors'",
      "currentState": "file-naming-enforcer exists but enforces low-impact rule",
      "suggestedChange": "Replace with no-hardcoded-colors agent which enforces critical theming rule",
      "fileToModify": ".claude/agents/file-naming-enforcer.md",
      "replaceWith": "no-hardcoded-colors.md",
      "reason": "Hardcoded colors cause theme inconsistency and are frequently violated"
    },
    {
      "category": "index_issue",
      "priority": "medium",
      "description": "backend-testing.md not referenced in backend-index.md",
      "currentState": "File exists but is not discoverable via index",
      "suggestedChange": "Add reference to backend-testing.md in backend-index.md",
      "fileToModify": ".guidelines/backend/backend-index.md"
    }
  ],
  "summary": {
    "totalSuggestions": 5,
    "highPriority": 2,
    "mediumPriority": 2,
    "lowPriority": 1,
    "categories": {
      "missing_rule": 1,
      "missing_agent": 2,
      "swap_recommendation": 1,
      "index_issue": 1
    }
  },
  "overallAssessment": "The setup is solid but missing enforcement agents for several critical rules. Consider swapping lower-priority agents for higher-impact ones."
}

Be specific and actionable. Include actual content suggestions where helpful.
When agents/skills are at the limit, focus on SWAP recommendations rather than just additions.`;
};

export interface Suggestion {
  category:
    | 'missing_rule'
    | 'outdated_rule'
    | 'missing_skill'
    | 'missing_agent'
    | 'guideline_gap'
    | 'stale_content'
    | 'index_issue'
    | 'swap_recommendation';
  priority: 'high' | 'medium' | 'low';
  description: string;
  currentState: string;
  suggestedChange: string;
  fileToModify: string;
  suggestedContent?: string;
  replaceWith?: string;  // For swap recommendations
  reason?: string;       // For swap recommendations
}

export interface SuggestionsReport {
  suggestions: Suggestion[];
  summary: {
    totalSuggestions: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    categories: Record<string, number>;
  };
  overallAssessment: string;
}
