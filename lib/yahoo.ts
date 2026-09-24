// lib/yahoo.ts
// Yahoo Finance data fetching utilities for commodity futures
// Compatible with yahoo-finance2 v4+

import YahooFinance from 'yahoo-finance2';
import { generateContractTickers, getCommodity, MONTH_CODE_MAP } from './commodities';

// ─── Instantiate (v4 uses class-based API) ────────────────────────────────
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface QuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  name: string;
}

export interface CurvePoint {
  /** Yahoo Finance ticker, e.g. 'CLZ26.NYM' */
  ticker: string;
  /** CME month code + 2-digit year, e.g. 'Z26' */
  monthCode: string;
  /** ISO date string for the first calendar day of the delivery month */
  deliveryDate: string;
  /** Last price in USD */
  price: number;
  /** Human-readable label, e.g. "Dec '26" */
  month: string;
}

export interface HistoricalPoint {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  close: number;
  volume: number;
}

// ─── Month helpers ────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Extract the delivery month label and ISO date from a Yahoo Finance futures
 * ticker such as 'CLZ26.NYM'.
 *
 * Format: <ROOT><MONTH_CODE><2-digit-year>.<SUFFIX>
 * We strip the suffix and parse the last 3 characters of the base.
 */
function parseTickerDelivery(
  ticker: string
): { monthCode: string; deliveryDate: string; label: string } | null {
  const base = ticker.split('.')[0];
  if (base.length < 4) return null;

  const yearStr = base.slice(-2);
  const monthCode = base.slice(-3, -2);
  const year = 2000 + parseInt(yearStr, 10);

  if (!MONTH_CODE_MAP[monthCode]) return null;

  const monthNum = MONTH_CODE_MAP[monthCode]; // 1-based
  const deliveryDate = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
  const label = `${MONTH_NAMES[monthNum - 1]} '${yearStr}`;

  return { monthCode: `${monthCode}${yearStr}`, deliveryDate, label };
}

// ─── Core fetchers ────────────────────────────────────────────────────────────

/**
 * Fetch a real-time quote for a single Yahoo Finance ticker.
 * Returns null on any error.
 */
export async function fetchQuote(ticker: string): Promise<QuoteResult | null> {
  try {
    const quote = await yahooFinance.quote(ticker);

    if (!quote || quote.regularMarketPrice == null) return null;

    return {
      symbol: ticker,
      price: quote.regularMarketPrice ?? 0,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      open: quote.regularMarketOpen ?? 0,
      high: quote.regularMarketDayHigh ?? 0,
      low: quote.regularMarketDayLow ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      name: quote.shortName ?? quote.longName ?? ticker,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch multiple quotes in parallel.
 * Returns a map of ticker → QuoteResult | null.
 */
export async function fetchMultipleQuotes(
  tickers: string[]
): Promise<Record<string, QuoteResult | null>> {
  const results = await Promise.allSettled(tickers.map((t) => fetchQuote(t)));

  const map: Record<string, QuoteResult | null> = {};
  tickers.forEach((ticker, i) => {
    const result = results[i];
    map[ticker] = result.status === 'fulfilled' ? result.value : null;
  });

  return map;
}

/**
 * Fetch the forward curve for a commodity root symbol (e.g. 'CL').
 * Generates the next 12 contract tickers and fetches their prices.
 */
export async function fetchForwardCurve(symbol: string): Promise<CurvePoint[]> {
  const commodity = getCommodity(symbol);
  if (!commodity) return [];

  const tickers = generateContractTickers(
    commodity.symbol,
    commodity.exchange,
    commodity.contractMonths,
    12
  );

  if (tickers.length === 0) return [];

  const settled = await Promise.allSettled(tickers.map((t) => fetchQuote(t)));

  const points: CurvePoint[] = [];

  tickers.forEach((ticker, i) => {
    const result = settled[i];
    if (result.status !== 'fulfilled' || result.value === null) return;

    const quote = result.value;
    if (!quote.price || quote.price <= 0) return;

    const parsed = parseTickerDelivery(ticker);
    if (!parsed) return;

    points.push({
      ticker,
      monthCode: parsed.monthCode,
      deliveryDate: parsed.deliveryDate,
      price: quote.price,
      month: parsed.label,
    });
  });

  points.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));

  return points;
}

/**
 * Fetch historical daily OHLCV data for a Yahoo Finance ticker.
 *
 * @param ticker  Yahoo Finance ticker (e.g. 'CL=F')
 * @param months  How many months of history to retrieve (default: 24)
 */
export async function fetchHistorical(
  ticker: string,
  months: number = 24
): Promise<HistoricalPoint[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const result = await yahooFinance.chart(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    });

    if (!result?.quotes || result.quotes.length === 0) return [];

    const points: HistoricalPoint[] = result.quotes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.close != null && q.date != null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((q: any) => ({
        date: new Date(q.date as Date).toISOString().split('T')[0],
        close: q.close as number,
        volume: q.volume ?? 0,
      }));

    points.sort((a, b) => a.date.localeCompare(b.date));
    return points;
  } catch {
    return [];
  }
}
