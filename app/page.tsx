import React from 'react';
import ProcessingSpreads from '@/components/ProcessingSpreads';
import RollCalendar from '@/components/RollCalendar';
import SectorTabsAndGrid, { CommodityOverview } from '@/components/SectorTabsAndGrid';

// ─── Base URL for server-side fetch ────────────────────────────────────────
// In server components, fetch() requires absolute URLs.
// Vercel injects VERCEL_URL automatically in all deployments.
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  return 'http://localhost:3000';
}

// ─── Data fetchers ──────────────────────────────────────────────────────────

async function fetchOverview(): Promise<CommodityOverview[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/overview`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`overview fetch failed: ${res.status}`);
    return res.json();
  } catch (err) {
    console.error('[dashboard] fetchOverview error:', err);
    return [];
  }
}

async function fetchSpreads() {
  try {
    const res = await fetch(`${getBaseUrl()}/api/spreads`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`spreads fetch failed: ${res.status}`);
    return res.json();
  } catch (err) {
    console.error('[dashboard] fetchSpreads error:', err);
    // Return null — ProcessingSpreads handles missing data gracefully
    return null;
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [commodities, spreadsData] = await Promise.all([
    fetchOverview(),
    fetchSpreads(),
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

      {/* ── Commodity Grid with Sector Tabs (Client Component) ───── */}
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
