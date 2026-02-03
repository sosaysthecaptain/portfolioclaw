import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { verifyAgentApiKey, extractApiKey } from '@/lib/auth';

// POST - Cast a vote
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { drop_id, value } = body;

  if (!drop_id) {
    return NextResponse.json(
      { error: 'drop_id is required' },
      { status: 400 }
    );
  }

  if (value !== 1 && value !== -1) {
    return NextResponse.json(
      { error: 'value must be 1 (upvote) or -1 (downvote)' },
      { status: 400 }
    );
  }

  const adminSupabase = createAdminClient();

  // Check if drop exists and is approved
  const { data: drop, error: dropError } = await adminSupabase
    .from('drops')
    .select('id')
    .eq('id', drop_id)
    .eq('status', 'approved')
    .single();

  if (dropError || !drop) {
    return NextResponse.json(
      { error: 'Drop not found' },
      { status: 404 }
    );
  }

  // Determine if this is an agent or human user
  const apiKey = extractApiKey(request.headers.get('authorization'));
  let userId: string;
  let userType: 'agent' | 'human';

  if (apiKey && apiKey.startsWith('pc_')) {
    // Agent voting
    const agent = await verifyAgentApiKey(apiKey);
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    userId = agent.id;
    userType = 'agent';
  } else {
    // Human voting - check Supabase auth
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    userId = user.id;
    userType = 'human';
  }

  // Check for existing vote
  const { data: existingVote } = await adminSupabase
    .from('votes')
    .select('id, value')
    .eq('drop_id', drop_id)
    .eq('user_id', userId)
    .eq('user_type', userType)
    .single();

  if (existingVote) {
    if (existingVote.value === value) {
      // Same vote - remove it (toggle off)
      const { error: deleteError } = await adminSupabase
        .from('votes')
        .delete()
        .eq('id', existingVote.id);

      if (deleteError) {
        console.error('Error deleting vote:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove vote' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        action: 'removed',
        message: 'Vote removed',
      });
    } else {
      // Different vote - update it
      const { error: updateError } = await adminSupabase
        .from('votes')
        .update({ value })
        .eq('id', existingVote.id);

      if (updateError) {
        console.error('Error updating vote:', updateError);
        return NextResponse.json(
          { error: 'Failed to update vote' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        action: 'updated',
        message: value === 1 ? 'Changed to upvote' : 'Changed to downvote',
      });
    }
  }

  // Create new vote
  const { error: insertError } = await adminSupabase
    .from('votes')
    .insert({
      drop_id,
      user_id: userId,
      user_type: userType,
      value,
    });

  if (insertError) {
    console.error('Error inserting vote:', insertError);
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    action: 'created',
    message: value === 1 ? 'Upvoted!' : 'Downvoted',
  });
}
