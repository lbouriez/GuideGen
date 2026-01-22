/**
 * Extraction phase prompts
 * Phase 3: Convert patterns into enforceable rules
 */

export const EXTRACTION_SYSTEM_PROMPT = `You are a technical lead converting observed code patterns into documented rules and workflows.

Your task is to:

1. **Convert Patterns to Rules**
   - Each consistent pattern becomes a rule
   - Identify what should ALWAYS be done
   - Identify what should NEVER be done
   - Provide do/don't examples

2. **Categorize Rules**
   - 'critical': Breaking this causes bugs, security issues, or build failures
   - 'important': Breaking this causes inconsistency or maintenance issues
   - 'recommended': Nice to have, but not critical

3. **Identify Enforceable Rules**
   - Can an agent automatically check for violations?
   - Is it a clear yes/no check?
   - Examples: "never use console.log", "always use path aliases"

4. **Map Workflows**
   - Common development tasks (add endpoint, create component)
   - Step-by-step processes
   - Which files to touch in what order

## Rule Format

Each rule should be actionable:
- BAD: "Use good naming conventions"
- GOOD: "Use PascalCase for React component files (e.g., UserProfile.tsx, not userProfile.tsx)"

## Output Format

Return a JSON object with rules and workflows.`;

export const EXTRACTION_USER_PROMPT = (
  techProfile: string,
  patternReport: string,
  existingLinterConfig: string
): string => {
  return `Convert these patterns into rules and workflows.

## Tech Profile
${techProfile}

## Observed Patterns
${patternReport}

## Existing Linter Configuration
${existingLinterConfig || 'No linter configuration found'}

## Required Output

Return a JSON object with this structure:
{
  "rules": [
    {
      "id": "no-console-log",
      "description": "Never use console.log, use the Winston logger instead",
      "category": "critical",
      "domain": "backend",
      "enforceable": true,
      "doExample": "import { logger } from '@/logger'; logger.info('message');",
      "dontExample": "console.log('message');"
    },
    {
      "id": "use-path-aliases",
      "description": "Always use @/ path aliases for imports within src/",
      "category": "important",
      "domain": "all",
      "enforceable": true,
      "doExample": "import { Button } from '@/components/Button';",
      "dontExample": "import { Button } from '../../../components/Button';"
    }
  ],
  "workflows": [
    {
      "name": "Add Backend Endpoint",
      "description": "Steps to add a new API endpoint",
      "domain": "backend",
      "steps": [
        { "order": 1, "action": "Create Zod schema in schemas/", "guidelineReference": "backend-schemas.md" },
        { "order": 2, "action": "Create repository interface and implementation", "guidelineReference": "backend-repositories.md" },
        { "order": 3, "action": "Register in DI container", "guidelineReference": "backend-di.md" },
        { "order": 4, "action": "Create service", "guidelineReference": "backend-services.md" },
        { "order": 5, "action": "Create route with registerRoute()", "guidelineReference": "backend-routes.md" }
      ]
    }
  ],
  "existingLinterRules": ["@typescript-eslint/no-unused-vars", "react-hooks/rules-of-hooks"]
}

Focus on rules that are:
1. Clearly observed in the codebase
2. Important for consistency
3. Enforceable (can be checked programmatically)`;
};