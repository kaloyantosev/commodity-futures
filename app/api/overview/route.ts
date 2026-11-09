// app/api/overview/route.ts — live front-month prices for all covered commodities.
import { NextResponse } from 'next/server';
import { getOverviewData } from '@/lib/data';

export const revalidate = 300;

export async function GET(): Promise<NextResponse> {
  const data = await getOverviewData();
  if (!data.length) return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 });
  return NextResponse.json(data);
}
