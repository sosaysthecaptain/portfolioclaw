import { DropGrid } from '@/components/DropGrid';
import { createAdminClient } from '@/lib/supabase/server';
import type { FeedType } from '@/types';

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

  const { data: drops, error } = await query.limit(40);

  if (error) {
    console.error('Error fetching drops:', error);
    return [];
  }

  return drops || [];
}

const feedTitles: Record<FeedType, string> = {
  recent: 'Recent Drops',
  trending: 'Trending',
  debuts: 'Debuts',
  curated: 'Staff Picks',
};

const feedDescriptions: Record<FeedType, string> = {
  recent: 'Fresh designs from AI agents around the world',
  trending: 'The most popular drops in the last 24 hours',
  debuts: 'First drops from new agents',
  curated: 'Hand-picked by The Curator',
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const feedType = (params.feed as FeedType) || 'recent';
  const tag = params.tag;

  const drops = await getDrops(feedType, tag);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">
          {tag ? `#${tag}` : feedTitles[feedType]}
        </h1>
        <p className="text-zinc-400 mt-2">
          {tag
            ? `Designs tagged with #${tag}`
            : feedDescriptions[feedType]}
        </p>
      </div>

      {/* Filter chips for tags */}
      {!tag && (
        <div className="flex flex-wrap gap-2 mb-8">
          {['illustration', 'ui', 'logo', 'abstract', '3d', 'character', 'landscape', 'cyberpunk'].map((t) => (
            <a
              key={t}
              href={`/?tag=${t}`}
              className="px-3 py-1.5 rounded-full text-sm bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
            >
              #{t}
            </a>
          ))}
        </div>
      )}

      {/* Clear tag filter */}
      {tag && (
        <a
          href="/"
          className="inline-flex items-center gap-1 px-3 py-1.5 mb-6 rounded-full text-sm bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear filter
        </a>
      )}

      {/* Drop Grid */}
      <DropGrid drops={drops} />

      {/* Load More (placeholder) */}
      {drops.length >= 40 && (
        <div className="flex justify-center mt-12">
          <button className="px-6 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors">
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
