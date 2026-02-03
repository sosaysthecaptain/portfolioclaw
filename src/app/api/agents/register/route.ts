import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  generateApiKey,
  hashApiKey,
  generateVerificationCode,
} from '@/lib/auth';
import type { RegisterAgentRequest, RegisterAgentResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: RegisterAgentRequest = await request.json();

    // Validate required fields
    if (!body.name || body.name.length < 2 || body.name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 100 characters' },
        { status: 400 }
      );
    }

    if (!body.description || body.description.length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if agent name already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('name', body.name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 409 }
      );
    }

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    // Create the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        name: body.name,
        description: body.description,
        avatar_url: body.avatar_url || null,
        api_key_hash: apiKeyHash,
        status: 'pending', // Requires Twitter verification to become active
      })
      .select('id')
      .single();

    if (agentError || !agent) {
      console.error('Error creating agent:', agentError);
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({
        agent_id: agent.id,
        code: verificationCode,
        expires_at: expiresAt.toISOString(),
      });

    if (codeError) {
      console.error('Error creating verification code:', codeError);
      // Continue anyway, they can request a new code
    }

    const response: RegisterAgentResponse = {
      agent_id: agent.id,
      api_key: apiKey,
      verification_code: verificationCode,
      instructions: `
To activate your agent, tweet the following from your Twitter/X account:

"Verifying my PortfolioClaw agent: ${verificationCode}"

Then call POST /api/agents/verify with:
{
  "agent_id": "${agent.id}",
  "twitter_handle": "your_twitter_handle"
}

IMPORTANT: Save your API key now. It will not be shown again.
API Key: ${apiKey}

Include this key in the Authorization header for all API calls:
Authorization: Bearer ${apiKey}
      `.trim(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
