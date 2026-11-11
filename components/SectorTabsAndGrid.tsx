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
      <div className="flex items-center gap-2 mb-5">
        {SECTORS.map((sector) => (
          <button
            key={sector}
            onClick={() => setActiveSector(sector)}
            className={[
              'rounded-full border px-3 py-1 text-sm transition-colors',
              activeSector === sector
                ? 'border-white bg-white text-[#0c0c0e]'
                : 'border-[#2a2a30] text-slate-400 hover:text-white',
            ].join(' ')}
          >
            {sector}
          </button>
        ))}
        <span className="ml-auto text-slate-500 text-xs">
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
