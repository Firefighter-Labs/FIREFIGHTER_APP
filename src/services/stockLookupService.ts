import type { DividendFrequency } from '../types';
import { fetchUsdKrwRate, usdToKrw } from './exchangeRateService';
import {
  fetchYahooDividendMeta,
  fetchYahooQuotePrice,
  payoutToDividendFrequency,
  searchYahooFinance,
  yahooChartSymbol,
  type YahooSearchQuote,
} from './yahooFinance';

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;
const FMP_KEY = import.meta.env.VITE_FMP_API_KEY as string | undefined;

export interface StockSearchResult {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
}

export interface StockAutoFill {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
  logoUrl: string | null;
  price: number | null;
  priceCurrency: 'KRW' | 'USD';
  frequency: DividendFrequency;
  nextPayMonth?: number;
  /** 주당 연간 배당 (원, KR) */
  annualDividendKRW: number;
  /** 주당 연간 배당 (USD, US) */
  annualDividendUSD: number;
  /** 평가금액 (원) */
  marketValueKRW: number;
  /** 평가금액 (USD) */
  marketValueUSD: number;
  source: 'yahoo' | 'fmp' | 'finnhub';
}

const searchCache = new Map<string, { results: StockSearchResult[]; at: number }>();
const logoCache = new Map<string, string | null>();

function toApiSymbol(symbol: string, market: 'KR' | 'US'): string {
  const s = symbol.trim().toUpperCase();
  if (market === 'US') return s;
  if (s.includes('.')) return s;
  if (/^\d{6}$/.test(s)) return `${s}.KS`;
  return s;
}

export function isStockSearchEnabled(): boolean {
  return true;
}

export function stockLogoUrl(symbol: string, market: 'KR' | 'US', remoteLogo?: string | null): string | null {
  const key = `${market}:${symbol}`;
  if (remoteLogo) {
    logoCache.set(key, remoteLogo);
    return remoteLogo;
  }
  if (logoCache.has(key)) return logoCache.get(key) ?? null;

  const sym = toApiSymbol(symbol, market);
  const fmp = `https://financialmodelingprep.com/image-stock/${encodeURIComponent(sym)}.png`;
  logoCache.set(key, fmp);
  return fmp;
}

async function searchFinnhub(q: string): Promise<StockSearchResult[]> {
  if (!FINNHUB_KEY?.trim()) return [];
  try {
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { result?: { symbol: string; description: string }[] };
    return (data.result ?? []).slice(0, 8).map((r) => ({
      symbol: r.symbol.replace(/\.(KS|KQ)$/i, ''),
      name: r.description,
      market: /\.(KS|KQ)$/i.test(r.symbol) ? ('KR' as const) : ('US' as const),
    }));
  } catch {
    return [];
  }
}

async function searchFmp(q: string): Promise<StockSearchResult[]> {
  if (!FMP_KEY?.trim()) return [];
  try {
    const url = `https://financialmodelingprep.com/stable/search-symbol?query=${encodeURIComponent(q)}&apikey=${FMP_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { symbol: string; name: string; exchange?: string }[];
    return data.slice(0, 8).map((r) => ({
      symbol: r.symbol.replace(/\.(KS|KQ)$/i, ''),
      name: r.name,
      market:
        r.exchange?.includes('KO') || /\.(KS|KQ)$/i.test(r.symbol) ? ('KR' as const) : ('US' as const),
    }));
  } catch {
    return [];
  }
}

function dedupeResults(list: StockSearchResult[]): StockSearchResult[] {
  const seen = new Set<string>();
  return list.filter((r) => {
    const k = `${r.market}:${r.symbol}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const cacheKey = q.toLowerCase();
  const hit = searchCache.get(cacheKey);
  if (hit && Date.now() - hit.at < 1000 * 60 * 10) return hit.results;

  let results: StockSearchResult[] = [];

  const fh = await searchFinnhub(q);
  if (fh.length) results = fh;
  else {
    const fmp = await searchFmp(q);
    if (fmp.length) results = fmp;
    else results = await searchYahooFinance(q);
  }

  results = dedupeResults(results);
  searchCache.set(cacheKey, { results, at: Date.now() });
  return results;
}

async function fetchFinnhubLogo(symbol: string, market: 'KR' | 'US'): Promise<string | null> {
  if (!FINNHUB_KEY?.trim()) return null;
  try {
    const apiSymbol = toApiSymbol(symbol, market);
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(apiSymbol)}&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { logo?: string; name?: string };
    return data.logo || null;
  } catch {
    return null;
  }
}

async function fetchFmpProfile(
  symbol: string,
  market: 'KR' | 'US'
): Promise<{ companyName?: string; name?: string; price?: number; lastDividend?: number } | null> {
  if (!FMP_KEY?.trim()) return null;
  try {
    const apiSymbol = toApiSymbol(symbol, market);
    const url = `https://financialmodelingprep.com/stable/profile?symbol=${encodeURIComponent(apiSymbol)}&apikey=${FMP_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { companyName?: string; price?: number; lastDividend?: number }[];
    return data[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchStockAutoFill(
  pick: StockSearchResult | YahooSearchQuote,
  shares = 1
): Promise<StockAutoFill> {
  const { symbol, name, market } = pick;
  const safeShares = Math.max(0, shares);

  const [yahooDiv, yahooPrice, finnhubLogo, fmpProfile, usdKrw] = await Promise.all([
    fetchYahooDividendMeta(symbol, market),
    fetchYahooQuotePrice(symbol, market),
    fetchFinnhubLogo(symbol, market),
    fetchFmpProfile(symbol, market),
    fetchUsdKrwRate(),
  ]);

  const displayName = fmpProfile?.companyName || name;
  const price = yahooPrice ?? fmpProfile?.price ?? null;
  const priceCurrency = market === 'KR' ? ('KRW' as const) : ('USD' as const);

  let annualPerShare = yahooDiv?.annualPerShare ?? fmpProfile?.lastDividend ?? 0;
  if (annualPerShare <= 0 && price != null && fmpProfile?.lastDividend) {
    annualPerShare = fmpProfile.lastDividend;
  }

  let annualDividendKRW = 0;
  let annualDividendUSD = 0;
  if (annualPerShare > 0) {
    if (market === 'KR') {
      annualDividendKRW = Math.round(annualPerShare);
    } else {
      annualDividendUSD = Math.round(annualPerShare * 100) / 100;
      annualDividendKRW = usdToKrw(annualDividendUSD, usdKrw);
    }
  }

  let marketValueKRW = 0;
  let marketValueUSD = 0;
  if (price != null && safeShares > 0) {
    if (market === 'KR') {
      marketValueKRW = Math.round(price * safeShares);
    } else {
      marketValueUSD = Math.round(price * safeShares * 100) / 100;
      marketValueKRW = usdToKrw(marketValueUSD, usdKrw);
    }
  }

  const frequency = yahooDiv
    ? payoutToDividendFrequency(yahooDiv.frequency)
    : ('quarterly' as DividendFrequency);

  const logoUrl = stockLogoUrl(symbol, market, finnhubLogo);

  return {
    symbol,
    name: displayName,
    market,
    logoUrl,
    price,
    priceCurrency,
    frequency,
    nextPayMonth: yahooDiv?.lastPayMonth,
    annualDividendKRW,
    annualDividendUSD,
    marketValueKRW,
    marketValueUSD,
    source: yahooDiv || yahooPrice ? 'yahoo' : fmpProfile ? 'fmp' : 'finnhub',
  };
}

export { yahooChartSymbol };
