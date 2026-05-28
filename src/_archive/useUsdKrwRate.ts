import { useCallback, useEffect, useState } from 'react';
import { fetchUsdKrwRate, getCachedUsdKrwRate } from '../services/exchangeRateService';

export function useUsdKrwRate() {
  const [usdKrw, setUsdKrw] = useState(getCachedUsdKrwRate());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rate = await fetchUsdKrwRate();
      setUsdKrw(rate);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { usdKrw, loading, refresh };
}
