/**
 * Types for generated guidelines and artifacts
 */

export type GuidelineDomain = 'backend' | 'frontend' | 'shared' | 'all';
export type GuidelineType = 'architecture' | 'patterns' | 'testing' | 'configuration' | 'general';

/**
 * Validates and converts a string to GuidelineDomain
 */
export function toGuidelineDomain(domain: string): GuidelineDomain {
  const normalized = domain.toLowerCase();
  if (normalized === 'backend' || normalized === 'frontend' || normalized === 'shared' || normalized === 'all') {
    return normalized;
  }
  // Default fallback
  return 'all';
}

export interface GeneratedGuideline {
  domain: GuidelineDomain;
  type: string;
  fileName: string;
  content: string;
  priority: number;
}

export interface GeneratedIndex {
  type: 'root' | 'domain';
  domain?: string;
  fileName: string;
  content: string;
}
