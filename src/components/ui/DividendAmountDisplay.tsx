import { formatFullWon, formatWon } from '../../utils/format';

interface DividendAmountDisplayProps {
  grossKRW: number;
  netKRW: number;
  size?: 'hero' | 'inline' | 'compact';
}

export function DividendAmountDisplay({ grossKRW, netKRW, size = 'inline' }: DividendAmountDisplayProps) {
  if (size === 'hero') {
    return (
      <div className="dividend-amount-hero">
        <div className="dividend-amount-hero__row">
          <span className="dividend-amount-hero__label">세전 (원본)</span>
          <span className="dividend-amount-hero__gross">{formatWon(grossKRW)}</span>
        </div>
        <div className="dividend-amount-hero__row dividend-amount-hero__row--net">
          <span className="dividend-amount-hero__label">예상 수령 (세후)</span>
          <span className="dividend-amount-hero__net">{formatWon(netKRW)}</span>
        </div>
      </div>
    );
  }

  if (size === 'compact') {
    return (
      <span className="dividend-amount-compact">
        <span className="dividend-amount-compact__net">{formatWon(netKRW)}</span>
        <span className="dividend-amount-compact__gross"> ({formatFullWon(grossKRW)} 세전)</span>
      </span>
    );
  }

  return (
    <div className="dividend-amount-inline">
      <span>
        세전 <strong>{formatWon(grossKRW)}</strong>
      </span>
      <span className="dividend-amount-inline__arrow">→</span>
      <span>
        수령 <strong className="accent-green-text">{formatWon(netKRW)}</strong>
      </span>
    </div>
  );
}
