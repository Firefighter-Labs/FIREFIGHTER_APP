import type { Holding } from '../types';
import {
  holdingCostBasisKRW,
  holdingMarketValueKRW,
} from './holdingMoney';

const CHART_COLORS = ['#3182f6', '#7c5cfc', '#14b8a6', '#ffb020', '#f04452', '#00c471'];

export function portfolioTotals(holdings: Holding[], usdKrw: number) {
  const totalMarket = holdings.reduce((s, h) => s + holdingMarketValueKRW(h, usdKrw), 0);
  const totalCost = holdings.reduce((s, h) => s + holdingCostBasisKRW(h, usdKrw), 0);
  return { totalMarket, totalCost, profit: totalMarket - totalCost };
}

export function sortedByMarketValue(holdings: Holding[], usdKrw: number): Holding[] {
  return [...holdings].sort(
    (a, b) => holdingMarketValueKRW(b, usdKrw) - holdingMarketValueKRW(a, usdKrw)
  );
}

export type AllocationSlice = {
  id: string;
  label: string;
  symbol?: string;
  value: number;
  pct: number;
  color: string;
  changePct: number | null;
};

export function buildAllocationSlices(
  holdings: Holding[],
  usdKrw: number,
  base?: number
): { slices: AllocationSlice[]; total: number } {
  const { totalMarket } = portfolioTotals(holdings, usdKrw);
  const total = base && base > 0 ? base : totalMarket;
  const sorted = sortedByMarketValue(holdings, usdKrw).filter(
    (h) => holdingMarketValueKRW(h, usdKrw) > 0
  );
  const slices = sorted.map((h, i) => {
    const mv = holdingMarketValueKRW(h, usdKrw);
    const cost = holdingCostBasisKRW(h, usdKrw);
    const changePct = cost > 0 ? ((mv - cost) / cost) * 100 : null;
    return {
      id: h.id,
      label: h.name,
      symbol: h.symbol,
      value: mv,
      pct: total > 0 ? (mv / total) * 100 : 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
      changePct,
    };
  });
  return { slices, total };
}

export function conicGradientFromSlices(slices: AllocationSlice[]): string {
  if (slices.length === 0) return '#e8eaed';
  let cursor = 0;
  const stops = slices.map((s) => {
    const start = cursor;
    cursor += s.pct;
    return `${s.color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}
