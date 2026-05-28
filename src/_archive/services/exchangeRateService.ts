const FALLBACK_USD_KRW = 1350;
const CACHE_TTL_MS = 1000 * 60 * 30;

let cached: { rate: number; fetchedAt: number } | null = null;

/** USD/KRW (Frankfurter · ECB 기준, 키 불필요) */
export async function fetchUsdKrwRate(): Promise<number> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW');
    if (!res.ok) throw new Error('fx');
    const data = (await res.json()) as { rates?: { KRW?: number } };
    const rate = data.rates?.KRW;
    if (rate != null && rate > 0) {
      cached = { rate, fetchedAt: Date.now() };
      return rate;
    }
  } catch {
    /* fallback */
  }

  return cached?.rate ?? FALLBACK_USD_KRW;
}

export function getCachedUsdKrwRate(): number {
  return cached?.rate ?? FALLBACK_USD_KRW;
}

export function getUsdKrwCacheAge(): number | null {
  if (!cached) return null;
  return Date.now() - cached.fetchedAt;
}
