'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2 } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Spreads', href: '/spreads' },
  { label: 'Seasonality', href: '/seasonality' },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  });
}

export default function Header() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    // Initialize on client to avoid hydration mismatch
    setTime(formatTime(new Date()));
    const interval = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-[#0a0e1a] border-b border-[#1e2d4a] sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* ── Brand ─────────────────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <BarChart2 className="w-5 h-5 text-blue-400" strokeWidth={2.5} />
            <span className="text-sm font-black tracking-widest">
              <span className="text-blue-400">COMMOD</span>
              <span className="text-white">INTEL</span>
            </span>
          </Link>

          {/* ── Navigation ────────────────────────────────────────────── */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    'px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors',
                    isActive
                      ? 'text-blue-400 bg-blue-400/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5',
                  ].join(' ')}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* ── Right: Clock + Live Badge ──────────────────────────────── */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span className="live-dot w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span className="text-emerald-400 text-xs font-bold tracking-widest">
                LIVE
              </span>
            </div>

            {/* Clock */}
            <div className="hidden sm:flex items-center gap-1 bg-[#0f1629] border border-[#1e2d4a] rounded px-2 py-1">
              <span className="font-numeric text-xs text-slate-300 tabular-nums">
                {time}
              </span>
              <span className="text-slate-500 text-[10px] ml-1">ET</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
