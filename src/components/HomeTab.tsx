import { useMemo } from 'react';
import { useCoverage } from '../hooks/useCoverage';
import { useAppStore } from '../store/useAppStore';
import type { HomeView } from '../types';
import { buildYearMonthlyTotals, sumYearTotal } from '../utils/dividendSeries';
import { formatFullWon, formatWon } from '../utils/format';
import { balanceSeries, filterHistory, latestBalance } from '../utils/historyStats';
import {
  holdingCostBasisKRW,
  holdingMarketValueKRW,
} from '../utils/holdingMoney';
import {
  buildAllocationSlices,
  conicGradientFromSlices,
  portfolioTotals,
  sortedByMarketValue,
} from '../utils/portfolioStats';
import { usePromoSlides } from '../hooks/usePromoSlides';
import { PromoCarousel } from './PromoCarousel';
import { EmptyState } from './ui/EmptyState';
import { IconChart, IconPen, IconWallet } from './ui/Icons';
import { MonthlyBarChart } from './ui/MonthlyBarChart';
import { AccountGrowthChart } from './ui/AccountGrowthChart';

const HOME_TABS: { id: HomeView; label: string }[] = [
  { id: 'cumulative', label: '계좌현황(누적)' },
  { id: 'year', label: '계좌현황(올해)' },
  { id: 'dividend', label: '배당현황' },
];
export function HomeTab() {
  const promoSlides = usePromoSlides();
  const homeView = useAppStore((s) => s.homeView);
  const setHomeView = useAppStore((s) => s.setHomeView);
  const setTab = useAppStore((s) => s.setTab);
  const goals = useAppStore((s) => s.goals);
  const historyEntries = useAppStore((s) => s.historyEntries);
  const holdings = useAppStore((s) => s.holdings);
  const c = useCoverage();

  const year = new Date().getFullYear();
  const monthlyDividends = useMemo(
    () => buildYearMonthlyTotals(holdings, c.usdKrw),
    [holdings, c.usdKrw]
  );
  const yearDividendTotal = sumYearTotal(monthlyDividends);

  const cumulativeSeries = useMemo(() => balanceSeries(historyEntries), [historyEntries]);
  const yearSeries = useMemo(() => balanceSeries(historyEntries, year), [historyEntries, year]);

  const { totalMarket, totalCost } = useMemo(
    () => portfolioTotals(holdings, c.usdKrw),
    [holdings, c.usdKrw]
  );
  const balanceLatest = useMemo(() => latestBalance(historyEntries), [historyEntries]);
  const totalAssets = Math.max(balanceLatest, goals.totalAssetsKRW, totalMarket);
  const principal =
    totalCost > 0 ? totalCost : goals.totalAssetsKRW > 0 ? goals.totalAssetsKRW : totalAssets;
  const cumulativeProfit = totalAssets - principal;
  const profitPct = principal > 0 ? (cumulativeProfit / principal) * 100 : null;

  const allocBase = totalMarket > 0 ? totalMarket : c.annualDividend;
  const { slices, total: allocTotal } = useMemo(
    () => buildAllocationSlices(holdings, c.usdKrw, allocBase),
    [holdings, c.usdKrw, allocBase]
  );
  const topHoldings = useMemo(
    () => sortedByMarketValue(holdings, c.usdKrw).slice(0, 5),
    [holdings, c.usdKrw]
  );
  const donutBg = useMemo(() => conicGradientFromSlices(slices), [slices]);

  const hasBalance = filterHistory(historyEntries, 'balance').length > 0;
  const hasDividendData = yearDividendTotal > 0 || holdings.length > 0;
  const hasHoldings = holdings.length > 0;

  const balancePoints = homeView === 'year' ? yearSeries : cumulativeSeries;
  const chartValues =
    homeView === 'dividend' ? monthlyDividends : balancePoints.map((p) => p.value);
  const chartLabels = homeView === 'dividend' ? undefined : balancePoints.map((p) => p.label);

  const accountStart = balancePoints[0]?.value ?? 0;
  const accountEnd = balancePoints[balancePoints.length - 1]?.value ?? 0;
  const accountDelta = accountEnd - accountStart;
  const accountDeltaPct = accountStart > 0 ? (accountDelta / accountStart) * 100 : null;

  const showChart =
    homeView === 'dividend'
      ? hasDividendData && yearDividendTotal > 0
      : hasBalance && chartValues.some((v) => v > 0);

  const goSettings = () => setTab('settings');

  return (
    <div className="page home-page">
      <PromoCarousel slides={promoSlides} />

      <section className="home-asset-card">
        <div className="home-asset-card__head">
          <span className="home-asset-card__icon" aria-hidden>
            <IconWallet />
          </span>
          <span className="home-asset-card__label">총 자산</span>
        </div>
        <p className="home-asset-card__total">
          {totalAssets > 0 ? (
            <>
              {totalAssets.toLocaleString('ko-KR')}
              <span className="home-asset-card__unit"> 원</span>
            </>
          ) : (
            <span className="home-asset-card__placeholder">자산을 입력해 주세요</span>
          )}
        </p>

        <div className="home-asset-card__goals">
          <button type="button" className="home-goal-link" onClick={goSettings}>
            <IconPen className="home-goal-link__pen" />
            <span>연간 입금액 목표 설정</span>
          </button>
          <button type="button" className="home-goal-link" onClick={goSettings}>
            <IconPen className="home-goal-link__pen" />
            <span>최종 총자산 목표 설정</span>
          </button>
          <button type="button" className="home-goal-link home-goal-link--center" onClick={goSettings}>
            <IconPen className="home-goal-link__pen" />
            <span>은퇴 목표시점 설정</span>
          </button>
        </div>

        <div className="home-asset-card__split">
          <div>
            <span className="home-asset-card__split-label">원금</span>
            <strong className="home-asset-card__split-value">
              {principal > 0 ? formatFullWon(principal) : '—'}
            </strong>
          </div>
          <div>
            <span className="home-asset-card__split-label">누적손익</span>
            <strong
              className={`home-asset-card__split-value ${
                cumulativeProfit < 0
                  ? 'home-asset-card__split-value--loss'
                  : cumulativeProfit > 0
                    ? 'home-asset-card__split-value--gain'
                    : ''
              }`}
            >
              {principal > 0 || totalAssets > 0
                ? `${cumulativeProfit < 0 ? '-' : ''}${formatFullWon(Math.abs(cumulativeProfit))}`
                : '—'}
            </strong>
            {profitPct != null && principal > 0 && (
              <span
                className={`home-asset-card__badge ${
                  profitPct < 0 ? 'home-asset-card__badge--loss' : 'home-asset-card__badge--gain'
                }`}
              >
                {profitPct >= 0 ? '+' : ''}
                {profitPct.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </section>

      {hasHoldings && slices.length > 0 && (
        <>
          <section className="home-panel">
            <div className="home-panel__head">
              <h2 className="home-panel__title">자산 비중</h2>
            </div>
            <div className="home-alloc">
              <div
                className="home-alloc__donut"
                style={{ background: donutBg }}
                role="img"
                aria-label="자산 비중 도넛 차트"
              >
                <div className="home-alloc__donut-hole">
                  <span className="home-alloc__donut-label">총 자산</span>
                  <strong>{formatWon(allocTotal)}</strong>
                </div>
              </div>
              <ul className="home-alloc__legend">
                {slices.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <span className="home-alloc__dot" style={{ background: s.color }} />
                    <span className="home-alloc__name">{s.label}</span>
                    <span className="home-alloc__pct">{s.pct.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="home-panel">
            <div className="home-panel__head">
              <h2 className="home-panel__title">상위 보유 종목</h2>
              <span className="home-panel__meta">{holdings.length}개 종목</span>
            </div>
            <ul className="home-top-list">
              {topHoldings.map((h) => {
                const mv = holdingMarketValueKRW(h, c.usdKrw);
                const cost = holdingCostBasisKRW(h, c.usdKrw);
                const changePct = cost > 0 ? ((mv - cost) / cost) * 100 : null;
                const slice = slices.find((s) => s.id === h.id);
                const pct = slice?.pct ?? 0;
                const color = slice?.color ?? '#3182f6';
                return (
                  <li key={h.id} className="home-top-item">
                    <div className="home-top-item__row1">
                      <span className="home-top-item__dot" style={{ background: color }} />
                      <span className="home-top-item__name">{h.name}</span>
                      <span className="home-top-item__value">{formatWon(mv)}</span>
                      <span
                        className={
                          changePct == null
                            ? 'home-top-item__chg'
                            : changePct >= 0
                              ? 'home-top-item__chg home-top-item__chg--up'
                              : 'home-top-item__chg home-top-item__chg--down'
                        }
                      >
                        {changePct == null
                          ? '—'
                          : `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`}
                      </span>
                    </div>
                    <div className="home-top-item__bar">
                      <div
                        className="home-top-item__bar-fill"
                        style={{ width: `${Math.min(100, pct)}%`, background: color }}
                      />
                    </div>
                    <div className="home-top-item__row3">
                      <span>{h.symbol ?? '—'}</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="home-panel__more" onClick={() => setTab('portfolio')}>
              포트폴리오 전체보기
            </button>
          </section>
        </>
      )}

      <div className="pill-tabs" role="tablist">
        {HOME_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={homeView === t.id}
            className={`pill-tabs__btn ${homeView === t.id ? 'active' : ''}`}
            onClick={() => setHomeView(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="surface-card surface-card--chart">
        {homeView === 'dividend' && !hasDividendData ? (
          <EmptyState
            icon={<IconChart className="empty-state__svg" />}
            title="아직 배당 데이터가 없어요"
            description="포트폴리오에서 종목을 추가하거나, 내역에서 배당금을 기록해보세요"
            action={{ label: '포트폴리오로 가기', onClick: () => setTab('portfolio') }}
          />
        ) : homeView !== 'dividend' && !hasBalance ? (
          <EmptyState
            icon={<IconChart className="empty-state__svg" />}
            title="아직 계좌 데이터가 없어요"
            description="내역 페이지에서 계좌총액, 배당금, 입출금 내역을 기록해보세요"
            action={{ label: '내역 기록하러 가기', onClick: () => setTab('history') }}
          />
        ) : showChart ? (
          <div className="home-chart">
            {homeView === 'dividend' && (
              <p className="home-chart__meta">
                올해 예상 배당 {yearDividendTotal.toLocaleString('ko-KR')}원 · 커버율{' '}
                {c.coveragePct.toFixed(0)}%
              </p>
            )}
            {homeView !== 'dividend' && (
              <p className="home-chart__meta home-chart__meta--growth">
                {formatWon(accountStart)} → {formatWon(accountEnd)} ·{' '}
                {accountDelta >= 0 ? '+' : '-'}
                {formatWon(Math.abs(accountDelta))}
                {accountDeltaPct != null && ` (${accountDeltaPct.toFixed(1)}%)`}
              </p>
            )}
            {homeView === 'dividend' ? (
              <MonthlyBarChart
                values={chartValues}
                labels={chartLabels}
                showTotals
              />
            ) : (
              <AccountGrowthChart points={balancePoints} />
            )}
          </div>
        ) : (
          <EmptyState
            icon={<IconChart className="empty-state__svg" />}
            title="표시할 데이터가 없어요"
            description="내역에서 월별 계좌총액을 입력하면 차트가 표시됩니다"
            action={{ label: '내역 기록하러 가기', onClick: () => setTab('history') }}
          />
        )}
      </div>
    </div>
  );
}
