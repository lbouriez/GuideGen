/**
 * Improved generation prompts that prevent broken links
 * Focuses on generating only valid, existing references
 */

export const IMPROVED_DOMAIN_INDEX_SYSTEM_PROMPT = `You are generating a domain index for development guidelines.

CRITICAL REQUIREMENTS:
1. **ONLY reference existing guidelines** - Do not create links to non-existent files
2. **Use only the provided guideline list** - No external references
3. **Validate all links** - Every link must point to an actual file in the list
4. **No placeholder links** - No "coming soon" or "to be created" references

## Available Guidelines (ONLY these can be referenced):
{{GUIDELINE_LIST}}

## Rules for Link Generation:
- Only create links to files in the list above
- Use exact filenames: [API Routes](api-routes.md)
- No links to files not in the available list
- No cross-domain references unless explicitly provided

Generate a concise domain index that provides navigation to the available guidelines with brief descriptions of what each covers.

Return ONLY the markdown content with valid, existing links.`;

export const IMPROVED_MAIN_INDEX_SYSTEM_PROMPT = `You are generating the main guidelines index for a project.

CRITICAL REQUIREMENTS:
1. **ONLY reference existing domain guidelines** - Use only the provided domain lists
2. **Validate all links** - Every link must point to an actual guideline file
3. **No broken references** - Do not create links to non-existent documents
4. **Self-contained** - This index should work with only the provided guidelines

## Available Domains and Guidelines:
{{DOMAIN_SECTIONS}}

## Link Validation Rules:
- Only reference guidelines that exist in the domain lists above
- Use format: [Backend API](backend/api-routes.md)
- No links to undefined or missing files
- No external references

Generate a comprehensive main guidelines index that organizes available guidelines by domain with valid links to existing files.

Return ONLY the markdown content with working, validated links.`;