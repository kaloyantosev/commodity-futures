'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ForwardCurveChart, { CurvePoint } from '@/components/ForwardCurveChart';
import SeasonalityChart, { SeasonalityStats } from '@/components/SeasonalityChart';
import VolatilityPanel from '@/components/VolatilityPanel';
import CalendarSpreadChart from '@/components/CalendarSpreadChart';
import RollCalendar from '@/components/RollCalendar';

// ─── Types ─────────────────────────────────────────────────────────────────

interface CurveData {
  points: CurvePoint[];
  curveShape: 'contango' | 'backwardation' | 'flat';
  rollYield: number | null; // annualized %, negative = cost of rolling (contango)
  m1m2: number | null;
}

interface HistoryData {
  hv10: number;
  hv20: number;
  hv60: number;
  high52w: number | null;
  low52w: number | null;
  avgVolume: number | null;
}

export interface CommodityTabsProps {
  symbol: string;
  name: string;
  sector: string;
  color?: string;
  price: number | null;
  change: number;
  changePercent: number;
  unit: string;
  curve: CurveData | null;
  history: HistoryData | null;
  calendarSpread: { label: string; data: Array<{ date: string; spread: number }> } | null;
  seasonality: SeasonalityStats | null;
}

const TABS = ['Overview', 'Forward Curve', 'Calendar Spread', 'Seasonality', 'Roll Calendar'] as const;
type Tab = (typeof TABS)[number];

const fmt = (v: number | null | undefined) =>
  v == null ? 'N/A' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg p-3">
      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-1">{label}</p>
      <p className="font-numeric text-white font-bold text-base tabular-nums">{value}</p>
    </div>
  );
}

function Unavailable({ what }: { what: string }) {
  return (
    <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-8 text-center text-slate-500 text-sm">
      {what} is unavailable right now (Yahoo Finance did not return data). Try again in a few minutes.
    </div>
  );
}

export default function CommodityTabs({
  symbol,
  name,
  sector,
  price,
  change,
  changePercent,
  unit,
  curve,
  history,
  calendarSpread,
  seasonality,
}: CommodityTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  const isPositive = change >= 0;
  const changeClass = isPositive ? 'text-emerald-400' : 'text-red-400';
  const ChangeTrendIcon = change === 0 ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="w-full">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-semibold mb-5 transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Dashboard
      </Link>

      {/* Hero */}
      <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-500 font-mono text-xs uppercase tracking-widest">{symbol.toUpperCase()}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-blue-400/10 text-blue-400 border-blue-400/20">
                {sector}
              </span>
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">{name}</h1>
            <div className="flex items-baseline gap-3">
              <span className="font-numeric text-3xl font-black text-white tabular-nums">{fmt(price)}</span>
              <span className="text-slate-500 text-sm">{unit}</span>
            </div>
          </div>
          {price != null && (
            <div className="flex flex-col items-start sm:items-end gap-1">
              <div className={['flex items-center gap-1.5', changeClass].join(' ')}>
                <ChangeTrendIcon className="w-4 h-4" />
                <span className="font-numeric font-bold text-xl tabular-nums">
                  {isPositive ? '+' : ''}
                  {change.toFixed(2)}
                </span>
              </div>
              <span
                className={[
                  'font-numeric text-sm font-bold px-2 py-0.5 rounded border tabular-nums',
                  isPositive ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20',
                ].join(' ')}
              >
                {isPositive ? '+' : ''}
                {changePercent.toFixed(2)}%
              </span>
              <span className="text-slate-600 text-[10px]">Today&apos;s change</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 border-b border-[#1e2d4a] mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2.5 text-xs font-semibold tracking-wide transition-all relative whitespace-nowrap',
              activeTab === tab ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            {tab}
            {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="fade-in">
        {activeTab === 'Overview' &&
          (history ? (
            <div className="space-y-6">
              <VolatilityPanel hv10={history.hv10} hv20={history.hv20} hv60={history.hv60} />
              <div>
                <p className="text-white font-semibold text-sm mb-3">Price Statistics</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatBox label="52-Week High" value={fmt(history.high52w)} />
                  <StatBox label="52-Week Low" value={fmt(history.low52w)} />
                  <StatBox
                    label="Avg. Volume (1y)"
                    value={
                      history.avgVolume == null
                        ? 'N/A'
                        : history.avgVolume >= 1_000
                        ? `${(history.avgVolume / 1_000).toFixed(1)}K`
                        : history.avgVolume.toLocaleString()
                    }
                  />
                  <StatBox label="Current Price" value={fmt(price)} />
                  <StatBox
                    label="52w Range Position"
                    value={(() => {
                      if (price == null || history.high52w == null || history.low52w == null) return 'N/A';
                      const range = history.high52w - history.low52w;
                      return range === 0 ? 'N/A' : `${(((price - history.low52w) / range) * 100).toFixed(0)}%`;
                    })()}
                  />
                  <StatBox label="Unit" value={unit} />
                </div>
              </div>
            </div>
          ) : (
            <Unavailable what="Price history" />
          ))}

        {activeTab === 'Forward Curve' &&
          (curve && curve.points.length > 0 ? (
            <div className="space-y-5">
              <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-5">
                <ForwardCurveChart points={curve.points} curveShape={curve.curveShape} symbol={symbol} name={name} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-lg p-4">
                  <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-1">Annualized Roll Yield (M1 vs M2)</p>
                  {curve.rollYield == null ? (
                    <span className="text-slate-500 text-sm">N/A</span>
                  ) : (
                    <>
                      <span className={['font-numeric text-2xl font-bold tabular-nums', curve.rollYield >= 0 ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                        {curve.rollYield >= 0 ? '+' : ''}
                        {curve.rollYield.toFixed(2)}%
                      </span>
                      <span className="text-slate-500 text-xs ml-2">/ year</span>
                      <p className="text-slate-600 text-[10px] mt-1">
                        {curve.rollYield >= 0
                          ? 'Backwardation: rolling a long position earns this, all else equal'
                          : 'Contango: rolling a long position costs this, all else equal'}
                      </p>
                    </>
                  )}
                </div>
                <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-lg p-4">
                  <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-1">M1 − M2</p>
                  <span className="font-numeric text-2xl font-bold tabular-nums text-white">
                    {curve.m1m2 == null ? 'N/A' : `${curve.m1m2 >= 0 ? '+' : ''}${curve.m1m2.toFixed(3)}`}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">{unit}</span>
                  {curve.points.length >= 2 && (
                    <p className="text-slate-600 text-[10px] mt-1">
                      {curve.points[0].month} vs {curve.points[1].month}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Unavailable what="The forward curve" />
          ))}

        {activeTab === 'Calendar Spread' &&
          (calendarSpread ? (
            <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-5">
              <CalendarSpreadChart data={calendarSpread.data} label={`${name} calendar spread · ${calendarSpread.label}`} unit={unit} />
            </div>
          ) : (
            <Unavailable what="Calendar spread history" />
          ))}

        {activeTab === 'Seasonality' &&
          (seasonality ? (
            <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-5">
              <SeasonalityChart {...seasonality} />
            </div>
          ) : (
            <Unavailable what="Seasonality" />
          ))}

        {activeTab === 'Roll Calendar' && <RollCalendar symbols={[symbol]} />}
      </div>
    </div>
  );
}
