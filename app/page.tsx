import React from 'react';
import ProcessingSpreads from '@/components/ProcessingSpreads';
import RollCalendar from '@/components/RollCalendar';
import SectorTabsAndGrid, { CommodityOverview } from '@/components/SectorTabsAndGrid';
import { getOverviewData, getSpreadsData } from '@/lib/data';

// Cache page for 5 minutes (ISR)
export const revalidate = 300;

export default async function DashboardPage() {
  // Direct function calls in Server Component — zero build-time HTTP requests
  const [commodities, spreadsData] = await Promise.all([
    getOverviewData().catch(() => [] as CommodityOverview[]),
    getSpreadsData().catch(() => null),
  ]);

  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  });

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Commodity Futures Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time prices · Forward curves · Processing spreads · Roll analytics
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0f1629] border border-[#1e2d4a] rounded-lg px-3 py-2 shrink-0">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          <span className="font-numeric text-slate-400 text-[11px] tabular-nums">
            {timestamp}
          </span>
        </div>
      </div>

      {/* ── Commodity Grid with Sector Tabs ──────────────────────── */}
      <section>
        <SectorTabsAndGrid commodities={commodities} />
      </section>

      <hr className="border-[#1e2d4a]" />

      {/* ── Processing Spreads ───────────────────────────────────── */}
      {spreadsData && (
        <section>
          <ProcessingSpreads {...spreadsData} />
        </section>
      )}

      <hr className="border-[#1e2d4a]" />

      {/* ── Roll Calendar ────────────────────────────────────────── */}
      <section>
        <RollCalendar />
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="text-center py-6">
        <p className="text-slate-600 text-[11px]">
          CommodIntel · Institutional Commodity Futures Intelligence · Data sourced from Yahoo Finance &amp; CFTC · For informational purposes only
        </p>
      </footer>
    </main>
  );
}
