/**
 * Pattern detection logic
 * Simplified pattern analysis
 */

import type { PatternReport, TechProfile, AnalysisDepth } from '@/types';
import type { IProviderClient } from '@/types';
import { ANALYSIS_SYSTEM_PROMPT, ANALYSIS_USER_PROMPT } from './prompts';

export async function detectPatterns(
  client: IProviderClient,
  techProfile: TechProfile,
  sampleFiles: Array<{ path: string; content: string }>,
  depth: AnalysisDepth = 'standard'
): Promise<PatternReport> {
  // Format tech profile
  const techProfileStr = JSON.stringify(techProfile, null, 2);
  
  // Format code content
  const codeContent = sampleFiles
    .map(f => `// File: ${f.path}\n${f.content}`)
    .join('\n\n---\n\n');
  
  // Determine project type
  const projectType = (techProfile.projects || [])[0]?.type || 'unknown';
  
  return await client.completeWithJson<PatternReport>(
    ANALYSIS_SYSTEM_PROMPT,
    ANALYSIS_USER_PROMPT(techProfileStr, codeContent, projectType)
  );
}
