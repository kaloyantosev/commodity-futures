'use client';

import React from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface SpreadInputs {
  wti_crude?: number;
  rbob_gasoline?: number;
  heating_oil?: number;
  soybeans?: number;
  soy_oil?: number;
  soy_meal?: number;
  [key: string]: number | undefined;
}

interface ProcessingSpreadsProps {
  crack_3_2_1: number;
  soy_crush: number;
  heating_oil_crack: number;
  gasoline_crack: number;
  inputs: SpreadInputs;
}

// ─── Spread Card ───────────────────────────────────────────────────────────

interface SpreadCardDef {
  id: string;
  title: string;
  formula: string;
  description: string;
  getValue: (p: ProcessingSpreadsProps) => number;
  unit: string;
}

const SPREAD_CARDS: SpreadCardDef[] = [
  {
    id: '321crack',
    title: '3:2:1 Crack Spread',
    formula: '(2 × RBOB + 1 × HO − 3 × WTI) / 3',
    description:
      'Refining margin proxy: processing 3 barrels of crude into 2 gasoline + 1 heating oil.',
    getValue: (p) => p.crack_3_2_1,
    unit: '$/bbl',
  },
  {
    id: 'soycrush',
    title: 'Soybean Crush',
    formula: 'Soy Oil + Soy Meal − Soybeans',
    description:
      'Crush margin for processing soybeans into oil and meal; measures crushing profitability.',
    getValue: (p) => p.soy_crush,
    unit: '$/bu',
  },
  {
    id: 'hocrack',
    title: 'Heating Oil Crack',
    formula: 'Heating Oil − WTI Crude',
    description:
      '1:1 distillate crack spread measuring distillate refining margin vs crude cost.',
    getValue: (p) => p.heating_oil_crack,
    unit: '$/bbl',
  },
  {
    id: 'rbobcrack',
    title: 'Gasoline Crack',
    formula: 'RBOB Gasoline − WTI Crude',
    description:
      '1:1 gasoline crack spread; tracks gasoline refining profitability vs crude input.',
    getValue: (p) => p.gasoline_crack,
    unit: '$/bbl',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function SpreadCard({ def, value }: { def: SpreadCardDef; value: number }) {
  const isPositive = value >= 0;
  const valueClass = isPositive ? 'text-emerald-400' : 'text-red-400';
  const chipClass = isPositive
    ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
    : 'bg-red-400/10 text-red-400 border-red-400/20';

  return (
    <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-lg p-4 flex flex-col gap-2">
      {/* Title + value */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-white text-sm font-semibold leading-tight">{def.title}</p>
        <div className="text-right shrink-0">
          <p className={['font-numeric text-xl font-bold tabular-nums', valueClass].join(' ')}>
            {isPositive ? '+' : ''}
            {value.toFixed(2)}
          </p>
          <p className="text-slate-500 text-[10px]">{def.unit}</p>
        </div>
      </div>

      {/* Formula */}
      <div className="bg-[#0a0e1a] border border-[#1e2d4a] rounded px-2.5 py-1.5">
        <p className="font-mono text-blue-400 text-[10px] tracking-wider">{def.formula}</p>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-[11px] leading-relaxed">{def.description}</p>
    </div>
  );
}

// ─── Input Prices Footer ───────────────────────────────────────────────────

const INPUT_LABELS: Record<string, string> = {
  wti_crude: 'WTI Crude',
  rbob_gasoline: 'RBOB Gasoline',
  heating_oil: 'Heating Oil',
  soybeans: 'Soybeans',
  soy_oil: 'Soy Oil',
  soy_meal: 'Soy Meal',
};

function InputPricesFooter({ inputs }: { inputs: SpreadInputs }) {
  const entries = Object.entries(inputs).filter(
    ([k, v]) => v !== undefined && INPUT_LABELS[k],
  ) as [string, number][];

  if (entries.length === 0) return null;

  return (
    <div className="mt-4 bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg p-3">
      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest mb-2">
        Input Prices Used
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">
              {INPUT_LABELS[key] ?? key}
            </span>
            <span className="font-numeric text-white text-[11px] tabular-nums font-semibold">
              ${value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────

export default function ProcessingSpreads(props: ProcessingSpreadsProps) {
  return (
    <div className="w-full">
      {/* Section header */}
      <div className="mb-4">
        <p className="text-white font-semibold text-base">Processing Spreads</p>
        <p className="text-slate-500 text-xs mt-0.5">
          Refining & crush margins derived from front-month futures prices
        </p>
      </div>

      {/* 2×2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SPREAD_CARDS.map((def) => (
          <SpreadCard key={def.id} def={def} value={def.getValue(props)} />
        ))}
      </div>

      {/* Input prices */}
      <InputPricesFooter inputs={props.inputs} />
    </div>
  );
}
