import type { ExpenseBreakdownItem } from '../../types';
import { formatWon } from '../../utils/format';

export function ExpenseBars({
  items,
  totalKRW,
  grossKRW,
}: {
  items: ExpenseBreakdownItem[];
  totalKRW: number;
  grossKRW?: number;
}) {
  return (
    <div className="expense-bars">
      {items.map((item) => {
        const pct = item.amount > 0 ? Math.min(100, (item.partial / item.amount) * 100) : 0;
        return (
          <div key={item.label} className="expense-row">
            <div className="expense-row__head">
              <span>{item.label}</span>
              <span className={item.covered ? 'covered' : ''}>
                {item.covered ? '✓' : `${formatWon(item.partial)} / ${formatWon(item.amount)}`}
              </span>
            </div>
            <div className="expense-row__track">
              <div
                className={`expense-row__fill ${item.covered ? 'full' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="expense-total">
        이번 달 예상 수령 {formatWon(totalKRW)}
        {grossKRW != null && grossKRW !== totalKRW && (
          <span className="expense-total__gross"> (세전 {formatWon(grossKRW)})</span>
        )}
      </p>
    </div>
  );
}
