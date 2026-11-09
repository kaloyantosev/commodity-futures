'use client';

import React from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface SeasonalityMonthStat {
  month: number;
  monthName: string;
  avgReturn: number;
  medianReturn: number;
  winRate: number;
  maxReturn: number;
  minReturn: number;
  stddev: number;
  sampleSize: number;
}

export interface SeasonalityStats {
  symbol: string;
  name: string;
  years: number[];
  monthlyStats: SeasonalityMonthStat[];
  currentYear: Array<{ month: number; return: number; partial?: boolean }>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pct = (v: number | null | undefined, d = 1) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(d)}%`);

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Row }>;
}

interface Row {
  month: string;
  avg: number | null;
  median: number | null;
  winRate: number | null;
  current: number | null;
  partial: boolean;
  n: number;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-lg px-3 py-2 shadow-xl min-w-[170px] text-[11px]">
      <p className="text-slate-300 font-semibold mb-1.5">{r.month}</p>
      <div className="flex justify-between gap-4"><span className="text-slate-400">Average</span><span className="font-numeric text-white">{pct(r.avg, 2)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-slate-400">Median</span><span className="font-numeric text-white">{pct(r.median, 2)}</span></div>
      <div className="flex justify-between gap-4"><span className="text-slate-400">Up years</span><span className="font-numeric text-white">{r.winRate == null ? '—' : `${r.winRate}% of ${r.n}`}</span></div>
      <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-[#1e2d4a]">
        <span className="text-slate-400">This year{r.partial ? ' (to date)' : ''}</span>
        <span className="font-numeric text-blue-400">{pct(r.current, 2)}</span>
      </div>
    </div>
  );
}

export default function SeasonalityChart({ monthlyStats, currentYear, years }: SeasonalityStats) {
  if (!monthlyStats?.length || monthlyStats.every((m) => m.sampleSize === 0)) {
    return <div className="flex items-center justify-center h-[260px] text-slate-500 text-sm">No seasonality data available</div>;
  }

  const rows: Row[] = MONTHS.map((m, i) => {
    const s = monthlyStats.find((x) => x.month === i + 1);
    const c = currentYear.find((x) => x.month === i + 1);
    return {
      month: m,
      avg: s && s.sampleSize ? s.avgReturn : null,
      median: s && s.sampleSize ? s.medianReturn : null,
      winRate: s && s.sampleSize ? s.winRate : null,
      current: c ? c.return : null,
      partial: !!c?.partial,
      n: s?.sampleSize ?? 0,
    };
  });
  const span = years.length ? `${years[0]}–${years[years.length - 1]}` : '';

  return (
    <div className="w-full">
      <div className="mb-3">
        <p className="text-white font-semibold text-sm">Seasonal Return Patterns</p>
        <p className="text-slate-500 text-xs mt-0.5">
          Month-end to month-end returns of the front-month contract, {span} ({years.length} years) · bars: average · line: this year
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={rows} margin={{ top: 5, right: 10, left: 5, bottom: 5 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={{ stroke: '#1e2d4a' }} tickLine={false} />
          <YAxis tickFormatter={(v: number) => `${v.toFixed(0)}%`} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} formatter={(v) => <span style={{ color: '#94a3b8' }}>{v}</span>} />
          <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
          <Bar dataKey="avg" name={`Average (${span})`} maxBarSize={28} fill="rgba(52,211,153,0.7)">
            {rows.map((r, i) => (
              <Cell key={i} fill={(r.avg ?? 0) >= 0 ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)'} />
            ))}
          </Bar>
          <Line type="linear" dataKey="median" name="Median" stroke="#cbd5e1" strokeDasharray="4 3" strokeWidth={1.5} dot={false} connectNulls />
          <Line type="linear" dataKey="current" name={`${new Date().getFullYear()}`} stroke="#60a5fa" strokeWidth={2} dot={{ fill: '#60a5fa', r: 3, strokeWidth: 0 }} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="overflow-x-auto mt-5 rounded-lg border border-[#1e2d4a]">
        <table className="w-full text-[11px] min-w-[640px]">
          <thead>
            <tr className="bg-[#0a0e1a] text-slate-500">
              <th className="text-left px-3 py-2 font-semibold">Month</th>
              <th className="text-right px-3 py-2 font-semibold">Average</th>
              <th className="text-right px-3 py-2 font-semibold">Median</th>
              <th className="text-right px-3 py-2 font-semibold">Up years</th>
              <th className="text-right px-3 py-2 font-semibold">Best</th>
              <th className="text-right px-3 py-2 font-semibold">Worst</th>
              <th className="text-right px-3 py-2 font-semibold">Std dev</th>
              <th className="text-right px-3 py-2 font-semibold">{new Date().getFullYear()}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2d4a]">
            {monthlyStats.map((s, i) => {
              const c = rows[i];
              return (
                <tr key={s.month} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-1.5 text-slate-300">{MONTHS[i]}</td>
                  <td className={['px-3 py-1.5 text-right font-numeric tabular-nums', s.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'].join(' ')}>{s.sampleSize ? pct(s.avgReturn) : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-numeric tabular-nums text-slate-300">{s.sampleSize ? pct(s.medianReturn) : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-numeric tabular-nums text-slate-300">{s.sampleSize ? `${s.winRate}% (${s.sampleSize})` : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-numeric tabular-nums text-slate-400">{s.sampleSize ? pct(s.maxReturn) : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-numeric tabular-nums text-slate-400">{s.sampleSize ? pct(s.minReturn) : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-numeric tabular-nums text-slate-400">{s.sampleSize ? `${s.stddev.toFixed(1)}%` : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-numeric tabular-nums text-blue-400">
                    {pct(c.current)}
                    {c.partial && <span className="text-slate-500"> MTD</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-slate-600 text-[10px] mt-2">
        Based on the continuous front-month series, so roll gaps between contracts are included. In steep-curve markets
        (natural gas, softs) part of a month&apos;s average can come from the roll rather than the price trend. With {years.length} years per
        month, treat averages as a tendency, not a forecast.
      </p>
    </div>
  );
}
