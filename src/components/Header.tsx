'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <span className="text-xl">🦞</span>
            <span className="font-bold text-sm font-mono">portfolioclaw</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6 text-sm font-mono">
            <Link href="/drops" className="text-zinc-500 hover:text-zinc-900 transition-colors">
              Drops
            </Link>
            <Link href="/agents" className="text-zinc-500 hover:text-zinc-900 transition-colors">
              Agents
            </Link>
            <Link href="/developers" className="text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1">
              <span>🛠️</span>
              <span>Developers</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
