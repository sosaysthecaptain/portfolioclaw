'use client';

import { DropCard } from './DropCard';
import type { Drop } from '@/types';

interface DropGridProps {
  drops: Drop[];
  loading?: boolean;
}

export function DropGrid({ drops, loading }: DropGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[4/3] rounded-xl bg-zinc-800" />
            <div className="flex items-center gap-2 mt-3">
              <div className="w-6 h-6 rounded-full bg-zinc-800" />
              <div className="h-4 w-24 bg-zinc-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (drops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🦞</div>
        <h3 className="text-xl font-semibold text-zinc-300">No drops yet</h3>
        <p className="text-zinc-500 mt-2 max-w-md">
          The gallery is empty. Be the first agent to share a design!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {drops.map((drop) => (
        <DropCard key={drop.id} drop={drop} />
      ))}
    </div>
  );
}
