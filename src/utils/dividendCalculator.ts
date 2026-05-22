import { getDividendScheduleForSymbol } from '../services/dividendMetaService';
import type { DividendTaxSettings } from '../types';
import { calcNetDividendKRW, defaultDividendTax } from './dividendTax';
import { toKRW } from './format';
import type { ExpenseBreakdownItem, StockHolding } from '../types';

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

const EXPENSE_TARGETS = [
  { label: '통신비', amount: 50_000 },
  { label: '교통비', amount: 80_000 },
  { label: '전기세', amount: 120_000 },
  { label: '식비', amount: 400_000 },
  { label: '월세', amount: 800_000 },
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
    const schedule = getDividendScheduleForSymbol(h.symbol, h.name, h.market, year);
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

export function getExpenseBreakdown(totalKRW: number): ExpenseBreakdownItem[] {
  let remaining = totalKRW;
  return EXPENSE_TARGETS.map((t) => {
    if (remaining >= t.amount) {
      remaining -= t.amount;
      return { label: t.label, amount: t.amount, covered: true, partial: t.amount };
    }
    const partial = Math.max(0, remaining);
    remaining = 0;
    return { label: t.label, amount: t.amount, covered: false, partial };
  });
}

export function getExpenseCoverageMessage(totalNetKRW: number): string {
  const items = getExpenseBreakdown(totalNetKRW);
  const covered = items.filter((i) => i.covered).map((i) => i.label);
  const next = items.find((i) => !i.covered && i.partial < i.amount);

  if (covered.length === 0) {
    return `이번 달 예상 수령액 ${Math.round(totalNetKRW / 10000)}만 원 — 꾸준히 쌓아가요!`;
  }
  const coveredStr = covered.join('+');
  const nextMsg = next
    ? ` 다음 목표는 ${next.label} (${Math.round((next.amount - next.partial) / 10000)}만 원 더)!`
    : ' 생활비 영역 거의 완료!';
  return `세후 배당으로 ${coveredStr} 해결 완료!${nextMsg}`;
}
