import { calcYearDividends, type DividendCalcOptions } from './dividendCalculator';
import type { StockHolding } from '../types';

export interface DividendFireProjection {
  monthlyExpense: number;
  monthlyDividendGross: number;
  monthlyDividendNet: number;
  /** @deprecated monthlyDividendNet */
  monthlyDividend: number;
  /** 매달 통장에 쌓는 현금 (배당주 매수 제외) */
  monthlyCashSavings: number;
  /** 이번 달 배당 + 현금 저축 합산 커버 */
  monthlyCoverKRW: number;
  annualDividendGross: number;
  annualDividendNet: number;
  /** @deprecated annualDividendNet */
  annualDividend: number;
  /** 생활비 대비 (배당 + 월 현금 저축) 커버율 (0–100) */
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
 * 배당 FIRE: 월 배당 + 월 현금 저축이 생활비를 덮을 때.
 * - 보유 종목 → 배당 현금흐름만 반영
 * - monthlyCashSavings → 배당주와 별도로 쌓는 현금만 (매수·재투자 가정 없음)
 */
export function calcDividendFireProjection(
  holdings: StockHolding[],
  monthlyExpense: number,
  monthlyCashSavings: number,
  year: number,
  divOpts?: DividendCalcOptions
): DividendFireProjection {
  const annual = calcYearDividends(holdings, year, divOpts);
  const monthlyDividendGross = annual.grossKRW / 12;
  const monthlyDividendNet = annual.netKRW / 12;
  const monthlyDividend = monthlyDividendNet;
  const hasHoldings = holdings.length > 0;

  const monthlyCoverKRW = monthlyDividendNet + Math.max(0, monthlyCashSavings);
  const coveragePct =
    monthlyExpense > 0 ? Math.min(100, (monthlyCoverKRW / monthlyExpense) * 100) : 0;
  const monthlyGapKRW = Math.max(0, monthlyExpense - monthlyCoverKRW);
  const isFIRE = monthlyExpense > 0 && monthlyCoverKRW >= monthlyExpense;

  // 배당은 보유 종목 기준으로만 변함. 현금 저축은 월 흐름으로만 반영 → 추가 매수 가정 없음
  const monthsToTarget = isFIRE ? 0 : 9999;

  return {
    monthlyExpense,
    monthlyDividendGross,
    monthlyDividendNet,
    monthlyDividend,
    monthlyCashSavings: Math.max(0, monthlyCashSavings),
    monthlyCoverKRW,
    annualDividendGross: annual.grossKRW,
    annualDividendNet: annual.netKRW,
    annualDividend: annual.netKRW,
    coveragePct,
    monthlyGapKRW,
    isFIRE,
    monthsToTarget,
    yearsToFIRE: monthsToTarget >= 9999 ? 99 : Math.round((monthsToTarget / 12) * 10) / 10,
    retirementDate: null,
    holdingsCount: holdings.length,
    hasHoldings,
  };
}
