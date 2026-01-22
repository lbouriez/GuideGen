/**
 * Claude Artifacts Workflow
 * Main orchestrator for generating Claude Code skills, agents, and CLAUDE.md
 */

import { injectable, inject } from 'inversify';
import * as path from 'path';
import { TYPES } from '../../di/identifiers.js';
import type { ILogger } from '../../interfaces/services/ILogger.js';
import type { IProviderClient } from '../../providers/types.js';
import type { TechProfile } from '../../types/index.js';
import { promptUpdateMode, confirmChanges } from '../../utils/interactive.js';
import { printSuccess } from '../../utils/display.js';

import { ArtifactFileManager } from './services/ArtifactFileManager.js';
import { SkillGeneratorService } from './services/SkillGeneratorService.js';
import { AgentGeneratorService } from './services/AgentGeneratorService.js';
import { ClaudeMdGeneratorService } from './services/ClaudeMdGeneratorService.js';
import { ArtifactMergerService } from './services/ArtifactMergerService.js';
import { GuidelineExtractor } from './services/GuidelineExtractor.js';

export interface ClaudeArtifactsWorkflowResult {
  success: boolean;
  skillsGenerated: number;
  agentsGenerated: number;
  mode?: 'created' | 'updated' | 'cancelled';
  error?: string;
}

type UpdateMode = 'override' | 'update' | 'new';

@injectable()
export class ClaudeArtifactsWorkflow {
  constructor(
    @inject(TYPES.ILogger) private logger: ILogger,
    @inject(TYPES.IArtifactFileManager) private fileManager: ArtifactFileManager,
    @inject(TYPES.ISkillGeneratorService) private skillGenerator: SkillGeneratorService,
    @inject(TYPES.IAgentGeneratorService) private agentGenerator: AgentGeneratorService,
    @inject(TYPES.IClaudeMdGeneratorService) private claudeMdGenerator: ClaudeMdGeneratorService,
    @inject(TYPES.IArtifactMergerService) private merger: ArtifactMergerService,
    @inject(TYPES.IGuidelineExtractor) private guidelineExtractor: GuidelineExtractor
  ) {}

  /**
   * Run the complete Claude artifacts generation workflow
   */
  async execute(
    client: IProviderClient,
    targetPath: string,
    _techProfile: TechProfile,
    interactive: boolean = true,
    onProgress?: (message: string) => void
  ): Promise<ClaudeArtifactsWorkflowResult> {
    try {
      this.progress(onProgress, 'Starting Claude artifacts workflow...');

      // Read and validate guidelines
      const guidelines = this.guidelineExtractor.readGuidelines(targetPath);
      if (guidelines.length === 0) {
        return this.errorResult('No guidelines found. Run guidelines generation first.');
      }

      // Extract rules from guidelines
      const rules = this.guidelineExtractor.extractRules(guidelines);

      // Determine update mode
      const updateMode = await this.determineUpdateMode(targetPath, interactive);
      if (updateMode === null) {
        return this.cancelledResult();
      }

      // Generate artifacts
      const { skills, agents, claudeMd } = await this.generateArtifacts(
        client,
        targetPath,
        rules,
        guidelines,
        onProgress
      );

      // Validate artifacts
      const validationError = this.validateArtifacts(skills, agents, guidelines);
      if (validationError) {
        return this.errorResult(validationError);
      }

      // Handle different modes
      if (updateMode === 'update') {
        return await this.handleUpdateMode(
          client,
          targetPath,
          skills,
          agents,
          claudeMd.content,
          interactive,
          onProgress
        );
      }

      // New or override mode - write directly
      this.progress(onProgress, 'Writing artifacts...');
      this.fileManager.writeArtifacts(targetPath, skills, agents, claudeMd.content);

      printSuccess(`\n✓ Claude artifacts created: ${skills.length} skills, ${agents.length} agents`);

      return {
        success: true,
        skillsGenerated: skills.length,
        agentsGenerated: agents.length,
        mode: 'created'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Claude artifacts workflow failed', { error: message });
      return this.errorResult(message);
    }
  }

  /**
   * Determine the update mode based on existing artifacts
   */
  private async determineUpdateMode(
    targetPath: string,
    interactive: boolean
  ): Promise<UpdateMode | null> {
    const exists = this.fileManager.artifactsExist(targetPath);

    if (!exists) {
      return 'new';
    }

    if (interactive) {
      const choice = await promptUpdateMode(path.join(targetPath, '.claude/'));

      if (choice === 'cancel') {
        return null;
      }

      if (choice === 'override') {
        this.fileManager.deleteArtifacts(targetPath);
        return 'override';
      }

      return 'update';
    }

    return 'update';
  }

  /**
   * Generate all artifacts
   */
  private async generateArtifacts(
    client: IProviderClient,
    targetPath: string,
    rules: ReturnType<GuidelineExtractor['extractRules']>,
    guidelines: ReturnType<GuidelineExtractor['readGuidelines']>,
    onProgress?: (message: string) => void
  ) {
    // Generate skills
    this.progress(onProgress, 'Generating skills...');
    const skillResult = await this.skillGenerator.generate(
      client,
      rules,
      guidelines,
      (current, total, name) => {
        this.progress(onProgress, `Generating skill ${current}/${total}: ${name}`);
      }
    );

    if (!skillResult.success) {
      throw new Error(skillResult.error);
    }

    // Generate agents
    this.progress(onProgress, 'Generating agents...');
    const agentResult = await this.agentGenerator.generate(
      client,
      rules,
      guidelines,
      (current, total, name) => {
        this.progress(onProgress, `Generating agent ${current}/${total}: ${name}`);
      }
    );

    if (!agentResult.success) {
      throw new Error(agentResult.error);
    }

    // Generate CLAUDE.md
    const projectName = path.basename(targetPath);
    const packageScripts = this.guidelineExtractor.getPackageJsonScripts(targetPath);
    const claudeMd = this.claudeMdGenerator.generate(
      projectName,
      guidelines,
      skillResult.skills,
      agentResult.agents,
      packageScripts
    );

    return {
      skills: skillResult.skills,
      agents: agentResult.agents,
      claudeMd
    };
  }

  /**
   * Validate generated artifacts
   */
  private validateArtifacts(
    skills: ReturnType<SkillGeneratorService['generate']> extends Promise<infer R> ? R extends { skills: infer S } ? S : never : never,
    agents: ReturnType<AgentGeneratorService['generate']> extends Promise<infer R> ? R extends { agents: infer A } ? A : never : never,
    guidelines: ReturnType<GuidelineExtractor['readGuidelines']>
  ): string | null {
    this.progress(undefined, 'Validating artifacts...');

    const skillValidation = this.skillGenerator.validate(skills, guidelines);
    if (!skillValidation.valid) {
      return `Skill validation failed: ${skillValidation.errors.join('; ')}`;
    }

    const agentValidation = this.agentGenerator.validate(agents, guidelines);
    if (!agentValidation.valid) {
      return `Agent validation failed: ${agentValidation.errors.join('; ')}`;
    }

    return null;
  }

  /**
   * Handle update mode with intelligent merging
   */
  private async handleUpdateMode(
    client: IProviderClient,
    targetPath: string,
    skills: Awaited<ReturnType<SkillGeneratorService['generate']>>['skills'],
    agents: Awaited<ReturnType<AgentGeneratorService['generate']>>['agents'],
    claudeMdContent: string,
    interactive: boolean,
    onProgress?: (message: string) => void
  ): Promise<ClaudeArtifactsWorkflowResult> {
    this.progress(onProgress, 'Reading existing artifacts...');
    const existing = this.fileManager.readExistingArtifacts(targetPath);

    this.progress(onProgress, 'Intelligently merging artifacts...');
    const mergeResult = await this.merger.merge(
      client,
      skills,
      agents,
      claudeMdContent,
      existing,
      (current, total, fileName) => {
        this.progress(onProgress, `Merging ${current}/${total}: ${fileName}`);
      }
    );

    if (!mergeResult.success) {
      return this.errorResult(mergeResult.error || 'Merge failed');
    }

    // Show preview and confirm in interactive mode
    if (interactive) {
      const confirmed = await confirmChanges(
        mergeResult.changesSummary.join('\n'),
        mergeResult.filesChanged
      );

      if (!confirmed) {
        return this.cancelledResult();
      }
    }

    // Write merged artifacts
    this.progress(onProgress, 'Writing updated artifacts...');
    this.fileManager.writeArtifacts(
      targetPath,
      skills,
      agents,
      claudeMdContent,
      mergeResult.mergedContent
    );

    printSuccess(`\n✓ Claude artifacts updated: ${skills.length} skills, ${agents.length} agents`);

    return {
      success: true,
      skillsGenerated: skills.length,
      agentsGenerated: agents.length,
      mode: 'updated'
    };
  }

  /**
   * Helper to send progress messages
   */
  private progress(onProgress: ((message: string) => void) | undefined, message: string): void {
    if (onProgress) {
      onProgress(message);
    }
  }

  /**
   * Create error result
   */
  private errorResult(error: string): ClaudeArtifactsWorkflowResult {
    return {
      success: false,
      skillsGenerated: 0,
      agentsGenerated: 0,
      error
    };
  }

  /**
   * Create cancelled result
   */
  private cancelledResult(): ClaudeArtifactsWorkflowResult {
    return {
      success: true,
      skillsGenerated: 0,
      agentsGenerated: 0,
      mode: 'cancelled'
    };
  }
}
