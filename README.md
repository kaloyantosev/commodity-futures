# Commodity Futures Platform

An institutional-grade commodity futures analysis platform built with **Next.js 14**, providing deep market intelligence across energy, metals, and agricultural futures markets.

---

## Features

| Module | Description |
|---|---|
| **Forward Curve** | Interactive multi-contract term structure visualization with contango/backwardation detection |
| **Calendar Spreads** | Near-far month differential analysis with seasonal overlays and historical percentile rankings |
| **Processing Spreads** | Crack spreads (3-2-1, 2-1-1), crush spreads (soybean meal + oil vs. beans), and spark spreads (natural gas vs. power) |
| **Seasonality Analysis** | Multi-year seasonal price patterns with statistical confidence bands per commodity |
| **Volatility Metrics** | Realized vs. implied volatility, historical vol cones, and rolling ATR across tenors |
| **Roll Calendar** | First notice dates, last trade dates, and optimal roll windows with cost estimation |
| **COT Integration** | CFTC Commitments of Traders data with managed money positioning, net change, and extreme readings |

---

## Data Sources

| Source | Key Required | Usage |
|---|---|---|
| **yahoo-finance2** | ❌ No key needed | Futures chain quotes, OHLCV history for all listed contracts |
| **Alpha Vantage** | ✅ Free key (25 req/day) | Commodity spot prices (WTI, Brent, natural gas, precious metals, agricultural) |
| **CFTC** | ❌ Public endpoint | Weekly COT reports from `publicreporting.cftc.gov` (no registration required) |

---

## Covered Commodities

### Energy
- WTI Crude Oil (`CL=F`)
- Brent Crude Oil (`BZ=F`)
- Natural Gas (`NG=F`)
- RBOB Gasoline (`RB=F`)
- Heating Oil / ULSD (`HO=F`)

### Metals
- Gold (`GC=F`)
- Silver (`SI=F`)
- Copper (`HG=F`)

### Agricultural
- Corn (`ZC=F`)
- Wheat (`ZW=F`)
- Soybeans (`ZS=F`)
- Sugar No. 11 (`SB=F`)
- Coffee (`KC=F`)
- Cocoa (`CC=F`)

---

## Local Development

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment variable template
cp .env.example .env.local

# 3. Open .env.local and add your Alpha Vantage API key
#    Get a free key at: https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY=your_key_here

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The free Alpha Vantage tier is limited to **25 API requests per day**. All API responses are cached in Next.js Route Handler cache with a 1-hour revalidation window to stay within limits. For production, consider upgrading to a paid Alpha Vantage plan (500 req/day at $50/month) or substituting a different spot price provider.

---

## Deploying to Vercel

Vercel is the recommended deployment target — the `vercel.json` included in this repo configures API route timeouts appropriately.

1. **Fork** this repository to your own GitHub account.
2. Go to [vercel.com/new](https://vercel.com/new) and click **Import Project**.
3. Select your forked repository.
4. Under **Environment Variables**, add:
   ```
   ALPHA_VANTAGE_API_KEY = <your key>
   ```
5. Click **Deploy**.

Subsequent pushes to `main` will trigger automatic redeployments.

---

## Deploying to GitHub

```bash
# Initialize git (skip if already done)
git init

# Stage all files
git add .

# Create the initial commit
git commit -m "feat: initial commodity futures platform scaffold"

# Add your remote
git remote add origin https://github.com/<your-username>/commodity-futures-platform.git

# Push to main
git push -u origin main
```

---

## Project Structure

```
commodity-futures-platform/
├── app/
│   ├── api/                  # Next.js Route Handlers (server-side data fetching)
│   │   ├── forward-curve/
│   │   ├── spreads/
│   │   ├── seasonality/
│   │   ├── volatility/
│   │   ├── roll-calendar/
│   │   └── cot/
│   ├── (dashboard)/          # Main analysis pages
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── charts/               # Recharts-based visualization components
│   ├── ui/                   # Shared UI primitives
│   └── commodity/            # Domain-specific components
├── lib/
│   ├── yahoo-finance.ts      # yahoo-finance2 wrapper utilities
│   ├── alpha-vantage.ts      # Alpha Vantage API client
│   ├── cftc.ts               # CFTC COT data fetcher/parser
│   └── utils.ts              # General utilities (cn, formatters, etc.)
├── types/                    # Shared TypeScript types/interfaces
├── .env.example
├── .env.local                # ← create this yourself (gitignored)
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

---

## API Rate Limits & Caching Strategy

| API | Free Limit | Cache TTL |
|---|---|---|
| Alpha Vantage | 25 req/day | 60 minutes (`revalidate: 3600`) |
| yahoo-finance2 | None (scraping) | 5 minutes (`revalidate: 300`) |
| CFTC | None (public) | 24 hours (`revalidate: 86400`) |

All caching is handled via Next.js `fetch` cache with `next: { revalidate }` options inside Route Handlers — no external cache store (Redis, etc.) is required for personal use.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with a custom dark-slate design system
- **Charts:** Recharts
- **Date Handling:** date-fns v3
- **Icons:** Lucide React
- **Futures Data:** yahoo-finance2
- **Spot Prices:** Alpha Vantage REST API
- **COT Data:** CFTC public reporting API

---

## License

MIT
