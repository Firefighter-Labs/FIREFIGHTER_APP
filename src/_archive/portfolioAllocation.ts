import type { StockHolding } from '../types';
import { toKRW } from './format';

export interface HoldingAllocationSlice {
  holdingId: string;
  symbol: string;
  name: string;
  market: 'KR' | 'US';
  shares: number;
  price: number | null;
  valueKRW: number;
  /** 등록 종목 합계 대비 비중 (0–100) */
  pctOfHoldings: number;
}

export interface PortfolioAllocation {
  slices: HoldingAllocationSlice[];
  totalStockKRW: number;
  totalAssetsKRW: number;
  stockRatio: number;
  cashRatio: number;
  fromHoldings: boolean;
  pricedCount: number;
  /** 시가 없어 수량만으로 비중 추정 */
  usedShareFallback: boolean;
}

export function calcPortfolioAllocation(
  holdings: StockHolding[],
  prices: Record<string, number | null | undefined>,
  totalAssets: number,
  assetsCurrency: 'KRW' | 'USD',
  usdKrw: number
): PortfolioAllocation {
  const totalAssetsKRW =
    assetsCurrency === 'USD' ? toKRW(totalAssets, 'USD', usdKrw) : totalAssets;

  if (holdings.length === 0) {
    return {
      slices: [],
      totalStockKRW: 0,
      totalAssetsKRW,
      stockRatio: 0,
      cashRatio: 100,
      fromHoldings: false,
      pricedCount: 0,
      usedShareFallback: false,
    };
  }

  let pricedCount = 0;
  const raw: Omit<HoldingAllocationSlice, 'pctOfHoldings'>[] = holdings.map((h) => {
    const price = prices[h.id] ?? null;
    if (price != null && price > 0) pricedCount++;

    let valueKRW = 0;
    if (price != null && price > 0) {
      const notional = h.shares * price;
      valueKRW = h.market === 'US' ? toKRW(notional, 'USD', usdKrw) : notional;
    }

    return {
      holdingId: h.id,
      symbol: h.symbol,
      name: h.name,
      market: h.market,
      shares: h.shares,
      price,
      valueKRW,
    };
  });

  let usedShareFallback = false;
  let totalStockKRW = raw.reduce((s, r) => s + r.valueKRW, 0);

  if (totalStockKRW <= 0) {
    usedShareFallback = true;
    const shareSum = holdings.reduce((s, h) => s + h.shares, 0) || 1;
    for (const r of raw) {
      r.valueKRW = (r.shares / shareSum) * (totalAssetsKRW > 0 ? totalAssetsKRW : 1);
    }
    totalStockKRW = raw.reduce((s, r) => s + r.valueKRW, 0);
  }

  const slices: HoldingAllocationSlice[] = raw.map((r) => ({
    ...r,
    pctOfHoldings: totalStockKRW > 0 ? (r.valueKRW / totalStockKRW) * 100 : 0,
  }));

  let stockRatio = 100;
  let cashRatio = 0;
  if (totalAssetsKRW > 0 && totalStockKRW > 0) {
    stockRatio = Math.min(100, Math.round((totalStockKRW / totalAssetsKRW) * 100));
    cashRatio = 100 - stockRatio;
  }

  return {
    slices,
    totalStockKRW,
    totalAssetsKRW,
    stockRatio,
    cashRatio,
    fromHoldings: true,
    pricedCount,
    usedShareFallback,
  };
}

/** conic-gradient용: pct 누적 */
export function buildHoldingsConicGradient(
  slices: HoldingAllocationSlice[],
  colors: string[]
): string {
  if (slices.length === 0) return 'var(--text-muted) 0% 100%';

  let acc = 0;
  const stops: string[] = [];
  slices.forEach((s, i) => {
    const pct = Math.max(0, s.pctOfHoldings);
    if (pct <= 0) return;
    const color = colors[i % colors.length];
    const start = acc;
    acc += pct;
    stops.push(`${color} ${start}% ${acc}%`);
  });

  if (stops.length === 0) return 'var(--text-muted) 0% 100%';
  if (acc < 100) stops.push(`var(--bg-elevated) ${acc}% 100%`);
  return `conic-gradient(${stops.join(', ')})`;
}
