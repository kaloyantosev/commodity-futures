// app/api/history/[symbol]/route.ts — daily history and realized volatility.
import { NextRequest, NextResponse } from 'next/server';
import { getCommodity } from '@/lib/commodities';
import { getHistoryData } from '@/lib/data';

export const revalidate = 3600;

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }): Promise<NextResponse> {
  const { symbol } = await params;
  if (!getCommodity(symbol)) return NextResponse.json({ error: `Unknown commodity symbol: ${symbol}` }, { status: 404 });
  const months = Math.min(120, Math.max(1, Number(req.nextUrl.searchParams.get('months')) || 24));
  const data = await getHistoryData(symbol, months);
  if (!data) return NextResponse.json({ error: `No historical data available for ${symbol}` }, { status: 503 });
  return NextResponse.json(data);
}
