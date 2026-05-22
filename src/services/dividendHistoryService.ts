import type { DividendEvent } from '../types';

export type PayoutFrequency =
  | 'monthly'
  | 'quarterly'
  | 'semi-annual'
  | 'annual'
  | 'weekly'
  | 'irregular'
  | 'unknown';

export interface ExactDividendResult {
  events: DividendEvent[];
  frequency: PayoutFrequency;
  source: 'yahoo';
}

const YAHOO_CHART_BASE = import.meta.env.DEV
  ? '/api/yahoo/v8/finance/chart'
  : '/api/yahoo/v8/finance/chart';

function yahooChartSymbol(symbol: string, market: 'KR' | 'US'): string {
  const s = symbol.trim().toUpperCase();
  if (market === 'US') return s;
  if (s.includes('.')) return s;
  if (/^\d{6}$/.test(s)) return `${s}.KS`;
  return s;
}

function tsToDateStr(ts: number): string {
  const d = new Date(ts * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 최근 지급 간격(일)으로 배당 주기 추정 */
export function inferPayoutFrequency(payDates: string[]): PayoutFrequency {
  if (payDates.length < 2) return payDates.length === 1 ? 'irregular' : 'unknown';

  const sorted = [...payDates].sort();
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1]).getTime();
    const b = new Date(sorted[i]).getTime();
    gaps.push(Math.round((b - a) / 86400000));
  }
  const median = gaps.sort((x, y) => x - y)[Math.floor(gaps.length / 2)] ?? 0;
  const count = payDates.length;

  if (median <= 10 || count >= 10) return 'monthly';
  if (median <= 20 || count >= 20) return 'weekly';
  if (median >= 55 && median <= 100) return 'quarterly';
  if (median >= 150 && median <= 210) return 'semi-annual';
  if (median >= 330) return 'annual';
  return 'irregular';
}

export function formatFrequencyLabel(freq: PayoutFrequency): string {
  const map: Record<PayoutFrequency, string> = {
    monthly: '월배당',
    quarterly: '분기배당',
    'semi-annual': '반기배당',
    annual: '연배당',
    weekly: '주배당',
    irregular: '불규칙',
    unknown: '주기 미상',
  };
  return map[freq];
}

/**
 * Yahoo Finance 실제 배당 지급일·금액 (개발: Vite 프록시 / 배포: /api/yahoo 리라이트 필요)
 */
export async function fetchExactDividendsFromYahoo(
  symbol: string,
  name: string,
  market: 'KR' | 'US',
  year: number
): Promise<ExactDividendResult | null> {
  const yahooSym = yahooChartSymbol(symbol, market);
  const url = `${YAHOO_CHART_BASE}/${encodeURIComponent(yahooSym)}?range=3y&interval=1d&events=div`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      chart?: {
        result?: {
          events?: {
            dividends?: Record<string, { amount: number; date?: number }>;
          };
        }[];
      };
    };

    const divMap = data.chart?.result?.[0]?.events?.dividends;
    if (!divMap || !Object.keys(divMap).length) return null;

    const currency = market === 'KR' ? ('KRW' as const) : ('USD' as const);
    const allPayDates: string[] = [];
    const raw: { payDate: string; amount: number }[] = [];

    for (const [tsKey, row] of Object.entries(divMap)) {
      const ts = Number(tsKey);
      if (!Number.isFinite(ts) || row.amount <= 0) continue;
      const payDate = tsToDateStr(ts);
      allPayDates.push(payDate);
      raw.push({ payDate, amount: row.amount });
    }

    const frequency = inferPayoutFrequency(allPayDates.slice(-14));
    const events: DividendEvent[] = raw
      .filter((r) => r.payDate.startsWith(String(year)))
      .map((r) => ({
        symbol,
        name,
        exDate: r.payDate,
        payDate: r.payDate,
        amountPerShare: r.amount,
        currency,
      }))
      .sort((a, b) => a.payDate.localeCompare(b.payDate));

    if (!events.length) return null;

    return { events, frequency, source: 'yahoo' };
  } catch {
    return null;
  }
}

/** Yahoo chart meta — 배당 프록시와 동일 경로 */
export async function fetchYahooQuotePrice(
  symbol: string,
  market: 'KR' | 'US'
): Promise<number | null> {
  const yahooSym = yahooChartSymbol(symbol, market);
  const url = `${YAHOO_CHART_BASE}/${encodeURIComponent(yahooSym)}?range=5d&interval=1d`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      chart?: {
        result?: {
          meta?: { regularMarketPrice?: number; previousClose?: number };
        }[];
      };
    };

    const meta = data.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose;
    return price != null && price > 0 ? price : null;
  } catch {
    return null;
  }
}
