/**
 * Agents generation logic
 */

import type { IProviderClient } from '@/providers/types';
import type { ExtractedRule, GeneratedGuideline } from '@/types';
import { AGENT_SYSTEM_PROMPT, AGENT_USER_PROMPT } from './prompts';

export interface GeneratedAgent {
  name: string;
  fileName: string;
  content: string;
  referencedGuideline: string;
  rule: string;
}

/**
 * Identify agents to generate from rules
 */
export function identifyAgents(
  rules: ExtractedRule[],
  guidelines: GeneratedGuideline[]
): Array<{ name: string; rule: ExtractedRule; guideline: string }> {
  const agents: Array<{ name: string; rule: ExtractedRule; guideline: string }> = [];

  // Only create agents for critical/important rules that are enforceable
  const enforceableRules = rules.filter(r =>
    r.enforceable &&
    (r.category === 'critical' || r.category === 'important')
  );

  for (const rule of enforceableRules) {
    // Find matching guideline
    const domain = rule.domain || 'shared';
    const matchingGuideline = guidelines.find(g =>
      g.domain === domain &&
      g.content.toLowerCase().includes(rule.id.toLowerCase())
    );

    if (matchingGuideline) {
      agents.push({
        name: rule.id,
        rule,
        guideline: `.guidelines/${matchingGuideline.domain}/${matchingGuideline.fileName}`
      });
    }
  }

  // If no agents identified, create a default critical-rules-enforcer agent
  if (agents.length === 0 && guidelines.length > 0) {
    // Use the first guideline as reference, create a generic critical rules agent
    const firstGuideline = guidelines[0];
    const defaultRule: ExtractedRule = {
      id: 'critical-rules',
      category: 'critical',
      description: 'Enforce critical rules and best practices from project guidelines',
      domain: (firstGuideline.domain === 'backend' || firstGuideline.domain === 'frontend' || firstGuideline.domain === 'shared')
        ? firstGuideline.domain
        : 'all',
      enforceable: true
    };

    agents.push({
      name: 'critical-rules-enforcer',
      rule: defaultRule,
      guideline: `.guidelines/index.md`
    });
  }

  return agents;
}

/**
 * Generate a single agent
 */
export async function generateAgent(
  client: IProviderClient,
  agentName: string,
  rule: ExtractedRule,
  guidelineReference: string
): Promise<GeneratedAgent> {
  // Extract examples from rule
  const examples = [
    rule.goodExample || '',
    rule.badExample || '',
    rule.example || ''
  ].filter(Boolean).join('\n\n');

  const response = await client.sendMessage(
    AGENT_SYSTEM_PROMPT,
    AGENT_USER_PROMPT(
      agentName,
      rule.description,
      guidelineReference,
      examples
    )
  );

  // Extract agent name from content (frontmatter)
  const nameMatch = response.content.match(/name:\s*([^\n]+)/);
  const actualName = nameMatch ? nameMatch[1].trim() : agentName;

  return {
    name: actualName,
    fileName: `${actualName}.md`,
    content: response.content,
    referencedGuideline: guidelineReference,
    rule: rule.description
  };
}

/**
 * Generate all agents
 */
export async function generateAllAgents(
  client: IProviderClient,
  rules: ExtractedRule[],
  guidelines: GeneratedGuideline[],
  maxAgents: number = 10,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<GeneratedAgent[]> {
  const agentsToGenerate = identifyAgents(rules, guidelines);

  // Apply limit
  const limited = agentsToGenerate.slice(0, maxAgents);

  const results: GeneratedAgent[] = [];

  for (let i = 0; i < limited.length; i++) {
    const agent = limited[i];
    if (onProgress) {
      onProgress(i + 1, limited.length, agent.name);
    }

    const generated = await generateAgent(
      client,
      agent.name,
      agent.rule,
      agent.guideline
    );

    results.push(generated);
  }

  return results;
}
