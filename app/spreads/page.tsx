import React from 'react';
import Link from 'next/link';
import SpreadHistoryChart from '@/components/SpreadHistoryChart';
import { getCalendarSpreadTable, getSpreadHistories, getSpreadsData, type SpreadHistory } from '@/lib/data';

export const revalidate = 300;

export const metadata = {
  title: 'Spreads | CommodIntel',
  description: 'Crack spreads, soybean crush and calendar spreads across commodity futures.',
};

const SPREADS: Array<{ key: SpreadHistory['key']; title: string; formula: string; unit: string; note: string }> = [
  { key: 'crack_3_2_1', title: '3:2:1 Crack Spread', formula: '(2 × RBOB × 42 + HO × 42 − 3 × WTI) / 3', unit: '$/bbl', note: 'US refining margin per barrel of crude' },
  { key: 'gasoline_crack', title: 'Gasoline Crack', formula: 'RBOB × 42 − WTI', unit: '$/bbl', note: 'Gasoline margin over crude' },
  { key: 'heating_oil_crack', title: 'Heating Oil (Diesel) Crack', formula: 'HO × 42 − WTI', unit: '$/bbl', note: 'Distillate margin over crude' },
  { key: 'soy_crush', title: 'Soybean Crush', formula: 'ZL × 11 lb + ZM × 44 lb − ZS', unit: '$/bu', note: 'Crusher margin per bushel of soybeans' },
];

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
const signed = (v: number | null, d = 2) => (v == null ? 'N/A' : `${v >= 0 ? '+' : ''}${v.toFixed(d)}`);

export default async function SpreadsPage() {
  const [live, histories, calendar] = await Promise.all([
    getSpreadsData().catch(() => null),
    getSpreadHistories(24).catch(() => [] as SpreadHistory[]),
    getCalendarSpreadTable().catch(() => []),
  ]);

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      <div>
        <h1 className="text-white text-2xl font-semibold tracking-tight">Spreads</h1>
        <p className="text-slate-400 text-sm mt-1">
          Processing margins (cracks and crush) and calendar spreads, from live front-month and contract-month futures.
        </p>
      </div>

      {/* Processing spreads */}
      <section>
        <p className="text-white font-semibold text-base">Processing Spreads</p>
        <p className="text-slate-500 text-xs mt-0.5 mb-4">
          Current value, where it sits in its 2-year range, and daily history (dashed line: 2-year median)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SPREADS.map((s) => {
            const h = histories.find((x) => x.key === s.key);
            const value = live?.[s.key] ?? h?.current ?? null;
            return (
              <div key={s.key} className="bg-[#16161a] border border-[#2a2a30] rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white text-sm font-semibold">{s.title}</p>
                    <p className="text-slate-500 text-[11px]">{s.note}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={['font-numeric text-xl font-semibold tabular-nums', value == null ? 'text-slate-500' : value >= 0 ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                      {signed(value)}
                    </p>
                    <p className="text-slate-500 text-[10px]">{s.unit}</p>
                  </div>
                </div>
                {h && h.percentile != null && (
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-400">
                    <span><span className="text-white font-semibold">{ordinal(h.percentile)}</span> percentile of 2 years</span>
                    <span>Median {h.median?.toFixed(2)}</span>
                    <span>Range {h.min?.toFixed(2)} to {h.max?.toFixed(2)}</span>
                  </div>
                )}
                <SpreadHistoryChart points={h?.points ?? []} median={h?.median ?? null} unit={s.unit} />
                <div className="bg-[#0c0c0e] border border-[#2a2a30] rounded px-2.5 py-1.5">
                  <p className="font-mono text-blue-400 text-[10px] tracking-wider">{s.formula}</p>
                </div>
              </div>
            );
          })}
        </div>
        {live && (
          <p className="text-slate-600 text-[10px] mt-3">
            Inputs: WTI {live.inputs.wti_crude?.toFixed(2) ?? 'N/A'} $/bbl · RBOB {live.inputs.rbob_gasoline?.toFixed(4) ?? 'N/A'} $/gal · HO{' '}
            {live.inputs.heating_oil?.toFixed(4) ?? 'N/A'} $/gal · Soybeans {live.inputs.soybeans?.toFixed(2) ?? 'N/A'} $/bu · Soy oil{' '}
            {live.inputs.soy_oil?.toFixed(4) ?? 'N/A'} $/lb · Soy meal {live.inputs.soy_meal?.toFixed(1) ?? 'N/A'} $/ton
          </p>
        )}
      </section>

      {/* Calendar spreads */}
      <section>
        <p className="text-white font-semibold text-base">Calendar Spreads</p>
        <p className="text-slate-500 text-xs mt-0.5 mb-4">
          Nearest listed contract (M1) minus the next one (M2). Positive = backwardation. Roll yield is the annualized gain (or cost) of rolling a long position from M1 to M2.
        </p>
        <div className="overflow-x-auto rounded-lg border border-[#2a2a30]">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="bg-[#0c0c0e] border-b border-[#2a2a30] text-slate-500">
                <th className="text-left px-4 py-2.5 font-semibold">Commodity</th>
                <th className="text-left px-3 py-2.5 font-semibold">M1</th>
                <th className="text-left px-3 py-2.5 font-semibold">M2</th>
                <th className="text-right px-3 py-2.5 font-semibold">M1 − M2</th>
                <th className="text-right px-3 py-2.5 font-semibold">Roll yield (ann.)</th>
                <th className="text-right px-4 py-2.5 font-semibold" title="Front contract vs the contract about 12 months out">12-month curve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a30]">
              {calendar.map((r) => (
                <tr key={r.symbol} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <Link href={`/commodity/${r.symbol}`} className="flex items-center gap-2 group">
                      <span className="font-mono text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">{r.symbol}</span>
                      <span className="text-white group-hover:text-blue-300">{r.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 font-numeric tabular-nums">{r.m1 ? `${r.m1.month} · ${r.m1.price.toFixed(2)}` : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-300 font-numeric tabular-nums">{r.m2 ? `${r.m2.month} · ${r.m2.price.toFixed(2)}` : '—'}</td>
                  <td className={['px-3 py-2.5 text-right font-numeric tabular-nums', r.m1m2 == null ? 'text-slate-500' : r.m1m2 >= 0 ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                    {r.m1m2 == null ? '—' : signed(r.m1m2, 3)}
                  </td>
                  <td className={['px-3 py-2.5 text-right font-numeric tabular-nums', r.rollYield == null ? 'text-slate-500' : r.rollYield >= 0 ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                    {r.rollYield == null ? '—' : `${signed(r.rollYield, 1)}%`}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {r.curveShape ? (
                      <span
                        className={[
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                          r.curveShape === 'backwardation'
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                            : r.curveShape === 'contango'
                            ? 'text-red-400 bg-red-400/10 border-red-400/20'
                            : 'text-slate-400 bg-slate-400/10 border-slate-400/20',
                        ].join(' ')}
                      >
                        {r.curveShape}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-slate-600 text-[10px] mt-2">
          M1 − M2 and the 12-month curve can disagree: natural gas, for example, is in contango into winter but backwardated over the year.
          For seasonal markets (NG, RBOB, heating oil) the annualized roll yield of a one-month gap mostly reflects seasonality, not a carry you can earn all year.
          Gaps between contract months differ by market (e.g. corn Dec → Mar) and are accounted for. Open a commodity for its daily M1 − M2 history.
        </p>
      </section>
    </main>
  );
}
