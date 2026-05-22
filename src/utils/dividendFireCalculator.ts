import { calcYearDividends, type DividendCalcOptions } from './dividendCalculator';
import type { StockHolding } from '../types';

export interface DividendFireProjection {
  monthlyExpense: number;
  monthlyDividendGross: number;
  monthlyDividendNet: number;
  /** @deprecated monthlyDividendNet */
  monthlyDividend: number;
  annualDividendGross: number;
  annualDividendNet: number;
  /** @deprecated annualDividendNet */
  annualDividend: number;
  /** 생활비 대비 배당 커버율 (0–100) — 프로그레스 링 */
  coveragePct: number;
  monthlyGapKRW: number;
  isFIRE: boolean;
  monthsToTarget: number;
  yearsToFIRE: number;
  retirementDate: Date | null;
  holdingsCount: number;
  hasHoldings: boolean;
}

/**
 * 배당 FIRE: 월·연 배당 현금흐름이 생활비를 덮을 때까지.
 * 저축은 배당주 매수(가정 수익률)로 월 배당을 늘리는 모델.
 */
export function calcDividendFireProjection(
  holdings: StockHolding[],
  monthlyExpense: number,
  monthlySavings: number,
  year: number,
  assumedYieldPct = 4,
  divOpts?: DividendCalcOptions
): DividendFireProjection {
  const annual = calcYearDividends(holdings, year, divOpts);
  const monthlyDividendGross = annual.grossKRW / 12;
  const monthlyDividendNet = annual.netKRW / 12;
  const monthlyDividend = monthlyDividendNet;
  const hasHoldings = holdings.length > 0;

  const coveragePct =
    monthlyExpense > 0 ? Math.min(100, (monthlyDividendNet / monthlyExpense) * 100) : 0;
  const monthlyGapKRW = Math.max(0, monthlyExpense - monthlyDividendNet);
  const isFIRE = monthlyExpense > 0 && monthlyDividendNet >= monthlyExpense && hasHoldings;

  const monthlyDivFromSavings = (monthlySavings * assumedYieldPct) / 100 / 12;

  let monthsToTarget = 0;
  if (!isFIRE && monthlyExpense > 0) {
    if (monthlyDivFromSavings <= 0 && monthlyDividendNet < monthlyExpense) {
      monthsToTarget = 9999;
    } else {
      let div = monthlyDividendNet;
      monthsToTarget = 0;
      while (div < monthlyExpense && monthsToTarget < 1200) {
        div += monthlyDivFromSavings;
        monthsToTarget++;
      }
      if (monthsToTarget >= 1200) monthsToTarget = 9999;
    }
  }

  let retirementDate: Date | null = null;
  if (!isFIRE && monthsToTarget > 0 && monthsToTarget < 9999) {
    retirementDate = new Date();
    retirementDate.setMonth(retirementDate.getMonth() + monthsToTarget);
  }

  return {
    monthlyExpense,
    monthlyDividendGross,
    monthlyDividendNet,
    monthlyDividend,
    annualDividendGross: annual.grossKRW,
    annualDividendNet: annual.netKRW,
    annualDividend: annual.netKRW,
    coveragePct,
    monthlyGapKRW,
    isFIRE,
    monthsToTarget,
    yearsToFIRE: monthsToTarget >= 9999 ? 99 : Math.round((monthsToTarget / 12) * 10) / 10,
    retirementDate,
    holdingsCount: holdings.length,
    hasHoldings,
  };
}

export function getDividendMotivationMessage(
  daysSaved: number,
  savedAmount: number,
  coveragePct: number
): string {
  const amt = `${(savedAmount / 10000).toFixed(0)}만`;
  if (coveragePct >= 100) return '배당만으로 생활비를 커버 중입니다. 화마 탈출 구간!';
  if (daysSaved <= 0) return `배당주에 ${amt} 원 더 넣으면 커버율이 올라갑니다.`;
  if (daysSaved === 1) return `배당 재투자 ${amt} 원 → 탈출까지 약 1일 단축!`;
  return `배당 재투자 ${amt} 원 → 탈출까지 약 ${daysSaved}일 단축!`;
}

/** 일시 저축·매수가 배당 커버율을 얼마나 당기는지 (일) */
export function daysSavedByDividendReinvest(
  lumpSumKRW: number,
  monthlyExpense: number,
  monthsToTarget: number,
  assumedYieldPct: number
): number {
  if (lumpSumKRW <= 0 || monthlyExpense <= 0 || monthsToTarget <= 0 || monthsToTarget >= 9999) {
    return 0;
  }
  const monthlyBoost = (lumpSumKRW * assumedYieldPct) / 100 / 12;
  const pctBoost = (monthlyBoost / monthlyExpense) * 100;
  return Math.max(1, Math.round((pctBoost / 100) * monthsToTarget * 30));
}
