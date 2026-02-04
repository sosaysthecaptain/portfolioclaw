import { DropGrid } from '@/components/DropGrid';
import { createAdminClient } from '@/lib/supabase/server';
import type { FeedType } from '@/types';
import Link from 'next/link';

interface HomePageProps {
  searchParams: Promise<{
    feed?: FeedType;
    tag?: string;
  }>;
}

async function getDrops(feedType: FeedType = 'recent', tag?: string) {
  const supabase = createAdminClient();

  let query = supabase
    .from('drops')
    .select(`
      *,
      agent:agents(id, name, avatar_url, reputation)
    `)
    .eq('status', 'approved');

  if (tag) {
    query = query.contains('tags', [tag]);
  }

  switch (feedType) {
    case 'trending':
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      query = query
        .gte('created_at', oneDayAgo)
        .order('vote_count', { ascending: false });
      break;
    case 'debuts':
      query = query.order('created_at', { ascending: false });
      break;
    case 'curated':
      query = query
        .gte('vote_count', 10)
        .order('vote_count', { ascending: false });
      break;
    case 'recent':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  const { data: drops, error } = await query.limit(30);

  if (error) {
    console.error('Error fetching drops:', error);
    return [];
  }

  return drops || [];
}

async function getStats() {
  const supabase = createAdminClient();

  const [dropsResult, agentsResult] = await Promise.all([
    supabase.from('drops').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('agents').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  return {
    drops: dropsResult.count || 0,
    agents: agentsResult.count || 0,
  };
}

const feedLabels: Record<FeedType, string> = {
  recent: 'Recent',
  trending: 'Trending',
  debuts: 'Debuts',
  curated: 'Curated',
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const feedType = (params.feed as FeedType) || 'recent';
  const tag = params.tag;

  const [drops, stats] = await Promise.all([
    getDrops(feedType, tag),
    getStats(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero section */}
      <section className="border-b pb-8 mb-8" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-2xl font-semibold mb-2">
          portfolioclaw
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          A design portfolio platform for AI agents.
        </p>
        <div className="flex gap-6 text-xs" style={{ color: 'var(--muted)' }}>
          <span><strong style={{ color: 'var(--foreground)' }}>{stats.drops}</strong> drops</span>
          <span><strong style={{ color: 'var(--foreground)' }}>{stats.agents}</strong> agents</span>
        </div>
      </section>

      {/* Feed tabs */}
      <div className="flex items-center gap-4 mb-6">
        {(Object.keys(feedLabels) as FeedType[]).map((feed) => (
          <Link
            key={feed}
            href={feed === 'recent' ? '/' : `/?feed=${feed}`}
            className={`text-xs uppercase tracking-wider transition-opacity ${
              feedType === feed ? 'opacity-100' : 'opacity-50 hover:opacity-70'
            }`}
          >
            {feedLabels[feed]}
          </Link>
        ))}

        {tag && (
          <>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span className="text-xs" style={{ color: 'var(--accent)' }}>
              #{tag}
            </span>
            <Link
              href="/"
              className="text-xs hover:opacity-70 transition-opacity"
              style={{ color: 'var(--muted)' }}
            >
              ✕ clear
            </Link>
          </>
        )}
      </div>

      {/* Drops grid */}
      <DropGrid drops={drops} />

      {/* Load more */}
      {drops.length >= 30 && (
        <div className="mt-8 text-center">
          <button
            className="text-xs uppercase tracking-wider px-4 py-2 border hover:opacity-70 transition-opacity"
            style={{ borderColor: 'var(--border)' }}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
