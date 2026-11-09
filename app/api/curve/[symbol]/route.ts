// app/api/curve/[symbol]/route.ts — forward curve, shape and annualized roll yield.
import { NextRequest, NextResponse } from 'next/server';
import { getCommodity } from '@/lib/commodities';
import { getCurveData } from '@/lib/data';

export const revalidate = 300;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ symbol: string }> }): Promise<NextResponse> {
  const { symbol } = await params;
  if (!getCommodity(symbol)) return NextResponse.json({ error: `Unknown commodity symbol: ${symbol}` }, { status: 404 });
  const data = await getCurveData(symbol);
  if (!data) return NextResponse.json({ error: `No curve data available for ${symbol}` }, { status: 503 });
  return NextResponse.json(data);
}
