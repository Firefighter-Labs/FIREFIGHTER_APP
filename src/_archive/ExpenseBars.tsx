import { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { sumExpenseItems } from '../../utils/dividendCalculator';
import { formatWon } from '../../utils/format';

interface ExpenseBarsProps {
  /** 배당 + 현금 저축 합계 (전체 커버 계산용) */
  coverKRW: number;
  dividendKRW?: number;
  cashKRW?: number;
}

export function ExpenseBars({ coverKRW, dividendKRW = 0, cashKRW = 0 }: ExpenseBarsProps) {
  const expenses = useAppStore((s) => s.expenses);
  const addExpense = useAppStore((s) => s.addExpense);
  const updateExpense = useAppStore((s) => s.updateExpense);
  const removeExpense = useAppStore((s) => s.removeExpense);
  const resetExpensesToDefaults = useAppStore((s) => s.resetExpensesToDefaults);

  const [editing, setEditing] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');

  const totalExpense = useMemo(() => sumExpenseItems(expenses), [expenses]);
  const coveragePct =
    totalExpense > 0 ? Math.min(100, (coverKRW / totalExpense) * 100) : 0;
  const gapKRW = Math.max(0, totalExpense - coverKRW);

  const handleAdd = () => {
    const label = newLabel.trim();
    const amount = typeof newAmount === 'number' ? newAmount : Number(newAmount);
    if (!label || !Number.isFinite(amount) || amount <= 0) return;
    addExpense({ label, amountKRW: amount });
    setNewLabel('');
    setNewAmount('');
  };

  if (expenses.length === 0) {
    return (
      <div className="expense-bars expense-bars--empty">
        <p className="hint-text">월 지출을 항목별로 적어두면 생활비 합계가 잡힙니다.</p>
        <button type="button" className="btn-primary" onClick={resetExpensesToDefaults}>
          기본 항목으로 시작
        </button>
      </div>
    );
  }

  return (
    <div className="expense-bars">
      {totalExpense > 0 && (
        <div className="expense-cover-summary">
          <div className="expense-cover-summary__nums">
            <div>
              <span className="expense-cover-summary__label">배당·현금</span>
              <strong className="expense-cover-summary__value num--pos">
                {formatWon(coverKRW)}
              </strong>
              {(dividendKRW > 0 || cashKRW > 0) && (
                <span className="expense-cover-summary__sub">
                  {dividendKRW > 0 && `배당 ${formatWon(dividendKRW)}`}
                  {dividendKRW > 0 && cashKRW > 0 && ' · '}
                  {cashKRW > 0 && `현금 ${formatWon(cashKRW)}`}
                </span>
              )}
            </div>
            <div>
              <span className="expense-cover-summary__label">월 지출</span>
              <strong className="expense-cover-summary__value">{formatWon(totalExpense)}</strong>
            </div>
          </div>
          <div className="progress-line">
            <div className="progress-line__fill" style={{ width: `${coveragePct}%` }} />
          </div>
          <p className="expense-cover-summary__foot">
            {coveragePct >= 100
              ? '생활비를 충당할 수 있습니다'
              : `커버 ${coveragePct.toFixed(0)}% · 부족 ${formatWon(gapKRW)}`}
          </p>
        </div>
      )}

      <div className="expense-ledger-head">
        <span className="expense-ledger-head__title">지출 기록</span>
        <button
          type="button"
          className="btn-ghost expense-bars__edit-toggle"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? '완료' : '편집'}
        </button>
      </div>
      <p className="hint-text expense-ledger-hint">항목별 금액은 기록용이며, 합계가 월 생활비가 됩니다.</p>

      <ul className="expense-ledger">
        {expenses.map((expense) => {
          const amount = Math.max(0, expense.amountKRW || 0);

          if (editing) {
            return (
              <li key={expense.id} className="expense-ledger__row expense-ledger__row--edit">
                <input
                  className="expense-edit__label"
                  value={expense.label}
                  onChange={(e) => updateExpense(expense.id, { label: e.target.value })}
                  maxLength={20}
                />
                <input
                  className="expense-edit__amount"
                  type="number"
                  inputMode="numeric"
                  value={expense.amountKRW}
                  min={0}
                  step={10000}
                  onChange={(e) =>
                    updateExpense(expense.id, { amountKRW: Number(e.target.value) || 0 })
                  }
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => removeExpense(expense.id)}
                  aria-label="삭제"
                >
                  ×
                </button>
              </li>
            );
          }

          return (
            <li key={expense.id} className="expense-ledger__row">
              <span className="expense-ledger__label">{expense.label}</span>
              <span className="expense-ledger__amount">{formatWon(amount)}</span>
            </li>
          );
        })}
      </ul>

      {editing && (
        <div className="expense-add">
          <input
            className="expense-add__label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="항목명"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <input
            className="expense-add__amount"
            type="number"
            inputMode="numeric"
            value={newAmount}
            placeholder="금액"
            onChange={(e) => {
              const v = e.target.value;
              setNewAmount(v === '' ? '' : Number(v));
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            type="button"
            className="btn-primary expense-add__submit"
            onClick={handleAdd}
            disabled={!newLabel.trim() || !newAmount || newAmount <= 0}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
