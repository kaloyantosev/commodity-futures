'use client';

import React from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const tick = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} '${d.slice(2, 4)}`;

/** Compact daily history of one spread with its period median as a reference line. */
export default function SpreadHistoryChart({
  points,
  median,
  unit,
  color = '#60a5fa',
}: {
  points: Array<{ date: string; value: number }>;
  median: number | null;
  unit: string;
  color?: string;
}) {
  if (!points.length) return <div className="h-[140px] flex items-center justify-center text-slate-600 text-xs">No history</div>;
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={points} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
        <XAxis dataKey="date" tickFormatter={tick} minTickGap={50} tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} width={36} domain={['auto', 'auto']} />
        {median != null && <ReferenceLine y={median} stroke="#475569" strokeDasharray="4 4" />}
        <ReferenceLine y={0} stroke="#334155" />
        <Tooltip
          contentStyle={{ background: '#0f1629', border: '1px solid #1e2d4a', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v: number) => [`${v.toFixed(2)} ${unit}`, 'Spread']}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
