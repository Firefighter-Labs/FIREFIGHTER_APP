import type { Holding } from '../types';
import { krwToUsd, usdToKrw } from '../services/exchangeRateService';

export function isUsdHolding(h: Holding): boolean {
  return h.market === 'US';
}

/** 주당 연간 배당 (원) */
export function holdingAnnualDividendPerShareKRW(h: Holding, usdKrw: number): number {
  if (isUsdHolding(h) && h.annualDividendUSD != null && h.annualDividendUSD > 0) {
    return usdToKrw(h.annualDividendUSD, usdKrw);
  }
  return Math.max(0, h.annualDividendKRW || 0);
}

export function holdingMarketValueKRW(h: Holding, usdKrw: number): number {
  if (isUsdHolding(h) && h.marketValueUSD != null && h.marketValueUSD > 0) {
    return usdToKrw(h.marketValueUSD, usdKrw);
  }
  return h.marketValueKRW ?? 0;
}

export function holdingCostBasisKRW(h: Holding, usdKrw: number): number {
  if (isUsdHolding(h) && h.costBasisUSD != null && h.costBasisUSD > 0) {
    return usdToKrw(h.costBasisUSD, usdKrw);
  }
  return h.costBasisKRW ?? 0;
}

export function holdingAvgCostKRW(h: Holding, usdKrw: number): number {
  const shares = h.shares != null && h.shares > 0 ? h.shares : 0;
  if (shares <= 0) return 0;
  return Math.round(holdingCostBasisKRW(h, usdKrw) / shares);
}

export function holdingAvgCostNative(h: Holding, usdKrw: number): number {
  const shares = h.shares != null && h.shares > 0 ? h.shares : 0;
  if (shares <= 0) return 0;
  if (isUsdHolding(h) && h.costBasisUSD != null && h.costBasisUSD > 0) {
    return Math.round((h.costBasisUSD / shares) * 100) / 100;
  }
  return Math.round(holdingCostBasisKRW(h, usdKrw) / shares);
}

/** 폼·저장용 USD 금액 (레거시 KRW만 있으면 역산) */
export function holdingAnnualDividendUSD(h: Holding, usdKrw: number): number {
  if (h.annualDividendUSD != null && h.annualDividendUSD > 0) return h.annualDividendUSD;
  if (isUsdHolding(h) && h.annualDividendKRW > 0) return krwToUsd(h.annualDividendKRW, usdKrw);
  return 0;
}

export function holdingMarketValueUSD(h: Holding, usdKrw: number): number {
  if (h.marketValueUSD != null && h.marketValueUSD > 0) return h.marketValueUSD;
  if (isUsdHolding(h) && (h.marketValueKRW ?? 0) > 0) return krwToUsd(h.marketValueKRW!, usdKrw);
  return 0;
}

export function holdingCostBasisUSD(h: Holding, usdKrw: number): number {
  if (h.costBasisUSD != null && h.costBasisUSD > 0) return h.costBasisUSD;
  if (isUsdHolding(h) && (h.costBasisKRW ?? 0) > 0) return krwToUsd(h.costBasisKRW!, usdKrw);
  return 0;
}

export function holdingAnnualTotalKRW(h: Holding, usdKrw: number): number {
  const shares = h.shares != null && h.shares > 0 ? h.shares : 1;
  return holdingAnnualDividendPerShareKRW(h, usdKrw) * shares;
}
