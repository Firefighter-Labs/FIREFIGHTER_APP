export function formatWon(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만`;
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

export function formatFullWon(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

export function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatFullUsd(n: number): string {
  return formatUsd(n);
}
