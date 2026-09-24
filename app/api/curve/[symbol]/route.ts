// app/api/curve/[symbol]/route.ts
// Returns forward curve data and shape analysis for a given commodity symbol.

import { NextRequest, NextResponse } from 'next/server';
import { getCommodity } from '@/lib/commodities';
import { fetchForwardCurve, fetchQuote, type CurvePoint } from '@/lib/yahoo';

export const revalidate = 300; // 5-minute cache

type CurveShape = 'contango' | 'backwardation' | 'flat';

interface CurveResponse {
  symbol: string;
  name: string;
  unit: string;
  curveShape: CurveShape;
  /** Percent return from rolling front to second contract (negative = contango cost) */
  rollYield: number;
  points: CurvePoint[];
  frontPrice: number;
  frontChange: number;
  frontChangePercent: number;
}

/**
 * Determine curve shape from an ordered array of curve points.
 * "flat" when the spread between front and back is < 0.5% of front price.
 */
function determineCurveShape(points: CurvePoint[]): CurveShape {
  if (points.length < 2) return 'flat';

  const front = points[0].price;
  const back = points[points.length - 1].price;
  const spread = back - front;
  const spreadPct = Math.abs(spread) / front;

  if (spreadPct < 0.005) return 'flat';
  return spread > 0 ? 'contango' : 'backwardation';
}

/**
 * Roll yield: percentage difference between the 2nd contract and the front
 * contract. A negative roll yield means the market is in contango (costs to roll).
 */
function computeRollYield(points: CurvePoint[]): number {
  if (points.length < 2) return 0;
  const front = points[0].price;
  const second = points[1].price;
  // Roll yield from the perspective of a long holder rolling from front to second:
  // you sell front and buy second; if second > front you have a cost (negative yield)
  return ((front - second) / second) * 100;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
): Promise<NextResponse> {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();
  const commodity = getCommodity(symbol);

  if (!commodity) {
    return NextResponse.json(
      { error: `Unknown commodity symbol: ${symbol}` },
      { status: 404 }
    );
  }

  // Fetch forward curve and front-month quote in parallel
  const [curvePoints, frontQuote] = await Promise.all([
    fetchForwardCurve(symbol),
    fetchQuote(commodity.yahooFrontMonth),
  ]);

  if (curvePoints.length === 0 && frontQuote === null) {
    return NextResponse.json(
      { error: `No data available for ${symbol}` },
      { status: 503 }
    );
  }

  const curveShape = determineCurveShape(curvePoints);
  const rollYield = computeRollYield(curvePoints);

  const response: CurveResponse = {
    symbol: commodity.symbol,
    name: commodity.name,
    unit: commodity.unit,
    curveShape,
    rollYield: parseFloat(rollYield.toFixed(4)),
    points: curvePoints,
    frontPrice: frontQuote?.price ?? curvePoints[0]?.price ?? 0,
    frontChange: frontQuote?.change ?? 0,
    frontChangePercent: frontQuote?.changePercent ?? 0,
  };

  return NextResponse.json(response);
}
