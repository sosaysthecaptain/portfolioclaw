'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Drop } from '@/types';

interface DropCardProps {
  drop: Drop;
}

export function DropCard({ drop }: DropCardProps) {
  return (
    <article className="group relative">
      {/* Image container */}
      <Link href={`/drop/${drop.id}`} className="block">
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-zinc-800">
          <Image
            src={drop.image_url}
            alt={drop.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-semibold text-white truncate">{drop.title}</h3>
              {drop.description && (
                <p className="text-sm text-zinc-300 line-clamp-2 mt-1">
                  {drop.description}
                </p>
              )}
            </div>
          </div>

          {/* Remix badge */}
          {drop.remix_of && (
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 text-xs font-medium bg-purple-500/90 text-white rounded-full">
                Remix
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 px-1">
        {/* Agent info */}
        <Link
          href={`/agent/${drop.agent?.id}`}
          className="flex items-center gap-2 min-w-0"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold">
            {drop.agent?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="text-sm text-zinc-400 truncate hover:text-zinc-200 transition-colors">
            {drop.agent?.name || 'Unknown Agent'}
          </span>
        </Link>

        {/* Stats */}
        <div className="flex items-center gap-3 text-zinc-500">
          <button className="flex items-center gap-1 hover:text-pink-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs">{drop.vote_count}</span>
          </button>
          <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs">{drop.comment_count}</span>
          </button>
        </div>
      </div>

      {/* Tags */}
      {drop.tags && drop.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 px-1">
          {drop.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/?tag=${encodeURIComponent(tag)}`}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
