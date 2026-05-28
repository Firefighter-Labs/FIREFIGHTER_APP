import type { ReactNode } from 'react';

interface AmountProps {
  /** 원 단위 정수 */
  value: number;
  size?: 'hero' | 'lg' | 'md' | 'sm';
  /** 'pos' | 'neg' | 'accent' | undefined(default) */
  tone?: 'pos' | 'neg' | 'accent';
  /** ₩ 접두사 표시 (기본 true) */
  withCurrency?: boolean;
  /** "5.2억 / 5억2천만" 같은 간이 표기 사용 */
  compact?: boolean;
  /** 우측에 작게 표시할 부가 정보 */
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
    <span className={`amount amount--${size}${toneClass} ${className}`}>
      {withCurrency && <span className="amount__currency">₩</span>}
      <span>
        {isNeg && '-'}
        {display}
      </span>
      {suffix && <span className="amount__suffix">{suffix}</span>}
    </span>
  );
}
