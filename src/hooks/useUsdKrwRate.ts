import { useCallback, useEffect, useState } from 'react';
import {
  fetchUsdKrwRate,
  getCachedUsdKrwRate,
  invalidateUsdKrwCache,
} from '../services/exchangeRateService';

export function useUsdKrwRate() {
  const [usdKrw, setUsdKrw] = useState(getCachedUsdKrwRate);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    invalidateUsdKrwCache();
    const rate = await fetchUsdKrwRate();
    setUsdKrw(rate);
    return rate;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchUsdKrwRate()
      .then((rate) => {
        if (!cancelled) setUsdKrw(rate);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { usdKrw, loading, refresh };
}
