import type { DividendEvent } from '../types';

export type DividendFrequency = 'monthly' | 'quarterly';

/** 월배당 ETF/리츠 (FMP 추정·캘린더용) */
export const MONTHLY_US_SYMBOLS = new Set([
  'JEPI',
  'JEPQ',
  'JEPY',
  'DIVO',
  'XYLD',
  'QYLD',
  'RYLD',
  'O', // Realty Income — 월배당 리츠
]);

/** 샘플 배당 일정 (실서비스 시 API/Supabase 연동) */
export const DIVIDEND_CATALOG: Record<
  string,
  Omit<DividendEvent, 'symbol' | 'name'> & { frequency?: DividendFrequency }
> = {
  O: {
    exDate: '2026-01-15',
    payDate: '2026-01-05',
    amountPerShare: 0.26,
    currency: 'USD',
    frequency: 'monthly',
  },
  JEPI: {
    exDate: '2026-01-01',
    payDate: '2026-01-05',
    amountPerShare: 0.39,
    currency: 'USD',
    frequency: 'monthly',
  },
  JEPQ: {
    exDate: '2026-01-01',
    payDate: '2026-01-05',
    amountPerShare: 0.51,
    currency: 'USD',
    frequency: 'monthly',
  },
  SCHD: {
    exDate: '2026-03-26',
    payDate: '2026-03-31',
    amountPerShare: 0.82,
    currency: 'USD',
    frequency: 'quarterly',
  },
  VYM: {
    exDate: '2026-03-20',
    payDate: '2026-03-27',
    amountPerShare: 0.95,
    currency: 'USD',
    frequency: 'quarterly',
  },
  '005930': {
    exDate: '2026-04-10',
    payDate: '2026-04-25',
    amountPerShare: 361,
    currency: 'KRW',
  },
  '035720': {
    exDate: '2026-05-08',
    payDate: '2026-05-22',
    amountPerShare: 120,
    currency: 'KRW',
  },
};

export const STOCK_PRESETS = [
  { symbol: 'O', name: '리얼티인컴 (O)', market: 'US' as const },
  { symbol: 'SCHD', name: 'SCHD', market: 'US' as const },
  { symbol: 'VYM', name: 'VYM', market: 'US' as const },
  { symbol: '005930', name: '삼성전자', market: 'KR' as const },
  { symbol: '035720', name: '카카오', market: 'KR' as const },
];

/** 연간 4회 분할 배당 (미국 ETF) */
export function expandAnnualDividends(
  symbol: string,
  name: string,
  year: number,
  quarterly: { month: number; exDay: number; payDay: number; amount: number; currency: 'KRW' | 'USD' }
): DividendEvent[] {
  const quarters = [0, 3, 6, 9].map((offset) => {
    const m = quarterly.month + offset;
    const month = ((m - 1) % 12) + 1;
    const y = year + Math.floor((m - 1) / 12);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      symbol,
      name,
      exDate: `${y}-${pad(month)}-${pad(quarterly.exDay)}`,
      payDate: `${y}-${pad(month)}-${pad(quarterly.payDay)}`,
      amountPerShare: quarterly.amount,
      currency: quarterly.currency,
    };
  });
  return quarters;
}

/** 연 12회 월배당 (미국 ETF·리츠) */
export function expandMonthlyDividends(
  symbol: string,
  name: string,
  year: number,
  monthly: { payDay: number; exDay: number; amount: number; currency: 'KRW' | 'USD' }
): DividendEvent[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return {
      symbol,
      name,
      exDate: `${year}-${pad(m)}-${pad(monthly.exDay)}`,
      payDate: `${year}-${pad(m)}-${pad(monthly.payDay)}`,
      amountPerShare: monthly.amount,
      currency: monthly.currency,
    };
  });
}

export function isMonthlyDividendSymbol(symbol: string): boolean {
  const s = symbol.trim().toUpperCase();
  const cat = DIVIDEND_CATALOG[s];
  if (cat?.frequency === 'monthly') return true;
  if (cat?.frequency === 'quarterly') return false;
  return MONTHLY_US_SYMBOLS.has(s);
}

export function getDividendScheduleForSymbol(symbol: string, name: string, year: number): DividendEvent[] {
  const cat = DIVIDEND_CATALOG[symbol];
  if (!cat) return [];

  if (cat.currency === 'USD' && isMonthlyDividendSymbol(symbol)) {
    return expandMonthlyDividends(symbol, name, year, {
      exDay: parseInt(cat.exDate.split('-')[2], 10),
      payDay: parseInt(cat.payDate.split('-')[2], 10),
      amount: cat.amountPerShare,
      currency: 'USD',
    });
  }

  if (cat.currency === 'USD' && ['SCHD', 'VYM'].includes(symbol)) {
    const base = new Date(cat.payDate);
    const month = base.getMonth() + 1;
    return expandAnnualDividends(symbol, name, year, {
      month,
      exDay: parseInt(cat.exDate.split('-')[2], 10),
      payDay: parseInt(cat.payDate.split('-')[2], 10),
      amount: cat.amountPerShare,
      currency: 'USD',
    });
  }

  const y = year;
  return [
    {
      symbol,
      name,
      exDate: cat.exDate.replace(/^\d{4}/, String(y)),
      payDate: cat.payDate.replace(/^\d{4}/, String(y)),
      amountPerShare: cat.amountPerShare,
      currency: cat.currency,
    },
  ];
}
