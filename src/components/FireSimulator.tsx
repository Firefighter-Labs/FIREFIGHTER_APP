import { useEffect, useMemo, useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useDividendSync } from '../hooks/useDividendSync';
import { usePortfolioAllocation } from '../hooks/usePortfolioAllocation';
import { useAppStore } from '../store/useAppStore';
import {
  daysSavedByDividendReinvest,
  getDividendMotivationMessage,
} from '../utils/dividendFireCalculator';
import { SAVINGS_PRESETS } from '../utils/fireCalculator';
import { toKRW } from '../utils/format';
import { formatCountdown, formatFullWon, formatWon } from '../utils/format';
import { MoneyEditor } from './ui/MoneyEditor';
import { PortfolioEditor } from './ui/PortfolioEditor';
import { ProgressRing } from './ui/ProgressRing';

const SAVINGS_PRESETS_UI = [
  { label: '100만', value: 1_000_000 },
  { label: '200만', value: 2_000_000 },
  { label: '300만', value: 3_000_000 },
  { label: '500만', value: 5_000_000 },
];

const EXPENSE_PRESETS = [
  { label: '알뜰 150만', value: 1_500_000 },
  { label: '보통 200만', value: 2_000_000 },
  { label: '여유 250만', value: 2_500_000 },
  { label: '넉넉 300만', value: 3_000_000 },
];

const YIELD_PRESETS = [3, 4, 5, 6] as const;

export function FireSimulator() {
  const fire = useAppStore((s) => s.fire);
  const holdings = useAppStore((s) => s.holdings);
  const setTab = useAppStore((s) => s.setTab);
  const updateFire = useAppStore((s) => s.updateFire);
  const year = useAppStore((s) => s.calendarMonth.year);
  const dash = useDashboard();
  useDividendSync(holdings, year);
  const { allocation: portfolio } = usePortfolioAllocation(
    holdings,
    fire.totalAssets,
    fire.currency,
    dash.usdKrw
  );

  useEffect(() => {
    if (!portfolio.fromHoldings) return;
    if (fire.stockRatio !== portfolio.stockRatio) {
      updateFire({ stockRatio: portfolio.stockRatio });
    }
  }, [portfolio.fromHoldings, portfolio.stockRatio, fire.stockRatio, updateFire]);

  const df = dash.dividendFire;
  const yieldPct = fire.assumedDividendYieldPct ?? 4;

  const [tick, setTick] = useState(0);
  const [planOpen, setPlanOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const assetsKRW =
    fire.currency === 'USD' ? toKRW(fire.totalAssets, 'USD') : fire.totalAssets;

  const motivation = getDividendMotivationMessage(
    daysSavedByDividendReinvest(
      SAVINGS_PRESETS[0],
      df.monthlyExpense,
      df.monthsToTarget,
      yieldPct
    ),
    SAVINGS_PRESETS[0],
    df.coveragePct
  );

  const msRemaining = useMemo(() => {
    if (df.isFIRE || !df.retirementDate) return 0;
    return Math.max(0, df.retirementDate.getTime() - Date.now());
  }, [df.retirementDate, df.isFIRE, tick]);

  const countdown = formatCountdown(msRemaining);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fire-page">
      <section className="card fire-hero">
        <div className="fire-hero__top">
          <span className="fire-hero__badge">
            {dash.tierEmoji} {dash.tier}
          </span>
          {!df.isFIRE && df.monthsToTarget < 9999 && (
            <span className="fire-hero__eta">약 {df.yearsToFIRE}년 후 배당 탈출</span>
          )}
        </div>

        <div className="fire-hero__body">
          <ProgressRing progress={df.coveragePct}>
            {df.isFIRE ? (
              <>
                <span className="ring-label">배당</span>
                <span className="ring-value">FIRE</span>
              </>
            ) : (
              <>
                <span className="ring-value">{df.coveragePct.toFixed(0)}%</span>
                <span className="ring-label">생활비 커버</span>
              </>
            )}
          </ProgressRing>

          <div className="fire-hero__stats">
            {!df.hasHoldings ? (
              <p className="fire-hero__celebrate" style={{ fontSize: '0.9rem' }}>
                배당 탭에서 종목·수량을 등록하면
                <br />
                월 배당으로 커버율이 계산됩니다.
              </p>
            ) : df.isFIRE ? (
              <p className="fire-hero__celebrate">
                🎉 월 배당 {formatWon(df.monthlyDividend)}이 생활비를 덮었습니다!
              </p>
            ) : (
              <>
                <div className="live-timer">
                  <span className="live-timer__num">
                    {countdown.totalSeconds.toLocaleString('ko-KR')}
                  </span>
                  <span className="live-timer__unit">초 남음</span>
                </div>
                <div className="mini-countdown">
                  {[
                    [countdown.days, '일'],
                    [countdown.hours, '시'],
                    [countdown.minutes, '분'],
                    [countdown.seconds, '초'],
                  ].map(([n, u]) => (
                    <span key={String(u)}>
                      <b>{n}</b>
                      {u}
                    </span>
                  ))}
                </div>
                {df.retirementDate && (
                  <p className="fire-hero__date">
                    배당 100% 커버 예상 {df.retirementDate.toLocaleDateString('ko-KR')}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <div className="motivation-banner">{motivation}</div>

      <div className="insight-row">
        <div className="insight-card">
          <span className="insight-card__label">예상 월 수령</span>
          <span className="insight-card__value accent-green">
            {df.hasHoldings ? formatWon(df.monthlyDividendNet) : '—'}
          </span>
          {df.hasHoldings && df.monthlyDividendGross > df.monthlyDividendNet && (
            <span className="insight-card__sub">세전 {formatWon(df.monthlyDividendGross)}</span>
          )}
        </div>
        <div className="insight-card">
          <span className="insight-card__label">목표 생활비</span>
          <span className="insight-card__value">{formatWon(df.monthlyExpense)}</span>
        </div>
        <div className="insight-card">
          <span className="insight-card__label">부족 (월)</span>
          <span className="insight-card__value accent-orange">
            {df.isFIRE ? '0' : formatWon(df.monthlyGapKRW)}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="card fire-holdings-cta"
        onClick={() => setTab('dividend')}
      >
        <span className="fire-holdings-cta__icon">📅</span>
        <div>
          <strong>배당 종목 {dash.holdingsCount}개</strong>
          <p>
            이번 달 수령 {formatWon(dash.monthDiv.totalNetKRW)} (세전 {formatWon(dash.monthDiv.totalGrossKRW)}) · 연간
            수령 {formatWon(dash.yearDiv.netKRW)}
          </p>
        </div>
        <span className="fire-holdings-cta__arrow">→</span>
      </button>

      <button
        type="button"
        className="section-toggle"
        onClick={() => setPlanOpen((o) => !o)}
        aria-expanded={planOpen}
      >
        <span>나의 배당 탈출 플랜</span>
        <span className="section-toggle__hint">{planOpen ? '접기' : '설정하기'}</span>
      </button>

      {planOpen && (
        <div className="plan-stack">
          <section className="card plan-card">
            <div className="plan-step">1</div>
            <MoneyEditor
              icon="🏠"
              title="은퇴 후 월 생활비 (목표)"
              subtitle="배당 현금흐름이 이 금액을 채우면 FIRE"
              value={fire.monthlyExpense}
              onChange={(v) => updateFire({ monthlyExpense: v })}
              presets={EXPENSE_PRESETS}
              step={100_000}
              max={10_000_000}
            />
          </section>

          <section className="card plan-card">
            <div className="plan-step">2</div>
            <MoneyEditor
              icon="📈"
              title="매달 배당주에 넣는 금액"
              subtitle={`가정 수익률 ${yieldPct}% → 월 배당이 조금씩 늘어난다고 계산`}
              value={fire.monthlySavings}
              onChange={(v) => updateFire({ monthlySavings: v })}
              presets={SAVINGS_PRESETS_UI}
              step={100_000}
              max={15_000_000}
            />
            <div className="withdrawal-rate-block">
              <p className="withdrawal-rate-block__title">배당주 가정 수익률</p>
              <p className="withdrawal-rate-block__hint">
                저축액이 모두 배당 ETF/주식에 들어간다고 가정할 때의 연 수익률입니다.
              </p>
              <div className="currency-pill-row">
                {YIELD_PRESETS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={`currency-pill ${yieldPct === rate ? 'active' : ''}`}
                    onClick={() => updateFire({ assumedDividendYieldPct: rate })}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card plan-card plan-card--muted">
            <div className="plan-step">3</div>
            <p className="plan-card__lead">
              <strong>보유 종목·수량</strong>은 배당 탭에서 관리합니다. SCHD, O 등을 넣으면 캘린더와
              여기 커버율이 같이 바뀝니다.
            </p>
            <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={() => setTab('dividend')}>
              배당 탭에서 종목 등록
            </button>
          </section>

          <section className="card plan-card">
            <div className="plan-step">4</div>
            <MoneyEditor
              icon="💰"
              title="총 자산 (커뮤니티 뱃지용)"
              subtitle={`현재 약 ${formatWon(assetsKRW)} · 배당 FIRE 계산과는 별도`}
              value={fire.totalAssets}
              onChange={(v) => updateFire({ totalAssets: v })}
              presets={[
                { label: '5천만', value: 50_000_000 },
                { label: '1억', value: 100_000_000 },
                { label: '3억', value: 300_000_000 },
              ]}
              step={fire.currency === 'USD' ? 10_000 : 5_000_000}
              max={fire.currency === 'USD' ? 5_000_000 : 2_000_000_000}
            />
          </section>

          <section className="card plan-card">
            <div className="plan-step">5</div>
            <PortfolioEditor
              allocation={portfolio}
              onOpenDividendTab={() => setTab('dividend')}
            />
          </section>

          <details
            className="card plan-card fire-advanced"
            open={advancedOpen}
            onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary>고급 · 총자산 인출형 FIRE 참고</summary>
            <p className="hint-text">
              클래식 4% 법칙(총 자산에서 인출) 목표는 참고용입니다. 이 앱의 메인 목표는{' '}
              <strong>배당 현금흐름</strong>입니다.
            </p>
          </details>
        </div>
      )}

      <section className="card sim-card">
        <div className="card-title">⚡ 배당 재투자 시뮬</div>
        <p className="hint-text">한 번 더 저축·매수하면 배당 커버율이 얼마나 빨리 오르는지 봅니다.</p>
        <div className="sim-grid">
          {SAVINGS_PRESETS.map((amt) => {
            const days = daysSavedByDividendReinvest(
              amt,
              df.monthlyExpense,
              df.monthsToTarget,
              yieldPct
            );
            return (
              <button
                key={amt}
                type="button"
                className="sim-card__item"
                onClick={() => updateFire({ monthlySavings: fire.monthlySavings + amt })}
              >
                <span className="sim-card__amt">+{(amt / 10000).toFixed(0)}만</span>
                <span className="sim-card__days">{days > 0 ? `${days}일 단축` : '커버↑'}</span>
              </button>
            );
          })}
        </div>
        <p className="hint-text" style={{ marginTop: 10 }}>
          월 배당 <strong>{formatFullWon(df.monthlyDividend)}</strong> / 목표{' '}
          <strong>{formatFullWon(df.monthlyExpense)}</strong>
          {df.hasHoldings && (
            <>
              {' '}
              · 연간 배당 약 <strong>{formatFullWon(df.annualDividend)}</strong>
            </>
          )}
        </p>
      </section>
    </div>
  );
}
