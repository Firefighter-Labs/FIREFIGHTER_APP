import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useUsdKrwRate } from '../hooks/useUsdKrwRate';
import {
  isStockSearchEnabled,
  searchSymbols,
} from '../services/dividendApiService';
import { useDividendSync } from '../hooks/useDividendSync';
import { calcHoldingAnnualDividend } from '../utils/dividendChartData';
import { formatWon } from '../utils/format';
import { EmptyState } from './ui/EmptyState';

interface WatchlistProps {
  monthlyExpense: number;
  currentMonthlyNetKRW: number;
}

export function Watchlist({ monthlyExpense, currentMonthlyNetKRW }: WatchlistProps) {
  const watchlist = useAppStore((s) => s.watchlist);
  const addWatchlistItem = useAppStore((s) => s.addWatchlistItem);
  const updateWatchlistItem = useAppStore((s) => s.updateWatchlistItem);
  const removeWatchlistItem = useAppStore((s) => s.removeWatchlistItem);
  const promoteWatchlistToHolding = useAppStore((s) => s.promoteWatchlistToHolding);
  const year = useAppStore((s) => s.calendarMonth.year);
  const { usdKrw } = useUsdKrwRate();

  const divOpts = useMemo(() => ({ usdKrw }), [usdKrw]);

  // 워치리스트 종목 배당 메타도 미리 동기화 (지급일 추정용)
  const syncHoldings = useMemo(
    () =>
      watchlist.map((w) => ({
        id: w.id,
        symbol: w.symbol,
        name: w.name,
        market: w.market,
        shares: Math.max(1, w.plannedShares),
      })),
    [watchlist]
  );
  useDividendSync(syncHoldings, year);

  const stockSearchEnabled = isStockSearchEnabled();
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<
    { symbol: string; name: string; market: 'US' | 'KR' }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [planShares, setPlanShares] = useState(5);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setSearchQ(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!stockSearchEnabled || q.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const outcome = await searchSymbols(q.trim());
        setSearchResults(outcome.results);
      } finally {
        setSearching(false);
      }
    }, 450);
  };

  useEffect(
    () => () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    },
    []
  );

  const handlePick = (r: { symbol: string; name: string; market: 'US' | 'KR' }) => {
    if (planShares <= 0) return;
    addWatchlistItem({
      symbol: r.symbol,
      name: r.name,
      market: r.market,
      plannedShares: planShares,
    });
    setSearchQ('');
    setSearchResults([]);
  };

  const itemSimulations = useMemo(() => {
    return watchlist.map((w) => {
      const synthetic = {
        id: w.id,
        symbol: w.symbol,
        name: w.name,
        market: w.market,
        shares: w.plannedShares,
      };
      const annual = calcHoldingAnnualDividend(synthetic, year, divOpts);
      const monthly = annual.grossKRW / 12;
      const coverageDelta =
        monthlyExpense > 0 ? (monthly / monthlyExpense) * 100 : 0;
      return { item: w, annual: annual.grossKRW, monthly, coverageDelta };
    });
  }, [watchlist, year, divOpts, monthlyExpense]);

  const totalAddedMonthly = itemSimulations.reduce((s, x) => s + x.monthly, 0);
  const projectedMonthly = currentMonthlyNetKRW + totalAddedMonthly;
  const projectedCoverage =
    monthlyExpense > 0 ? (projectedMonthly / monthlyExpense) * 100 : 0;
  const currentCoverage =
    monthlyExpense > 0 ? (currentMonthlyNetKRW / monthlyExpense) * 100 : 0;
  const coverageDelta = projectedCoverage - currentCoverage;

  return (
    <section className="card watchlist">
      <div className="card-title">
        워치리스트
        <span className="card-title__sub">{watchlist.length}개</span>
      </div>
      <p className="hint-text" style={{ marginBottom: 10 }}>
        매수 예정 종목·수량을 등록하면 <strong>전체 매수 시 커버율</strong>이 얼마나 오르는지
        시뮬레이션됩니다. (실제 매수는 별도)
      </p>

      {watchlist.length > 0 && (
        <div className="watchlist-summary">
          <div className="watchlist-summary__row">
            <span className="hd-label">전부 매수 시 월 배당</span>
            <strong>{formatWon(projectedMonthly)}</strong>
            <span className="watchlist-summary__delta accent-green">
              +{formatWon(totalAddedMonthly)}
            </span>
          </div>
          <div className="watchlist-summary__row">
            <span className="hd-label">예상 커버율</span>
            <strong>{projectedCoverage.toFixed(0)}%</strong>
            <span className="watchlist-summary__delta accent-green">
              +{coverageDelta.toFixed(1)}%p
            </span>
          </div>
        </div>
      )}

      {!stockSearchEnabled ? (
        <p className="hint-text">
          종목 검색에 <code>VITE_FINNHUB_API_KEY</code> 또는 <code>VITE_FMP_API_KEY</code>가 필요합니다.
        </p>
      ) : (
        <div className="watchlist-add">
          <div className="field">
            <label>종목 검색</label>
            <input
              type="text"
              placeholder="예: O, MAIN, JEPI"
              value={searchQ}
              onChange={(e) => handleSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label>매수 예정 수량</label>
            <input
              type="number"
              min={1}
              value={planShares}
              onChange={(e) => setPlanShares(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          {searching && <p className="hint-text">검색 중…</p>}
          {searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map((r) => (
                <li key={`${r.symbol}-${r.market}`}>
                  <button
                    type="button"
                    className="search-result-btn"
                    onClick={() => handlePick(r)}
                  >
                    <strong>{r.symbol}</strong>
                    <span>{r.name}</span>
                    <span className="search-result-market">
                      {r.market === 'KR' ? '국내' : '미국'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {watchlist.length === 0 ? (
        <EmptyState
          icon="·"
          title="아직 후보 종목이 없어요"
          description="매수 전에 후보를 모아 두면, 사기 전에 커버율 변화를 미리 볼 수 있습니다."
        />
      ) : (
        <ul className="watchlist-items">
          {itemSimulations.map(({ item, monthly, coverageDelta: covΔ }) => (
            <li key={item.id} className="watchlist-row">
              <div className="watchlist-row__head">
                <strong>{item.symbol}</strong>
                <span className="watchlist-row__name">{item.name}</span>
                <span className="watchlist-row__market">
                  {item.market === 'KR' ? '국내' : '미국'}
                </span>
              </div>
              <div className="watchlist-row__sim">
                <span>
                  {item.plannedShares}주 매수 시 → 월 <strong>{formatWon(monthly)}</strong>
                </span>
                {monthlyExpense > 0 && (
                  <span className="accent-green">커버 +{covΔ.toFixed(1)}%p</span>
                )}
              </div>
              <div className="watchlist-row__controls">
                <label>
                  수량
                  <input
                    type="number"
                    min={0}
                    value={item.plannedShares}
                    onChange={(e) =>
                      updateWatchlistItem(item.id, {
                        plannedShares: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </label>
                <label>
                  목표가
                  <input
                    type="number"
                    placeholder="0"
                    value={item.targetPrice ?? ''}
                    onChange={(e) =>
                      updateWatchlistItem(item.id, {
                        targetPrice: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </label>
              </div>
              <div className="watchlist-row__actions">
                <button
                  type="button"
                  className="btn-primary watchlist-promote"
                  onClick={() => {
                    if (window.confirm(`${item.symbol} ${item.plannedShares}주를 보유 종목으로 옮길까요?`)) {
                      promoteWatchlistToHolding(item.id);
                    }
                  }}
                  disabled={item.plannedShares <= 0}
                >
                  보유로 이동
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => removeWatchlistItem(item.id)}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
