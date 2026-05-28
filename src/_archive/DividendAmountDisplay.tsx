import { Amount } from './Amount';

interface DividendAmountDisplayProps {
  /** 세전 배당 (원) */
  grossKRW: number;
  /** @deprecated 세전 금액과 동일하게 사용. 세금 개념 제거됨. */
  netKRW?: number;
  size?: 'hero' | 'inline' | 'compact';
}

export function DividendAmountDisplay({ grossKRW, size = 'inline' }: DividendAmountDisplayProps) {
  if (size === 'hero') {
    return (
      <div className="dividend-amount-hero">
        <Amount value={grossKRW} size="hero" tone="pos" />
      </div>
    );
  }

  if (size === 'compact') {
    return (
      <span className="dividend-amount-compact">
        <Amount value={grossKRW} size="sm" tone="pos" />
      </span>
    );
  }

  return (
    <div className="dividend-amount-inline">
      <Amount value={grossKRW} size="sm" tone="pos" />
    </div>
  );
}
