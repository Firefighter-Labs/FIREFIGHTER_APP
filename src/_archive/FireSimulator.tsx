import { useDashboard } from '../hooks/useDashboard';
import { useDividendSync } from '../hooks/useDividendSync';
import { useAppStore } from '../store/useAppStore';
import { formatWon } from '../utils/format';

export function FireSimulator() {
  const holdings = useAppStore((s) => s.holdings);
  const setTab = useAppStore((s) => s.setTab);
  const year = useAppStore((s) => s.calendarMonth.year);
  const dash = useDashboard();
  useDividendSync(holdings, year);

  const df = dash.dividendFire;
  const coverage = Math.min(100, df.coveragePct);

  return (
    <div className="fire-page">
      <section className="hero-stat">
        <div className="hero-stat__label">생활비 커버</div>
        {df.isFIRE ? (
          <div className="hero-stat__big hero-stat__big--fire">FIRE</div>
        ) : (
          <div className="hero-stat__big">
            {df.coveragePct.toFixed(0)}
            <small>%</small>
          </div>
        )}
        <div className="progress-line">
          <div className="progress-line__fill" style={{ width: `${coverage}%` }} />
        </div>
        <div className="hero-stat__sub">
          {df.isFIRE
            ? '배당 + 현금 저축으로 생활비 충당'
            : `월 ${formatWon(df.monthlyGapKRW)} 부족`}
        </div>
      </section>

      <ul className="stat-list">
        <li>
          <span className="stat-list__label">월 배당</span>
          <span className="stat-list__value num--pos">
            {df.hasHoldings ? formatWon(df.monthlyDividendGross) : '—'}
          </span>
        </li>
        <li>
          <span className="stat-list__label">월 현금 저축</span>
          <span className="stat-list__value">
            {df.monthlyCashSavings > 0 ? formatWon(df.monthlyCashSavings) : '—'}
          </span>
        </li>
        <li>
          <button type="button" className="stat-list__row-btn" onClick={() => setTab('dividend')}>
            <span className="stat-list__label">
              월 생활비
              <span className="stat-list__hint">배당 탭 · 지출 항목 합계</span>
            </span>
            <span className="stat-list__value">
              {formatWon(df.monthlyExpense)}
              <span className="stat-list__arrow">›</span>
            </span>
          </button>
        </li>
      </ul>

      <button type="button" className="row-link" onClick={() => setTab('dividend')}>
        <span className="row-link__title">종목 · 지출 관리</span>
        <span className="row-link__sub">{dash.holdingsCount}개 종목</span>
        <span className="row-link__arrow">›</span>
      </button>
    </div>
  );
}
