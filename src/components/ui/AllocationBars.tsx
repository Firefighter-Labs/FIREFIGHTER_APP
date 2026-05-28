import type { HoldingShare } from '../../utils/dividendSeries';
import { formatWon } from '../../utils/format';

interface AllocationBarsProps {
  shares: HoldingShare[];
  onSelect?: (id: string) => void;
}

export function AllocationBars({ shares, onSelect }: AllocationBarsProps) {
  if (shares.length === 0) {
    return <p className="empty-inline">등록된 종목이 없습니다.</p>;
  }

  return (
    <ul className="alloc-list">
      {shares.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            className="alloc-row"
            onClick={() => onSelect?.(s.id)}
            disabled={!onSelect}
          >
            <div className="alloc-row__head">
              <span className="alloc-row__name">{s.name}</span>
              <span className="alloc-row__pct">{s.pct.toFixed(0)}%</span>
            </div>
            <div className="alloc-row__track">
              <div className="alloc-row__fill" style={{ width: `${s.pct}%` }} />
            </div>
            <span className="alloc-row__sub">연 {formatWon(s.annualKRW)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
