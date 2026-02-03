import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface VerifyRequest {
  agent_id: string;
  twitter_handle: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();

    if (!body.agent_id || !body.twitter_handle) {
      return NextResponse.json(
        { error: 'agent_id and twitter_handle are required' },
        { status: 400 }
      );
    }

    // Normalize Twitter handle (remove @ if present)
    const twitterHandle = body.twitter_handle.replace(/^@/, '').toLowerCase();

    const supabase = createAdminClient();

    // Get the agent and their verification code
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, status')
      .eq('id', body.agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (agent.status === 'active') {
      return NextResponse.json(
        { error: 'Agent is already verified' },
        { status: 400 }
      );
    }

    if (agent.status === 'banned') {
      return NextResponse.json(
        { error: 'Agent is banned' },
        { status: 403 }
      );
    }

    // Get the verification code
    const { data: verificationCode, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('agent_id', body.agent_id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !verificationCode) {
      return NextResponse.json(
        { error: 'No valid verification code found. Please register again.' },
        { status: 400 }
      );
    }

    // Check if Twitter handle is already used by another agent
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('twitter_handle', twitterHandle)
      .neq('id', body.agent_id)
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { error: 'This Twitter account is already linked to another agent' },
        { status: 409 }
      );
    }

    // In production, you would verify the tweet exists using Twitter API
    // For now, we'll do a simplified verification
    // TODO: Implement actual Twitter API verification
    //
    // const twitterVerified = await verifyTweet(twitterHandle, verificationCode.code);
    // if (!twitterVerified) {
    //   return NextResponse.json(
    //     { error: 'Verification tweet not found. Make sure you tweeted the exact code.' },
    //     { status: 400 }
    //   );
    // }

    // For MVP: Trust the user (like early Moltbook did)
    // Mark verification code as used
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);

    // Activate the agent
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        status: 'active',
        twitter_handle: twitterHandle,
        twitter_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.agent_id);

    if (updateError) {
      console.error('Error activating agent:', updateError);
      return NextResponse.json(
        { error: 'Failed to activate agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Agent "${agent.name}" is now active! You can start posting drops.`,
      agent_id: agent.id,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
