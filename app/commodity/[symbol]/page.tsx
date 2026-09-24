import React from 'react';
import { notFound } from 'next/navigation';
import CommodityTabs, { CommodityTabsProps } from '@/components/CommodityTabs';
import { CurvePoint } from '@/components/ForwardCurveChart';
import { getCommodity } from '@/lib/commodities';
import {
  getCurveData,
  getHistoryData,
  getSeasonalityData,
} from '@/lib/data';

// Enable dynamic rendering with a 5-minute cache (ISR)
export const revalidate = 300;

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

// ─── Fallback helpers (used only if external Yahoo API is unreachable) ────────

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
    const slippage = i * basePrice * 0.003;
    return {
      ticker: `${symbol}${MONTH_CODES[mi]}${yr}`,
      month: `${MONTH_ABBREVS[mi]} '${yr}`,
      monthCode: `${MONTH_CODES[mi]}${yr}`,
      price: parseFloat((basePrice + slippage).toFixed(2)),
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

interface TabHistory {
  hv10: number;
  hv20: number;
  hv60: number;
  high52w: number | null;
  low52w: number | null;
  avgVolume: number | null;
  spreadHistory: Array<{ date: string; spread: number }>;
}

function buildFallbackHistory(): TabHistory {
  const MONTH_ABBREVS2 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return {
    hv10: 22.4,
    hv20: 24.1,
    hv60: 26.5,
    high52w: null,
    low52w: null,
    avgVolume: null,
    spreadHistory: Array.from({ length: 90 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (89 - i));
      return {
        date: `${MONTH_ABBREVS2[d.getMonth()]} ${d.getDate()}`,
        spread: parseFloat(((Math.random() - 0.48) * 1.5).toFixed(3)),
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

  // Call data layer directly in code — NO HTTP fetch to localhost/Vercel
  const [curveData, historyRaw, seasonalityRaw] = await Promise.all([
    getCurveData(sym).catch(() => null),
    getHistoryData(sym, 24).catch(() => null),
    getSeasonalityData(sym).catch(() => null),
  ]);

  // Transform history data for tabs
  let history: TabHistory = buildFallbackHistory();
  if (historyRaw && historyRaw.data.length > 0) {
    const data = historyRaw.data;
    const closes = data.map((d) => d.close);
    const recentCloses = closes.slice(-252);
    const high52w = recentCloses.length > 0 ? Math.max(...recentCloses) : null;
    const low52w = recentCloses.length > 0 ? Math.min(...recentCloses) : null;

    const volumes = data.map((d) => d.volume).filter((v) => v > 0);
    const avgVolume = volumes.length > 0
      ? Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length)
      : null;

    const spreadHistory = data.slice(-90).map((d, i, arr) => {
      const spread = i > 0 ? parseFloat((d.close - arr[i - 1].close).toFixed(3)) : 0;
      const dt = new Date(d.date);
      return { date: `${MONTH_ABBREVS[dt.getMonth()]} ${dt.getDate()}`, spread };
    });

    history = {
      hv10: historyRaw.volatility.hv10,
      hv20: historyRaw.volatility.hv20,
      hv60: historyRaw.volatility.hv60,
      high52w,
      low52w,
      avgVolume,
      spreadHistory,
    };
  }

  const curve = curveData ?? {
    points: buildFallbackCurve(100, sym),
    curveShape: 'contango' as const,
    rollYield: -3.5,
    frontPrice: 100,
    frontChange: 0,
    frontChangePercent: 0,
  };

  const seasonality = seasonalityRaw ?? buildFallbackSeasonality(sym);

  const tabsProps: CommodityTabsProps = {
    symbol: commodity.symbol,
    name: commodity.name,
    sector: commodity.sector,
    color: commodity.color,
    unit: commodity.unit,
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
