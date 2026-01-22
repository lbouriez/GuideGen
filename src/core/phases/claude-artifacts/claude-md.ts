/**
 * CLAUDE.md file generation
 */

import type { GeneratedGuideline } from '@/types';
import type { GeneratedSkill } from './skills';
import type { GeneratedAgent } from './agents';

export interface GeneratedClaudeMd {
  content: string;
}

/**
 * Generate CLAUDE.md content
 */
export function generateClaudeMd(
  projectName: string,
  guidelines: GeneratedGuideline[],
  skills: GeneratedSkill[],
  agents: GeneratedAgent[],
  packageJsonCommands?: Record<string, string>
): GeneratedClaudeMd {
  // Group guidelines by domain
  const domainMap = new Map<string, GeneratedGuideline[]>();
  for (const guideline of guidelines) {
    if (!domainMap.has(guideline.domain)) {
      domainMap.set(guideline.domain, []);
    }
    domainMap.get(guideline.domain)!.push(guideline);
  }

  // Extract critical rules from guidelines (look for ✅/❌ patterns)
  const criticalRules: string[] = [];
  for (const guideline of guidelines) {
    const doMatches = guideline.content.match(/- ✅[^\n]+/g);
    const neverMatches = guideline.content.match(/- ❌[^\n]+/g);

    if (doMatches) criticalRules.push(...doMatches.slice(0, 2));
    if (neverMatches) criticalRules.push(...neverMatches.slice(0, 2));
  }

  // Build quick commands section
  let commandsSection = '';
  if (packageJsonCommands && Object.keys(packageJsonCommands).length > 0) {
    const importantCommands = ['dev', 'start', 'build', 'test', 'setup'];
    const commands = Object.entries(packageJsonCommands)
      .filter(([name]) => importantCommands.some(ic => name.includes(ic)))
      .slice(0, 6);

    if (commands.length > 0) {
      commandsSection = `\n## Quick Commands\n\n\`\`\`bash\n${commands.map(([name, cmd]) => `npm run ${name}  # ${cmd}`).join('\n')}\n\`\`\`\n`;
    }
  }

  // Build skills section
  const skillsSection = skills.length > 0
    ? `\n**Skills** (invoke with \`/skillname\`):\n${skills.map(s => {
        // Extract description from frontmatter
        const descMatch = s.content.match(/description:\s*([^\n]+)/);
        const desc = descMatch ? descMatch[1].trim() : 'Browse project guidelines';
        return `- \`/${s.name}\` - ${desc}`;
      }).join('\n')}\n`
    : '';

  // Build agents section
  const agentsSection = agents.length > 0
    ? `\n**Agents** (automatic enforcement):\n${agents.map(a => `- \`${a.name}\` - ${a.rule}`).join('\n')}\n`
    : '';

  const content = `# ${projectName} Development Guidelines

## Critical Rules

${criticalRules.slice(0, 10).join('\n')}
${commandsSection}

## Full Guidelines

See \`.guidelines/index.md\` for complete documentation.

## Skills & Agents
${skillsSection}${agentsSection}
`;

  return { content };
}
