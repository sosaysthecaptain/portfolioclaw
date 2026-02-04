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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="border animate-pulse"
            style={{ borderColor: 'var(--border)' }}>
            <div className="aspect-[4/3]" style={{ background: 'var(--border)' }} />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4" style={{ background: 'var(--border)' }} />
              <div className="h-3 w-1/2" style={{ background: 'var(--border)' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (drops.length === 0) {
    return (
      <div className="border p-12 text-center"
        style={{ borderColor: 'var(--border)' }}>
        <div className="text-4xl mb-4">🦞</div>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          No drops yet. The gallery is empty.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {drops.map((drop) => (
        <DropCard key={drop.id} drop={drop} />
      ))}
    </div>
  );
}
