/**
 * Artifact Merger Service
 * Handles intelligent merging of new and existing artifacts
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/identifiers.js';
import type { ILogger } from '../../../interfaces/services/ILogger.js';
import type { IProviderClient } from '../../../providers/types.js';
import type { GeneratedSkill } from '../../../core/phases/claude-artifacts/skills.js';
import type { GeneratedAgent } from '../../../core/phases/claude-artifacts/agents.js';
import { batchIntelligentMerge, formatChanges, type MergeChange } from '../../../core/phases/intelligent-merge.js';
import type { ExistingArtifacts, MergedContent } from './ArtifactFileManager.js';
import type { ArtifactMatchDecision } from '../../../core/workflows/services/artifact-matcher.js';

export interface MergeItem {
  fileName: string;
  existing: string | null;
  generated: string;
  type: 'skill' | 'agent' | 'claude-md';
}

export interface MergeResult {
  success: boolean;
  mergedContent: MergedContent;
  changesSummary: string[];
  filesChanged: number;
  error?: string;
}

@injectable()
export class ArtifactMergerService {
  constructor(
    @inject(TYPES.ILogger) private logger: ILogger
  ) {}

  /**
   * Merge new artifacts with existing ones
   */
  async merge(
    client: IProviderClient,
    skills: GeneratedSkill[],
    agents: GeneratedAgent[],
    claudeMdContent: string,
    existing: ExistingArtifacts,
    onProgress?: (current: number, total: number, fileName: string) => void,
    skillMatchDecisions?: Map<string, ArtifactMatchDecision>,
    agentMatchDecisions?: Map<string, ArtifactMatchDecision>
  ): Promise<MergeResult> {
    try {
      this.logger.info('Starting artifact merge');

      // Prepare items for merge
      const itemsToMerge = this.prepareItemsForMerge(
        skills,
        agents,
        claudeMdContent,
        existing,
        skillMatchDecisions,
        agentMatchDecisions
      );

      // Perform batch intelligent merge
      const mergeResults = await batchIntelligentMerge(
        client,
        itemsToMerge,
        this.logger,
        onProgress
      );

      // Build change summary and merged content
      const { changesSummary, mergedContent } = this.processMergeResults(
        mergeResults,
        skills,
        agents
      );

      this.logger.info(`Merge complete: ${mergeResults.size} files processed`);

      return {
        success: true,
        mergedContent,
        changesSummary,
        filesChanged: mergeResults.size
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Artifact merge failed', { error: message });
      return {
        success: false,
        mergedContent: { skills: new Map(), agents: new Map(), claudeMd: null },
        changesSummary: [],
        filesChanged: 0,
        error: message
      };
    }
  }

  /**
   * Prepare items for merging
   */
  private prepareItemsForMerge(
    skills: GeneratedSkill[],
    agents: GeneratedAgent[],
    claudeMdContent: string,
    existing: ExistingArtifacts,
    skillMatchDecisions?: Map<string, ArtifactMatchDecision>,
    agentMatchDecisions?: Map<string, ArtifactMatchDecision>
  ): MergeItem[] {
    const items: MergeItem[] = [];

    // Skills
    for (const skill of skills) {
      const decision = skillMatchDecisions?.get(skill.name);
      const existingContent = decision?.existingFileName
        ? existing.skills.get(decision.existingFileName)
        : existing.skills.get(skill.fileName);

      if (decision?.action === 'update') {
        this.logger.info(`Matched skill ${skill.name} → ${decision.existingFileName} (${decision.reason})`);
      }

      items.push({
        fileName: skill.fileName,
        existing: existingContent || null,
        generated: skill.content,
        type: 'skill'
      });
    }

    // Agents
    for (const agent of agents) {
      const decision = agentMatchDecisions?.get(agent.name);
      const existingContent = decision?.existingFileName
        ? existing.agents.get(decision.existingFileName)
        : existing.agents.get(agent.fileName);

      if (decision?.action === 'update') {
        this.logger.info(`Matched agent ${agent.name} → ${decision.existingFileName} (${decision.reason})`);
      }

      items.push({
        fileName: agent.fileName,
        existing: existingContent || null,
        generated: agent.content,
        type: 'agent'
      });
    }

    // CLAUDE.md
    items.push({
      fileName: 'CLAUDE.md',
      existing: existing.claudeMd,
      generated: claudeMdContent,
      type: 'claude-md'
    });

    return items;
  }

  /**
   * Process merge results into final format
   */
  private processMergeResults(
    mergeResults: Map<string, { mergedContent: string; changes: MergeChange[] }>,
    skills: GeneratedSkill[],
    agents: GeneratedAgent[]
  ): { changesSummary: string[]; mergedContent: MergedContent } {
    const changesSummary: string[] = [];
    const mergedSkills = new Map<string, string>();
    const mergedAgents = new Map<string, string>();
    let mergedClaudeMd: string | null = null;

    for (const [fileName, result] of mergeResults) {
      // Build change summary
      changesSummary.push(`\n${fileName}:`);
      changesSummary.push(formatChanges(result.changes));

      // Categorize merged content
      if (skills.some(s => s.fileName === fileName)) {
        mergedSkills.set(fileName, result.mergedContent);
      } else if (agents.some(a => a.fileName === fileName)) {
        mergedAgents.set(fileName, result.mergedContent);
      } else if (fileName === 'CLAUDE.md') {
        mergedClaudeMd = result.mergedContent;
      }
    }

    return {
      changesSummary,
      mergedContent: {
        skills: mergedSkills,
        agents: mergedAgents,
        claudeMd: mergedClaudeMd
      }
    };
  }
}
