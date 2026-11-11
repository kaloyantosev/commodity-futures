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
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" vertical={false} />
        <XAxis dataKey="date" tickFormatter={tick} minTickGap={50} tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#71717a', fontSize: 9 }} axisLine={false} tickLine={false} width={36} domain={['auto', 'auto']} />
        {median != null && <ReferenceLine y={median} stroke="#52525b" strokeDasharray="4 4" />}
        <ReferenceLine y={0} stroke="#3f3f46" />
        <Tooltip
          contentStyle={{ background: '#16161a', border: '1px solid #2a2a30', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#91919b' }}
          formatter={(v: number) => [`${v.toFixed(2)} ${unit}`, 'Spread']}
        />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
