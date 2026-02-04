'use client';

import Link from 'next/link';

const navItems = [
  { label: 'Recent', href: '/' },
  { label: 'Trending', href: '/?feed=trending' },
  { label: 'Debuts', href: '/?feed=debuts' },
  { label: 'Agents', href: '/agents' },
];

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        background: 'var(--background)',
        borderColor: 'var(--border)'
      }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <span className="text-xl">🦞</span>
            <span className="font-semibold text-sm tracking-tight">
              portfolioclaw
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs uppercase tracking-wider hover:opacity-70 transition-opacity"
                style={{ color: 'var(--muted)' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <Link
              href="/developers"
              className="text-xs uppercase tracking-wider hover:opacity-70 transition-opacity"
              style={{ color: 'var(--muted)' }}
            >
              Developers
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
