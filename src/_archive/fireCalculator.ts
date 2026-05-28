import { getCachedUsdKrwRate } from '../services/exchangeRateService';
import { toKRW } from './format';
import type { Currency } from '../types';

export interface FireProjection {
  targetAssets: number;
  currentAssetsKRW: number;
  progress: number;
  monthsToTarget: number;
  retirementDate: Date | null;
  gapKRW: number;
  isFIRE: boolean;
  yearsToFIRE: number;
}

/** 연 생활비 대비 목표 자산 배수 (4% → 25) */
export function expenseMultiplierFromRate(withdrawalRatePct: number): number {
  const rate = Math.max(0.5, Math.min(10, withdrawalRatePct));
  return 100 / rate;
}

export function calcTargetAssets(monthlyExpense: number, withdrawalRatePct = 4): number {
  return monthlyExpense * 12 * expenseMultiplierFromRate(withdrawalRatePct);
}

export function formatFireRuleSubtitle(withdrawalRatePct: number): string {
  const mult = Math.round(expenseMultiplierFromRate(withdrawalRatePct) * 10) / 10;
  return `인출률 ${withdrawalRatePct}% → 목표 자산 = 연 생활비 × ${mult}`;
}

export function calcFireProjection(
  totalAssets: number,
  currency: Currency,
  monthlySavings: number,
  monthlyExpense: number,
  withdrawalRatePct = 4
): FireProjection {
  const currentAssetsKRW =
    currency === 'USD' ? toKRW(totalAssets, 'USD', getCachedUsdKrwRate()) : totalAssets;
  const targetAssets = calcTargetAssets(monthlyExpense, withdrawalRatePct);
  const progress = targetAssets > 0 ? Math.min(100, (currentAssetsKRW / targetAssets) * 100) : 0;
  const gapKRW = Math.max(0, targetAssets - currentAssetsKRW);
  const isFIRE = gapKRW === 0 && targetAssets > 0;

  const monthsToTarget =
    monthlySavings > 0 ? Math.ceil(gapKRW / monthlySavings) : gapKRW > 0 ? 9999 : 0;

  let retirementDate: Date | null = null;
  if (!isFIRE && monthsToTarget !== 9999 && monthsToTarget >= 0) {
    retirementDate = new Date();
    retirementDate.setMonth(retirementDate.getMonth() + monthsToTarget);
  }

  return {
    targetAssets,
    currentAssetsKRW,
    progress,
    monthsToTarget: monthsToTarget === 9999 ? 9999 : monthsToTarget,
    retirementDate,
    gapKRW,
    isFIRE,
    yearsToFIRE: monthsToTarget === 9999 ? 99 : Math.round((monthsToTarget / 12) * 10) / 10,
  };
}

export function daysSavedByAmount(savedAmount: number, monthlySavings: number): number {
  if (monthlySavings <= 0 || savedAmount <= 0) return 0;
  return Math.round(savedAmount / (monthlySavings / 30));
}

export function getMotivationMessage(daysSaved: number, savedAmount: number): string {
  const amt = `${(savedAmount / 10000).toFixed(0)}만`;
  if (daysSaved <= 0) return `오늘 ${amt} 원 아끼면 목표에 한 걸음 더 가까워져요!`;
  if (daysSaved === 1) return `오늘 ${amt} 원 아끼면 은퇴가 1일 당겨집니다!`;
  return `오늘 ${amt} 원 아끼면 은퇴가 ${daysSaved}일 당겨집니다!`;
}

export const SAVINGS_PRESETS = [50_000, 100_000, 500_000] as const;
