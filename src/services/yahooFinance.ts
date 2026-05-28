import type { DividendFrequency } from '../types';

export type PayoutFrequency =
  | 'monthly'
  | 'quarterly'
  | 'semi-annual'
  | 'annual'
  | 'weekly'
  | 'irregular'
  | 'unknown';

const YAHOO_BASE = '/api/yahoo';

export function yahooChartSymbol(symbol: string, market: 'KR' | 'US'): string {
  const s = symbol.trim().toUpperCase();
  if (market === 'US') return s;
  if (s.includes('.')) return s;
  if (/^\d{6}$/.test(s)) return `${s}.KS`;
  return s;
}

export function inferPayoutFrequency(payDates: string[]): PayoutFrequency {
  if (payDates.length < 2) return payDates.length === 1 ? 'irregular' : 'unknown';

  const oneYearAgo = Date.now() - 365 * 86400000;
  const inLastYear = payDates.filter((d) => new Date(d).getTime() >= oneYearAgo);
  if (inLastYear.length >= 10) return 'monthly';
  if (inLastYear.length >= 20) return 'weekly';

  const sorted = [...payDates].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(
      Math.round(
        (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000
      )
    );
  }
  const median = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 0;
  const count = payDates.length;

  if (median <= 10 || count >= 10) return 'monthly';
  if (median <= 20 || count >= 20) return 'weekly';
  if (median >= 55 && median <= 100) return 'quarterly';
  if (median >= 150 && median <= 210) return 'semi-annual';
  if (median >= 330) return 'annual';
  return 'irregular';
}

export function payoutToDividendFrequency(freq: PayoutFrequency): DividendFrequency {
  if (freq === 'monthly' || freq === 'weekly') return 'monthly';
  if (freq === 'quarterly') return 'quarterly';
  if (freq === 'semi-annual') return 'semiannual';
  if (freq === 'annual') return 'annual';
  return 'quarterly';
}

function tsToDateStr(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export async function fetchYahooQuotePrice(
  symbol: string,
  market: 'KR' | 'US'
): Promise<number | null> {
  const yahooSym = yahooChartSymbol(symbol, market);
  const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=5d&interval=1d`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: { meta?: { regularMarketPrice?: number; previousClose?: number } }[] };
    };
    const meta = data.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose;
    return price != null && price > 0 ? price : null;
  } catch {
    return null;
  }
}

export async function fetchYahooDividendMeta(
  symbol: string,
  market: 'KR' | 'US'
): Promise<{
  frequency: PayoutFrequency;
  annualPerShare: number;
  currency: 'KRW' | 'USD';
  lastPayMonth?: number;
} | null> {
  const yahooSym = yahooChartSymbol(symbol, market);
  const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=3y&interval=1d&events=div`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      chart?: {
        result?: { events?: { dividends?: Record<string, { amount: number }> } }[];
      };
    };

    const divMap = data.chart?.result?.[0]?.events?.dividends;
    if (!divMap) return null;

    const currency = market === 'KR' ? ('KRW' as const) : ('USD' as const);
    const payDates: string[] = [];
    const rows: { payDate: string; amount: number }[] = [];

    for (const [tsKey, row] of Object.entries(divMap)) {
      const ts = Number(tsKey);
      if (!Number.isFinite(ts) || row.amount <= 0) continue;
      const payDate = tsToDateStr(ts);
      payDates.push(payDate);
      rows.push({ payDate, amount: row.amount });
    }

    if (!rows.length) return null;

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const annualPerShare = rows
      .filter((r) => new Date(r.payDate) >= cutoff)
      .reduce((s, r) => s + r.amount, 0);

    const last = rows.sort((a, b) => b.payDate.localeCompare(a.payDate))[0];
    const lastPayMonth = last ? new Date(last.payDate).getMonth() + 1 : undefined;

    const frequency = inferPayoutFrequency(payDates);

    return {
      frequency,
      annualPerShare: annualPerShare > 0 ? annualPerShare : rows.reduce((s, r) => s + r.amount, 0),
      currency,
      lastPayMonth: frequency === 'monthly' || frequency === 'weekly' ? undefined : lastPayMonth,
    };
  } catch {
    return null;
  }
}

export interface YahooSearchQuote {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
}

export async function searchYahooFinance(query: string): Promise<YahooSearchQuote[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const url = `${YAHOO_BASE}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      quotes?: {
        symbol?: string;
        shortname?: string;
        longname?: string;
        quoteType?: string;
        exchange?: string;
      }[];
    };

    return (data.quotes ?? [])
      .filter((row) => row.symbol && row.quoteType !== 'OPTION')
      .slice(0, 8)
      .map((row) => {
        const sym = row.symbol!.replace(/\.(KS|KQ)$/i, '');
        const ex = row.exchange ?? '';
        const isKr =
          ex.includes('KO') ||
          ex === 'KSC' ||
          ex === 'KOE' ||
          /\.(KS|KQ)$/i.test(row.symbol!);
        return {
          symbol: sym,
          name: row.longname || row.shortname || sym,
          market: isKr ? ('KR' as const) : ('US' as const),
        };
      });
  } catch {
    return [];
  }
}
