/**
 * Knowledge Registry
 * In-memory knowledge base for efficient file reading and context building
 */

export interface KnowledgeEntry {
  filePath: string;
  content: string;
  purpose: 'example' | 'pattern' | 'reference' | 'entry-point';
  domain: string; // 'backend', 'frontend', 'shared', 'mobile', etc.
  relevance: number; // 0-1 score
  metadata?: {
    lineCount?: number;
    hasTypes?: boolean;
    hasTests?: boolean;
    framework?: string;
  };
}

export interface KnowledgeFilters {
  domain?: string;
  purpose?: KnowledgeEntry['purpose'];
  minRelevance?: number;
  hasTypes?: boolean;
}

/**
 * Knowledge Registry - stores analyzed files for quick retrieval
 */
export class KnowledgeRegistry {
  private static instance: KnowledgeRegistry;
  private entries: Map<string, KnowledgeEntry>;
  private domainIndex: Map<string, Set<string>>;
  private purposeIndex: Map<string, Set<string>>;

  private constructor() {
    this.entries = new Map();
    this.domainIndex = new Map();
    this.purposeIndex = new Map();
  }

  static getInstance(): KnowledgeRegistry {
    if (!KnowledgeRegistry.instance) {
      KnowledgeRegistry.instance = new KnowledgeRegistry();
    }
    return KnowledgeRegistry.instance;
  }

  /**
   * Add entry to registry
   */
  add(entry: KnowledgeEntry): void {
    this.entries.set(entry.filePath, entry);

    // Update domain index
    if (!this.domainIndex.has(entry.domain)) {
      this.domainIndex.set(entry.domain, new Set());
    }
    this.domainIndex.get(entry.domain)!.add(entry.filePath);

    // Update purpose index
    if (!this.purposeIndex.has(entry.purpose)) {
      this.purposeIndex.set(entry.purpose, new Set());
    }
    this.purposeIndex.get(entry.purpose)!.add(entry.filePath);
  }

  /**
   * Query entries with filters
   */
  query(filters: KnowledgeFilters = {}): KnowledgeEntry[] {
    let results = Array.from(this.entries.values());

    if (filters.domain) {
      const domainPaths = this.domainIndex.get(filters.domain);
      if (domainPaths) {
        results = results.filter(e => domainPaths.has(e.filePath));
      } else {
        return [];
      }
    }

    if (filters.purpose) {
      const purposePaths = this.purposeIndex.get(filters.purpose);
      if (purposePaths) {
        results = results.filter(e => purposePaths.has(e.filePath));
      } else {
        return [];
      }
    }

    if (filters.minRelevance !== undefined) {
      results = results.filter(e => e.relevance >= filters.minRelevance!);
    }

    if (filters.hasTypes !== undefined) {
      results = results.filter(e => e.metadata?.hasTypes === filters.hasTypes);
    }

    return results;
  }

  /**
   * Get best entries for a domain
   */
  getBest(domain: string, limit: number): KnowledgeEntry[] {
    const entries = this.query({ domain });
    return entries
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /**
   * Get all domains
   */
  getDomains(): string[] {
    return Array.from(this.domainIndex.keys());
  }

  /**
   * Get entry by path
   */
  get(filePath: string): KnowledgeEntry | undefined {
    return this.entries.get(filePath);
  }

  /**
   * Get all entries
   */
  getAll(): KnowledgeEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get count
   */
  size(): number {
    return this.entries.size;
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.entries.clear();
    this.domainIndex.clear();
    this.purposeIndex.clear();
  }
}
