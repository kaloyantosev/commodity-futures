'use client';

import React, { useMemo } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ExpiryRow {
  commodity: string;
  symbol: string;
  contractMonth: string;
  firstNoticeDay: Date;
  lastTradingDay: Date;
}

// ─── Date Helpers ──────────────────────────────────────────────────────────

/** Returns number of business days to add/subtract from a date */
function addBusinessDays(date: Date, n: number): Date {
  const d = new Date(date);
  let count = 0;
  const step = n >= 0 ? 1 : -1;
  while (Math.abs(count) < Math.abs(n)) {
    d.setDate(d.getDate() + step);
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += step;
  }
  return d;
}

/** Last calendar day of given month */
function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

/** Last business day of month */
function lastBusinessDayOfMonth(year: number, month: number): Date {
  const last = lastDayOfMonth(year, month);
  let d = new Date(last);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

/** Business day on or before the Nth of the month */
function nthOfMonthBizDay(year: number, month: number, day: number): Date {
  // We want 3 business days before the 25th
  const target = new Date(year, month, day);
  return addBusinessDays(target, -3);
}

/** First day of next month */
function firstDayOfNextMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 1);
}

// ─── Expiry Computation ────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_CODES = 'FGHJKMNQUVXZ'; // futures month codes

interface ContractSpec {
  commodity: string;
  symbol: string;
  /**
   * Which calendar months have listed contracts (0 = Jan … 11 = Dec).
   * null = all months.
   */
  activeMonths: number[] | null;
  getLastTradingDay: (deliveryYear: number, deliveryMonth: number) => Date;
  getFirstNoticeDay: (ltd: Date, deliveryYear: number, deliveryMonth: number) => Date;
}

const SPECS: ContractSpec[] = [
  {
    commodity: 'WTI Crude Oil',
    symbol: 'CL',
    activeMonths: null,
    getLastTradingDay: (y, m) => {
      // 3 business days before the 25th of the PRIOR month
      const priorYear = m === 0 ? y - 1 : y;
      const priorMonth = m === 0 ? 11 : m - 1;
      return nthOfMonthBizDay(priorYear, priorMonth, 25);
    },
    getFirstNoticeDay: (ltd) => ltd, // same day
  },
  {
    commodity: 'Natural Gas',
    symbol: 'NG',
    activeMonths: null,
    getLastTradingDay: (y, m) => {
      // 3 business days prior to first day of delivery month
      const firstDay = new Date(y, m, 1);
      return addBusinessDays(firstDay, -3);
    },
    getFirstNoticeDay: (ltd) => ltd,
  },
  {
    commodity: 'Gold',
    symbol: 'GC',
    activeMonths: [1, 3, 5, 7, 9, 11], // Feb Apr Jun Aug Oct Dec
    getLastTradingDay: (y, m) => {
      // 3 business days before last business day of delivery month
      const lbd = lastBusinessDayOfMonth(y, m);
      return addBusinessDays(lbd, -3);
    },
    getFirstNoticeDay: (ltd) => addBusinessDays(ltd, -1),
  },
  {
    commodity: 'Silver',
    symbol: 'SI',
    activeMonths: [2, 4, 6, 8, 11], // Mar May Jul Sep Dec
    getLastTradingDay: (y, m) => {
      const lbd = lastBusinessDayOfMonth(y, m);
      return addBusinessDays(lbd, -3);
    },
    getFirstNoticeDay: (ltd) => addBusinessDays(ltd, -1),
  },
  {
    commodity: 'Corn',
    symbol: 'ZC',
    activeMonths: [2, 4, 6, 8, 11], // Mar May Jul Sep Dec
    getLastTradingDay: (y, m) => {
      // 2 business days before last business day of the month
      const lbd = lastBusinessDayOfMonth(y, m);
      return addBusinessDays(lbd, -2);
    },
    getFirstNoticeDay: (ltd) => addBusinessDays(ltd, -1),
  },
  {
    commodity: 'Wheat',
    symbol: 'ZW',
    activeMonths: [2, 4, 6, 8, 11],
    getLastTradingDay: (y, m) => {
      const lbd = lastBusinessDayOfMonth(y, m);
      return addBusinessDays(lbd, -2);
    },
    getFirstNoticeDay: (ltd) => addBusinessDays(ltd, -1),
  },
  {
    commodity: 'Soybeans',
    symbol: 'ZS',
    activeMonths: [0, 2, 4, 6, 7, 9, 10], // Jan Mar May Jul Aug Sep Nov
    getLastTradingDay: (y, m) => {
      const lbd = lastBusinessDayOfMonth(y, m);
      return addBusinessDays(lbd, -2);
    },
    getFirstNoticeDay: (ltd) => addBusinessDays(ltd, -1),
  },
];

function generateUpcoming(specList: ContractSpec[], count: number, now: Date): ExpiryRow[] {
  const rows: ExpiryRow[] = [];
  // Look ahead 18 months
  for (let offset = 0; offset <= 18 && rows.length < 50; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = d.getMonth();

    for (const spec of specList) {
      if (spec.activeMonths && !spec.activeMonths.includes(month)) continue;

      const ltd = spec.getLastTradingDay(year, month);
      if (ltd <= now) continue;

      const fnd = spec.getFirstNoticeDay(ltd, year, month);
      const contractMonth = `${MONTH_NAMES[month]} ${year}`;

      rows.push({
        commodity: spec.commodity,
        symbol: spec.symbol,
        contractMonth,
        firstNoticeDay: fnd < ltd ? fnd : ltd,
        lastTradingDay: ltd,
      });
    }
  }

  // Sort by LTD ascending
  rows.sort((a, b) => a.lastTradingDay.getTime() - b.lastTradingDay.getTime());
  return rows.slice(0, count);
}

// ─── Urgency Badge ─────────────────────────────────────────────────────────

function daysUntil(date: Date, now: Date): number {
  return Math.round((date.getTime() - now.getTime()) / 86_400_000);
}

function UrgencyBadge({ days }: { days: number }) {
  let cls = '';
  let label = `${days}d`;
  if (days < 7) {
    cls = 'bg-red-400/10 text-red-400 border border-red-400/20';
  } else if (days <= 30) {
    cls = 'bg-amber-400/10 text-amber-400 border border-amber-400/20';
  } else {
    cls = 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20';
  }
  return (
    <span className={['text-[10px] font-bold px-1.5 py-0.5 rounded font-numeric tabular-nums', cls].join(' ')}>
      {label}
    </span>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function RollCalendar() {
  const now = useMemo(() => new Date(), []);
  const rows = useMemo(() => generateUpcoming(SPECS, 12, now), [now]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <p className="text-white font-semibold text-base">Roll Calendar</p>
        <p className="text-slate-500 text-xs mt-0.5">
          Upcoming futures contract expiry dates · color coded by days remaining
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-[10px]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-slate-400">&lt;7 days</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-slate-400">7–30 days</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">&gt;30 days</span>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[#1e2d4a]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#0a0e1a] border-b border-[#1e2d4a]">
              <th className="text-left px-4 py-2.5 text-slate-500 font-semibold tracking-wide">
                Commodity
              </th>
              <th className="text-left px-3 py-2.5 text-slate-500 font-semibold tracking-wide">
                Contract
              </th>
              <th className="text-left px-3 py-2.5 text-slate-500 font-semibold tracking-wide hidden sm:table-cell">
                First Notice Day
              </th>
              <th className="text-left px-3 py-2.5 text-slate-500 font-semibold tracking-wide">
                Last Trading Day
              </th>
              <th className="text-right px-4 py-2.5 text-slate-500 font-semibold tracking-wide">
                Days
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2d4a]">
            {rows.map((row, i) => {
              const days = daysUntil(row.lastTradingDay, now);
              const rowHover = 'hover:bg-white/[0.02] transition-colors';
              return (
                <tr key={`${row.symbol}-${row.contractMonth}-${i}`} className={rowHover}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">
                        {row.symbol}
                      </span>
                      <span className="text-white font-medium">{row.commodity}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">{row.contractMonth}</td>
                  <td className="px-3 py-2.5 text-slate-400 hidden sm:table-cell">
                    {formatDate(row.firstNoticeDay)}
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">{formatDate(row.lastTradingDay)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <UrgencyBadge days={days} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
