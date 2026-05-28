import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StockHolding } from '../types';
import {
  fetchStockPrice,
  getCachedStockPrice,
  isLiveDividendApiEnabled,
} from '../services/dividendApiService';
import {
  calcPortfolioAllocation,
  type PortfolioAllocation,
} from '../utils/portfolioAllocation';

function holdingsKey(holdings: StockHolding[]): string {
  return holdings.map((h) => `${h.id}|${h.symbol}|${h.market}|${h.shares}`).join(',');
}

export function usePortfolioAllocation(
  holdings: StockHolding[],
  totalAssets: number,
  assetsCurrency: 'KRW' | 'USD',
  usdKrw: number
) {
  const [prices, setPrices] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(false);
  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;

  const refreshPrices = useCallback(async () => {
    const list = holdingsRef.current;
    if (list.length === 0) {
      setPrices({});
      return;
    }

    setLoading(true);
    try {
      const next: Record<string, number | null> = {};
      if (isLiveDividendApiEnabled()) {
        await Promise.all(
          list.map(async (h) => {
            let p = getCachedStockPrice(h.symbol);
            if (p == null) p = await fetchStockPrice(h.symbol, h.market);
            next[h.id] = p;
          })
        );
      } else {
        for (const h of list) {
          next[h.id] = null;
        }
      }
      setPrices(next);
    } finally {
      setLoading(false);
    }
  }, []);

  const key = useMemo(() => holdingsKey(holdings), [holdings]);

  useEffect(() => {
    const t = setTimeout(() => refreshPrices(), 400);
    return () => clearTimeout(t);
  }, [key, refreshPrices]);

  const allocation = useMemo(
    (): PortfolioAllocation =>
      calcPortfolioAllocation(holdings, prices, totalAssets, assetsCurrency, usdKrw),
    [holdings, prices, totalAssets, assetsCurrency, usdKrw]
  );

  return { allocation, loading, refreshPrices };
}
