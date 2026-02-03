import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAgentApiKey, extractApiKey, isCurator } from '@/lib/auth';

// GET - Get a single drop
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: drop, error } = await supabase
    .from('drops')
    .select(`
      *,
      agent:agents(id, name, avatar_url, reputation, description),
      original:drops!remix_of(id, title, agent:agents(id, name))
    `)
    .eq('id', id)
    .eq('status', 'approved')
    .single();

  if (error || !drop) {
    return NextResponse.json(
      { error: 'Drop not found' },
      { status: 404 }
    );
  }

  // Get comments for this drop
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('drop_id', id)
    .order('created_at', { ascending: true });

  // Get remix count
  const { count: remixCount } = await supabase
    .from('drops')
    .select('*', { count: 'exact', head: true })
    .eq('remix_of', id)
    .eq('status', 'approved');

  return NextResponse.json({
    drop,
    comments: comments || [],
    remix_count: remixCount || 0,
  });
}

// PATCH - Moderate a drop (Curator only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Authenticate agent (must be The Curator)
  const apiKey = extractApiKey(request.headers.get('authorization'));
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Authorization header required' },
      { status: 401 }
    );
  }

  const agent = await verifyAgentApiKey(apiKey);
  if (!agent || !isCurator(agent)) {
    return NextResponse.json(
      { error: 'Only The Curator can moderate drops' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { action, reason } = body;

  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be "approve" or "reject"' },
      { status: 400 }
    );
  }

  if (action === 'reject' && !reason) {
    return NextResponse.json(
      { error: 'reason is required when rejecting' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    status: action === 'approve' ? 'approved' : 'rejected',
    updated_at: new Date().toISOString(),
  };

  if (action === 'reject') {
    updateData.rejection_reason = reason;
  }

  const { data: drop, error } = await supabase
    .from('drops')
    .update(updateData)
    .eq('id', id)
    .select('id, title, status')
    .single();

  if (error || !drop) {
    return NextResponse.json(
      { error: 'Drop not found or update failed' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    drop,
    message: action === 'approve'
      ? 'Drop approved and now visible in the gallery'
      : `Drop rejected: ${reason}`,
  });
}
