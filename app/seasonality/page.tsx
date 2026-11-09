import React from 'react';
import Link from 'next/link';
import SeasonalityChart from '@/components/SeasonalityChart';
import { COMMODITIES, SECTORS, getCommodity } from '@/lib/commodities';
import { getSeasonalityData } from '@/lib/data';

export const revalidate = 3600;

export const metadata = {
  title: 'Seasonality | CommodIntel',
  description: 'Monthly seasonal return patterns for commodity futures: average, median and share of up years.',
};

interface PageProps {
  searchParams: Promise<{ symbol?: string }>;
}

export default async function SeasonalityPage({ searchParams }: PageProps) {
  const { symbol: raw } = await searchParams;
  const commodity = getCommodity(raw ?? 'CL') ?? getCommodity('CL')!;
  const data = await getSeasonalityData(commodity.symbol).catch(() => null);

  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Seasonality</h1>
        <p className="text-slate-400 text-sm mt-1">
          How each commodity has tended to move in each calendar month over the last 10 years.
        </p>
      </div>

      <div className="space-y-2">
        {SECTORS.map((sector) => (
          <div key={sector} className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest w-24">{sector}</span>
            {COMMODITIES.filter((c) => c.sector === sector).map((c) => {
              const active = c.symbol === commodity.symbol;
              return (
                <Link
                  key={c.symbol}
                  href={`/seasonality?symbol=${c.symbol}`}
                  scroll={false}
                  className={[
                    'px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors',
                    active
                      ? 'bg-blue-400/15 text-blue-300 border-blue-400/40'
                      : 'text-slate-400 border-[#1e2d4a] hover:text-white hover:border-slate-500',
                  ].join(' ')}
                >
                  {c.name}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <section className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-semibold">
            {commodity.name} <span className="text-slate-500 font-mono text-xs ml-1">{commodity.yahooFrontMonth}</span>
          </p>
          <Link href={`/commodity/${commodity.symbol}`} className="text-blue-400 text-xs hover:underline">
            Open {commodity.symbol} detail →
          </Link>
        </div>
        {data ? (
          <SeasonalityChart {...data} />
        ) : (
          <p className="text-slate-500 text-sm py-10 text-center">
            Seasonality is unavailable right now (Yahoo Finance did not return history). Try again in a few minutes.
          </p>
        )}
      </section>
    </main>
  );
}
