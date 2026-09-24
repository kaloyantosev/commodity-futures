// lib/data.ts
// Direct data-fetching functions shared across Server Components and API Routes.
// Calling these directly in Server Components eliminates build-time HTTP requests,
// preventing "Unexpected token '<'" errors caused by fetching unstarted servers.

import { COMMODITIES, getCommodity } from '@/lib/commodities';
import {
  fetchQuote,
  fetchMultipleQuotes,
  fetchForwardCurve,
  fetchHistorical,
  type CurvePoint,
  type HistoricalPoint,
} from '@/lib/yahoo';

// ─── Overview Data ────────────────────────────────────────────────────────────

export interface OverviewItem {
  symbol: string;
  name: string;
  sector: 'Energy' | 'Metals' | 'Agriculture';
  color: string;
  unit: string;
  price: number;
  change: number;
  changePercent: number;
}

const SECTOR_ORDER: Record<string, number> = {
  Energy: 0,
  Metals: 1,
  Agriculture: 2,
};

export async function getOverviewData(): Promise<OverviewItem[]> {
  try {
    const settled = await Promise.allSettled(
      COMMODITIES.map((c) => fetchQuote(c.yahooFrontMonth))
    );

    const items: OverviewItem[] = [];

    COMMODITIES.forEach((commodity, i) => {
      const result = settled[i];
      if (result.status !== 'fulfilled' || !result.value) {
        return;
      }
      const quote = result.value;
      items.push({
        symbol: commodity.symbol,
        name: commodity.name,
        sector: commodity.sector as 'Energy' | 'Metals' | 'Agriculture',
        color: commodity.color,
        unit: commodity.unit,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
      });
    });

    items.sort((a, b) => {
      const sectorDiff = (SECTOR_ORDER[a.sector] ?? 99) - (SECTOR_ORDER[b.sector] ?? 99);
      if (sectorDiff !== 0) return sectorDiff;
      return a.name.localeCompare(b.name);
    });

    return items;
  } catch (error) {
    console.error('Error in getOverviewData:', error);
    return [];
  }
}

// ─── Spreads Data ─────────────────────────────────────────────────────────────

export interface SpreadsResponse {
  crack_3_2_1: number;
  soy_crush: number;
  heating_oil_crack: number;
  gasoline_crack: number;
  inputs: Record<string, number | undefined>;
  updatedAt: string;
}

export async function getSpreadsData(): Promise<SpreadsResponse> {
  const TICKERS = {
    wti: 'CL=F',
    rbob: 'RB=F',
    heatingOil: 'HO=F',
    natgas: 'NG=F',
    soybeans: 'ZS=F',
    soybeanOil: 'ZL=F',
    soybeanMeal: 'ZM=F',
  };

  const tickerList = Object.values(TICKERS);
  const quotes = await fetchMultipleQuotes(tickerList);

  const cl = quotes[TICKERS.wti]?.price ?? 80;
  const rb = quotes[TICKERS.rbob]?.price ?? 2.4;
  const ho = quotes[TICKERS.heatingOil]?.price ?? 2.5;
  const zs = quotes[TICKERS.soybeans]?.price ?? 1100;
  const zl = quotes[TICKERS.soybeanOil]?.price ?? 45;
  const zm = quotes[TICKERS.soybeanMeal]?.price ?? 320;
  const ng = quotes[TICKERS.natgas]?.price ?? 2.5;

  const crack_3_2_1 = (2 * rb * 42 + 1 * ho * 42 - 3 * cl) / 3;
  const gasoline_crack = rb * 42 - cl;
  const heating_oil_crack = ho * 42 - cl;
  // Soy Crush: (ZL in cents/lb * 11 / 100) + (ZM in $/ton * 44 / 2000) - (ZS in cents/bu / 100)
  const soy_crush = (zl / 100) * 11 + (zm / 2000) * 44 - zs / 100;

  return {
    crack_3_2_1: parseFloat(crack_3_2_1.toFixed(2)),
    soy_crush: parseFloat(soy_crush.toFixed(2)),
    gasoline_crack: parseFloat(gasoline_crack.toFixed(2)),
    heating_oil_crack: parseFloat(heating_oil_crack.toFixed(2)),
    inputs: {
      wti_crude: cl,
      rbob_gasoline: rb,
      heating_oil: ho,
      natgas: ng,
      soybeans: zs / 100,
      soy_oil: zl / 100,
      soy_meal: zm,
    },
    updatedAt: new Date().toISOString(),
  };
}

// ─── Curve Data ───────────────────────────────────────────────────────────────

export type CurveShape = 'contango' | 'backwardation' | 'flat';

export interface CurveResponse {
  symbol: string;
  name: string;
  unit: string;
  curveShape: CurveShape;
  rollYield: number;
  points: CurvePoint[];
  frontPrice: number;
  frontChange: number;
  frontChangePercent: number;
}

export async function getCurveData(symbol: string): Promise<CurveResponse | null> {
  const commodity = getCommodity(symbol);
  if (!commodity) return null;

  const [curvePoints, frontQuote] = await Promise.all([
    fetchForwardCurve(commodity.symbol),
    fetchQuote(commodity.yahooFrontMonth),
  ]);

  if (curvePoints.length === 0 && !frontQuote) {
    return null;
  }

  let curveShape: CurveShape = 'flat';
  let rollYield = 0;

  if (curvePoints.length >= 2) {
    const front = curvePoints[0].price;
    const back = curvePoints[curvePoints.length - 1].price;
    const spread = back - front;
    if (Math.abs(spread) / front >= 0.005) {
      curveShape = spread > 0 ? 'contango' : 'backwardation';
    }
    const second = curvePoints[1].price;
    if (second > 0) {
      rollYield = ((front - second) / second) * 100;
    }
  }

  return {
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
}

// ─── History & Volatility Data ────────────────────────────────────────────────

export interface HistoryResponse {
  symbol: string;
  name: string;
  unit: string;
  data: HistoricalPoint[];
  volatility: {
    hv10: number;
    hv20: number;
    hv60: number;
  };
}

function historicalVolatility(closes: number[], window: number): number {
  if (closes.length < window + 1) return 0;
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
  const variance = logReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / logReturns.length;
  return parseFloat((Math.sqrt(variance) * Math.sqrt(252)).toFixed(4));
}

export async function getHistoryData(symbol: string, months: number = 24): Promise<HistoryResponse | null> {
  const commodity = getCommodity(symbol);
  if (!commodity) return null;

  const data = await fetchHistorical(commodity.yahooFrontMonth, Math.max(months, 6));
  if (data.length === 0) return null;

  const closes = data.map((d) => d.close);
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  const trimmed = data.filter((d) => d.date >= cutoffStr);

  return {
    symbol: commodity.symbol,
    name: commodity.name,
    unit: commodity.unit,
    data: trimmed,
    volatility: {
      hv10: historicalVolatility(closes, 10),
      hv20: historicalVolatility(closes, 20),
      hv60: historicalVolatility(closes, 60),
    },
  };
}

// ─── Seasonality Data ─────────────────────────────────────────────────────────

export interface MonthStat {
  month: number;
  monthName: string;
  avgReturn: number;
  maxReturn: number;
  minReturn: number;
  stddev: number;
  sampleSize: number;
}

export interface SeasonalityResponse {
  symbol: string;
  name: string;
  monthlyStats: MonthStat[];
  currentYear: Array<{ month: number; return: number }>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export async function getSeasonalityData(symbol: string): Promise<SeasonalityResponse | null> {
  const commodity = getCommodity(symbol);
  if (!commodity) return null;

  const data = await fetchHistorical(commodity.yahooFrontMonth, 60);
  if (data.length === 0) return null;

  const grouped = new Map<string, Array<{ date: string; close: number }>>();
  for (const point of data) {
    const [yr, mo] = point.date.split('-');
    const key = `${yr}-${mo}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(point);
  }

  const monthlyByYear = new Map<number, Map<number, number>>();
  for (const [key, points] of grouped) {
    const [yr, mo] = key.split('-');
    const year = parseInt(yr, 10);
    const month = parseInt(mo, 10);
    points.sort((a, b) => a.date.localeCompare(b.date));
    const first = points[0].close;
    const last = points[points.length - 1].close;
    if (first > 0) {
      if (!monthlyByYear.has(year)) monthlyByYear.set(year, new Map());
      monthlyByYear.get(year)!.set(month, ((last - first) / first) * 100);
    }
  }

  const currentYear = new Date().getFullYear();
  const historicalReturns: Map<number, number[]> = new Map(
    Array.from({ length: 12 }, (_, i) => [i + 1, []])
  );

  for (const [year, monthMap] of monthlyByYear) {
    if (year >= currentYear) continue;
    for (const [month, ret] of monthMap) {
      if (month >= 1 && month <= 12) {
        historicalReturns.get(month)!.push(ret);
      }
    }
  }

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
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - avg) ** 2, 0) / returns.length;
    monthlyStats.push({
      month,
      monthName: MONTH_NAMES[month - 1],
      avgReturn: parseFloat(avg.toFixed(2)),
      maxReturn: parseFloat(Math.max(...returns).toFixed(2)),
      minReturn: parseFloat(Math.min(...returns).toFixed(2)),
      stddev: parseFloat(Math.sqrt(variance).toFixed(2)),
      sampleSize: returns.length,
    });
  }

  const currentYearMap = monthlyByYear.get(currentYear) ?? new Map<number, number>();
  const currentYearData: Array<{ month: number; return: number }> = [];
  for (const [month, ret] of currentYearMap) {
    currentYearData.push({ month, return: parseFloat(ret.toFixed(2)) });
  }
  currentYearData.sort((a, b) => a.month - b.month);

  return {
    symbol: commodity.symbol,
    name: commodity.name,
    monthlyStats,
    currentYear: currentYearData,
  };
}
