/**
 * Validation Schemas with Zod
 * Centralized schema definitions for input validation
 */

import { z } from 'zod';
import { resolve, isAbsolute, normalize } from 'path';

/**
 * Path schema - validates file/directory paths
 */
export const PathSchema = z.string()
  .min(1, 'Path cannot be empty')
  .refine(
    (path) => !path.includes('..') || isAbsolute(path),
    'Relative paths cannot contain parent directory references (..)'
  )
  .refine(
    (path) => !/[<>:"|?*]/.test(path.replace(/^[A-Za-z]:/, '')),
    'Path contains invalid characters'
  );

/**
 * Target path schema - validates and transforms to absolute path
 */
export const TargetPathSchema = PathSchema
  .transform((path) => resolve(normalize(path)));

/**
 * Safe path schema - additional security checks
 */
export const SafePathSchema = z.string()
  .min(1, 'Path cannot be empty')
  .refine(
    (path) => !path.includes('\0'),
    'Path cannot contain null bytes'
  )
  .refine(
    (path) => !/^[\\\/]{2}/.test(path),
    'UNC paths are not allowed'
  )
  .refine(
    (path) => !path.includes('..'),
    'Path traversal attempts are not allowed'
  );

/**
 * Analysis depth schema
 */
export const AnalysisDepthSchema = z.enum(['quick', 'standard', 'thorough']);

/**
 * Provider type schema
 */
export const ProviderTypeSchema = z.enum(['anthropic', 'groq']);

/**
 * API key schema - validates API key format
 */
export const ApiKeySchema = z.string()
  .min(1, 'API key is required')
  .refine(
    (key) => !key.includes(' '),
    'API key cannot contain spaces'
  )
  .refine(
    (key) => key.length >= 20,
    'API key seems too short'
  );

/**
 * Model configuration schema
 */
export const ModelConfigSchema = z.object({
  quick: z.string().min(1).optional(),
  standard: z.string().min(1).optional(),
  thorough: z.string().min(1).optional(),
}).optional();

/**
 * Provider configuration schema
 */
export const ProviderConfigSchema = z.object({
  provider: ProviderTypeSchema,
  apiKey: ApiKeySchema,
  models: ModelConfigSchema,
  excludedProjects: z.array(z.string()).optional(),
});

/**
 * Setup options schema
 */
export const SetupOptionsSchema = z.object({
  targetPath: TargetPathSchema,
  depth: AnalysisDepthSchema.default('standard'),
  interactive: z.boolean().default(true),
  outputDir: z.string().optional(),
  forceSetup: z.boolean().default(false),
});

/**
 * Guidelines generation options schema
 */
export const GuidelinesOptionsSchema = z.object({
  targetPath: TargetPathSchema,
  depth: AnalysisDepthSchema.default('standard'),
  interactive: z.boolean().default(true),
  merge: z.boolean().default(true),
});

/**
 * File path array schema - limits number of files
 */
export const FilePathArraySchema = z.array(SafePathSchema)
  .max(10000, 'Too many files (max 10000)');

/**
 * Exclusion pattern schema
 */
export const ExclusionPatternSchema = z.string()
  .min(1, 'Pattern cannot be empty')
  .max(500, 'Pattern too long');

/**
 * Exclusion patterns array schema
 */
export const ExclusionPatternsSchema = z.array(ExclusionPatternSchema)
  .max(100, 'Too many exclusion patterns (max 100)');

/**
 * Completion options schema
 */
export const CompletionOptionsSchema = z.object({
  depth: AnalysisDepthSchema.optional(),
  maxTokens: z.number().int().positive().max(100000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

/**
 * Guideline schema
 */
export const GuidelineSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().min(1).max(100),
  severity: z.enum(['error', 'warning', 'info']).optional(),
  examples: z.array(z.string()).optional(),
  references: z.array(z.string()).optional(),
});

/**
 * Skill schema for Claude artifacts
 */
export const SkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  triggers: z.array(z.string()).optional(),
  instructions: z.string().min(1),
});

/**
 * Agent schema for Claude artifacts
 */
export const AgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  role: z.string().min(1).max(500),
  skills: z.array(z.string()).optional(),
  instructions: z.string().min(1),
});

/**
 * Type exports
 */
export type Path = z.infer<typeof PathSchema>;
export type TargetPath = z.infer<typeof TargetPathSchema>;
export type SafePath = z.infer<typeof SafePathSchema>;
export type AnalysisDepth = z.infer<typeof AnalysisDepthSchema>;
export type ProviderType = z.infer<typeof ProviderTypeSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type SetupOptions = z.infer<typeof SetupOptionsSchema>;
export type GuidelinesOptions = z.infer<typeof GuidelinesOptionsSchema>;
export type CompletionOptions = z.infer<typeof CompletionOptionsSchema>;
export type Guideline = z.infer<typeof GuidelineSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Agent = z.infer<typeof AgentSchema>;
