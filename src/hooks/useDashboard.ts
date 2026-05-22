import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { calcDividendFireProjection } from '../utils/dividendFireCalculator';
import { calcMonthDividends, calcYearDividends } from '../utils/dividendCalculator';
import { toKRW } from '../utils/format';
import { getBadgeEmoji, getBadgeTier, getNextTierProgress } from '../utils/badgeUtils';
import { useUsdKrwRate } from './useUsdKrwRate';

export function useDashboard() {
  const fire = useAppStore((s) => s.fire);
  const dividendTax = useAppStore((s) => s.dividendTax);
  const holdings = useAppStore((s) => s.holdings);
  const { usdKrw } = useUsdKrwRate();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const divOpts = useMemo(() => ({ usdKrw, tax: dividendTax }), [usdKrw, dividendTax]);

  return useMemo(() => {
    const assetsKRW =
      fire.currency === 'USD' ? toKRW(fire.totalAssets, 'USD', usdKrw) : fire.totalAssets;
    const yieldPct = fire.assumedDividendYieldPct ?? 4;

    const dividendFire = calcDividendFireProjection(
      holdings,
      fire.monthlyExpense,
      fire.monthlySavings,
      year,
      yieldPct,
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
    };
  }, [fire, holdings, year, month, divOpts, usdKrw]);
}
