// app/api/seasonality/[symbol]/route.ts
// Returns 5-year monthly seasonality statistics and current-year monthly returns.

import { NextRequest, NextResponse } from 'next/server';
import { getCommodity } from '@/lib/commodities';
import { fetchHistorical } from '@/lib/yahoo';

export const revalidate = 86400; // Cache for 24 hours

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthStat {
  /** Calendar month number (1 = January, 12 = December) */
  month: number;
  /** Month name */
  monthName: string;
  /**
   * Average monthly return over the historical period (percentage).
   * Computed as arithmetic mean of all years' monthly log returns.
   */
  avgReturn: number;
  /** Maximum single-year monthly return (percentage) */
  maxReturn: number;
  /** Minimum single-year monthly return (percentage) */
  minReturn: number;
  /** Standard deviation of monthly returns (percentage) */
  stddev: number;
  /** Number of years of data used */
  sampleSize: number;
}

interface CurrentYearMonthly {
  month: number;
  return: number;
}

interface SeasonalityResponse {
  symbol: string;
  name: string;
  monthlyStats: MonthStat[];
  currentYear: CurrentYearMonthly[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Compute the arithmetic mean of an array of numbers.
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute the population standard deviation of an array of numbers.
 */
function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Given a series of daily OHLCV points, compute the percentage return for each
 * calendar month in each year.
 *
 * The monthly return is computed as:
 *   (last_close_of_month / first_close_of_month - 1) × 100
 *
 * Returns a nested map: year → month → return (%)
 */
function computeMonthlyReturns(
  data: Array<{ date: string; close: number }>
): Map<number, Map<number, number>> {
  if (data.length === 0) return new Map();

  // Group daily closes by year-month
  const grouped = new Map<string, Array<{ date: string; close: number }>>();

  for (const point of data) {
    const [yearStr, monthStr] = point.date.split('-');
    const key = `${yearStr}-${monthStr}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(point);
  }

  // Build result: year → month → return %
  const result = new Map<number, Map<number, number>>();

  for (const [key, points] of grouped) {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    // Sort ascending by date to get first and last
    points.sort((a, b) => a.date.localeCompare(b.date));

    const firstClose = points[0].close;
    const lastClose = points[points.length - 1].close;

    if (firstClose <= 0) continue;

    const monthReturn = ((lastClose - firstClose) / firstClose) * 100;

    if (!result.has(year)) result.set(year, new Map());
    result.get(year)!.set(month, monthReturn);
  }

  return result;
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

  // Fetch 5 years of daily data (60 months)
  const HISTORY_MONTHS = 60;
  const data = await fetchHistorical(commodity.yahooFrontMonth, HISTORY_MONTHS);

  if (data.length === 0) {
    return NextResponse.json(
      { error: `No historical data available for ${symbol}` },
      { status: 503 }
    );
  }

  // Compute monthly returns per year
  const monthlyByYear = computeMonthlyReturns(data);

  const currentYear = new Date().getFullYear();

  // Collect returns per month across historical years (exclude current year from stats)
  const historicalReturns: Map<number, number[]> = new Map(
    Array.from({ length: 12 }, (_, i) => [i + 1, []])
  );

  for (const [year, monthMap] of monthlyByYear) {
    if (year >= currentYear) continue; // exclude ongoing year from historical stats
    for (const [month, ret] of monthMap) {
      if (month >= 1 && month <= 12) {
        historicalReturns.get(month)!.push(ret);
      }
    }
  }

  // Build monthly statistics
  const monthlyStats: MonthStat[] = [];

  for (let month = 1; month <= 12; month++) {
    const returns = historicalReturns.get(month) ?? [];

    if (returns.length === 0) {
      monthlyStats.push({
        month,
        monthName: MONTH_NAMES[month - 1],
        avgReturn: 0,
        maxReturn: 0,
        minReturn: 0,
        stddev: 0,
        sampleSize: 0,
      });
      continue;
    }

    const avg = mean(returns);
    const sd = stddev(returns);
    const max = Math.max(...returns);
    const min = Math.min(...returns);

    monthlyStats.push({
      month,
      monthName: MONTH_NAMES[month - 1],
      avgReturn: parseFloat(avg.toFixed(4)),
      maxReturn: parseFloat(max.toFixed(4)),
      minReturn: parseFloat(min.toFixed(4)),
      stddev: parseFloat(sd.toFixed(4)),
      sampleSize: returns.length,
    });
  }

  // Current year's completed months
  const currentYearMap = monthlyByYear.get(currentYear) ?? new Map<number, number>();
  const currentYearData: CurrentYearMonthly[] = [];

  for (const [month, ret] of currentYearMap) {
    currentYearData.push({
      month,
      return: parseFloat(ret.toFixed(4)),
    });
  }

  currentYearData.sort((a, b) => a.month - b.month);

  const response: SeasonalityResponse = {
    symbol: commodity.symbol,
    name: commodity.name,
    monthlyStats,
    currentYear: currentYearData,
  };

  return NextResponse.json(response);
}
