import { useMemo, useState } from 'react';
import { useDividendSync } from '../hooks/useDividendSync';
import { useAppStore } from '../store/useAppStore';
import { calcMonthDividends } from '../utils/dividendCalculator';
import { useUsdKrwRate } from '../hooks/useUsdKrwRate';
import { formatWon } from '../utils/format';
import { AddHoldingForm, type AddHoldingFormSubmit } from './AddHoldingForm';
import { ExpenseBars } from './ui/ExpenseBars';
import { Modal } from './ui/Modal';

export function DividendCalendar() {
  const holdings = useAppStore((s) => s.holdings);
  const monthlyCashSavings = useAppStore((s) => s.fire.monthlySavings);
  const { year, month } = useAppStore((s) => s.calendarMonth);
  const setCalendarMonth = useAppStore((s) => s.setCalendarMonth);
  const addHolding = useAppStore((s) => s.addHolding);
  const updateHolding = useAppStore((s) => s.updateHolding);
  const removeHolding = useAppStore((s) => s.removeHolding);
  const { usdKrw } = useUsdKrwRate();

  const divOpts = useMemo(() => ({ usdKrw }), [usdKrw]);
  const { tick } = useDividendSync(holdings, year);

  const [showAdd, setShowAdd] = useState(false);

  const summary = useMemo(
    () => calcMonthDividends(holdings, year, month, divOpts),
    [holdings, year, month, tick, divOpts]
  );

  const monthlyCoverKRW = summary.totalGrossKRW + Math.max(0, monthlyCashSavings);

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setCalendarMonth(y, m);
  };

  const handleAddSubmit = (payload: AddHoldingFormSubmit) => {
    const existing = holdings.find(
      (h) => h.symbol === payload.symbol && h.market === payload.market
    );
    if (existing) {
      updateHolding(existing.id, { shares: existing.shares + payload.shares });
    } else {
      addHolding({
        symbol: payload.symbol,
        name: payload.name,
        market: payload.market,
        shares: payload.shares,
        manual: true,
      });
    }
    setShowAdd(false);
  };

  return (
    <div className="dividend-page">
      <section className="card">
        <div className="month-strip">
          <button type="button" className="btn-ghost" onClick={() => shiftMonth(-1)} aria-label="이전 달">
            ‹
          </button>
          <span className="month-strip__label">
            {year}년 {month}월
          </span>
          <button type="button" className="btn-ghost" onClick={() => shiftMonth(1)} aria-label="다음 달">
            ›
          </button>
        </div>
        <div className="month-strip__amount">{formatWon(summary.totalGrossKRW)}</div>
        <p className="hint-text month-strip__hint">이번 달 예상 배당</p>
      </section>

      <section className="card" id="expenses">
        <div className="card-title">생활비 커버</div>
        <ExpenseBars
          coverKRW={monthlyCoverKRW}
          dividendKRW={summary.totalGrossKRW}
          cashKRW={monthlyCashSavings}
        />
      </section>

      {summary.events.length > 0 && (
        <section className="card">
          <div className="card-title">지급 일정</div>
          <ul className="schedule-list">
            {summary.events.map((e) => (
              <li key={e.date}>
                <span className="schedule-date">{e.date.slice(5).replace('-', '/')}</span>
                <span>{formatWon(e.grossKRW)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="card-title-row">
          <span className="card-title">보유 종목</span>
          <button type="button" className="btn-ghost" onClick={() => setShowAdd(true)}>
            + 추가
          </button>
        </div>

        {holdings.length === 0 ? (
          <p className="hint-text">종목을 추가하면 배당과 커버율이 계산됩니다.</p>
        ) : (
          <ul className="holding-list-simple">
            {holdings.map((h) => (
              <li key={h.id} className="holding-list-simple__row">
                <div className="holding-list-simple__info">
                  <strong>{h.name}</strong>
                  <span className="holding-list-simple__meta">
                    {h.symbol} · {h.shares}주
                  </span>
                </div>
                <input
                  type="number"
                  className="shares-input shares-input--compact"
                  value={h.shares}
                  min={0}
                  onChange={(e) => updateHolding(h.id, Number(e.target.value) || 0)}
                  aria-label={`${h.symbol} 수량`}
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => removeHolding(h.id)}
                  aria-label="삭제"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="종목 추가">
        <AddHoldingForm onSubmit={handleAddSubmit} onCancel={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}
