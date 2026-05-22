import { useEffect, useMemo, useRef, useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useDividendSync } from '../hooks/useDividendSync';
import { useAppStore } from '../store/useAppStore';
import {
  getCachedDividendMeta,
  isLiveDividendApiEnabled,
  isStockSearchEnabled,
  searchSymbols,
} from '../services/dividendApiService';
import { formatFrequencyLabel } from '../services/dividendHistoryService';
import {
  calcMonthDividends,
  getExpenseBreakdown,
  getExpenseCoverageMessage,
} from '../utils/dividendCalculator';
import { useUsdKrwRate } from '../hooks/useUsdKrwRate';
import { describeTaxRule } from '../utils/dividendTax';
import { formatUsdKrwRate, formatWon } from '../utils/format';
import { DividendAmountDisplay } from './ui/DividendAmountDisplay';
import { EmptyState } from './ui/EmptyState';
import { ExpenseBars } from './ui/ExpenseBars';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const SOURCE_LABEL = {
  api: '실시간 API',
  supabase: '클라우드 DB',
  local: '샘플 데이터',
} as const;

function sourcePillLabel(
  source: keyof typeof SOURCE_LABEL,
  isEstimate: boolean,
  isExact: boolean,
  lastProvider: string
): string {
  if (source === 'api' && lastProvider === 'yahoo') return '실제 지급일';
  if (source === 'api' && isExact) return '실제 지급일 (API)';
  if (source === 'api' && isEstimate) return '추정 일정';
  return SOURCE_LABEL[source];
}

export function DividendCalendar() {
  const holdings = useAppStore((s) => s.holdings);
  const { year, month } = useAppStore((s) => s.calendarMonth);
  const setCalendarMonth = useAppStore((s) => s.setCalendarMonth);
  const addHolding = useAppStore((s) => s.addHolding);
  const updateHolding = useAppStore((s) => s.updateHolding);
  const removeHolding = useAppStore((s) => s.removeHolding);
  const dividendTax = useAppStore((s) => s.dividendTax);
  const updateDividendTax = useAppStore((s) => s.updateDividendTax);
  const dash = useDashboard();
  const { usdKrw, loading: fxLoading, refresh: refreshFx } = useUsdKrwRate();

  const divOpts = useMemo(
    () => ({ usdKrw, tax: dividendTax }),
    [usdKrw, dividendTax]
  );

  const { loading, source, apiError, apiStatus, yields, refresh, tick } = useDividendSync(holdings, year);

  const [newShares, setNewShares] = useState(10);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; market: 'US' | 'KR' }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const [searchProvider, setSearchProvider] = useState<'finnhub' | 'fmp' | null>(null);
  const stockSearchEnabled = isStockSearchEnabled();

  const summary = useMemo(
    () => calcMonthDividends(holdings, year, month, divOpts),
    [holdings, year, month, tick, divOpts]
  );

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const isViewingCurrentMonth = year === todayYear && month === todayMonth;

  const thisMonthSummary = useMemo(
    () => calcMonthDividends(holdings, todayYear, todayMonth, divOpts),
    [holdings, todayYear, todayMonth, tick, divOpts]
  );

  const expenseItems = useMemo(
    () => getExpenseBreakdown(summary.totalNetKRW),
    [summary.totalNetKRW]
  );
  const coverageMsg = getExpenseCoverageMessage(summary.totalNetKRW);

  const yieldMap = useMemo(() => new Map(yields.map((y) => [y.holdingId, y.yieldPct])), [yields]);

  const calendarCells = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: { day: number; inMonth: boolean; dateStr: string }[] = [];

    const prevLast = new Date(year, month - 1, 0).getDate();
    for (let i = startPad - 1; i >= 0; i--) {
      const d = prevLast - i;
      const m = month === 1 ? 12 : month - 1;
      const y = month === 1 ? year - 1 : year;
      cells.push({
        day: d,
        inMonth: false,
        dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        inMonth: true,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }
    const remain = 42 - cells.length;
    for (let d = 1; d <= remain; d++) {
      const m = month === 12 ? 1 : month + 1;
      const y = month === 12 ? year + 1 : year;
      cells.push({
        day: d,
        inMonth: false,
        dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }
    return cells;
  }, [year, month]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) {
      m = 1;
      y++;
    } else if (m < 1) {
      m = 12;
      y--;
    }
    setCalendarMonth(y, m);
    setSelectedDay(null);
  };

  const goToday = () => {
    const n = new Date();
    setCalendarMonth(n.getFullYear(), n.getMonth() + 1);
    setSelectedDay(n.toISOString().slice(0, 10));
  };

  const addOrMerge = (symbol: string, name: string, market: 'US' | 'KR', shares: number) => {
    const exists = holdings.find((h) => h.symbol === symbol && h.market === market);
    if (exists) {
      updateHolding(exists.id, exists.shares + shares);
    } else {
      addHolding({ symbol, name, shares, market });
    }
  };

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setSearchQ(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!stockSearchEnabled || q.trim().length < 2) {
      setSearchResults([]);
      setSearchWarning(null);
      setSearchProvider(null);
      setSearching(false);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const outcome = await searchSymbols(q.trim());
        setSearchResults(outcome.results);
        setSearchWarning(outcome.warning);
        setSearchProvider(outcome.provider);
      } finally {
        setSearching(false);
      }
    }, 450);
  };

  const handlePickSearchResult = (r: { symbol: string; name: string; market: 'US' | 'KR' }) => {
    if (newShares <= 0) return;
    addOrMerge(r.symbol, r.name, r.market, newShares);
    setSearchQ('');
    setSearchResults([]);
  };

  useEffect(
    () => () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    },
    []
  );

  const dayDetail = selectedDay ? summary.byDay[selectedDay] : null;

  return (
    <div className="dividend-page">
      <section className="card data-source-bar">
        <div>
          <span className="data-source-bar__label">배당 데이터</span>
          <span className={`data-source-bar__pill data-source-bar__pill--${source}`}>
            {loading
              ? '불러오는 중…'
              : sourcePillLabel(source, apiStatus.isEstimate, apiStatus.isExactSchedule, apiStatus.lastProvider)}
          </span>
        </div>
        <button type="button" className="btn-ghost" onClick={() => refresh()} disabled={loading}>
          ↻ 새로고침
        </button>
        {apiStatus.fmp && apiStatus.sessionFmpCalls > 0 && (
          <span className="data-source-bar__calls" title="이 브라우저 탭에서 FMP에 실제 요청한 횟수">
            API {apiStatus.sessionFmpCalls}회
          </span>
        )}
        <button type="button" className="btn-ghost" onClick={() => refreshFx()} disabled={fxLoading}>
          💱 {fxLoading ? '환율…' : formatUsdKrwRate(usdKrw)}
        </button>
      </section>

      {!isLiveDividendApiEnabled() && (
        <div className="motivation-banner banner-warn" style={{ marginBottom: 12 }}>
          실시간 배당: <code>VITE_FMP_API_KEY</code>(권장) 또는 <code>VITE_FINNHUB_API_KEY</code>를 .env에 추가하세요.
          <br />
          <a href="https://site.financialmodelingprep.com/developer/docs" target="_blank" rel="noreferrer">
            FMP 무료 키
          </a>
          {' · '}
          Finnhub 무료 플랜은 배당 API 403이 날 수 있습니다.
        </div>
      )}
      {apiStatus.isEstimate && (
        <div className="motivation-banner banner-info" style={{ marginBottom: 12 }}>
          실제 지급일을 가져오지 못해 <strong>추정 일정</strong>을 씁니다. 개발 서버(<code>npm run dev</code>)에서는
          Yahoo 실데이터를 우선 사용합니다.
        </div>
      )}
      {apiStatus.lastProvider === 'yahoo' && (
        <div className="motivation-banner banner-info" style={{ marginBottom: 12 }}>
          배당 <strong>지급일·금액</strong>은 Yahoo Finance 실제 이력 기준입니다. 월/분기/주배당은 자동 판별됩니다.
        </div>
      )}
      {apiError && source === 'local' && (
        <div className="motivation-banner banner-warn" style={{ marginBottom: 12 }}>
          {apiError}
          {!apiStatus.fmp && (
            <span>
              {' '}
              → <a href="https://site.financialmodelingprep.com/developer/docs" target="_blank" rel="noreferrer">FMP 키</a> 발급 후{' '}
              <code>VITE_FMP_API_KEY</code> 추가
            </span>
          )}
        </div>
      )}

      <section className={`card ${loading ? 'card--loading' : ''}`}>
        <div className="cal-nav">
          <button type="button" className="btn-ghost" onClick={() => shiftMonth(-1)} aria-label="이전 달">
            ◀
          </button>
          <strong>
            {year}년 {month}월
          </strong>
          <button type="button" className="btn-ghost" onClick={() => shiftMonth(1)} aria-label="다음 달">
            ▶
          </button>
        </div>
        <button type="button" className="btn-ghost cal-today" onClick={goToday}>
          오늘로 이동
        </button>

        <div className="calendar-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-head">
              {w}
            </div>
          ))}
          {calendarCells.map((cell, i) => {
            const div = summary.byDay[cell.dateStr];
            const isToday = cell.dateStr === todayStr;
            const isSelected = selectedDay === cell.dateStr;
            return (
              <button
                key={`${cell.dateStr}-${i}`}
                type="button"
                className={`cal-day ${!cell.inMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${div ? 'has-dividend' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => cell.inMonth && setSelectedDay(cell.dateStr)}
                disabled={!cell.inMonth}
              >
                <span>{cell.day}</span>
                {div && (
                  <>
                    <span className="div-icon">💰</span>
                    <span className="div-amt">{formatWon(div.netKRW)}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {dayDetail && (
          <div className="day-detail">
            <strong>{selectedDay?.slice(5).replace('-', '/')} 배당</strong>
            <DividendAmountDisplay grossKRW={dayDetail.grossKRW} netKRW={dayDetail.netKRW} />
            <ul>
              {dayDetail.items.map((it) => (
                <li key={it.name}>
                  {it.name}{' '}
                  <span className="day-detail__gross">{formatWon(it.grossKRW)}</span>
                  {' → '}
                  <span className="day-detail__net">{formatWon(it.netKRW)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="motivation-banner">{coverageMsg}</div>

      <section className="card">
        <div className="card-title">
          {year}년 {month}월 예상 배당
          {!isViewingCurrentMonth && (
            <span className="card-title__sub"> · 달력에서 본 달</span>
          )}
        </div>
        <DividendAmountDisplay
          grossKRW={summary.totalGrossKRW}
          netKRW={summary.totalNetKRW}
          size="hero"
        />
        {summary.totalNetKRW === 0 && dash.yearDiv.netKRW > 0 && holdings.length > 0 && (
          <p className="hint-text dividend-zero-hint">
            이 달에는 지급 예정일이 없습니다. <strong>JEPI·JEPQ</strong>는 월배당,{' '}
            <strong>SCHD</strong> 등은 분기(3·6·9·12월)인 경우가 많습니다. 달력 ◀ ▶로 확인하세요.
          </p>
        )}
        {!isViewingCurrentMonth && thisMonthSummary.totalNetKRW > 0 && (
          <p className="hint-text">
            오늘 기준 {todayMonth}월 수령 예상:{' '}
            <strong>{formatWon(thisMonthSummary.totalNetKRW)}</strong> (세전{' '}
            {formatWon(thisMonthSummary.totalGrossKRW)})
          </p>
        )}
        <p className="hint-text">
          {year}년 연간 — 세전 {formatWon(dash.yearDiv.grossKRW)} · 수령 {formatWon(dash.yearDiv.netKRW)}
        </p>
      </section>

      <section className="card">
        <div className="card-title">세금 · 환율 설정 (간이)</div>
        <p className="hint-text" style={{ marginBottom: 10 }}>
          국내: 분리과세 15.4% 또는 감면 세율 가정 · 미국: 원천징수 15%. 종목·ISA·요건별로 실제와 다를 수
          있습니다.
        </p>
        <label className="tax-toggle">
          <input
            type="checkbox"
            checked={dividendTax.useKrExemption}
            onChange={(e) => updateDividendTax({ useKrExemption: e.target.checked })}
          />
          국내 주식 배당소득세 <strong>감면</strong> 적용 가정 ({dividendTax.krExemptionTaxPct}%)
        </label>
        <p className="hint-text" style={{ marginTop: 8 }}>
          미국 종목: {describeTaxRule('US', dividendTax)} · 국내:{' '}
          {describeTaxRule('KR', dividendTax)}
        </p>
      </section>

      <section className="card">
        <div className="card-title">생활비 커버 현황 (세후 기준)</div>
        <ExpenseBars
          items={expenseItems}
          totalKRW={summary.totalNetKRW}
          grossKRW={summary.totalGrossKRW}
        />
      </section>

      {summary.events.length > 0 && (
        <section className="card">
          <div className="card-title">배당 일정</div>
          <ul className="schedule-list">
            {summary.events.map((e) => (
              <li key={e.date}>
                <span className="schedule-date">{e.date.slice(5).replace('-', '/')}</span>
                <span>
                  {formatWon(e.grossKRW)} → {formatWon(e.netKRW)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <div className="card-title">종목 검색 · 추가</div>
        {!stockSearchEnabled ? (
          <div className="motivation-banner banner-warn">
            종목 검색에 <code>VITE_FINNHUB_API_KEY</code> 또는 <code>VITE_FMP_API_KEY</code>가 필요합니다.{' '}
            <a href="https://finnhub.io/register" target="_blank" rel="noreferrer">
              Finnhub 키
            </a>
            발급 후 <code>npm run dev</code>를 재시작하세요.
          </div>
        ) : (
          <>
            <p className="hint-text" style={{ marginBottom: 12 }}>
              검색 결과를 탭해서만 종목을 추가합니다. (Finnhub 우선 · 키 오류 시 FMP)
            </p>
            {searchWarning && (
              <div className="motivation-banner banner-warn" style={{ marginBottom: 12 }}>
                {searchWarning}
              </div>
            )}
            {searchProvider === 'fmp' && !searchWarning && (
              <p className="hint-text" style={{ marginBottom: 8 }}>
                FMP 검색 결과입니다.
              </p>
            )}
            <div className="field">
              <label>티커 검색</label>
              <input
                type="text"
                placeholder="예: SCHD, JEPI, JEPQ"
                value={searchQ}
                onChange={(e) => handleSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
            {searching && <p className="hint-text">검색 중…</p>}
            {!searching && searchQ.trim().length >= 2 && searchResults.length === 0 && (
              <p className="hint-text">검색 결과가 없습니다. 다른 키워드를 시도해 보세요.</p>
            )}
            {searchResults.length > 0 && (
              <ul className="search-results">
                {searchResults.map((r) => (
                  <li key={`${r.symbol}-${r.market}`}>
                    <button
                      type="button"
                      className="search-result-btn"
                      onClick={() => handlePickSearchResult(r)}
                      disabled={newShares <= 0}
                    >
                      <strong>{r.symbol}</strong>
                      <span>{r.name}</span>
                      <span className="search-result-market">{r.market === 'KR' ? '국내' : '미국'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="field" style={{ marginTop: 12 }}>
              <label>추가할 수량 (주)</label>
              <input
                type="number"
                min={1}
                value={newShares}
                onChange={(e) => setNewShares(Number(e.target.value) || 0)}
              />
            </div>
            <p className="hint-text">위 검색 결과를 탭하면 보유 종목에 추가됩니다.</p>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-title">보유 종목</div>
        {holdings.length === 0 ? (
          <EmptyState
            icon="📊"
            title="보유 종목이 없어요"
            description="Finnhub 검색으로 종목을 추가하면 예상 배당금이 달력에 표시됩니다."
          />
        ) : (
          holdings.map((h) => {
            const yld = yieldMap.get(h.id);
            const meta = getCachedDividendMeta(h.symbol, h.market, year);
            const freqLabel = meta?.frequency ? formatFrequencyLabel(meta.frequency) : null;
            const scheduleTag =
              meta?.provider === 'yahoo'
                ? '실제 지급일'
                : meta?.provider === 'fmp-estimate'
                  ? '추정'
                  : meta?.provider === 'local'
                    ? '샘플'
                    : null;
            return (
              <div key={h.id} className="holding-row holding-row--rich">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{h.name}</div>
                  <div className="holding-meta">
                    {h.symbol} · {h.shares}주 · {h.market === 'US' ? '미국' : '국내'}
                    {freqLabel && <span className="yield-tag"> {freqLabel}</span>}
                    {scheduleTag && <span className="yield-tag yield-tag--muted"> · {scheduleTag}</span>}
                    {yld != null && <span className="yield-tag"> · 배당률 ~{yld.toFixed(2)}%</span>}
                  </div>
                </div>
                <input
                  type="number"
                  className="shares-input"
                  value={h.shares}
                  min={0}
                  onChange={(e) => updateHolding(h.id, Number(e.target.value) || 0)}
                />
                <button type="button" className="btn-ghost" onClick={() => removeHolding(h.id)}>
                  삭제
                </button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
