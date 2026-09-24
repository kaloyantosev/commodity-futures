'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface MonthlyAvgStat {
  month: number;       // 1–12
  monthName: string;   // e.g. 'January'
  avgReturn: number;   // in percent, e.g. 2.3
}

interface CurrentYearReturn {
  month: number;
  return: number;      // in percent
}

interface SeasonalityChartProps {
  monthlyStats: MonthlyAvgStat[];
  currentYear: CurrentYearReturn[];
}

const MONTH_ABBREVS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-lg px-3 py-2 shadow-xl min-w-[140px]">
      <p className="text-slate-400 text-xs mb-2 font-semibold">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
          <span className="text-slate-400 text-[10px]">{entry.name}</span>
          <span
            className="font-numeric text-xs font-semibold tabular-nums"
            style={{ color: entry.color }}
          >
            {entry.value >= 0 ? '+' : ''}
            {entry.value.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SeasonalityChart({
  monthlyStats,
  currentYear,
}: SeasonalityChartProps) {
  // Merge into a single array indexed by month
  const merged = MONTH_ABBREVS.map((abbr, i) => {
    const monthNum = i + 1;
    const stat = monthlyStats.find((s) => s.month === monthNum);
    const curr = currentYear.find((c) => c.month === monthNum);
    return {
      month: abbr,
      avgReturn: stat?.avgReturn ?? null,
      currentYear: curr?.return ?? null,
    };
  });

  if (!monthlyStats || monthlyStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-slate-500 text-sm">
        No seasonality data available
      </div>
    );
  }

  const allValues = [
    ...merged.map((d) => d.avgReturn ?? 0),
    ...merged.map((d) => d.currentYear ?? 0),
  ];
  const minV = Math.min(...allValues);
  const maxV = Math.max(...allValues);
  const pad = (Math.abs(maxV - minV) * 0.2) || 1;
  const yDomain: [number, number] = [minV - pad, maxV + pad];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-3">
        <p className="text-white font-semibold text-sm">Seasonal Return Patterns</p>
        <p className="text-slate-500 text-xs mt-0.5">
          Historical monthly average returns vs current year
        </p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart
          data={merged}
          margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={{ stroke: '#1e2d4a' }}
            tickLine={false}
          />
          <YAxis
            domain={yDomain}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
            formatter={(value) => (
              <span style={{ color: '#94a3b8' }}>{value}</span>
            )}
          />
          <ReferenceLine y={0} stroke="#1e2d4a" strokeWidth={1.5} />

          {/* Historical average bars */}
          <Bar dataKey="avgReturn" name="Hist. Avg" maxBarSize={28}>
            {merged.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  (entry.avgReturn ?? 0) >= 0
                    ? 'rgba(52,211,153,0.7)'   // emerald
                    : 'rgba(248,113,113,0.7)'  // red
                }
              />
            ))}
          </Bar>

          {/* Current year line */}
          <Line
            type="monotone"
            dataKey="currentYear"
            name="Current Year"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ fill: '#60a5fa', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#60a5fa', strokeWidth: 0 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
