/**
 * Frontmatter parser for markdown files
 * Extracts YAML frontmatter metadata from guideline, skill, and agent files
 */

export interface GuidelineMeta {
  title: string;
  description: string;
  domain: string;
  fileName: string;  // Original filename (e.g., "backend/error-handling.md")
  content: string;   // Content without frontmatter
}

export interface ArtifactMeta {
  name: string;       // From frontmatter (e.g., "browse-guidelines")
  description: string;
  fileName: string;   // Original filename (e.g., "browse-guidelines.md")
  content: string;    // Content without frontmatter
}

/**
 * Parse YAML frontmatter from guideline content
 *
 * Expected format:
 * ---
 * title: Error Handling Patterns
 * description: Try-catch patterns and custom error classes
 * ---
 * # Backend - Error Handling
 * ...
 */
export function parseFrontmatter(fileContent: string, fileName: string): GuidelineMeta {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = fileContent.match(frontmatterRegex);

  if (!match) {
    // No frontmatter - fallback to filename-based metadata
    const domain = extractDomainFromPath(fileName);
    return {
      title: fileNameToTitle(fileName),
      description: 'No description available',
      domain,
      fileName,
      content: fileContent
    };
  }

  const [, frontmatter, content] = match;
  const meta = parseYaml(frontmatter);

  // Extract domain from filename if not in frontmatter
  const domain = meta.domain || extractDomainFromPath(fileName);

  return {
    title: meta.title || fileNameToTitle(fileName),
    description: meta.description || 'No description available',
    domain,
    fileName,
    content
  };
}

/**
 * Extract metadata from all existing guidelines
 */
export function extractAllMetadata(
  existingGuidelines: Map<string, string>
): GuidelineMeta[] {
  const metadata: GuidelineMeta[] = [];

  for (const [fileName, content] of existingGuidelines) {
    metadata.push(parseFrontmatter(content, fileName));
  }

  return metadata;
}

/**
 * Parse YAML frontmatter from skill/agent content
 *
 * Expected format:
 * ---
 * name: skill-name
 * description: Brief description
 * ---
 * # Skill Name
 * ...
 */
export function parseArtifactFrontmatter(fileContent: string, fileName: string): ArtifactMeta {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = fileContent.match(frontmatterRegex);

  if (!match) {
    // No frontmatter - fallback to filename-based metadata
    return {
      name: fileNameToName(fileName),
      description: 'No description available',
      fileName,
      content: fileContent
    };
  }

  const [, frontmatter, content] = match;
  const meta = parseYaml(frontmatter);

  return {
    name: meta.name || fileNameToName(fileName),
    description: meta.description || 'No description available',
    fileName,
    content
  };
}

/**
 * Extract metadata from all existing artifacts (skills or agents)
 */
export function extractAllArtifactMetadata(
  existingArtifacts: Map<string, string>
): ArtifactMeta[] {
  const metadata: ArtifactMeta[] = [];

  for (const [fileName, content] of existingArtifacts) {
    metadata.push(parseArtifactFrontmatter(content, fileName));
  }

  return metadata;
}

/**
 * Simple YAML parser for frontmatter
 * Handles basic key-value pairs
 */
function parseYaml(yamlContent: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    const value = trimmed.substring(colonIndex + 1).trim();

    // Remove quotes if present
    result[key] = value.replace(/^["']|["']$/g, '');
  }

  return result;
}

/**
 * Extract domain from file path
 * "backend/error-handling.md" → "backend"
 * "all/typescript-imports.md" → "all"
 */
function extractDomainFromPath(fileName: string): string {
  const normalized = fileName.replace(/\\/g, '/');
  const parts = normalized.split('/');

  if (parts.length >= 2) {
    return parts[0]; // First part is domain
  }

  return 'unknown';
}

/**
 * Convert filename to readable title
 * "error-handling-try-catch.md" → "Error Handling Try Catch"
 */
function fileNameToTitle(fileName: string): string {
  const normalized = fileName.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const fileNameOnly = parts[parts.length - 1];

  // Remove extension and domain prefix
  const withoutExt = fileNameOnly.replace(/\.md$/, '');

  // Convert kebab-case to Title Case
  return withoutExt
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert filename to artifact name (kebab-case)
 * "browse-guidelines.md" → "browse-guidelines"
 */
function fileNameToName(fileName: string): string {
  const normalized = fileName.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const fileNameOnly = parts[parts.length - 1];

  // Remove extension
  return fileNameOnly.replace(/\.md$/, '');
}
