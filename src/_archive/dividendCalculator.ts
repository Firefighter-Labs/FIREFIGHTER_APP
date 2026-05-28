import { getDividendScheduleForSymbol } from '../services/dividendMetaService';
import type {
  DividendEvent,
  DividendFrequency,
  DividendTaxSettings,
  ExpenseBreakdownItem,
  ExpenseItem,
  StockHolding,
} from '../types';
import { calcNetDividendKRW, defaultDividendTax } from './dividendTax';
import { toKRW } from './format';

/**
 * 사용자가 수동 입력한 배당 주기·배당률로부터 1년치 이벤트를 생성합니다.
 * - 기준가는 평단가(`avgBuyPrice`, 시장 통화)
 * - 평단가 또는 배당률이 없으면 `null` (API 일정으로 폴백)
 */
function buildManualSchedule(h: StockHolding, year: number): DividendEvent[] | null {
  if (!h.manualFrequency || !h.manualYieldPct || h.manualYieldPct <= 0) return null;
  if (!h.avgBuyPrice || h.avgBuyPrice <= 0) return null;

  const annualPerShare = (h.avgBuyPrice * h.manualYieldPct) / 100;
  if (annualPerShare <= 0) return null;

  const months = frequencyMonths(h.manualFrequency);
  const perPayment = annualPerShare / months.length;
  const currency: DividendEvent['currency'] = h.market === 'US' ? 'USD' : 'KRW';

  return months.map((m): DividendEvent => {
    const date = `${year}-${String(m).padStart(2, '0')}-15`;
    return {
      symbol: h.symbol,
      name: h.name,
      exDate: date,
      payDate: date,
      amountPerShare: perPayment,
      currency,
    };
  });
}

function frequencyMonths(freq: DividendFrequency): number[] {
  switch (freq) {
    case 'monthly':
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    case 'quarterly':
      return [3, 6, 9, 12];
    case 'semiannual':
      return [6, 12];
    case 'annual':
      return [12];
  }
}

export function frequencyLabelKr(freq: DividendFrequency): string {
  switch (freq) {
    case 'monthly':
      return '월배당';
    case 'quarterly':
      return '분기배당';
    case 'semiannual':
      return '반기배당';
    case 'annual':
      return '연배당';
  }
}

export interface DividendCalcOptions {
  usdKrw: number;
  tax?: DividendTaxSettings;
}

export interface DividendLineItem {
  name: string;
  grossKRW: number;
  netKRW: number;
  /** @deprecated netKRW */
  amountKRW: number;
}

export interface DayDividend {
  date: string;
  grossKRW: number;
  netKRW: number;
  totalKRW: number;
  items: DividendLineItem[];
}

export interface MonthDividendSummary {
  totalGrossKRW: number;
  totalNetKRW: number;
  /** 세후 합계 (기존 호환) */
  totalKRW: number;
  byDay: Record<string, DayDividend>;
  events: DayDividend[];
}

/** 사용자가 지출 항목을 한 번도 등록하지 않았을 때 사용하는 폴백 시드 */
const FALLBACK_EXPENSE_TARGETS: ExpenseItem[] = [
  { id: 'fallback-comm', label: '통신비', amountKRW: 50_000 },
  { id: 'fallback-transport', label: '교통비', amountKRW: 80_000 },
  { id: 'fallback-util', label: '공과금', amountKRW: 120_000 },
  { id: 'fallback-food', label: '식비', amountKRW: 400_000 },
  { id: 'fallback-housing', label: '주거비', amountKRW: 800_000 },
];

function resolveOpts(opts?: DividendCalcOptions): Required<DividendCalcOptions> {
  return {
    usdKrw: opts?.usdKrw ?? 1350,
    tax: opts?.tax ?? defaultDividendTax,
  };
}

export function calcMonthDividends(
  holdings: StockHolding[],
  year: number,
  month: number,
  opts?: DividendCalcOptions
): MonthDividendSummary {
  const { usdKrw, tax } = resolveOpts(opts);
  const byDay: Record<string, DayDividend> = {};
  let totalGrossKRW = 0;
  let totalNetKRW = 0;

  for (const h of holdings) {
    const manual = buildManualSchedule(h, year);
    const schedule =
      manual ?? getDividendScheduleForSymbol(h.symbol, h.name, h.market, year);
    for (const ev of schedule) {
      const pay = new Date(ev.payDate);
      if (pay.getFullYear() !== year || pay.getMonth() + 1 !== month) continue;

      const gross = ev.amountPerShare * h.shares;
      const grossKRW = toKRW(gross, ev.currency, usdKrw);
      const netKRW = calcNetDividendKRW(grossKRW, h.market, tax);
      const key = ev.payDate;

      if (!byDay[key]) {
        byDay[key] = { date: key, grossKRW: 0, netKRW: 0, totalKRW: 0, items: [] };
      }
      byDay[key].grossKRW += grossKRW;
      byDay[key].netKRW += netKRW;
      byDay[key].totalKRW += netKRW;
      byDay[key].items.push({
        name: h.name,
        grossKRW,
        netKRW,
        amountKRW: netKRW,
      });
      totalGrossKRW += grossKRW;
      totalNetKRW += netKRW;
    }
  }

  const events = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  return {
    totalGrossKRW,
    totalNetKRW,
    totalKRW: totalNetKRW,
    byDay,
    events,
  };
}

export function calcYearDividends(
  holdings: StockHolding[],
  year: number,
  opts?: DividendCalcOptions
): { grossKRW: number; netKRW: number } {
  let grossKRW = 0;
  let netKRW = 0;
  for (let m = 1; m <= 12; m++) {
    const month = calcMonthDividends(holdings, year, m, opts);
    grossKRW += month.totalGrossKRW;
    netKRW += month.totalNetKRW;
  }
  return { grossKRW, netKRW };
}

/**
 * 사용자가 등록한 지출 항목을 배당이 어떻게 커버하는지 분해합니다.
 * - `expenses`가 비었거나 미지정이면 폴백 시드를 사용
 * - 금액이 0인 항목은 무시
 * - 항목 순서대로 우선 커버 (사용자가 정한 우선순위 반영)
 */
export function getExpenseBreakdown(
  totalKRW: number,
  expenses?: ExpenseItem[]
): ExpenseBreakdownItem[] {
  const source =
    expenses && expenses.length > 0 ? expenses : FALLBACK_EXPENSE_TARGETS;
  if (source.length === 0) return [];

  let remaining = totalKRW;
  return source.map((t) => {
    const amount = Math.max(0, t.amountKRW || 0);
    if (amount <= 0) {
      return { label: t.label, amount: 0, covered: true, partial: 0 };
    }
    if (remaining >= amount) {
      remaining -= amount;
      return { label: t.label, amount, covered: true, partial: amount };
    }
    const partial = Math.max(0, remaining);
    remaining = 0;
    return { label: t.label, amount, covered: false, partial };
  });
}

/** 등록된 지출 항목의 합계 (KRW) — 0이면 사용자가 등록하지 않은 것으로 간주 */
export function sumExpenseItems(expenses?: ExpenseItem[]): number {
  if (!expenses || expenses.length === 0) return 0;
  return expenses.reduce((sum, e) => sum + Math.max(0, e.amountKRW || 0), 0);
}

/** 전체 배당·현금이 생활비를 얼마나 덮는지 한 줄 요약 */
export function getExpenseCoverageMessage(
  coverKRW: number,
  expenses?: ExpenseItem[]
): string {
  const totalExpense = sumExpenseItems(expenses);
  if (totalExpense <= 0) {
    return `이번 달 수입 ${Math.round(coverKRW / 10000)}만 원 — 지출 항목을 등록해 보세요.`;
  }
  const pct = Math.min(100, (coverKRW / totalExpense) * 100);
  const gap = Math.max(0, totalExpense - coverKRW);
  if (pct >= 100) return '배당·현금으로 이번 달 생활비를 충당할 수 있습니다.';
  return `생활비 커버 ${pct.toFixed(0)}% · ${Math.round(gap / 10000)}만 원 부족`;
}
