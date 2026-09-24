// lib/commodities.ts
// Commodity configuration for CME/NYMEX/COMEX/CBOT futures

export type Exchange = 'NYM' | 'CMX' | 'CBT' | 'NYB';
export type Sector = 'Energy' | 'Metals' | 'Agriculture' | 'Livestock';

export interface Commodity {
  /** CME root symbol, e.g. 'CL' */
  symbol: string;
  /** Human-readable name */
  name: string;
  /** Yahoo Finance front-month ticker, e.g. 'CL=F' */
  yahooFrontMonth: string;
  /** Exchange this commodity trades on */
  exchange: Exchange;
  /** Market sector */
  sector: Sector;
  /** Unit of measure */
  unit: string;
  /** Hex color for charts */
  color: string;
  /** Month codes of listed contract months */
  contractMonths: string[];
}

// All 12 calendar months
const ALL_MONTHS = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];

export const COMMODITIES: Commodity[] = [
  // ─── Energy ───────────────────────────────────────────────────────────────
  {
    symbol: 'CL',
    name: 'WTI Crude Oil',
    yahooFrontMonth: 'CL=F',
    exchange: 'NYM',
    sector: 'Energy',
    unit: 'bbl',
    color: '#f59e0b',
    contractMonths: ALL_MONTHS,
  },
  {
    symbol: 'BZ',
    name: 'Brent Crude',
    yahooFrontMonth: 'BZ=F',
    exchange: 'NYM',
    sector: 'Energy',
    unit: 'bbl',
    color: '#ef4444',
    contractMonths: ALL_MONTHS,
  },
  {
    symbol: 'NG',
    name: 'Natural Gas',
    yahooFrontMonth: 'NG=F',
    exchange: 'NYM',
    sector: 'Energy',
    unit: 'MMBtu',
    color: '#3b82f6',
    contractMonths: ALL_MONTHS,
  },
  {
    symbol: 'RB',
    name: 'RBOB Gasoline',
    yahooFrontMonth: 'RB=F',
    exchange: 'NYM',
    sector: 'Energy',
    unit: 'gal',
    color: '#8b5cf6',
    contractMonths: ALL_MONTHS,
  },
  {
    symbol: 'HO',
    name: 'Heating Oil',
    yahooFrontMonth: 'HO=F',
    exchange: 'NYM',
    sector: 'Energy',
    unit: 'gal',
    color: '#ec4899',
    contractMonths: ALL_MONTHS,
  },

  // ─── Metals ───────────────────────────────────────────────────────────────
  {
    symbol: 'GC',
    name: 'Gold',
    yahooFrontMonth: 'GC=F',
    exchange: 'CMX',
    sector: 'Metals',
    unit: 'troy oz',
    color: '#fbbf24',
    contractMonths: ['G', 'J', 'M', 'Q', 'V', 'Z'],
  },
  {
    symbol: 'SI',
    name: 'Silver',
    yahooFrontMonth: 'SI=F',
    exchange: 'CMX',
    sector: 'Metals',
    unit: 'troy oz',
    color: '#9ca3af',
    contractMonths: ['H', 'K', 'N', 'U', 'Z'],
  },
  {
    symbol: 'HG',
    name: 'Copper',
    yahooFrontMonth: 'HG=F',
    exchange: 'CMX',
    sector: 'Metals',
    unit: 'lb',
    color: '#b45309',
    contractMonths: ['H', 'K', 'N', 'U', 'Z'],
  },

  // ─── Agriculture ──────────────────────────────────────────────────────────
  {
    symbol: 'ZC',
    name: 'Corn',
    yahooFrontMonth: 'ZC=F',
    exchange: 'CBT',
    sector: 'Agriculture',
    unit: 'bu',
    color: '#84cc16',
    contractMonths: ['H', 'K', 'N', 'U', 'Z'],
  },
  {
    symbol: 'ZW',
    name: 'Wheat',
    yahooFrontMonth: 'ZW=F',
    exchange: 'CBT',
    sector: 'Agriculture',
    unit: 'bu',
    color: '#d97706',
    contractMonths: ['H', 'K', 'N', 'U', 'Z'],
  },
  {
    symbol: 'ZS',
    name: 'Soybeans',
    yahooFrontMonth: 'ZS=F',
    exchange: 'CBT',
    sector: 'Agriculture',
    unit: 'bu',
    color: '#65a30d',
    contractMonths: ['F', 'H', 'K', 'N', 'Q', 'U', 'X'],
  },
  {
    symbol: 'SB',
    name: 'Sugar No.11',
    yahooFrontMonth: 'SB=F',
    exchange: 'NYB',
    sector: 'Agriculture',
    unit: 'lb',
    color: '#f472b6',
    contractMonths: ['H', 'K', 'N', 'V'],
  },
  {
    symbol: 'KC',
    name: 'Coffee',
    yahooFrontMonth: 'KC=F',
    exchange: 'NYB',
    sector: 'Agriculture',
    unit: 'lb',
    color: '#92400e',
    contractMonths: ['H', 'K', 'N', 'U', 'Z'],
  },
  {
    symbol: 'CC',
    name: 'Cocoa',
    yahooFrontMonth: 'CC=F',
    exchange: 'NYB',
    sector: 'Agriculture',
    unit: 'MT',
    color: '#6b3a2a',
    contractMonths: ['H', 'K', 'N', 'U', 'Z'],
  },
];

// ─── Month code maps ──────────────────────────────────────────────────────────

/** Maps futures month codes to calendar month numbers (1-based) */
export const MONTH_CODE_MAP: Record<string, number> = {
  F: 1,  // January
  G: 2,  // February
  H: 3,  // March
  J: 4,  // April
  K: 5,  // May
  M: 6,  // June
  N: 7,  // July
  Q: 8,  // August
  U: 9,  // September
  V: 10, // October
  X: 11, // November
  Z: 12, // December
};

/** Maps calendar month numbers (1-based) to futures month codes */
export const MONTH_NUMBER_TO_CODE: Record<number, string> = Object.fromEntries(
  Object.entries(MONTH_CODE_MAP).map(([code, num]) => [num, code])
);

// ─── Exchange suffix map ──────────────────────────────────────────────────────

/** Yahoo Finance exchange suffixes */
export const EXCHANGE_SUFFIX: Record<Exchange, string> = {
  NYM: '.NYM',
  CMX: '.CMX',
  CBT: '.CBT',
  NYB: '.NYB',
};

// ─── Sectors ──────────────────────────────────────────────────────────────────

export const SECTORS = ['Energy', 'Metals', 'Agriculture'] as const;

// ─── Utility functions ────────────────────────────────────────────────────────

/**
 * Look up a commodity by its root symbol (case-insensitive).
 */
export function getCommodity(symbol: string): Commodity | undefined {
  return COMMODITIES.find(
    (c) => c.symbol.toUpperCase() === symbol.toUpperCase()
  );
}

/**
 * Generate the next `count` upcoming contract ticker symbols in Yahoo Finance
 * format (e.g. 'CLZ24.NYM').
 *
 * The function walks forward from the current month and builds the list of
 * contract delivery months that are listed for this commodity, then formats
 * them as Yahoo Finance expects: <ROOT><MONTH_CODE><2-digit-year>.<EXCHANGE>.
 *
 * @param symbol         CME root symbol (e.g. 'CL')
 * @param exchange       Exchange code (e.g. 'NYM')
 * @param contractMonths Array of month codes traded (e.g. ['F','H','K','N','Q','U','X'])
 * @param count          How many contracts to return
 * @param referenceDate  Optional reference date (defaults to today)
 */
export function generateContractTickers(
  symbol: string,
  exchange: Exchange,
  contractMonths: string[],
  count: number,
  referenceDate?: Date
): string[] {
  const suffix = EXCHANGE_SUFFIX[exchange];
  const now = referenceDate ?? new Date();

  // We start looking from the current month forward.
  // "Upcoming" means delivery month >= current month (we include the current
  // month because many front-month contracts are still actively traded even
  // into their delivery month for the first couple of weeks).
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-based

  const tickers: string[] = [];

  // Sort the contract months by their calendar month number so we iterate in order.
  const sortedMonthCodes = [...contractMonths].sort(
    (a, b) => MONTH_CODE_MAP[a] - MONTH_CODE_MAP[b]
  );

  // Walk forward up to 3 years to collect `count` contracts
  const maxYears = 3;
  const startYear = year;

  while (tickers.length < count && year <= startYear + maxYears) {
    for (const code of sortedMonthCodes) {
      const contractMonth = MONTH_CODE_MAP[code];
      // Skip months that are already past in the current year
      if (year === startYear && contractMonth < month) {
        continue;
      }

      const twoDigitYear = String(year).slice(-2);
      tickers.push(`${symbol}${code}${twoDigitYear}${suffix}`);

      if (tickers.length >= count) break;
    }
    year++;
  }

  return tickers;
}
