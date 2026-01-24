/**
 * Agent Generator Service
 * Generates Claude Code agents from guidelines
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '../../../di/identifiers.js';
import type { ILogger } from '../../../interfaces/services/ILogger.js';
import type { IProviderClient } from '../../../providers/types.js';
import type { GeneratedGuideline, ExtractedRule, TechProfile } from '../../../types/index.js';
import { generateAllAgentsV2, type GeneratedAgent } from '../../../core/phases/claude-artifacts/agents-v2.js';
import { validateAllAgents } from '../../../core/phases/claude-artifacts/validator.js';

export interface AgentGenerationResult {
  success: boolean;
  agents: GeneratedAgent[];
  error?: string;
}

@injectable()
export class AgentGeneratorService {
  private readonly maxAgents = 5;

  constructor(
    @inject(TYPES.ILogger) private logger: ILogger
  ) {}

  /**
   * Generate agents from guidelines using improved V2 approach
   */
  async generate(
    client: IProviderClient,
    rules: ExtractedRule[],
    guidelines: GeneratedGuideline[],
    techProfile: TechProfile,
    onProgress?: (current: number, total: number, name: string) => void
  ): Promise<AgentGenerationResult> {
    try {
      this.logger.info('Starting agent generation (V2 - AI-guided selection)');

      const agents = await generateAllAgentsV2(
        client,
        guidelines,
        this.maxAgents,
        onProgress
      );

      this.logger.info(`Generated ${agents.length} agents`);
      return { success: true, agents };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Agent generation failed', { error: message });
      return { success: false, agents: [], error: message };
    }
  }

  /**
   * Validate generated agents
   */
  validate(
    agents: GeneratedAgent[],
    guidelines: GeneratedGuideline[]
  ): { valid: boolean; errors: string[] } {
    const validation = validateAllAgents(agents, guidelines);
    const errors: string[] = [];

    for (const [name, result] of validation) {
      if (!result.valid) {
        errors.push(`Agent "${name}": ${result.errors.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
