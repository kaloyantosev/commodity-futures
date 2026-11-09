// lib/data.ts
// Data functions shared by Server Components and API routes.
// Rule: everything returned here comes from market data. When an input is missing the
// value is null and the UI shows "unavailable" — no placeholder prices are substituted.

import { COMMODITIES, getCommodity } from '@/lib/commodities';
import {
  fetchQuote,
  fetchMultipleQuotes,
  fetchForwardCurve,
  fetchHistorical,
  type CurvePoint,
  type HistoricalPoint,
} from '@/lib/yahoo';

// ─── Overview ─────────────────────────────────────────────────────────────────

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

const SECTOR_ORDER: Record<string, number> = { Energy: 0, Metals: 1, Agriculture: 2 };

export async function getOverviewData(): Promise<OverviewItem[]> {
  const settled = await Promise.allSettled(COMMODITIES.map((c) => fetchQuote(c.yahooFrontMonth)));
  const items: OverviewItem[] = [];
  COMMODITIES.forEach((commodity, i) => {
    const r = settled[i];
    if (r.status !== 'fulfilled' || !r.value) return;
    items.push({
      symbol: commodity.symbol,
      name: commodity.name,
      sector: commodity.sector as OverviewItem['sector'],
      color: commodity.color,
      unit: commodity.unit,
      price: r.value.price,
      change: r.value.change,
      changePercent: r.value.changePercent,
    });
  });
  items.sort((a, b) => (SECTOR_ORDER[a.sector] ?? 99) - (SECTOR_ORDER[b.sector] ?? 99) || a.name.localeCompare(b.name));
  return items;
}

// ─── Processing spreads ───────────────────────────────────────────────────────

const SPREAD_TICKERS = {
  wti: 'CL=F',          // $/bbl
  rbob: 'RB=F',         // $/gal
  heatingOil: 'HO=F',   // $/gal
  soybeans: 'ZS=F',     // cents/bu
  soybeanOil: 'ZL=F',   // cents/lb
  soybeanMeal: 'ZM=F',  // $/short ton
} as const;

type SpreadKey = 'crack_3_2_1' | 'gasoline_crack' | 'heating_oil_crack' | 'soy_crush';
type Px = Partial<Record<keyof typeof SPREAD_TICKERS, number>>;

/** All results in $/bbl of crude, except soy crush in $/bu of soybeans. */
function computeSpreads(p: Px): Record<SpreadKey, number | null> {
  const energy = p.wti != null && p.rbob != null && p.heatingOil != null;
  const soy = p.soybeans != null && p.soybeanOil != null && p.soybeanMeal != null;
  return {
    crack_3_2_1: energy ? (2 * p.rbob! * 42 + p.heatingOil! * 42 - 3 * p.wti!) / 3 : null,
    gasoline_crack: p.wti != null && p.rbob != null ? p.rbob * 42 - p.wti : null,
    heating_oil_crack: p.wti != null && p.heatingOil != null ? p.heatingOil * 42 - p.wti : null,
    // 1 bu (60 lb) yields ~11 lb oil and ~44 lb meal (CBOT board-crush convention)
    soy_crush: soy ? (p.soybeanOil! / 100) * 11 + (p.soybeanMeal! / 2000) * 44 - p.soybeans! / 100 : null,
  };
}

const round = (v: number | null, d = 2) => (v == null ? null : parseFloat(v.toFixed(d)));

export interface SpreadsResponse {
  crack_3_2_1: number | null;
  soy_crush: number | null;
  heating_oil_crack: number | null;
  gasoline_crack: number | null;
  inputs: Record<string, number | undefined>;
  updatedAt: string;
}

export async function getSpreadsData(): Promise<SpreadsResponse> {
  const quotes = await fetchMultipleQuotes(Object.values(SPREAD_TICKERS));
  const p: Px = {};
  for (const [k, t] of Object.entries(SPREAD_TICKERS)) {
    const q = quotes[t];
    if (q && q.price > 0) p[k as keyof Px] = q.price;
  }
  const s = computeSpreads(p);
  return {
    crack_3_2_1: round(s.crack_3_2_1),
    soy_crush: round(s.soy_crush),
    gasoline_crack: round(s.gasoline_crack),
    heating_oil_crack: round(s.heating_oil_crack),
    inputs: {
      wti_crude: p.wti,
      rbob_gasoline: p.rbob,
      heating_oil: p.heatingOil,
      soybeans: p.soybeans != null ? p.soybeans / 100 : undefined,
      soy_oil: p.soybeanOil != null ? p.soybeanOil / 100 : undefined,
      soy_meal: p.soybeanMeal,
    },
    updatedAt: new Date().toISOString(),
  };
}

export interface SpreadHistory {
  key: SpreadKey;
  points: Array<{ date: string; value: number }>;
  current: number | null;
  percentile: number | null; // where the latest value sits in the period, 0-100
  min: number | null;
  max: number | null;
  median: number | null;
}

/** Daily history of each processing spread from front-month closes, aligned by date. */
export async function getSpreadHistories(months = 24): Promise<SpreadHistory[]> {
  const entries = Object.entries(SPREAD_TICKERS) as Array<[keyof Px, string]>;
  const series = await Promise.all(entries.map(([, t]) => fetchHistorical(t, months)));
  const byDate = new Map<string, Px>();
  entries.forEach(([k], i) => {
    for (const pt of series[i]) {
      if (!byDate.has(pt.date)) byDate.set(pt.date, {});
      byDate.get(pt.date)![k] = pt.close;
    }
  });
  const dates = [...byDate.keys()].sort();
  const keys: SpreadKey[] = ['crack_3_2_1', 'gasoline_crack', 'heating_oil_crack', 'soy_crush'];
  return keys.map((key) => {
    const points: Array<{ date: string; value: number }> = [];
    for (const d of dates) {
      const v = computeSpreads(byDate.get(d)!)[key];
      if (v != null && Number.isFinite(v)) points.push({ date: d, value: parseFloat(v.toFixed(3)) });
    }
    if (!points.length) return { key, points, current: null, percentile: null, min: null, max: null, median: null };
    const vals = points.map((p) => p.value);
    const sorted = [...vals].sort((a, b) => a - b);
    const cur = vals[vals.length - 1];
    return {
      key,
      points,
      current: cur,
      percentile: Math.round((sorted.filter((v) => v < cur).length / sorted.length) * 100),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
    };
  });
}

// ─── Forward curve ────────────────────────────────────────────────────────────

export type CurveShape = 'contango' | 'backwardation' | 'flat';

export interface CurveResponse {
  symbol: string;
  name: string;
  unit: string;
  curveShape: CurveShape;
  /** Annualized % from holding M1 vs M2: positive in backwardation, negative in contango */
  rollYield: number | null;
  /** M1 − M2 in price units */
  m1m2: number | null;
  points: CurvePoint[];
  frontPrice: number;
  frontChange: number;
  frontChangePercent: number;
}

function monthsBetween(a: string, b: string): number {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

export async function getCurveData(symbol: string): Promise<CurveResponse | null> {
  const commodity = getCommodity(symbol);
  if (!commodity) return null;

  const [curvePoints, frontQuote] = await Promise.all([
    fetchForwardCurve(commodity.symbol),
    fetchQuote(commodity.yahooFrontMonth),
  ]);
  if (curvePoints.length === 0 && !frontQuote) return null;

  let curveShape: CurveShape = 'flat';
  let rollYield: number | null = null;
  let m1m2: number | null = null;

  if (curvePoints.length >= 2) {
    const [m1, m2] = curvePoints;
    const back = curvePoints[curvePoints.length - 1].price;
    if (Math.abs(back - m1.price) / m1.price >= 0.005) curveShape = back > m1.price ? 'contango' : 'backwardation';
    m1m2 = parseFloat((m1.price - m2.price).toFixed(4));
    const gap = Math.max(1, monthsBetween(m1.deliveryDate, m2.deliveryDate));
    // (M1/M2 − 1) is the return from rolling over `gap` months; scale to a year.
    rollYield = parseFloat((((m1.price / m2.price) - 1) * (12 / gap) * 100).toFixed(2));
  }

  return {
    symbol: commodity.symbol,
    name: commodity.name,
    unit: commodity.unit,
    curveShape,
    rollYield,
    m1m2,
    points: curvePoints,
    frontPrice: frontQuote?.price ?? curvePoints[0]?.price ?? 0,
    frontChange: frontQuote?.change ?? 0,
    frontChangePercent: frontQuote?.changePercent ?? 0,
  };
}

/** Daily M1 − M2 for the two nearest live contracts (real contract histories, not the continuous series). */
export async function getCalendarSpreadHistory(
  points: CurvePoint[],
  months = 6
): Promise<{ label: string; data: Array<{ date: string; spread: number }> } | null> {
  if (points.length < 2) return null;
  const [m1, m2] = points;
  const [h1, h2] = await Promise.all([fetchHistorical(m1.ticker, months), fetchHistorical(m2.ticker, months)]);
  const second = new Map(h2.map((p) => [p.date, p.close]));
  const data = h1
    .filter((p) => second.has(p.date))
    .map((p) => ({ date: p.date, spread: parseFloat((p.close - second.get(p.date)!).toFixed(4)) }));
  if (!data.length) return null;
  return { label: `${m1.month} − ${m2.month}`, data };
}

export interface CalendarRow {
  symbol: string;
  name: string;
  sector: string;
  unit: string;
  m1: CurvePoint | null;
  m2: CurvePoint | null;
  m1m2: number | null;
  rollYield: number | null;
  curveShape: CurveShape | null;
}

export async function getCalendarSpreadTable(): Promise<CalendarRow[]> {
  const curves = await Promise.all(COMMODITIES.map((c) => getCurveData(c.symbol).catch(() => null)));
  return COMMODITIES.map((c, i) => {
    const cv = curves[i];
    return {
      symbol: c.symbol,
      name: c.name,
      sector: c.sector,
      unit: c.unit,
      m1: cv?.points[0] ?? null,
      m2: cv?.points[1] ?? null,
      m1m2: cv?.m1m2 ?? null,
      rollYield: cv?.rollYield ?? null,
      curveShape: cv && cv.points.length >= 2 ? cv.curveShape : null,
    };
  });
}

// ─── History & volatility ─────────────────────────────────────────────────────

export interface HistoryResponse {
  symbol: string;
  name: string;
  unit: string;
  data: HistoricalPoint[];
  volatility: { hv10: number; hv20: number; hv60: number };
}

function historicalVolatility(closes: number[], window: number): number {
  if (closes.length < window + 1) return 0;
  const recent = closes.slice(-(window + 1));
  const r: number[] = [];
  for (let i = 1; i < recent.length; i++) if (recent[i - 1] > 0 && recent[i] > 0) r.push(Math.log(recent[i] / recent[i - 1]));
  if (r.length < 2) return 0;
  const m = r.reduce((s, x) => s + x, 0) / r.length;
  const v = r.reduce((s, x) => s + (x - m) ** 2, 0) / (r.length - 1);
  return parseFloat((Math.sqrt(v) * Math.sqrt(252)).toFixed(4));
}

export async function getHistoryData(symbol: string, months = 24): Promise<HistoryResponse | null> {
  const commodity = getCommodity(symbol);
  if (!commodity) return null;
  const data = await fetchHistorical(commodity.yahooFrontMonth, Math.max(months, 6));
  if (data.length === 0) return null;
  const closes = data.map((d) => d.close);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return {
    symbol: commodity.symbol,
    name: commodity.name,
    unit: commodity.unit,
    data: data.filter((d) => d.date >= cutoffStr),
    volatility: {
      hv10: historicalVolatility(closes, 10),
      hv20: historicalVolatility(closes, 20),
      hv60: historicalVolatility(closes, 60),
    },
  };
}

// ─── Seasonality ──────────────────────────────────────────────────────────────

export interface MonthStat {
  month: number;
  monthName: string;
  avgReturn: number;
  medianReturn: number;
  winRate: number; // % of years the month closed higher
  maxReturn: number;
  minReturn: number;
  stddev: number;
  sampleSize: number;
}

export interface SeasonalityResponse {
  symbol: string;
  name: string;
  years: number[];
  monthlyStats: MonthStat[];
  currentYear: Array<{ month: number; return: number; partial?: boolean }>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SEASONALITY_YEARS = 10;

/**
 * Monthly returns are month-end close to month-end close (the first month of the series
 * has no prior close and is skipped). The front-month continuous series includes roll
 * gaps, so averages for steep-curve markets (natural gas, softs) carry some roll effect.
 */
export async function getSeasonalityData(symbol: string): Promise<SeasonalityResponse | null> {
  const commodity = getCommodity(symbol);
  if (!commodity) return null;

  const data = await fetchHistorical(commodity.yahooFrontMonth, SEASONALITY_YEARS * 12 + 13);
  if (data.length === 0) return null;

  // Last close of each calendar month, in order
  const monthEnd: Array<{ year: number; month: number; close: number; date: string }> = [];
  for (const p of data) {
    const year = Number(p.date.slice(0, 4));
    const month = Number(p.date.slice(5, 7));
    const last = monthEnd[monthEnd.length - 1];
    if (last && last.year === year && last.month === month) {
      last.close = p.close;
      last.date = p.date;
    } else {
      monthEnd.push({ year, month, close: p.close, date: p.date });
    }
  }

  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const byMonth = new Map<number, number[]>(Array.from({ length: 12 }, (_, i) => [i + 1, []]));
  const yearsSeen = new Set<number>();
  const currentYear: SeasonalityResponse['currentYear'] = [];

  for (let i = 1; i < monthEnd.length; i++) {
    const prev = monthEnd[i - 1], cur = monthEnd[i];
    if (prev.close <= 0) continue;
    const ret = (cur.close / prev.close - 1) * 100;
    if (cur.year === thisYear) {
      currentYear.push({ month: cur.month, return: parseFloat(ret.toFixed(2)), partial: cur.month === thisMonth });
    } else if (cur.year >= thisYear - SEASONALITY_YEARS) {
      byMonth.get(cur.month)!.push(ret);
      yearsSeen.add(cur.year);
    }
  }

  const monthlyStats: MonthStat[] = [];
  for (let m = 1; m <= 12; m++) {
    const r = byMonth.get(m)!;
    if (!r.length) {
      monthlyStats.push({ month: m, monthName: MONTH_NAMES[m - 1], avgReturn: 0, medianReturn: 0, winRate: 0, maxReturn: 0, minReturn: 0, stddev: 0, sampleSize: 0 });
      continue;
    }
    const sorted = [...r].sort((a, b) => a - b);
    const avg = r.reduce((a, b) => a + b, 0) / r.length;
    const med = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const sd = r.length > 1 ? Math.sqrt(r.reduce((s, x) => s + (x - avg) ** 2, 0) / (r.length - 1)) : 0;
    monthlyStats.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      avgReturn: parseFloat(avg.toFixed(2)),
      medianReturn: parseFloat(med.toFixed(2)),
      winRate: Math.round((r.filter((x) => x > 0).length / r.length) * 100),
      maxReturn: parseFloat(sorted[sorted.length - 1].toFixed(2)),
      minReturn: parseFloat(sorted[0].toFixed(2)),
      stddev: parseFloat(sd.toFixed(2)),
      sampleSize: r.length,
    });
  }

  return {
    symbol: commodity.symbol,
    name: commodity.name,
    years: [...yearsSeen].sort(),
    monthlyStats,
    currentYear,
  };
}
