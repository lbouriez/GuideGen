/**
 * Zod schemas for runtime validation of AI responses
 * Ensures type safety when parsing JSON from LLM outputs
 */

import { z } from 'zod';

/**
 * Guideline Domain Schema
 */
export const GuidelineDomainSchema = z.enum(['backend', 'frontend', 'shared', 'mobile', 'all']);

/**
 * Generated Guideline Schema
 */
export const GeneratedGuidelineSchema = z.object({
  domain: GuidelineDomainSchema,
  type: z.string().min(1),
  fileName: z.string().regex(/\.md$/),
  content: z.string().min(100),
  priority: z.number().min(1).max(10).optional(),
});
export type GeneratedGuidelineValidated = z.infer<typeof GeneratedGuidelineSchema>;

/**
 * Code Pattern Schema
 */
export const CodePatternSchema = z.object({
  name: z.string(),
  description: z.string(),
  examples: z.array(z.string()),
  files: z.array(z.string()),
  frequency: z.enum(['always', 'common', 'occasional']),
});

/**
 * Pattern Report Schema
 */
export const PatternReportSchema = z.object({
  importPatterns: z.array(CodePatternSchema).optional(),
  namingConventions: z.array(CodePatternSchema).optional(),
  architecturePatterns: z.array(CodePatternSchema).optional(),
  stateManagement: z.array(CodePatternSchema).optional(),
  errorHandling: z.array(CodePatternSchema).optional(),
  loggingPatterns: z.array(CodePatternSchema).optional(),
});

/**
 * Merge Change Schema
 */
export const MergeChangeSchema = z.object({
  type: z.enum(['added', 'modified', 'removed', 'kept']),
  section: z.string(),
  description: z.string(),
  significance: z.enum(['minor', 'major']),
});

/**
 * Intelligent Merge Result Schema
 */
export const IntelligentMergeResultSchema = z.object({
  mergedContent: z.string(),
  changes: z.array(MergeChangeSchema),
  requiresConfirmation: z.boolean().optional().default(false),
});
export type IntelligentMergeResultValidated = z.infer<typeof IntelligentMergeResultSchema>;

/**
 * Rule Schema
 */
export const RuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: z.enum(['critical', 'important', 'recommended']),
  domain: z.enum(['backend', 'frontend', 'shared', 'all']),
  enforceable: z.boolean(),
  doExample: z.string().optional(),
  dontExample: z.string().optional(),
});

/**
 * Extracted Rule Schema
 */
export const ExtractedRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: z.enum(['critical', 'important', 'recommended']),
  domain: z.enum(['backend', 'frontend', 'shared', 'all']).optional(),
  enforceable: z.boolean(),
  type: z.string().optional(),
  steps: z.array(z.any()).optional(),
  goodExample: z.string().optional(),
  badExample: z.string().optional(),
  example: z.string().optional(),
});

/**
 * Tech Stack Schema
 */
export const TechStackSchema = z.object({
  languages: z.array(z.string()),
  frameworks: z.array(z.string()),
  buildTools: z.array(z.string()),
  testingFrameworks: z.array(z.string()),
  linters: z.array(z.string()),
  packageManager: z.enum(['npm', 'yarn', 'pnpm', 'bun', 'unknown']),
});

/**
 * Project Info Schema
 */
export const ProjectInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(['frontend', 'backend', 'shared', 'website', 'mobile', 'unknown']),
  stack: TechStackSchema.partial(),
});

/**
 * Tech Profile Schema
 */
export const TechProfileSchema = z.object({
  stack: TechStackSchema,
  structure: z.object({
    root: z.string(),
    directories: z.array(z.string()),
    keyFiles: z.array(z.string()),
    configFiles: z.array(z.string()),
    isMonorepo: z.boolean().optional(),
  }).optional(),
  isMonorepo: z.boolean().optional(),
  projects: z.array(ProjectInfoSchema).optional(),
  languages: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
});

/**
 * Guideline to Generate Schema
 */
export const GuidelineToGenerateSchema = z.object({
  domain: GuidelineDomainSchema,
  type: z.string(),
  priority: z.number().min(1).max(10),
  description: z.string().optional(),
});

/**
 * Guidelines List Schema (for AI responses that return arrays)
 */
export const GuidelinesListSchema = z.array(GuidelineToGenerateSchema);

/**
 * Safe JSON parse with schema validation
 */
export function parseWithSchema<T>(
  schema: z.ZodSchema<T>,
  jsonString: string
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errorMessages = result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: `Validation failed: ${errorMessages}` };
    }
  } catch (error) {
    return { success: false, error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Extract JSON from AI response (handles markdown code blocks)
 */
export function extractJsonFromResponse(response: string): string | null {
  // Try to find JSON in markdown code blocks first
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // Fall back to finding raw JSON object
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
}

/**
 * Parse AI JSON response with schema validation
 */
export function parseAIResponse<T>(
  schema: z.ZodSchema<T>,
  response: string
): { success: true; data: T } | { success: false; error: string } {
  const jsonString = extractJsonFromResponse(response);

  if (!jsonString) {
    return { success: false, error: 'No JSON found in AI response' };
  }

  return parseWithSchema(schema, jsonString);
}

/**
 * Package.json Schema
 * Minimal validation for package.json files
 */
export const PackageJsonSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  scripts: z.record(z.string(), z.string()).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
}).passthrough(); // Allow additional fields

export type PackageJson = z.infer<typeof PackageJsonSchema>;
