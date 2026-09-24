// app/api/spreads/route.ts
// Computes energy crack spreads and soy crush margins from live market prices.

import { NextResponse } from 'next/server';
import { fetchMultipleQuotes } from '@/lib/yahoo';

export const revalidate = 300; // 5-minute cache

// ─── Ticker map ───────────────────────────────────────────────────────────────

const TICKERS = {
  wti: 'CL=F',          // WTI Crude Oil – $/bbl
  rbob: 'RB=F',         // RBOB Gasoline – $/gal
  heatingOil: 'HO=F',   // Heating Oil – $/gal
  natgas: 'NG=F',       // Natural Gas – $/MMBtu
  soybeans: 'ZS=F',     // Soybeans – cents/bushel
  soybeanOil: 'ZL=F',   // Soybean Oil – cents/lb
  soybeanMeal: 'ZM=F',  // Soybean Meal – $/short ton
} as const;

// ─── Spread calculations ──────────────────────────────────────────────────────

/**
 * 3-2-1 Crack Spread
 * Represents the profit from cracking 3 barrels of crude into 2 barrels of
 * gasoline and 1 barrel of heating oil.
 *
 * Formula:
 *   (2 × RBOB_$/gal × 42 + 1 × HO_$/gal × 42 − 3 × CL_$/bbl) ÷ 3
 *
 * Result: $/barrel of crude
 */
function crack321(
  clPrice: number,  // $/bbl
  rbPrice: number,  // $/gal
  hoPrice: number   // $/gal
): number {
  return (2 * rbPrice * 42 + 1 * hoPrice * 42 - 3 * clPrice) / 3;
}

/**
 * Gasoline Crack Spread (1:1)
 * Profit from cracking 1 barrel of crude into gasoline.
 *
 * Formula: RBOB_$/gal × 42 − CL_$/bbl
 * Result: $/barrel
 */
function gasolineCrack(clPrice: number, rbPrice: number): number {
  return rbPrice * 42 - clPrice;
}

/**
 * Heating Oil Crack Spread (1:1)
 * Profit from cracking 1 barrel of crude into heating oil / distillate.
 *
 * Formula: HO_$/gal × 42 − CL_$/bbl
 * Result: $/barrel
 */
function heatingOilCrack(clPrice: number, hoPrice: number): number {
  return hoPrice * 42 - clPrice;
}

/**
 * Soy Crush Margin
 * Represents the profit from crushing 1 bushel of soybeans into oil and meal.
 *
 * Conversion factors per bushel:
 *   - Soybean Oil:  ~11 lbs/bu  (ZL quoted in cents/lb → $/lb = ZL/100)
 *   - Soybean Meal: ~44 lbs/bu  (ZM quoted in $/short ton → $/lb = ZM/2000)
 *   - Soybeans:     ZS quoted in cents/bu → $/bu = ZS/100
 *
 * Formula (all in $/bushel):
 *   Crush = (ZL_cents/lb ÷ 100 × 11) + (ZM_$/ton ÷ 2000 × 44) − (ZS_cents/bu ÷ 100)
 * Result: $/bushel
 */
function soyCrush(
  zsPrice: number, // cents/bu
  zlPrice: number, // cents/lb
  zmPrice: number  // $/short ton
): number {
  const oilValue = (zlPrice / 100) * 11;         // $/bu from oil
  const mealValue = (zmPrice / 2000) * 44;        // $/bu from meal
  const beanCost = zsPrice / 100;                 // $/bu cost of beans
  return oilValue + mealValue - beanCost;
}

// ─── Route handler ────────────────────────────────────────────────────────────

interface SpreadInputs {
  wti: number;
  rbob: number;
  heatingOil: number;
  natgas: number;
  soybeans: number;
  soybeanOil: number;
  soybeanMeal: number;
}

interface SpreadResponse {
  /** 3-2-1 crack spread in $/bbl of crude */
  crack_3_2_1: number;
  /** Soy crush margin in $/bushel */
  soy_crush: number;
  /** Heating oil crack in $/bbl */
  heating_oil_crack: number;
  /** Gasoline crack in $/bbl */
  gasoline_crack: number;
  /** Raw input prices used for the calculations */
  inputs: SpreadInputs;
  /** ISO timestamp of when this was computed */
  updatedAt: string;
}

export async function GET(): Promise<NextResponse> {
  const allTickers = Object.values(TICKERS);
  const quotes = await fetchMultipleQuotes(allTickers);

  // Map friendly keys to prices; return null if a required ticker failed
  function price(ticker: string): number | null {
    const q = quotes[ticker];
    return q && q.price > 0 ? q.price : null;
  }

  const wti = price(TICKERS.wti);
  const rbob = price(TICKERS.rbob);
  const ho = price(TICKERS.heatingOil);
  const ng = price(TICKERS.natgas);
  const zs = price(TICKERS.soybeans);
  const zl = price(TICKERS.soybeanOil);
  const zm = price(TICKERS.soybeanMeal);

  // Determine which spreads we can compute (some inputs may have failed)
  const energyOk = wti !== null && rbob !== null && ho !== null;
  const soyOk = zs !== null && zl !== null && zm !== null;

  if (!energyOk && !soyOk) {
    return NextResponse.json(
      { error: 'Unable to fetch market data for spread computation' },
      { status: 503 }
    );
  }

  const inputs: SpreadInputs = {
    wti: wti ?? 0,
    rbob: rbob ?? 0,
    heatingOil: ho ?? 0,
    natgas: ng ?? 0,
    soybeans: zs ?? 0,
    soybeanOil: zl ?? 0,
    soybeanMeal: zm ?? 0,
  };

  const response: SpreadResponse = {
    crack_3_2_1: energyOk
      ? parseFloat(crack321(wti!, rbob!, ho!).toFixed(4))
      : 0,
    soy_crush: soyOk
      ? parseFloat(soyCrush(zs!, zl!, zm!).toFixed(4))
      : 0,
    heating_oil_crack: energyOk
      ? parseFloat(heatingOilCrack(wti!, ho!).toFixed(4))
      : 0,
    gasoline_crack: energyOk
      ? parseFloat(gasolineCrack(wti!, rbob!).toFixed(4))
      : 0,
    inputs,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
