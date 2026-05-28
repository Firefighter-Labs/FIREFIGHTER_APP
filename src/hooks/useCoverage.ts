import { useMemo } from 'react';
import { useUsdKrwRate } from './useUsdKrwRate';
import { useAppStore } from '../store/useAppStore';
import {
  calcCoverage,
  totalMonthlyDividend,
  totalMonthlyExpense,
} from '../utils/coverage';
import { getMilestoneMessage } from '../utils/milestones';
import { simulateFireAge } from '../utils/simulator';

export function useCoverage() {
  const { usdKrw } = useUsdKrwRate();
  const goals = useAppStore((s) => s.goals);
  const holdings = useAppStore((s) => s.holdings);
  const expenseCategories = useAppStore((s) => s.expenseCategories);

  return useMemo(() => {
    const monthlyDividend = totalMonthlyDividend(holdings, usdKrw);
    const monthlyExpense = totalMonthlyExpense(
      expenseCategories,
      goals.monthlyExpenseFallback
    );
    const coverage = calcCoverage(monthlyDividend, monthlyExpense);
    const annualDividend = monthlyDividend * 12;
    const milestone = getMilestoneMessage(coverage.coveragePct);
    const simulation = simulateFireAge(
      goals.currentAge,
      monthlyDividend,
      monthlyExpense,
      goals.monthlyInvestmentKRW,
      goals.assumedYieldPct
    );

    return {
      ...coverage,
      annualDividend,
      milestone,
      simulation,
      goals,
      holdingsCount: holdings.length,
      usdKrw,
    };
  }, [goals, holdings, expenseCategories, usdKrw]);
}
