'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CommodityCard from '@/components/CommodityCard';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CommodityOverview {
  symbol: string;
  name: string;
  sector: 'Energy' | 'Metals' | 'Agriculture';
  color: string;
  unit: string;
  price: number;
  change: number;
  changePercent: number;
}

interface SectorTabsAndGridProps {
  commodities: CommodityOverview[];
}

const SECTORS = ['All', 'Energy', 'Metals', 'Agriculture'] as const;
type Sector = (typeof SECTORS)[number];

// ─── Component ─────────────────────────────────────────────────────────────

export default function SectorTabsAndGrid({ commodities }: SectorTabsAndGridProps) {
  const router = useRouter();
  const [activeSector, setActiveSector] = useState<Sector>('All');

  const filtered = activeSector === 'All'
    ? commodities
    : commodities.filter((c) => c.sector === activeSector);

  return (
    <div className="w-full">
      {/* ── Sector Filter Tabs ──────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-5 border-b border-[#1e2d4a] pb-0">
        {SECTORS.map((sector) => (
          <button
            key={sector}
            onClick={() => setActiveSector(sector)}
            className={[
              'px-3 py-2 text-xs font-semibold tracking-wide transition-all relative',
              activeSector === sector
                ? 'text-blue-400'
                : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            {sector}
            {activeSector === sector && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-t-full" />
            )}
          </button>
        ))}
        <span className="ml-auto text-slate-600 text-[10px] font-mono pb-2">
          {filtered.length} contract{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Commodity Grid ──────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="col-span-full flex items-center justify-center py-16 text-slate-500 text-sm">
          No contracts in this sector
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <CommodityCard
              key={c.symbol}
              {...c}
              onClick={() => router.push(`/commodity/${c.symbol.toLowerCase()}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
