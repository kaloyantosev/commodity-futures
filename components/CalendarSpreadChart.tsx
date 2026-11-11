'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';

interface SpreadDataPoint {
  date: string;
  spread: number;
}

interface CalendarSpreadChartProps {
  data: SpreadDataPoint[];
  label: string;
  unit?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** '2026-11-03' -> 'Nov 3' */
const shortDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8))}` : d);

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: SpreadDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value ?? 0;
  const isPositive = value >= 0;
  return (
    <div className="bg-[#16161a] border border-[#2a2a30] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label ? shortDate(label) : ''}</p>
      <p
        className={[
          'font-numeric font-semibold text-sm tabular-nums',
          isPositive ? 'text-emerald-400' : 'text-red-400',
        ].join(' ')}
      >
        {isPositive ? '+' : ''}
        {value.toFixed(3)}
      </p>
      <p className="text-slate-500 text-[10px] mt-0.5">
        {isPositive ? 'Backwardation' : 'Contango'}
      </p>
    </div>
  );
}

export default function CalendarSpreadChart({
  data,
  label,
  unit,
}: CalendarSpreadChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-slate-500 text-sm">
        No spread data available
      </div>
    );
  }

  const spreads = data.map((d) => d.spread);
  const minS = Math.min(...spreads);
  const maxS = Math.max(...spreads);
  const pad = (Math.abs(maxS - minS) * 0.15) || 0.1;
  const yDomain: [number, number] = [minS - pad, maxS + pad];

  // Enrich with above/below zero for area fills
  const enriched = data.map((d) => ({
    ...d,
    aboveZero: d.spread >= 0 ? d.spread : 0,
    belowZero: d.spread < 0 ? d.spread : 0,
  }));

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            Front contract minus second contract{unit ? ` (${unit})` : ''} · positive = backwardation · last {data.length} sessions
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="text-slate-400">Backwardation</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            <span className="text-slate-400">Contango</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={enriched}
          margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
        >
          <defs>
            <linearGradient id="aboveGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgba(52,211,153,0.3)" />
              <stop offset="95%" stopColor="rgba(52,211,153,0)" />
            </linearGradient>
            <linearGradient id="belowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgba(248,113,113,0)" />
              <stop offset="95%" stopColor="rgba(248,113,113,0.3)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            minTickGap={40}
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={{ stroke: '#2a2a30' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={yDomain}
            tickFormatter={(v: number) => v.toFixed(2)}
            tick={{ fill: '#71717a', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#2a2a30" strokeWidth={2} strokeDasharray="4 4" />
          {/* Above zero (backwardation) fill */}
          <Area
            type="monotone"
            dataKey="aboveZero"
            stroke="none"
            fill="url(#aboveGrad)"
            isAnimationActive={false}
          />
          {/* Below zero (contango) fill */}
          <Area
            type="monotone"
            dataKey="belowZero"
            stroke="none"
            fill="url(#belowGrad)"
            isAnimationActive={false}
          />
          {/* Main spread line */}
          <Line
            type="monotone"
            dataKey="spread"
            stroke="#60a5fa"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
