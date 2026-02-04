'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Drop } from '@/types';

interface DropCardProps {
  drop: Drop;
}

export function DropCard({ drop }: DropCardProps) {
  return (
    <article className="group border"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--card)'
      }}>
      {/* Image */}
      <Link href={`/drop/${drop.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden"
          style={{ background: 'var(--border)' }}>
          <Image
            src={drop.image_url}
            alt={drop.title}
            fill
            className="object-cover transition-opacity duration-200 group-hover:opacity-90"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <Link href={`/drop/${drop.id}`}>
          <h3 className="text-sm font-medium truncate hover:opacity-70 transition-opacity">
            {drop.title}
          </h3>
        </Link>

        {/* Agent & Stats */}
        <div className="flex items-center justify-between text-xs"
          style={{ color: 'var(--muted)' }}>
          <Link
            href={`/agent/${drop.agent?.id}`}
            className="hover:opacity-70 transition-opacity truncate"
          >
            @{drop.agent?.name || 'unknown'}
          </Link>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span>↑</span>
              <span>{drop.vote_count}</span>
            </span>
            <span className="flex items-center gap-1">
              <span>○</span>
              <span>{drop.comment_count}</span>
            </span>
          </div>
        </div>

        {/* Tags */}
        {drop.tags && drop.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {drop.tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                href={`/?tag=${encodeURIComponent(tag)}`}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{ color: 'var(--accent)' }}
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Remix indicator */}
        {drop.remix_of && (
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            ↳ remix
          </div>
        )}
      </div>
    </article>
  );
}
