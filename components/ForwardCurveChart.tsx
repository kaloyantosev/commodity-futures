'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface CurvePoint {
  ticker: string;
  month: string;
  price: number;
  monthCode: string;
}

interface ForwardCurveChartProps {
  points: CurvePoint[];
  curveShape: 'contango' | 'backwardation' | 'flat';
  symbol: string;
  name: string;
}

const SHAPE_CONFIG = {
  contango: {
    gradientId: 'curveBlue',
    stroke: '#60a5fa',        // blue-400
    gradientStart: 'rgba(96,165,250,0.35)',
    gradientEnd:   'rgba(96,165,250,0)',
    badge: 'CONTANGO',
    badgeClass: 'bg-blue-400/10 text-blue-400 border border-blue-400/30',
  },
  backwardation: {
    gradientId: 'curveEmerald',
    stroke: '#34d399',        // emerald-400
    gradientStart: 'rgba(52,211,153,0.35)',
    gradientEnd:   'rgba(52,211,153,0)',
    badge: 'BACKWARDATION',
    badgeClass: 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30',
  },
  flat: {
    gradientId: 'curveGray',
    stroke: '#94a3b8',        // slate-400
    gradientStart: 'rgba(148,163,184,0.25)',
    gradientEnd:   'rgba(148,163,184,0)',
    badge: 'FLAT',
    badgeClass: 'bg-slate-400/10 text-slate-400 border border-slate-400/30',
  },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: CurvePoint }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0];
  return (
    <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{point.payload.month}</p>
      <p className="font-numeric text-white font-semibold text-sm tabular-nums">
        ${point.value.toFixed(2)}
      </p>
      <p className="text-slate-500 text-[10px] mt-0.5">{point.payload.ticker}</p>
    </div>
  );
}

export default function ForwardCurveChart({
  points,
  curveShape,
  symbol,
  name,
}: ForwardCurveChartProps) {
  const cfg = SHAPE_CONFIG[curveShape] ?? SHAPE_CONFIG.flat;

  if (!points || points.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">
        No curve data available
      </div>
    );
  }

  // Compute y-axis domain with padding
  const prices = points.map((p) => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const pad = (maxP - minP) * 0.15 || 1;
  const yDomain: [number, number] = [minP - pad, maxP + pad];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-semibold text-sm">{name} Forward Curve</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {points.length} contract months · Spot to{' '}
            {points[points.length - 1]?.month}
          </p>
        </div>
        <span
          className={[
            'text-[10px] font-bold px-2 py-1 rounded tracking-widest',
            cfg.badgeClass,
          ].join(' ')}
        >
          {cfg.badge}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={points}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id={cfg.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cfg.gradientStart} />
              <stop offset="95%" stopColor={cfg.gradientEnd} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#1e2d4a' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="price"
            stroke={cfg.stroke}
            strokeWidth={2}
            fill={`url(#${cfg.gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: cfg.stroke, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
