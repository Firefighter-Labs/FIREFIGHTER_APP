import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StockHolding } from '../types';
import {
  getLastDividendDataSource,
  getLastDividendSyncError,
  syncHoldingsDividends,
} from '../services/dividendMetaService';
import {
  fetchDividendYield,
  getCachedDividendYield,
  getDividendApiStatus,
  isLiveDividendApiEnabled,
} from '../services/dividendApiService';

export interface HoldingYield {
  holdingId: string;
  yieldPct: number | null;
}

function holdingsSyncKey(holdings: StockHolding[], year: number): string {
  return `${year}::${holdings.map((h) => `${h.id}|${h.symbol}|${h.market}|${h.shares}`).join(',')}`;
}

export function useDividendSync(holdings: StockHolding[], year: number) {
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'api' | 'local'>('local');
  const [apiError, setApiError] = useState<string | null>(null);
  const [yields, setYields] = useState<HoldingYield[]>([]);
  const [tick, setTick] = useState(0);

  const holdingsKey = useMemo(() => holdingsSyncKey(holdings, year), [holdings, year]);
  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;

  const refresh = useCallback(async (force = false) => {
    const list = holdingsRef.current;
    setLoading(true);
    try {
      await syncHoldingsDividends(list, year, { force });

      if (isLiveDividendApiEnabled()) {
        const y: HoldingYield[] = [];
        for (const h of list) {
          let yieldPct = getCachedDividendYield(h.symbol, h.market);
          if (yieldPct == null) {
            yieldPct = await fetchDividendYield(h.symbol, h.market);
          }
          y.push({ holdingId: h.id, yieldPct });
        }
        setYields(y);
      } else {
        setYields([]);
      }

      setSource(getLastDividendDataSource());
      setApiError(getLastDividendSyncError() ?? getDividendApiStatus().lastError);
    } finally {
      setLoading(false);
      setTick((t) => t + 1);
    }
  }, [year]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [holdingsKey, refresh]);

  return {
    loading,
    source,
    apiError,
    apiStatus: getDividendApiStatus(),
    yields,
    refresh: () => refresh(true),
    tick,
  };
}
