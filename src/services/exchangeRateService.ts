const CACHE_TTL_MS = 1000 * 60 * 30;
const FALLBACK_USD_KRW = 1350;
/** 브라우저 CORS 회피: dev/prod 모두 동일 경로 → Vite·Vercel 프록시 */
const FX_LATEST_URL = '/api/fx/latest?from=USD&to=KRW';

let cachedRate: { value: number; fetchedAt: number } | null = null;

export function getCachedUsdKrwRate(): number {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL_MS) {
    return cachedRate.value;
  }
  return FALLBACK_USD_KRW;
}

export async function fetchUsdKrwRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_TTL_MS) {
    return cachedRate.value;
  }

  try {
    const res = await fetch(FX_LATEST_URL);
    if (!res.ok) throw new Error('rate fetch failed');
    const data = (await res.json()) as { rates?: { KRW?: number } };
    const rate = data.rates?.KRW;
    if (rate && rate > 0) {
      cachedRate = { value: rate, fetchedAt: Date.now() };
      return rate;
    }
  } catch {
    /* fallback */
  }

  return getCachedUsdKrwRate();
}

export function usdToKrw(usd: number, rate = getCachedUsdKrwRate()): number {
  return Math.round(usd * rate);
}

export function krwToUsd(krw: number, rate = getCachedUsdKrwRate()): number {
  if (rate <= 0) return 0;
  return Math.round((krw / rate) * 100) / 100;
}

export function invalidateUsdKrwCache(): void {
  cachedRate = null;
}
