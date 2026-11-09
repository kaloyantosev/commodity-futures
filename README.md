# CommodIntel — Commodity Futures Dashboard

Live prices, forward curves, spreads, seasonality and roll dates for 14 liquid commodity futures. Next.js 15 (App Router), Recharts, data from Yahoo Finance via `yahoo-finance2`. No API keys needed.

## Pages

| Page | What it shows |
|---|---|
| **Dashboard** `/` | Front-month prices by sector, live processing spreads, upcoming roll dates |
| **Spreads** `/spreads` | 3:2:1 crack, gasoline crack, heating-oil crack and soybean crush: live value, 2-year percentile, daily history. Calendar-spread table (M1, M2, M1 − M2, annualized roll yield, 12-month curve shape) for every commodity |
| **Seasonality** `/seasonality?symbol=CL` | 10 years of month-end to month-end returns: average, median, share of up years, best/worst, this year to date |
| **Commodity** `/commodity/CL` | Price and realized volatility, forward curve with roll yield, daily M1 − M2 calendar spread from the two nearest contracts, seasonality, contract roll calendar |

## Covered markets

Energy: WTI (CL), Brent (BZ), Natural Gas (NG), RBOB (RB), Heating Oil (HO) · Metals: Gold (GC), Silver (SI), Copper (HG) · Agriculture: Corn (ZC), Wheat (ZW), Soybeans (ZS), Sugar No.11 (SB), Coffee (KC), Cocoa (CC)

## Method notes

- **No placeholder data.** If Yahoo Finance doesn't return a series, the page says it is unavailable instead of showing stand-in numbers.
- **Processing spreads** use front-month continuous futures: 3:2:1 crack = (2 × RBOB × 42 + HO × 42 − 3 × WTI) / 3 in $/bbl; soybean crush = soy oil × 11 lb + meal × 44 lb − soybeans, in $/bu.
- **Calendar spreads** use the specific contract months (e.g. `CLZ26.NYM`, `CLF27.NYM`), not the continuous series. Roll yield = (M1 / M2 − 1) × 12 / months between contracts.
- **Seasonality** uses the continuous front-month series, so roll gaps are included. For steep-curve markets (natural gas, softs) part of a monthly average can be roll effect rather than price trend.
- **Roll calendar** applies CME/NYMEX/COMEX/CBOT contract rules (WTI, natural gas, gold, silver, copper, corn, wheat, soybeans). Exchange holidays are not modelled, so a date can be a business day off around holidays.

## API routes

`/api/overview`, `/api/spreads`, `/api/curve/[symbol]`, `/api/history/[symbol]?months=24`, `/api/seasonality/[symbol]`. They share the same functions as the pages (`lib/data.ts`).

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

Deploys to Vercel as-is; pages revalidate every 5 minutes (seasonality hourly).

Not investment advice.
