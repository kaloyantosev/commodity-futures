'use client';

import React from 'react';

interface VolatilityPanelProps {
  hv10: number;   // annualized %, e.g. 18.5
  hv20: number;
  hv60: number;
}

interface HVMetric {
  key: string;
  label: string;
  sublabel: string;
  value: number;
}

function getVolatilityColor(pct: number): {
  text: string;
  bg: string;
  border: string;
  badge: string;
} {
  if (pct < 20) {
    return {
      text: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
      badge: 'LOW',
    };
  } else if (pct <= 40) {
    return {
      text: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20',
      badge: 'MODERATE',
    };
  } else {
    return {
      text: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/20',
      badge: 'HIGH',
    };
  }
}

function BarGauge({ pct }: { pct: number }) {
  // Cap the fill at 100 for visual purposes
  const fill = Math.min((pct / 80) * 100, 100);
  const colors = getVolatilityColor(pct);
  return (
    <div className="mt-3 h-1.5 w-full bg-[#1e2d4a] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          pct < 20
            ? 'bg-emerald-400'
            : pct <= 40
            ? 'bg-amber-400'
            : 'bg-red-400'
        }`}
        style={{ width: `${fill}%` }}
      />
    </div>
  );
}

function MetricCard({ metric }: { metric: HVMetric }) {
  const colors = getVolatilityColor(metric.value);
  return (
    <div
      className={[
        'flex-1 rounded-lg p-4 border',
        'bg-[#0f1629]',
        colors.border,
      ].join(' ')}
    >
      {/* Top */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-white text-xs font-bold tracking-wide">{metric.key}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">{metric.sublabel}</p>
        </div>
        <span
          className={[
            'text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wider',
            colors.text,
            colors.bg,
            colors.border,
          ].join(' ')}
        >
          {colors.badge}
        </span>
      </div>

      {/* Value */}
      <p className={['font-numeric text-2xl font-bold tabular-nums', colors.text].join(' ')}>
        {metric.value.toFixed(1)}
        <span className="text-sm ml-0.5">%</span>
      </p>

      {/* Bar gauge */}
      <BarGauge pct={metric.value} />
    </div>
  );
}

export default function VolatilityPanel({ hv10, hv20, hv60 }: VolatilityPanelProps) {
  const metrics: HVMetric[] = [
    { key: 'HV10', label: '10-Day', sublabel: '10-day historical vol', value: hv10 },
    { key: 'HV20', label: '20-Day', sublabel: '20-day historical vol', value: hv20 },
    { key: 'HV60', label: '60-Day', sublabel: '60-day historical vol', value: hv60 },
  ];

  return (
    <div className="w-full">
      {/* Panel Header */}
      <div className="mb-3">
        <p className="text-white font-semibold text-sm">Realized Volatility</p>
        <p className="text-slate-500 text-xs mt-0.5">
          Annualized historical volatility of log returns &mdash; &lt;20%&nbsp;Low · 20–40%&nbsp;Moderate · &gt;40%&nbsp;High
        </p>
      </div>

      {/* Metric Cards */}
      <div className="flex flex-col sm:flex-row gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.key} metric={m} />
        ))}
      </div>
    </div>
  );
}
