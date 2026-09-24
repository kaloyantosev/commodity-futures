// app/api/history/[symbol]/route.ts
// Returns historical price data and historical volatility metrics for a commodity.

import { NextRequest, NextResponse } from 'next/server';
import { getCommodity } from '@/lib/commodities';
import { fetchHistorical, type HistoricalPoint } from '@/lib/yahoo';

export const revalidate = 3600; // 1-hour cache

interface VolatilityMetrics {
  /** 10-day historical volatility (annualized, as a decimal, e.g. 0.25 = 25%) */
  hv10: number;
  /** 20-day historical volatility */
  hv20: number;
  /** 60-day historical volatility */
  hv60: number;
}

interface HistoryResponse {
  symbol: string;
  name: string;
  unit: string;
  data: HistoricalPoint[];
  volatility: VolatilityMetrics;
}

/**
 * Compute annualized historical volatility over the last `window` trading days.
 * Uses the standard deviation of log returns × sqrt(252).
 *
 * Returns 0 if there are insufficient data points.
 */
function historicalVolatility(closes: number[], window: number): number {
  if (closes.length < window + 1) return 0;

  // Use the most recent `window` log-returns
  const recent = closes.slice(-(window + 1));
  const logReturns: number[] = [];

  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    if (prev > 0 && curr > 0) {
      logReturns.push(Math.log(curr / prev));
    }
  }

  if (logReturns.length === 0) return 0;

  const mean = logReturns.reduce((sum, r) => sum + r, 0) / logReturns.length;
  const variance =
    logReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) /
    logReturns.length;

  const dailyStdDev = Math.sqrt(variance);
  return parseFloat((dailyStdDev * Math.sqrt(252)).toFixed(6));
}

export async function GET(
  req: NextRequest,
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

  // Parse optional `months` query parameter (default: 24)
  const searchParams = req.nextUrl.searchParams;
  const monthsParam = searchParams.get('months');
  const months = monthsParam ? Math.max(1, Math.min(120, parseInt(monthsParam, 10))) : 24;

  if (isNaN(months)) {
    return NextResponse.json(
      { error: 'Invalid months parameter' },
      { status: 400 }
    );
  }

  // Fetch more history than requested to have enough data for 60-day HV
  const fetchMonths = Math.max(months, 6);
  const data = await fetchHistorical(commodity.yahooFrontMonth, fetchMonths);

  if (data.length === 0) {
    return NextResponse.json(
      { error: `No historical data available for ${symbol}` },
      { status: 503 }
    );
  }

  // Extract close prices in chronological order
  const closes = data.map((d) => d.close);

  const volatility: VolatilityMetrics = {
    hv10: historicalVolatility(closes, 10),
    hv20: historicalVolatility(closes, 20),
    hv60: historicalVolatility(closes, 60),
  };

  // Trim data to only return the requested number of months
  // (we may have fetched extra for HV calculation)
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  const trimmedData = data.filter((d) => d.date >= cutoffStr);

  const response: HistoryResponse = {
    symbol: commodity.symbol,
    name: commodity.name,
    unit: commodity.unit,
    data: trimmedData,
    volatility,
  };

  return NextResponse.json(response);
}
