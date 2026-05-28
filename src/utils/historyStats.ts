import type { HistoryEntry, HistoryKind } from '../types';

export function filterHistory(entries: HistoryEntry[], kind: HistoryKind): HistoryEntry[] {
  return entries.filter((e) => e.kind === kind);
}

export function countByKind(entries: HistoryEntry[], kind: HistoryKind): number {
  return filterHistory(entries, kind).length;
}

export function latestBalance(entries: HistoryEntry[]): number {
  const balances = filterHistory(entries, 'balance').sort(
    (a, b) => b.year - a.year || b.month - a.month
  );
  return balances[0]?.amountKRW ?? 0;
}

export function balanceSeries(
  entries: HistoryEntry[],
  yearFilter?: number
): { label: string; value: number }[] {
  let list = filterHistory(entries, 'balance');
  if (yearFilter != null) list = list.filter((e) => e.year === yearFilter);
  const sorted = list.sort((a, b) => a.year - b.year || a.month - b.month);

  // 누적(여러 연도)에서 월 라벨이 중복되지 않도록, 연도 포함 여부를 자동 결정합니다.
  const years = new Set(sorted.map((e) => e.year));
  const labelFor = (e: HistoryEntry) => {
    if (yearFilter != null) return `${e.month}월`;
    if (years.size <= 1) return `${e.month}월`;
    return `${e.year}년 ${e.month}월`;
  };

  return sorted.map((e) => ({ label: labelFor(e), value: e.amountKRW }));
}

export function sumDividendHistory(entries: HistoryEntry[], year?: number): number {
  let list = filterHistory(entries, 'dividend');
  if (year != null) list = list.filter((e) => e.year === year);
  return list.reduce((s, e) => s + e.amountKRW, 0);
}

export function sumCashflow(entries: HistoryEntry[], year?: number): number {
  let list = filterHistory(entries, 'cashflow');
  if (year != null) list = list.filter((e) => e.year === year);
  return list.reduce((s, e) => s + e.amountKRW, 0);
}
