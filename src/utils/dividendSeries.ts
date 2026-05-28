import type { DividendFrequency, Holding } from '../types';
import {
  holdingAnnualDividendPerShareKRW,
  holdingAnnualTotalKRW,
} from './holdingMoney';

const PAYMENTS_PER_YEAR: Record<DividendFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

/** 주 1회 지급액(원) — 주당 연간 배당 × shares */
export function holdingPerPaymentKRW(h: Holding, usdKrw: number): number {
  const payments = PAYMENTS_PER_YEAR[h.frequency] ?? 4;
  const shares = h.shares != null && h.shares > 0 ? h.shares : 1;
  return (holdingAnnualDividendPerShareKRW(h, usdKrw) * shares) / payments;
}

/** 배당 지급이 예상되는 월 (1–12) */
export function getPaymentMonths(h: Holding): number[] {
  const n = PAYMENTS_PER_YEAR[h.frequency] ?? 4;
  const anchor = h.nextPayMonth ?? defaultAnchorMonth(n);

  // 월배당은 지급월 입력과 무관하게 12개월 모두 반영
  if (n === 12) {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }
  if (n === 4) {
    return [0, 1, 2, 3].map((i) => ((anchor - 1 + i * 3) % 12) + 1);
  }
  if (n === 2) {
    return [0, 1].map((i) => ((anchor - 1 + i * 6) % 12) + 1);
  }
  return [anchor];
}

function defaultAnchorMonth(n: number): number {
  if (n === 4) return 3;
  if (n === 2) return 6;
  return 12;
}

/** 연간 12개월 월별 배당 합계 (원) */
export function buildYearMonthlyTotals(holdings: Holding[], usdKrw: number): number[] {
  const months = Array(12).fill(0);
  for (const h of holdings) {
    const perPayment = holdingPerPaymentKRW(h, usdKrw);
    for (const m of getPaymentMonths(h)) {
      months[m - 1] += perPayment;
    }
  }
  return months;
}

export function sumYearTotal(monthlyTotals: number[]): number {
  return monthlyTotals.reduce((a, b) => a + b, 0);
}

export interface HoldingShare {
  id: string;
  name: string;
  annualKRW: number;
  pct: number;
}

export function buildHoldingShares(holdings: Holding[], usdKrw: number): HoldingShare[] {
  const total = holdings.reduce((s, h) => s + holdingAnnualTotalKRW(h, usdKrw), 0);
  if (total <= 0) return [];
  return holdings
    .map((h) => {
      const annualKRW = holdingAnnualTotalKRW(h, usdKrw);
      return {
        id: h.id,
        name: h.name,
        annualKRW,
        pct: (annualKRW / total) * 100,
      };
    })
    .sort((a, b) => b.annualKRW - a.annualKRW);
}
