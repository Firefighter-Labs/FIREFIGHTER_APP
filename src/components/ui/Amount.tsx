import type { ReactNode } from 'react';

interface AmountProps {
  value: number;
  size?: 'hero' | 'lg' | 'md' | 'sm';
  tone?: 'pos' | 'neg' | 'accent' | 'muted';
  withCurrency?: boolean;
  compact?: boolean;
  suffix?: ReactNode;
  className?: string;
}

function formatCompactKR(n: number): string {
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return eok >= 10 ? `${Math.round(eok)}억` : `${eok.toFixed(1)}억`;
  }
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만`;
  return Math.round(n).toLocaleString('ko-KR');
}

function formatFullKR(n: number): string {
  return Math.round(n).toLocaleString('ko-KR');
}

export function Amount({
  value,
  size = 'md',
  tone,
  withCurrency = true,
  compact = false,
  suffix,
  className = '',
}: AmountProps) {
  const isNeg = value < 0;
  const abs = Math.abs(value);
  const display = compact ? formatCompactKR(abs) : formatFullKR(abs);
  const toneClass = tone ? ` amount--${tone}` : isNeg ? ' amount--neg' : '';

  return (
    <span className={`amount amount--${size}${toneClass} ${className}`.trim()}>
      {withCurrency && <span className="amount__currency">₩</span>}
      <span className="amount__value">
        {isNeg && '−'}
        {display}
      </span>
      {suffix && <span className="amount__suffix">{suffix}</span>}
    </span>
  );
}
