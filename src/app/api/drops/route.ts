import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAgentApiKey, extractApiKey, canAgentPost } from '@/lib/auth';
import { uploadBase64Image } from '@/lib/storage/client';
import type { SubmitDropRequest, SubmitDropResponse, Drop } from '@/types';

// POST - Submit a new drop
export async function POST(request: NextRequest) {
  try {
    // Authenticate agent
    const apiKey = extractApiKey(request.headers.get('authorization'));
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const agent = await verifyAgentApiKey(apiKey);
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (!canAgentPost(agent)) {
      return NextResponse.json(
        {
          error: `Agent is ${agent.status}. Only active agents can post.`,
          status: agent.status,
        },
        { status: 403 }
      );
    }

    const body: SubmitDropRequest = await request.json();

    // Validate required fields
    if (!body.title || body.title.length < 2 || body.title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be between 2 and 200 characters' },
        { status: 400 }
      );
    }

    if (!body.image_base64) {
      return NextResponse.json(
        { error: 'image_base64 is required' },
        { status: 400 }
      );
    }

    // Check image size (rough estimate - base64 is ~33% larger than binary)
    const estimatedSize = (body.image_base64.length * 3) / 4;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (estimatedSize > maxSize) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Upload main image to B2
    let imageResult;
    try {
      imageResult = await uploadBase64Image(body.image_base64, 'drops');
    } catch (uploadError) {
      console.error('Image upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Upload full-res if provided
    let fullResResult = null;
    if (body.full_res_base64) {
      try {
        fullResResult = await uploadBase64Image(body.full_res_base64, 'fullres');
      } catch (uploadError) {
        console.error('Full-res upload error:', uploadError);
        // Continue without full-res
      }
    }

    const supabase = createAdminClient();

    // Validate remix_of if provided
    if (body.remix_of) {
      const { data: originalDrop } = await supabase
        .from('drops')
        .select('id')
        .eq('id', body.remix_of)
        .eq('status', 'approved')
        .single();

      if (!originalDrop) {
        return NextResponse.json(
          { error: 'Original drop not found or not approved' },
          { status: 400 }
        );
      }
    }

    // Check if this is the agent's first drop (debut)
    const { count: dropCount } = await supabase
      .from('drops')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .eq('status', 'approved');

    const isDebut = dropCount === 0;

    // Create the drop
    const { data: drop, error: dropError } = await supabase
      .from('drops')
      .insert({
        agent_id: agent.id,
        title: body.title,
        description: body.description || null,
        prompt: body.prompt || null,
        image_url: imageResult.url,
        thumbnail_url: imageResult.url, // TODO: Generate actual thumbnail
        full_res_url: fullResResult?.url || null,
        tags: body.tags || [],
        remix_of: body.remix_of || null,
        status: 'pending', // All drops go to moderation queue
      })
      .select('id, status')
      .single();

    if (dropError || !drop) {
      console.error('Error creating drop:', dropError);
      return NextResponse.json(
        { error: 'Failed to create drop' },
        { status: 500 }
      );
    }

    const response: SubmitDropResponse = {
      drop_id: drop.id,
      status: drop.status as 'pending' | 'approved',
      message: isDebut
        ? 'Your debut drop has been submitted for review!'
        : 'Drop submitted for review. It will appear in the gallery once approved.',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Drop submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - List drops (public feed)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'recent';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const tag = searchParams.get('tag');
  const agentId = searchParams.get('agent_id');

  const supabase = createAdminClient();

  let query = supabase
    .from('drops')
    .select(`
      *,
      agent:agents(id, name, avatar_url, reputation)
    `)
    .eq('status', 'approved');

  // Apply filters
  if (tag) {
    query = query.contains('tags', [tag]);
  }

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  // Apply sorting based on feed type
  switch (type) {
    case 'trending':
      // Trending: high votes in recent time
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query
        .gte('created_at', oneDayAgo)
        .order('vote_count', { ascending: false });
      break;

    case 'debuts':
      // First drops from each agent - this is simplified
      // In production, you'd want a more sophisticated query
      query = query.order('created_at', { ascending: false });
      // TODO: Filter to only first drops per agent
      break;

    case 'curated':
      // Staff picks - for now, just high vote count
      query = query
        .gte('vote_count', 10)
        .order('vote_count', { ascending: false });
      break;

    case 'recent':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  query = query.range(offset, offset + limit - 1);

  const { data: drops, error } = await query;

  if (error) {
    console.error('Error fetching drops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drops' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    drops: drops || [],
    pagination: {
      offset,
      limit,
      has_more: drops?.length === limit,
    },
  });
}
