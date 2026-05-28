import type { HoldingDividendShare } from '../../utils/dividendChartData';
import { formatWon } from '../../utils/format';

const COLORS = ['var(--green)', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#fb7185'];

interface HoldingShareBarsProps {
  shares: HoldingDividendShare[];
  onSelect?: (holdingId: string) => void;
}

export function HoldingShareBars({ shares, onSelect }: HoldingShareBarsProps) {
  const total = shares.reduce((s, x) => s + x.annualNetKRW, 0);
  if (total === 0) {
    return (
      <p className="hint-text">
        보유 종목 배당이 0원입니다. 종목을 추가하거나 수량을 입력해 보세요.
      </p>
    );
  }

  const maxPct = Math.max(...shares.map((s) => s.pct), 1);

  return (
    <ul className="holding-share-list">
      {shares.map((s, i) => {
        const color = COLORS[i % COLORS.length];
        const barW = (s.pct / maxPct) * 100;
        const Tag = onSelect ? 'button' : 'div';
        return (
          <li key={s.holdingId}>
            <Tag
              type={onSelect ? 'button' : undefined}
              className={`holding-share-row ${onSelect ? 'holding-share-row--clickable' : ''}`}
              onClick={onSelect ? () => onSelect(s.holdingId) : undefined}
            >
              <div className="holding-share-row__head">
                <span className="holding-share-row__sym">{s.symbol}</span>
                <span className="holding-share-row__name">{s.name}</span>
                <span className="holding-share-row__pct">{s.pct.toFixed(1)}%</span>
              </div>
              <div className="holding-share-row__track">
                <div
                  className="holding-share-row__fill"
                  style={{ width: `${barW}%`, background: color }}
                />
              </div>
              <div className="holding-share-row__amt">{formatWon(s.annualNetKRW)} / 연</div>
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}
