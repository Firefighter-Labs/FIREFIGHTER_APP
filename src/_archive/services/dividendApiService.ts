import {
  DIVIDEND_CATALOG,
  expandAnnualDividends,
  expandMonthlyDividends,
  getDividendScheduleForSymbol as localSchedule,
  isMonthlyDividendSymbol,
} from '../data/dividendCatalog';
import type { DividendEvent } from '../types';
import {
  fetchExactDividendsFromYahoo,
  fetchYahooQuotePrice,
  type PayoutFrequency,
} from './dividendHistoryService';

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;
const FMP_KEY = import.meta.env.VITE_FMP_API_KEY as string | undefined;
/** 유료 FMP만 true — 무료는 stable/dividends 호출 시 402만 발생 */
const FMP_PREMIUM =
  import.meta.env.VITE_FMP_PREMIUM === '1' || import.meta.env.VITE_FMP_PREMIUM === 'true';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;

type Provider = 'yahoo' | 'fmp' | 'fmp-estimate' | 'finnhub' | 'local';

interface CacheEntry {
  events: DividendEvent[];
  fetchedAt: number;
  provider: Provider;
  frequency?: PayoutFrequency;
}

const memoryCache = new Map<string, CacheEntry>();

interface ProfileCacheEntry {
  profile: FmpProfile;
  yieldPct: number;
  fetchedAt: number;
}

const profileCache = new Map<string, ProfileCacheEntry>();
const profileInflight = new Map<string, Promise<FmpProfile | null>>();
const searchCache = new Map<
  string,
  {
    results: { symbol: string; name: string; market: 'US' | 'KR' }[];
    provider: StockSearchProvider | null;
    warning: string | null;
    fetchedAt: number;
  }
>();

let sessionFmpCalls = 0;
let lastGlobalError: string | null = null;
let lastProviderUsed: Provider = 'local';
/** Finnhub 배당 403 한 번 확인되면 재호출 안 함 */
let finnhubDividendBlocked = false;

export function isLiveDividendApiEnabled(): boolean {
  return Boolean(FINNHUB_KEY?.trim() || FMP_KEY?.trim());
}

/** 배당 탭 종목 검색·등록 (Finnhub 전용) */
export function isFinnhubSearchEnabled(): boolean {
  return Boolean(FINNHUB_KEY?.trim());
}

export function isStockSearchEnabled(): boolean {
  return Boolean(FINNHUB_KEY?.trim() || FMP_KEY?.trim());
}

export type StockSearchProvider = 'finnhub' | 'fmp';

export interface StockSearchOutcome {
  results: { symbol: string; name: string; market: 'US' | 'KR' }[];
  provider: StockSearchProvider | null;
  warning: string | null;
}

/** @deprecated use isLiveDividendApiEnabled */
export function isFinnhubEnabled(): boolean {
  return isLiveDividendApiEnabled();
}

export function getDividendApiStatus(): {
  finnhub: boolean;
  fmp: boolean;
  lastError: string | null;
  lastProvider: Provider;
  isEstimate: boolean;
  isExactSchedule: boolean;
  sessionFmpCalls: number;
} {
  const exact =
    lastProviderUsed === 'yahoo' || lastProviderUsed === 'fmp' || lastProviderUsed === 'finnhub';
  return {
    finnhub: Boolean(FINNHUB_KEY?.trim()) && !finnhubDividendBlocked,
    fmp: Boolean(FMP_KEY?.trim()),
    lastError: lastGlobalError,
    lastProvider: lastProviderUsed,
    isEstimate: lastProviderUsed === 'fmp-estimate' || lastProviderUsed === 'local',
    isExactSchedule: exact,
    sessionFmpCalls,
  };
}

export function getCachedDividendMeta(
  symbol: string,
  market: 'KR' | 'US',
  year: number
): { provider: Provider; frequency?: PayoutFrequency } | null {
  const hit = memoryCache.get(cacheKey(symbol, market, year));
  if (!hit) return null;
  return { provider: hit.provider, frequency: hit.frequency };
}

/** 동기화 직후 캐시된 배당률 (추가 API 호출 없음) */
export function getCachedDividendYield(symbol: string, _market: 'KR' | 'US'): number | null {
  const hit = profileCache.get(symbol.trim().toUpperCase());
  if (!hit || Date.now() - hit.fetchedAt >= CACHE_TTL_MS) return null;
  return hit.yieldPct;
}

/** FMP profile 캐시 시가 */
export function getCachedStockPrice(symbol: string): number | null {
  const hit = profileCache.get(symbol.trim().toUpperCase());
  if (!hit || Date.now() - hit.fetchedAt >= CACHE_TTL_MS) return null;
  const p = hit.profile.price;
  return p != null && p > 0 ? p : null;
}

export function toApiSymbol(symbol: string, market: 'KR' | 'US'): string {
  const s = symbol.trim().toUpperCase();
  if (market === 'US') return s;
  if (s.includes('.')) return s;
  if (/^\d{6}$/.test(s)) return `${s}.KS`;
  return s;
}

function cacheKey(symbol: string, market: 'KR' | 'US', year: number) {
  return `${symbol}:${market}:${year}`;
}

function saveCache(
  key: string,
  events: DividendEvent[],
  provider: Provider,
  frequency?: PayoutFrequency
) {
  memoryCache.set(key, { events, fetchedAt: Date.now(), provider, frequency });
  lastProviderUsed = provider;
}

function fallbackAndCache(key: string, symbol: string, name: string, year: number): DividendEvent[] {
  const events = localSchedule(symbol, name, year);
  saveCache(key, events, 'local');
  return events;
}

function payoutPatternFromCatalog(symbol: string) {
  const cat = DIVIDEND_CATALOG[symbol];
  if (cat?.currency === 'USD') {
    const pay = cat.payDate.split('-');
    const ex = cat.exDate.split('-');
    return {
      monthly: isMonthlyDividendSymbol(symbol),
      month: parseInt(pay[1], 10),
      exDay: parseInt(ex[2], 10),
      payDay: parseInt(pay[2], 10),
    };
  }
  return {
    monthly: isMonthlyDividendSymbol(symbol),
    month: 3,
    exDay: 20,
    payDay: isMonthlyDividendSymbol(symbol) ? 5 : 28,
  };
}

interface FmpProfile {
  symbol: string;
  price: number;
  lastDividend: number;
  companyName?: string;
  isEtf?: boolean;
}

async function fetchFmpProfile(symbol: string, market: 'KR' | 'US' = 'US'): Promise<FmpProfile | null> {
  if (!FMP_KEY?.trim()) return null;

  const key = symbol.trim().toUpperCase();
  const cached = profileCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.profile;
  }

  const inflight = profileInflight.get(key);
  if (inflight) return inflight;

  const apiSymbol = toApiSymbol(symbol, market);

  const promise = (async () => {
    sessionFmpCalls += 1;
    const url = `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(apiSymbol)}&apikey=${FMP_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as FmpProfile[];
    const row = data[0];
    if (!row?.price || !row?.lastDividend) return null;
    profileCache.set(key, {
      profile: row,
      yieldPct: (row.lastDividend / row.price) * 100,
      fetchedAt: Date.now(),
    });
    return row;
  })();

  profileInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    profileInflight.delete(key);
  }
}

/** FMP 유료 전용: stable/dividends (무료 플랜 402 — 기본 호출 안 함) */
async function fetchFromFmpDividends(
  symbol: string,
  name: string,
  year: number
): Promise<DividendEvent[] | null> {
  if (!FMP_KEY?.trim() || !FMP_PREMIUM) return null;

  const url = `https://financialmodelingprep.com/stable/dividends?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`;
  const res = await fetch(url);
  if (res.status === 402 || res.status === 403) return null;
  if (!res.ok) return null;

  const rows = (await res.json()) as {
    date?: string;
    recordDate?: string;
    paymentDate?: string;
    dividend?: number;
    adjDividend?: number;
  }[];
  if (!Array.isArray(rows) || !rows.length) return null;

  const events: DividendEvent[] = rows
    .map((r) => {
      const amount = r.adjDividend ?? r.dividend ?? 0;
      const payDate = r.paymentDate || r.date || '';
      const exDate = r.recordDate || r.date || payDate;
      return {
        symbol,
        name,
        exDate,
        payDate,
        amountPerShare: amount,
        currency: 'USD' as const,
      };
    })
    .filter((e) => e.amountPerShare > 0)
    .filter((e) => e.payDate.startsWith(String(year)) || e.exDate.startsWith(String(year)));

  return events.length ? events : null;
}

/** FMP 무료: profile.lastDividend(연간) → 추정 일정 (실제 API 실패 시에만) */
async function fetchFromFmpProfileEstimate(
  symbol: string,
  name: string,
  market: 'KR' | 'US',
  year: number
): Promise<DividendEvent[] | null> {
  const profile = await fetchFmpProfile(symbol, market);
  if (!profile) return null;

  const pattern = payoutPatternFromCatalog(symbol);
  const perPayAmount = profile.lastDividend / (pattern.monthly ? 12 : 4);
  const amount = Math.round(perPayAmount * 10000) / 10000;
  const displayName = profile.companyName || name;

  const events = pattern.monthly
    ? expandMonthlyDividends(symbol, displayName, year, {
        exDay: pattern.exDay,
        payDay: pattern.payDay,
        amount,
        currency: 'USD',
      })
    : expandAnnualDividends(symbol, displayName, year, {
        month: pattern.month,
        exDay: pattern.exDay,
        payDay: pattern.payDay,
        amount,
        currency: 'USD',
      });

  return events.length ? events : null;
}

async function fetchFromFinnhub(
  symbol: string,
  name: string,
  market: 'KR' | 'US',
  year: number
): Promise<DividendEvent[] | null> {
  if (!FINNHUB_KEY?.trim() || finnhubDividendBlocked) return null;

  const apiSymbol = toApiSymbol(symbol, market);
  const from = `${year - 1}-01-01`;
  const to = `${year + 1}-12-31`;
  const currency = market === 'KR' ? 'KRW' : 'USD';

  const url = `https://finnhub.io/api/v1/stock/dividend?symbol=${encodeURIComponent(apiSymbol)}&from=${from}&to=${to}&token=${FINNHUB_KEY}`;
  const res = await fetch(url);

  if (res.status === 403) {
    finnhubDividendBlocked = true;
    return null;
  }
  if (!res.ok) return null;

  const rows = (await res.json()) as { date?: string; amount?: number; payDate?: string }[];
  if (!Array.isArray(rows) || !rows.length) return null;

  const events: DividendEvent[] = rows
    .filter((r) => r.amount != null && r.amount > 0)
    .map((r) => ({
      symbol,
      name,
      exDate: r.date ?? '',
      payDate: r.payDate && r.payDate !== '' ? r.payDate : (r.date ?? ''),
      amountPerShare: Number(r.amount),
      currency: currency as 'KRW' | 'USD',
    }))
    .filter((e) => e.payDate.startsWith(String(year)) || e.exDate.startsWith(String(year)));

  return events.length ? events : null;
}

export async function fetchDividendsFromApi(
  symbol: string,
  name: string,
  market: 'KR' | 'US',
  year: number
): Promise<DividendEvent[]> {
  const key = cacheKey(symbol, market, year);
  const hit = memoryCache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) {
    lastProviderUsed = hit.provider;
    return hit.events;
  }

  if (!isLiveDividendApiEnabled()) {
    return fallbackAndCache(key, symbol, name, year);
  }

  lastGlobalError = null;

  const yahooExact = await fetchExactDividendsFromYahoo(symbol, name, market, year);
  if (yahooExact?.events.length) {
    saveCache(key, yahooExact.events, 'yahoo', yahooExact.frequency);
    return yahooExact.events;
  }

  if (market === 'US' && FMP_KEY?.trim()) {
    if (FMP_PREMIUM) {
      const exact = await fetchFromFmpDividends(symbol, name, year);
      if (exact?.length) {
        saveCache(key, exact, 'fmp');
        return exact;
      }
    }

    const estimated = await fetchFromFmpProfileEstimate(symbol, name, market, year);
    if (estimated?.length) {
      saveCache(key, estimated, 'fmp-estimate');
      return estimated;
    }
  }

  // 국내 또는 FMP 실패: Finnhub (미국은 FMP 키 있으면 스킵 — 403 방지)
  const skipFinnhub = market === 'US' && Boolean(FMP_KEY?.trim());
  if (!skipFinnhub && FINNHUB_KEY?.trim()) {
    const fh = await fetchFromFinnhub(symbol, name, market, year);
    if (fh?.length) {
      saveCache(key, fh, 'finnhub');
      return fh;
    }
  }

  return fallbackAndCache(key, symbol, name, year);
}

export async function fetchStockPrice(symbol: string, market: 'KR' | 'US'): Promise<number | null> {
  const cached = getCachedStockPrice(symbol);
  if (cached != null) return cached;

  if (FMP_KEY?.trim()) {
    const profile = await fetchFmpProfile(symbol, market);
    if (profile?.price && profile.price > 0) return profile.price;
  }

  return fetchYahooQuotePrice(symbol, market);
}

export async function fetchDividendYield(symbol: string, market: 'KR' | 'US'): Promise<number | null> {
  if (FMP_KEY?.trim()) {
    const cached = getCachedDividendYield(symbol, market);
    if (cached != null) return cached;
    const profile = await fetchFmpProfile(symbol, market);
    if (profile) return getCachedDividendYield(symbol, market);
  }

  if (!FINNHUB_KEY?.trim() || finnhubDividendBlocked) return null;
  const apiSymbol = toApiSymbol(symbol, market);
  try {
    const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(apiSymbol)}&metric=all&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { metric?: { dividendYieldIndicatedAnnual?: number } };
    const y = data.metric?.dividendYieldIndicatedAnnual;
    return y != null && !Number.isNaN(y) ? y * 100 : null;
  } catch {
    return null;
  }
}

async function searchFromFmp(q: string): Promise<StockSearchOutcome['results']> {
  if (!FMP_KEY?.trim()) return [];
  const url = `https://financialmodelingprep.com/stable/search-symbol?query=${encodeURIComponent(q)}&apikey=${FMP_KEY}`;
  sessionFmpCalls += 1;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { symbol: string; name: string; exchange?: string }[];
  return data.slice(0, 8).map((r) => ({
    symbol: r.symbol.replace(/\.(KS|KQ)$/, ''),
    name: r.name,
    market:
      r.exchange?.includes('KO') || r.symbol.endsWith('.KS') || r.symbol.endsWith('.KQ')
        ? ('KR' as const)
        : ('US' as const),
  }));
}

/** 배당 탭 종목 검색 — Finnhub 우선, 401 시 FMP 대체 */
export async function searchSymbols(query: string): Promise<StockSearchOutcome> {
  const q = query.trim();
  const empty: StockSearchOutcome = { results: [], provider: null, warning: null };
  if (q.length < 2 || !isStockSearchEnabled()) return empty;

  const cacheKey = q.toLowerCase();
  const cacheHit = searchCache.get(cacheKey);
  if (cacheHit && Date.now() - cacheHit.fetchedAt < CACHE_TTL_MS) {
    return {
      results: cacheHit.results,
      provider: cacheHit.provider,
      warning: cacheHit.warning,
    };
  }

  let finnhubWarning: string | null = null;

  if (FINNHUB_KEY?.trim()) {
    try {
      const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_KEY}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as { result?: { symbol: string; description: string }[] };
        const results = (data.result ?? []).slice(0, 8).map((r) => ({
          symbol: r.symbol.replace(/\.(KS|KQ)$/, ''),
          name: r.description,
          market: r.symbol.endsWith('.KS') || r.symbol.endsWith('.KQ') ? ('KR' as const) : ('US' as const),
        }));
        const outcome: StockSearchOutcome = { results, provider: 'finnhub', warning: null };
        searchCache.set(cacheKey, { ...outcome, fetchedAt: Date.now() });
        return outcome;
      }
      if (res.status === 401 || res.status === 403) {
        finnhubWarning =
          'Finnhub API 키가 유효하지 않습니다(401). finnhub.io에서 키를 재발급하거나 FMP 검색을 사용합니다.';
      }
    } catch {
      finnhubWarning = 'Finnhub 검색 연결에 실패했습니다.';
    }
  }

  if (FMP_KEY?.trim()) {
    const results = await searchFromFmp(q);
    if (results.length) {
      const outcome: StockSearchOutcome = {
        results,
        provider: 'fmp',
        warning: finnhubWarning,
      };
      searchCache.set(cacheKey, { ...outcome, fetchedAt: Date.now() });
      return outcome;
    }
  }

  return {
    results: [],
    provider: null,
    warning:
      finnhubWarning ??
      (FINNHUB_KEY?.trim() ? '검색 결과가 없습니다.' : 'VITE_FINNHUB_API_KEY 또는 VITE_FMP_API_KEY가 필요합니다.'),
  };
}

export function clearDividendApiCache(): void {
  memoryCache.clear();
  profileCache.clear();
  searchCache.clear();
  lastGlobalError = null;
}

export function getCachedDividendEvents(symbol: string, market: 'KR' | 'US', year: number): DividendEvent[] {
  const hit = memoryCache.get(cacheKey(symbol, market, year));
  if (!hit) return [];
  return hit.events.filter(
    (e) => e.payDate.startsWith(String(year)) || e.exDate.startsWith(String(year))
  );
}
