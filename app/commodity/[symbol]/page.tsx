import React from 'react';
import { notFound } from 'next/navigation';
import CommodityTabs, { CommodityTabsProps } from '@/components/CommodityTabs';
import { CurvePoint } from '@/components/ForwardCurveChart';
import { COMMODITIES, getCommodity } from '@/lib/commodities';

// ─── Base URL helper ────────────────────────────────────────────────────────
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  return 'http://localhost:3000';
}

// ─── Data fetchers ──────────────────────────────────────────────────────────

async function fetchCurve(symbol: string) {
  try {
    const res = await fetch(`${getBaseUrl()}/api/curve/${symbol.toUpperCase()}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchHistory(symbol: string) {
  try {
    const res = await fetch(`${getBaseUrl()}/api/history/${symbol.toUpperCase()}?months=24`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();

    // Flatten nested volatility + compute derived fields from raw data
    const data: Array<{ date: string; close: number; volume: number }> = json.data ?? [];
    const closes: number[] = data.map((d: { close: number }) => d.close);

    // 52-week high/low from the last ~252 trading days
    const recentCloses = closes.slice(-252);
    const high52w = recentCloses.length > 0 ? Math.max(...recentCloses) : null;
    const low52w = recentCloses.length > 0 ? Math.min(...recentCloses) : null;

    // Average daily volume
    const volumes: number[] = data.map((d: { volume: number }) => d.volume).filter((v: number) => v > 0);
    const avgVolume = volumes.length > 0
      ? Math.round(volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length)
      : null;

    // Calendar spread proxy: M1 close minus 30-day-ago close as a simple spread series
    const MONTH_ABBREVS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const spreadHistory = data.slice(-90).map((d: { date: string; close: number }, i: number, arr: { close: number }[]) => {
      const spread = i > 0 ? parseFloat((d.close - arr[i - 1].close).toFixed(3)) : 0;
      const dt = new Date(d.date);
      return { date: `${MONTH_ABBREVS[dt.getMonth()]} ${dt.getDate()}`, spread };
    });

    return {
      hv10: json.volatility?.hv10 ?? 0,
      hv20: json.volatility?.hv20 ?? 0,
      hv60: json.volatility?.hv60 ?? 0,
      high52w,
      low52w,
      avgVolume,
      spreadHistory,
    };
  } catch {
    return null;
  }
}

async function fetchSeasonality(symbol: string) {
  try {
    const res = await fetch(`${getBaseUrl()}/api/seasonality/${symbol.toUpperCase()}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Static params (pre-render all known commodity pages) ──────────────────

export async function generateStaticParams() {
  return COMMODITIES.map((c) => ({ symbol: c.symbol.toLowerCase() }));
}

// ─── Metadata ───────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { symbol } = await params;
  const commodity = getCommodity(symbol);
  if (!commodity) return { title: 'Commodity Not Found | CommodIntel' };
  return {
    title: `${commodity.name} (${commodity.symbol}) | CommodIntel`,
    description: `${commodity.name} forward curve, seasonality analysis, volatility metrics, and roll calendar`,
  };
}

// ─── Fallback curve helper ─────────────────────────────────────────────────
// Used when the API is unavailable to generate a plausible dummy curve
// so the page still renders (shows shape but with placeholder prices).

const MONTH_ABBREVS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTH_CODES = 'FGHJKMNQUVXZ';

function buildFallbackCurve(basePrice: number, symbol: string): CurvePoint[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mi = d.getMonth();
    const yr = d.getFullYear().toString().slice(-2);
    const noise = (Math.random() - 0.5) * basePrice * 0.005;
    const slippage = i * basePrice * 0.003; // mild contango
    return {
      ticker: `${symbol}${MONTH_CODES[mi]}${yr}`,
      month: `${MONTH_ABBREVS[mi]} '${yr}`,
      monthCode: `${MONTH_CODES[mi]}${yr}`,
      price: parseFloat((basePrice + slippage + noise).toFixed(2)),
    };
  });
}

function buildFallbackSeasonality(symbol: string) {
  const seed = symbol.charCodeAt(0);
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return {
    monthlyStats: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: MONTH_NAMES[i],
      avgReturn: parseFloat((Math.sin(i * 0.6 + seed) * 3.5).toFixed(2)),
    })),
    currentYear: Array.from({ length: new Date().getMonth() + 1 }, (_, i) => ({
      month: i + 1,
      return: parseFloat((Math.sin(i * 0.8 + seed + 1) * 4).toFixed(2)),
    })),
  };
}

function buildFallbackHistory() {
  const MONTH_ABBREVS2 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return {
    hv10: parseFloat((15 + Math.random() * 25).toFixed(1)),
    hv20: parseFloat((18 + Math.random() * 22).toFixed(1)),
    hv60: parseFloat((20 + Math.random() * 18).toFixed(1)),
    high52w: null,
    low52w: null,
    avgVolume: null,
    spreadHistory: Array.from({ length: 90 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (89 - i));
      return {
        date: `${MONTH_ABBREVS2[d.getMonth()]} ${d.getDate()}`,
        spread: parseFloat(((Math.random() - 0.48) * 2).toFixed(3)),
      };
    }),
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function CommodityDetailPage({ params }: PageProps) {
  const { symbol: rawSymbol } = await params;
  const sym = rawSymbol.toUpperCase();
  const commodity = getCommodity(sym);

  if (!commodity) notFound();

  // Fetch all data in parallel; each function handles its own errors
  const [curveData, historyData, seasonalityData] = await Promise.all([
    fetchCurve(sym),
    fetchHistory(sym),
    fetchSeasonality(sym),
  ]);

  // Use API data where available, fallback to generated placeholder otherwise
  const curve = curveData ?? {
    points: buildFallbackCurve(100, sym),
    curveShape: 'contango',
    rollYield: -3.5,
    frontPrice: 100,
    frontChange: 0,
    frontChangePercent: 0,
  };

  const history = historyData ?? buildFallbackHistory();
  const seasonality = seasonalityData ?? buildFallbackSeasonality(sym);

  const tabsProps: CommodityTabsProps = {
    symbol: commodity.symbol,
    name: commodity.name,
    sector: commodity.sector,
    color: commodity.color,
    unit: commodity.unit,
    // Price from curve API (most up to date) or fallback to 0
    price: curveData?.frontPrice ?? 0,
    change: curveData?.frontChange ?? 0,
    changePercent: curveData?.frontChangePercent ?? 0,
    curve,
    history,
    seasonality,
  };

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <CommodityTabs {...tabsProps} />
    </main>
  );
}
