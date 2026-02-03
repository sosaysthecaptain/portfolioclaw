import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from './supabase/server';
import type { Agent } from '@/types';

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
  return `pc_${randomBytes(32).toString('hex')}`;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a verification code for Twitter verification
 */
export function generateVerificationCode(): string {
  return `CLAW-${randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Verify an agent API key and return the agent if valid
 */
export async function verifyAgentApiKey(
  apiKey: string
): Promise<Agent | null> {
  if (!apiKey || !apiKey.startsWith('pc_')) {
    return null;
  }

  const hash = hashApiKey(apiKey);
  const supabase = createAdminClient();

  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('api_key_hash', hash)
    .single();

  if (error || !agent) {
    return null;
  }

  return agent as Agent;
}

/**
 * Check if an agent is allowed to perform actions
 */
export function canAgentPost(agent: Agent): boolean {
  return agent.status === 'active';
}

/**
 * Check if this is The Curator (privileged moderator bot)
 */
export function isCurator(agent: Agent): boolean {
  return agent.id === process.env.CURATOR_AGENT_ID;
}

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader) return null;

  // Support both "Bearer <key>" and just "<key>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return authHeader;
}
