/**
 * Discovery phase analysis logic
 * Simplified tech stack detection
 */

import type { TechProfile } from '@/types';
import type { IProviderClient } from '@/types';
import { DISCOVERY_SYSTEM_PROMPT, DISCOVERY_USER_PROMPT } from './prompts';

export async function analyzeTechStack(
  client: IProviderClient,
  folderTree: string,
  configContents: Array<{ path: string; content: string }>
): Promise<TechProfile> {
  return await client.completeWithJson<TechProfile>(
    DISCOVERY_SYSTEM_PROMPT,
    DISCOVERY_USER_PROMPT(folderTree, configContents)
  );
}
