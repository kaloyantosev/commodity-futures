// app/api/spreads/route.ts — processing spreads (live) plus daily history.
import { NextResponse } from 'next/server';
import { getSpreadHistories, getSpreadsData } from '@/lib/data';

export const revalidate = 300;

export async function GET(): Promise<NextResponse> {
  const [live, history] = await Promise.all([getSpreadsData(), getSpreadHistories(24)]);
  const anyLive = [live.crack_3_2_1, live.soy_crush, live.gasoline_crack, live.heating_oil_crack].some((v) => v != null);
  if (!anyLive) return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 });
  return NextResponse.json({ ...live, history });
}
