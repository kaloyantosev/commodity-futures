// app/api/overview/route.ts
// Returns a summary of all 14 commodities with live front-month prices.

import { NextResponse } from 'next/server';
import { COMMODITIES } from '@/lib/commodities';
import { fetchQuote } from '@/lib/yahoo';

export const revalidate = 300; // 5-minute cache

interface OverviewItem {
  symbol: string;
  name: string;
  sector: string;
  color: string;
  unit: string;
  price: number;
  change: number;
  changePercent: number;
}

// Sector sort order
const SECTOR_ORDER: Record<string, number> = {
  Energy: 0,
  Metals: 1,
  Agriculture: 2,
  Livestock: 3,
};

export async function GET(): Promise<NextResponse> {
  // Fetch all front-month quotes in parallel; tolerate individual failures
  const settled = await Promise.allSettled(
    COMMODITIES.map((c) => fetchQuote(c.yahooFrontMonth))
  );

  const items: OverviewItem[] = [];

  COMMODITIES.forEach((commodity, i) => {
    const result = settled[i];
    if (result.status !== 'fulfilled' || result.value === null) {
      // Skip commodities where the fetch failed
      return;
    }

    const quote = result.value;
    items.push({
      symbol: commodity.symbol,
      name: commodity.name,
      sector: commodity.sector,
      color: commodity.color,
      unit: commodity.unit,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
    });
  });

  // Sort by sector order, then alphabetically by name within each sector
  items.sort((a, b) => {
    const sectorDiff =
      (SECTOR_ORDER[a.sector] ?? 99) - (SECTOR_ORDER[b.sector] ?? 99);
    if (sectorDiff !== 0) return sectorDiff;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(items);
}
