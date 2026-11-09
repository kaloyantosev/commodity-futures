// app/api/seasonality/[symbol]/route.ts — monthly seasonality from the shared data layer.
import { NextRequest, NextResponse } from 'next/server';
import { getCommodity } from '@/lib/commodities';
import { getSeasonalityData } from '@/lib/data';

export const revalidate = 86400;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }): Promise<NextResponse> {
  const { symbol } = await params;
  if (!getCommodity(symbol)) return NextResponse.json({ error: `Unknown commodity symbol: ${symbol}` }, { status: 404 });
  const data = await getSeasonalityData(symbol);
  if (!data) return NextResponse.json({ error: `No historical data available for ${symbol}` }, { status: 503 });
  return NextResponse.json(data);
}
