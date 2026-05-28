import type { StockHolding } from '../types';
import { calcMonthDividends, type DividendCalcOptions } from './dividendCalculator';

export interface MonthlyBucket {
  month: number;
  label: string;
  grossKRW: number;
  netKRW: number;
}

export function buildMonthlyDividendSeries(
  holdings: StockHolding[],
  year: number,
  opts?: DividendCalcOptions
): MonthlyBucket[] {
  const buckets: MonthlyBucket[] = [];
  for (let m = 1; m <= 12; m++) {
    const summary = calcMonthDividends(holdings, year, m, opts);
    buckets.push({
      month: m,
      label: `${m}월`,
      grossKRW: summary.totalGrossKRW,
      netKRW: summary.totalNetKRW,
    });
  }
  return buckets;
}

export interface HoldingDividendShare {
  holdingId: string;
  symbol: string;
  name: string;
  annualNetKRW: number;
  pct: number;
}

export function buildHoldingDividendShares(
  holdings: StockHolding[],
  year: number,
  opts?: DividendCalcOptions
): HoldingDividendShare[] {
  const perHolding = holdings.map((h) => {
    let netKRW = 0;
    for (let m = 1; m <= 12; m++) {
      const month = calcMonthDividends([h], year, m, opts);
      netKRW += month.totalNetKRW;
    }
    return { holdingId: h.id, symbol: h.symbol, name: h.name, netKRW };
  });

  const total = perHolding.reduce((s, p) => s + p.netKRW, 0);

  return perHolding
    .map((p) => ({
      holdingId: p.holdingId,
      symbol: p.symbol,
      name: p.name,
      annualNetKRW: p.netKRW,
      pct: total > 0 ? (p.netKRW / total) * 100 : 0,
    }))
    .sort((a, b) => b.annualNetKRW - a.annualNetKRW);
}

export function calcHoldingAnnualDividend(
  holding: StockHolding,
  year: number,
  opts?: DividendCalcOptions
): { grossKRW: number; netKRW: number; byMonth: MonthlyBucket[] } {
  const byMonth: MonthlyBucket[] = [];
  let grossKRW = 0;
  let netKRW = 0;
  for (let m = 1; m <= 12; m++) {
    const summary = calcMonthDividends([holding], year, m, opts);
    byMonth.push({
      month: m,
      label: `${m}월`,
      grossKRW: summary.totalGrossKRW,
      netKRW: summary.totalNetKRW,
    });
    grossKRW += summary.totalGrossKRW;
    netKRW += summary.totalNetKRW;
  }
  return { grossKRW, netKRW, byMonth };
}
