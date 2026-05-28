import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calcDividendFireProjection } from '../utils/dividendFireCalculator';
import {
  calcMonthDividends,
  calcYearDividends,
  sumExpenseItems,
} from '../utils/dividendCalculator';
import { toKRW } from '../utils/format';
import { getBadgeEmoji, getBadgeTier, getNextTierProgress } from '../utils/badgeUtils';
import { useUsdKrwRate } from './useUsdKrwRate';

export function useDashboard() {
  const fire = useAppStore((s) => s.fire);
  const holdings = useAppStore((s) => s.holdings);
  const expenses = useAppStore((s) => s.expenses);
  const { usdKrw } = useUsdKrwRate();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const divOpts = useMemo(() => ({ usdKrw }), [usdKrw]);

  return useMemo(() => {
    const assetsKRW =
      fire.currency === 'USD' ? toKRW(fire.totalAssets, 'USD', usdKrw) : fire.totalAssets;
    // 사용자가 항목별 지출을 등록했다면 그 합계를 우선 사용 (단일 입력 일관성)
    const expensesTotal = sumExpenseItems(expenses);
    const effectiveMonthlyExpense = expensesTotal > 0 ? expensesTotal : fire.monthlyExpense;

    const dividendFire = calcDividendFireProjection(
      holdings,
      effectiveMonthlyExpense,
      fire.monthlySavings,
      year,
      divOpts
    );

    const monthDiv = calcMonthDividends(holdings, year, month, divOpts);
    const yearDiv = calcYearDividends(holdings, year, divOpts);
    const tier = getBadgeTier(assetsKRW);
    const tierProgress = getNextTierProgress(assetsKRW);

    return {
      assetsKRW,
      usdKrw,
      dividendFire,
      monthDiv,
      yearDiv,
      tier,
      tierEmoji: getBadgeEmoji(tier),
      tierProgress,
      holdingsCount: holdings.length,
      /** 사용자 지출 항목 기준 합계 (없으면 fire.monthlyExpense로 폴백) */
      effectiveMonthlyExpense,
      /** 사용자가 항목별로 지출을 등록했는지 여부 */
      hasExpenseItems: expensesTotal > 0,
    };
  }, [fire, holdings, expenses, year, month, divOpts, usdKrw]);
}
