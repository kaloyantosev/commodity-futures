'use client';

import React from 'react';

export interface CommodityCardProps {
  symbol: string;
  name: string;
  sector: string;
  color: string;        // Tailwind color name e.g. 'blue', 'amber', 'emerald'
  unit: string;         // e.g. '$/bbl', '¢/bu'
  price: number;
  change: number;
  changePercent: number;
  onClick?: () => void;
}

const SECTOR_COLORS: Record<string, string> = {
  Energy:      'bg-blue-400/10 text-blue-400 border-blue-400/20',
  Metals:      'bg-amber-400/10 text-amber-400 border-amber-400/20',
  Agriculture: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
};

const INDICATOR_COLORS: Record<string, string> = {
  blue:    'bg-blue-400',
  amber:   'bg-amber-400',
  emerald: 'bg-emerald-400',
  orange:  'bg-orange-400',
  yellow:  'bg-yellow-400',
  rose:    'bg-rose-400',
  cyan:    'bg-cyan-400',
  purple:  'bg-purple-400',
};

export default function CommodityCard({
  symbol,
  name,
  sector,
  color,
  unit,
  price,
  change,
  changePercent,
  onClick,
}: CommodityCardProps) {
  const isPositive = change >= 0;
  const changeClass = isPositive ? 'text-emerald-400' : 'text-red-400';
  const changeBgClass = isPositive
    ? 'bg-emerald-400/10 border-emerald-400/20'
    : 'bg-red-400/10 border-red-400/20';
  const indicatorColor = INDICATOR_COLORS[color] ?? 'bg-slate-400';
  const sectorBadgeClass =
    SECTOR_COLORS[sector] ?? 'bg-slate-400/10 text-slate-400 border-slate-400/20';

  const formattedPrice = price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedChange = `${isPositive ? '+' : ''}${change.toFixed(2)}`;
  const formattedChangePct = `${isPositive ? '+' : ''}${changePercent.toFixed(2)}%`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={[
        'bg-[#0f1629] border border-[#1e2d4a] rounded-lg p-4 cursor-pointer',
        'hover:border-blue-500 transition-all duration-200 group',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/40',
        'select-none fade-in',
      ].join(' ')}
    >
      {/* ── Top Row ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-1">
          <span className="text-white font-semibold text-sm leading-tight">
            {name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs font-mono uppercase tracking-wider">
              {symbol}
            </span>
            <span
              className={[
                'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                sectorBadgeClass,
              ].join(' ')}
            >
              {sector.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Colored indicator dot */}
        <div
          className={[
            'w-2.5 h-2.5 rounded-full mt-0.5 shrink-0',
            indicatorColor,
          ].join(' ')}
        />
      </div>

      {/* ── Price ────────────────────────────────────────────────── */}
      <div className="mb-3">
        <span className="font-numeric text-2xl font-bold text-white tabular-nums tracking-tight group-hover:text-blue-100 transition-colors">
          {formattedPrice}
        </span>
      </div>

      {/* ── Bottom Row ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={[
              'font-numeric text-xs font-semibold tabular-nums',
              changeClass,
            ].join(' ')}
          >
            {formattedChange}
          </span>
          <span
            className={[
              'font-numeric text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums',
              changeClass,
              changeBgClass,
            ].join(' ')}
          >
            {formattedChangePct}
          </span>
        </div>
        <span className="text-slate-500 text-[10px] font-mono">{unit}</span>
      </div>
    </div>
  );
}
