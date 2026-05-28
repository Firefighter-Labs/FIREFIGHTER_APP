import type { DividendFrequency, ExpenseCategory, Holding } from '../types';
import { holdingAnnualDividendPerShareKRW } from './holdingMoney';

const PAYMENTS_PER_YEAR: Record<DividendFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

export function monthlyDividendFromHolding(h: Holding, usdKrw: number): number {
  const payments = PAYMENTS_PER_YEAR[h.frequency] ?? 4;
  const shares = h.shares != null && h.shares > 0 ? h.shares : 1;
  const annualPerShare = holdingAnnualDividendPerShareKRW(h, usdKrw);
  return (annualPerShare * shares) / payments;
}

export function totalMonthlyDividend(holdings: Holding[], usdKrw: number): number {
  return holdings.reduce((sum, h) => sum + monthlyDividendFromHolding(h, usdKrw), 0);
}

export function totalMonthlyExpense(
  categories: ExpenseCategory[],
  fallback: number
): number {
  const sum = categories.reduce((s, c) => s + Math.max(0, c.amountKRW || 0), 0);
  return sum > 0 ? sum : Math.max(0, fallback);
}

export function calcCoveragePct(monthlyDividend: number, monthlyExpense: number): number {
  if (monthlyExpense <= 0) return 0;
  return Math.min(100, (monthlyDividend / monthlyExpense) * 100);
}

export function calcCoverage(monthlyDividend: number, monthlyExpense: number) {
  const coveragePct = calcCoveragePct(monthlyDividend, monthlyExpense);
  const gapKRW = Math.max(0, monthlyExpense - monthlyDividend);
  const isFire = monthlyExpense > 0 && monthlyDividend >= monthlyExpense;
  return { coveragePct, gapKRW, isFire, monthlyDividend, monthlyExpense };
}

export function frequencyLabel(freq: DividendFrequency): string {
  switch (freq) {
    case 'monthly':
      return '월';
    case 'quarterly':
      return '분기';
    case 'semiannual':
      return '반기';
    case 'annual':
      return '연';
  }
}
