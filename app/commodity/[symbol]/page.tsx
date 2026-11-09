import React from 'react';
import { notFound } from 'next/navigation';
import CommodityTabs, { CommodityTabsProps } from '@/components/CommodityTabs';
import { getCommodity } from '@/lib/commodities';
import { getCalendarSpreadHistory, getCurveData, getHistoryData, getSeasonalityData } from '@/lib/data';

export const revalidate = 300;

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { symbol } = await params;
  const commodity = getCommodity(symbol);
  if (!commodity) return { title: 'Commodity Not Found | CommodIntel' };
  return {
    title: `${commodity.name} (${commodity.symbol}) | CommodIntel`,
    description: `${commodity.name} forward curve, calendar spread, seasonality, volatility and roll calendar`,
  };
}

export default async function CommodityDetailPage({ params }: PageProps) {
  const { symbol: rawSymbol } = await params;
  const sym = rawSymbol.toUpperCase();
  const commodity = getCommodity(sym);
  if (!commodity) notFound();

  const [curve, historyRaw, seasonality] = await Promise.all([
    getCurveData(sym).catch(() => null),
    getHistoryData(sym, 24).catch(() => null),
    getSeasonalityData(sym).catch(() => null),
  ]);
  const calendarSpread = curve ? await getCalendarSpreadHistory(curve.points, 6).catch(() => null) : null;

  let history: CommodityTabsProps['history'] = null;
  if (historyRaw && historyRaw.data.length > 0) {
    const last252 = historyRaw.data.slice(-252);
    const closes = last252.map((d) => d.close);
    const volumes = last252.map((d) => d.volume).filter((v) => v > 0);
    history = {
      // Data layer returns decimals (0.35 = 35%); VolatilityPanel expects percent.
      hv10: historyRaw.volatility.hv10 * 100,
      hv20: historyRaw.volatility.hv20 * 100,
      hv60: historyRaw.volatility.hv60 * 100,
      high52w: closes.length ? Math.max(...closes) : null,
      low52w: closes.length ? Math.min(...closes) : null,
      avgVolume: volumes.length ? Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length) : null,
    };
  }

  const tabsProps: CommodityTabsProps = {
    symbol: commodity.symbol,
    name: commodity.name,
    sector: commodity.sector,
    color: commodity.color,
    unit: commodity.unit,
    price: curve?.frontPrice ?? null,
    change: curve?.frontChange ?? 0,
    changePercent: curve?.frontChangePercent ?? 0,
    curve,
    history,
    calendarSpread,
    seasonality,
  };

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <CommodityTabs {...tabsProps} />
    </main>
  );
}
