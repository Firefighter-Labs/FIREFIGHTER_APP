import { useEffect, useMemo, useRef, useState } from 'react';
import { useCoverage } from '../hooks/useCoverage';
import { useUsdKrwRate } from '../hooks/useUsdKrwRate';
import { useAppStore } from '../store/useAppStore';
import { usdToKrw } from '../services/exchangeRateService';
import {
  fetchStockAutoFill,
  isStockSearchEnabled,
  searchStocks,
  type StockSearchResult,
} from '../services/stockLookupService';
import { FREE_HOLDING_LIMIT } from '../types';
import type { DividendFrequency, Holding } from '../types';
import { frequencyLabel } from '../utils/coverage';
import { formatFullWon } from '../utils/format';
import {
  holdingAnnualDividendUSD,
  holdingAvgCostNative,
  holdingCostBasisKRW,
  holdingCostBasisUSD,
  holdingMarketValueKRW,
  holdingMarketValueUSD,
} from '../utils/holdingMoney';
import {
  avgFromCost,
  avgFromCostUsd,
  costFromAvgPerShare,
  costFromAvgPerShareUsd,
  formatNumericInput,
  formatUsdInput,
  normalizeNumericInput,
  normalizeUsdInput,
  parseNumericInput,
  parseUsdInput,
} from '../utils/numberInput';
import { portfolioTotals, sortedByMarketValue } from '../utils/portfolioStats';
import { usePromoSlides } from '../hooks/usePromoSlides';
import { PfAllocationChart } from './PfAllocationChart';
import { PromoCarousel } from './PromoCarousel';
import { EmptyState } from './ui/EmptyState';
import { HoldingAvatar } from './ui/HoldingAvatar';
import { IconPie, IconPen, IconTrash } from './ui/Icons';

const FREQUENCIES: DividendFrequency[] = ['monthly', 'quarterly', 'semiannual', 'annual'];

export function PortfolioTab() {
  const promoSlides = usePromoSlides();
  const holdings = useAppStore((s) => s.holdings);
  const isPro = useAppStore((s) => s.isPro);
  const addHolding = useAppStore((s) => s.addHolding);
  const updateHolding = useAppStore((s) => s.updateHolding);
  const removeHolding = useAppStore((s) => s.removeHolding);
  const c = useCoverage();
  const { usdKrw, refresh: refreshFx } = useUsdKrwRate();

  const [view, setView] = useState<'list' | 'chart'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaHint, setMetaHint] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frequencyTouched = useRef(false);

  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<'KR' | 'US'>('US');
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [shares, setShares] = useState('1');
  const [annual, setAnnual] = useState('');
  const [marketVal, setMarketVal] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [cost, setCost] = useState('');
  const [frequency, setFrequency] = useState<DividendFrequency>('quarterly');
  const [payMonth, setPayMonth] = useState('');

  const isUsdForm = market === 'US';
  const rate = usdKrw;

  const atLimit = !isPro && holdings.length >= FREE_HOLDING_LIMIT;
  const searchEnabled = isStockSearchEnabled();

  const resetForm = () => {
    frequencyTouched.current = false;
    setSearchQ('');
    setSearchResults([]);
    setSymbol('');
    setMarket('US');
    setName('');
    setLogoUrl(undefined);
    setShares('1');
    setAnnual('');
    setMarketVal('');
    setAvgPrice('');
    setCost('');
    setFrequency('quarterly');
    setPayMonth('');
    setMetaHint(null);
    setLoadingMeta(false);
  };

  const openAdd = () => {
    setEditingId(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (h: Holding) => {
    frequencyTouched.current = false;
    setEditingId(h.id);
    setSearchQ('');
    setSearchResults([]);
    setSymbol(h.symbol ?? '');
    setMarket(h.market ?? 'US');
    setName(h.name);
    setLogoUrl(h.logoUrl);
    const shareStr = h.shares != null ? String(h.shares) : '1';
    setShares(shareStr);
    if (h.market === 'US') {
      const annualUsd = holdingAnnualDividendUSD(h, rate);
      const mvUsd = holdingMarketValueUSD(h, rate);
      const costUsd = holdingCostBasisUSD(h, rate);
      setAnnual(annualUsd > 0 ? String(annualUsd) : '');
      setMarketVal(mvUsd > 0 ? String(mvUsd) : '');
      setCost(costUsd > 0 ? String(costUsd) : '');
      setAvgPrice(
        costUsd > 0 && Number(shareStr) > 0
          ? avgFromCostUsd(String(costUsd), shareStr)
          : ''
      );
    } else {
      setAnnual(String(h.annualDividendKRW || ''));
      setMarketVal(h.marketValueKRW ? String(h.marketValueKRW) : '');
      const costStr = h.costBasisKRW ? String(h.costBasisKRW) : '';
      setCost(costStr);
      setAvgPrice(costStr ? avgFromCost(costStr, shareStr) : '');
    }
    setFrequency(h.frequency);
    setPayMonth(h.nextPayMonth ? String(h.nextPayMonth) : '');
    setMetaHint(null);
    setModalOpen(true);
  };

  const applyPick = async (pick: StockSearchResult) => {
    setSearchQ('');
    setSearchResults([]);
    setLoadingMeta(true);
    setMetaHint('종목 정보를 불러오는 중…');

    const shareN = Math.max(0, Number(shares) || 1);
    try {
      const meta = await fetchStockAutoFill(pick, shareN);
      setSymbol(meta.symbol);
      setMarket(meta.market);
      setName(meta.name);
      setLogoUrl(meta.logoUrl ?? undefined);
      if (!frequencyTouched.current) {
        setFrequency(meta.frequency);
        setPayMonth(
          meta.frequency === 'monthly' || !meta.nextPayMonth ? '' : String(meta.nextPayMonth)
        );
      }
      if (meta.market === 'US') {
        if (meta.annualDividendUSD > 0) setAnnual(String(meta.annualDividendUSD));
        if (meta.marketValueUSD > 0) {
          setMarketVal(String(meta.marketValueUSD));
          if (shareN > 0) {
            setAvgPrice(String(Math.round((meta.marketValueUSD / shareN) * 100) / 100));
          }
        }
      } else {
        if (meta.annualDividendKRW > 0) setAnnual(String(meta.annualDividendKRW));
        if (meta.marketValueKRW > 0) setMarketVal(String(meta.marketValueKRW));
      }
      setMetaHint(
        meta.price != null
          ? `시세 ${meta.price.toLocaleString()} ${meta.priceCurrency} · ${meta.source} 기준`
          : '배당·주기 정보를 일부 자동 입력했습니다'
      );
    } catch {
      setSymbol(pick.symbol);
      setMarket(pick.market);
      setName(pick.name);
      setMetaHint('자동 조회에 실패했습니다. 직접 입력해 주세요.');
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (!modalOpen || editingId) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (searchQ.trim().length < 1) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setSearchResults(await searchStocks(searchQ.trim()));
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQ, modalOpen, editingId]);

  const refreshMeta = async () => {
    if (!symbol.trim()) return;
    setLoadingMeta(true);
    setMetaHint('다시 불러오는 중…');
    try {
      const meta = await fetchStockAutoFill(
        { symbol: symbol.trim(), name: name.trim() || symbol, market },
        Math.max(0, Number(shares) || 1)
      );
      setName(meta.name);
      setLogoUrl(meta.logoUrl ?? undefined);
      if (!frequencyTouched.current) {
        setFrequency(meta.frequency);
        setPayMonth(
          meta.frequency === 'monthly' || !meta.nextPayMonth ? '' : String(meta.nextPayMonth)
        );
      }
      if (meta.market === 'US') {
        if (meta.annualDividendUSD > 0) setAnnual(String(meta.annualDividendUSD));
        if (meta.marketValueUSD > 0) setMarketVal(String(meta.marketValueUSD));
      } else {
        if (meta.annualDividendKRW > 0) setAnnual(String(meta.annualDividendKRW));
        if (meta.marketValueKRW > 0) setMarketVal(String(meta.marketValueKRW));
      }
      setMetaHint('정보를 갱신했습니다');
    } catch {
      setMetaHint('갱신에 실패했습니다');
    } finally {
      setLoadingMeta(false);
    }
  };

  const onSharesChange = (raw: string) => {
    setShares(raw);
    if (isUsdForm) {
      const nextCost = costFromAvgPerShareUsd(avgPrice, raw);
      if (nextCost) {
        setCost(nextCost);
        return;
      }
      const nextAvg = avgFromCostUsd(cost, raw);
      if (nextAvg) setAvgPrice(nextAvg);
    } else {
      const nextCost = costFromAvgPerShare(avgPrice, raw);
      if (nextCost) {
        setCost(nextCost);
        return;
      }
      const nextAvg = avgFromCost(cost, raw);
      if (nextAvg) setAvgPrice(nextAvg);
    }
  };

  const onAvgPriceChange = (raw: string) => {
    if (isUsdForm) {
      const n = normalizeUsdInput(raw);
      setAvgPrice(n);
      const nextCost = costFromAvgPerShareUsd(n, shares);
      if (nextCost) setCost(nextCost);
      else if (!n) setCost('');
    } else {
      const n = normalizeNumericInput(raw);
      setAvgPrice(n);
      const nextCost = costFromAvgPerShare(n, shares);
      if (nextCost) setCost(nextCost);
      else if (!n) setCost('');
    }
  };

  const onCostChange = (raw: string) => {
    if (isUsdForm) {
      const n = normalizeUsdInput(raw);
      setCost(n);
      const nextAvg = avgFromCostUsd(n, shares);
      if (nextAvg) setAvgPrice(nextAvg);
      else if (!n) setAvgPrice('');
    } else {
      const n = normalizeNumericInput(raw);
      setCost(n);
      const nextAvg = avgFromCost(n, shares);
      if (nextAvg) setAvgPrice(nextAvg);
      else if (!n) setAvgPrice('');
    }
  };

  const submit = () => {
    if (!name.trim()) return;

    const base = {
      name: name.trim(),
      symbol: symbol.trim() || undefined,
      market: symbol.trim() ? market : undefined,
      logoUrl,
      shares: shares ? Math.max(0, Number(shares)) : undefined,
      frequency,
      nextPayMonth:
        frequency === 'monthly'
          ? undefined
          : payMonth
            ? Math.min(12, Math.max(1, Number(payMonth)))
            : undefined,
    };

    let payload;
    if (isUsdForm) {
      const annualUSD = parseUsdInput(annual);
      if (annualUSD == null || annualUSD < 0) return;
      const marketValueUSD = parseUsdInput(marketVal) || 0;
      const costBasisUSD = parseUsdInput(cost) || 0;
      payload = {
        ...base,
        annualDividendUSD: annualUSD,
        marketValueUSD,
        costBasisUSD,
        annualDividendKRW: usdToKrw(annualUSD, rate),
        marketValueKRW: usdToKrw(marketValueUSD, rate),
        costBasisKRW: usdToKrw(costBasisUSD, rate),
      };
    } else {
      const annualKRW = parseNumericInput(annual);
      if (annualKRW == null || annualKRW < 0) return;
      payload = {
        ...base,
        annualDividendKRW: annualKRW,
        marketValueKRW: parseNumericInput(marketVal) || 0,
        costBasisKRW: parseNumericInput(cost) || 0,
        annualDividendUSD: undefined,
        marketValueUSD: undefined,
        costBasisUSD: undefined,
      };
    }

    if (editingId) updateHolding(editingId, payload);
    else if (!addHolding(payload)) return;
    setModalOpen(false);
  };

  const { totalMarket, totalCost, profit } = useMemo(
    () => portfolioTotals(holdings, rate),
    [holdings, rate]
  );

  const sorted = useMemo(
    () => sortedByMarketValue(holdings, rate),
    [holdings, rate]
  );

  return (
    <div className="page portfolio-page">
      <div className="portfolio-summary-head">
        <span className="text-muted">보유 종목 총 평가금액</span>
        <span className="text-muted">{holdings.length}개 종목</span>
      </div>
      <p className="portfolio-total">{totalMarket.toLocaleString('ko-KR')} 원</p>
      <p className="portfolio-fx">
        <span>
          USD 1 = {rate.toLocaleString('ko-KR')}원
        </span>
        <button type="button" className="link-btn" onClick={() => void refreshFx()}>
          환율 갱신
        </button>
      </p>

      <div className="split-card">
        <div>
          <span className="split-card__label">투자원금</span>
          <span className="split-card__value">{formatFullWon(totalCost)}</span>
        </div>
        <div>
          <span className="split-card__label">평가수익</span>
          <span className={`split-card__value ${profit >= 0 ? 'text-pos' : 'text-neg'}`}>
            {profit >= 0 ? '+' : ''}
            {formatFullWon(profit)}
          </span>
        </div>
      </div>

      <PromoCarousel slides={promoSlides} />

      <div className="portfolio-toolbar">
        <div className="view-toggle">
          <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            리스트
          </button>
          <button type="button" className={view === 'chart' ? 'active' : ''} onClick={() => setView('chart')}>
            차트
          </button>
        </div>
        {!atLimit && (
          <button type="button" className="btn-add" onClick={openAdd}>
            + 종목 추가
          </button>
        )}
      </div>

      {sorted.length > 0 && (
        <div className="pf-allocation-head">
          <div className="pf-allocation-head__left">
            <div className="pf-allocation-head__title">포트폴리오 비중</div>
            <div className="pf-allocation-head__sub">평가금액 기준</div>
          </div>
          <div />
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<IconPie className="empty-state__svg empty-state__svg--faint" />}
          title="보유 종목이 없습니다"
          description="종목명·티커를 검색하면 로고와 배당 정보가 자동으로 채워집니다."
          action={!atLimit ? { label: '+ 종목 추가', onClick: openAdd } : undefined}
        />
      ) : view === 'list' ? (
        <ul className="holding-list">
          {sorted.map((h) => (
            <li key={h.id}>
              <div className="holding-list__row">
                <div className="holding-list__body">
                  {(() => {
                    const sharesN = h.shares && h.shares > 0 ? h.shares : 1;
                    const cost = holdingCostBasisKRW(h, rate);
                    const mv = holdingMarketValueKRW(h, rate);
                    const profit = mv - cost;
                    const changePct = cost > 0 ? (profit / cost) * 100 : null;
                    const avgCost = holdingAvgCostNative(h, rate);
                    const totalAnnualDividend =
                      (h.market === 'US' && h.annualDividendUSD
                        ? usdToKrw(h.annualDividendUSD, rate)
                        : h.annualDividendKRW) * sharesN;
                    const allocBase = totalMarket > 0 ? totalMarket : c.annualDividend;
                    const allocValue = totalMarket > 0 ? mv : totalAnnualDividend;
                    const allocPct = allocBase > 0 ? (allocValue / allocBase) * 100 : 0;

                    return (
                      <>
                        <div className="holding-list__top">
                          <div
                            className="holding-list__clickable"
                            role="button"
                            tabIndex={0}
                            aria-label={`${h.name} 종목 수정`}
                            onClick={() => openEdit(h)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openEdit(h);
                              }
                            }}
                          >
                            <div className="holding-list__main">
                              <HoldingAvatar name={h.name} symbol={h.symbol} logoUrl={h.logoUrl} />
                              <div className="holding-list__copy">
                                <span className="holding-list__name">{h.name}</span>
                                <span className="holding-list__meta">
                                  {h.shares ? `${h.shares.toLocaleString('ko-KR')}주` : '—'}
                                  {avgCost > 0
                                  ? h.market === 'US'
                                    ? ` · 평단 $${avgCost.toLocaleString('en-US')}`
                                    : ` · 평단 ${formatFullWon(avgCost)}`
                                  : ''}
                                </span>
                              </div>
                            </div>
                            <div className="holding-list__quote">
                              {h.symbol && (
                                <span className="holding-list__ticker">{h.symbol}</span>
                              )}
                              <strong className="holding-list__amount">
                                {formatFullWon(mv)}
                              </strong>
                              <span
                                className={
                                  changePct == null
                                    ? 'holding-list__change'
                                    : `holding-list__change ${changePct >= 0 ? 'holding-list__change--up' : 'holding-list__change--down'}`
                                }
                              >
                                {changePct == null
                                  ? '—'
                                  : `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`}
                              </span>
                            </div>
                          </div>
                          <div className="holding-list__actions">
                            <button
                              type="button"
                              className="holding-list__icon-btn"
                              aria-label="종목 수정"
                              onClick={() => openEdit(h)}
                            >
                              <IconPen />
                            </button>
                            <button
                              type="button"
                              className="holding-list__icon-btn"
                              aria-label="종목 삭제"
                              onClick={() => {
                                if (window.confirm(`${h.name} 종목을 삭제할까요?`)) {
                                  removeHolding(h.id);
                                }
                              }}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </div>

                        <div
                          className="holding-list__alloc"
                          role="button"
                          tabIndex={0}
                          aria-label={`${h.name} 포트폴리오 비중 ${allocPct.toFixed(0)}%, 수정`}
                          onClick={() => openEdit(h)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openEdit(h);
                            }
                          }}
                        >
                          <div className="holding-list__alloc-head">
                            <span>포트폴리오 비중</span>
                            <span>{allocPct.toFixed(0)}%</span>
                          </div>
                          <div className="holding-list__alloc-track">
                            <div
                              className="holding-list__alloc-fill"
                              style={{ width: `${Math.max(0, Math.min(100, allocPct))}%` }}
                            />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <PfAllocationChart holdings={sorted} totalMarket={totalMarket} annualDividend={c.annualDividend} rate={rate} />
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)} role="presentation">
          <div className="modal-sheet modal-sheet--tall" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3>{editingId ? '종목 수정' : '종목 추가'}</h3>

            {!editingId && searchEnabled && (
              <div className="field">
                <label>종목 검색</label>
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="SCHD, 삼성전자, 005930…"
                  autoFocus
                />
                {searching && <p className="field-hint">검색 중…</p>}
                {searchResults.length > 0 && (
                  <ul className="search-results">
                    {searchResults.map((r) => (
                      <li key={`${r.market}-${r.symbol}`}>
                        <button type="button" className="search-result" onClick={() => applyPick(r)}>
                          <span className="search-result__sym">{r.symbol}</span>
                          <span className="search-result__name">{r.name}</span>
                          <span className="search-result__mkt">{r.market}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {(symbol || name) && (
              <div className="stock-preview">
                <HoldingAvatar name={name || symbol} symbol={symbol} logoUrl={logoUrl} size={48} />
                <div className="stock-preview__body">
                  <strong>{symbol || '—'}</strong>
                  <span>{name || '종목명'}</span>
                </div>
                {symbol && (
                  <button type="button" className="link-btn" disabled={loadingMeta} onClick={refreshMeta}>
                    {loadingMeta ? '…' : '새로고침'}
                  </button>
                )}
              </div>
            )}

            {metaHint && <p className="field-hint">{metaHint}</p>}

            <div className="field-row">
              <div className="field">
                <label>티커</label>
                <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="SCHD" />
              </div>
              <div className="field">
                <label>시장</label>
                <select value={market} onChange={(e) => setMarket(e.target.value as 'KR' | 'US')}>
                  <option value="US">미국</option>
                  <option value="KR">한국</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>종목명</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Schwab U.S. Dividend Equity ETF" />
            </div>
            <div className="field-row">
              <div className="field">
                <label>보유 주수</label>
                <input
                  type="number"
                  min={0}
                  value={shares}
                  onChange={(e) => onSharesChange(e.target.value)}
                />
              </div>
              <div className="field">
                <label>{isUsdForm ? '주당 평단 ($)' : '주당 평단 (원)'}</label>
                <input
                  inputMode="decimal"
                  value={isUsdForm ? formatUsdInput(avgPrice) : formatNumericInput(avgPrice)}
                  onChange={(e) => onAvgPriceChange(e.target.value)}
                  placeholder={isUsdForm ? '45.00' : '45000'}
                />
              </div>
            </div>
            <div className="field">
              <label>{isUsdForm ? '총 매수금 ($)' : '총 매수금 (원)'}</label>
              <input
                inputMode="decimal"
                value={isUsdForm ? formatUsdInput(cost) : formatNumericInput(cost)}
                onChange={(e) => onCostChange(e.target.value)}
                placeholder={isUsdForm ? '4,500' : '4,500,000'}
              />
            </div>
            <div className="field">
              <label>{isUsdForm ? '평가금액 ($)' : '평가금액 (원)'}</label>
              <input
                inputMode="decimal"
                value={isUsdForm ? formatUsdInput(marketVal) : formatNumericInput(marketVal)}
                onChange={(e) =>
                  setMarketVal(isUsdForm ? normalizeUsdInput(e.target.value) : normalizeNumericInput(e.target.value))
                }
                placeholder={isUsdForm ? '5,200' : '5,200,000'}
              />
            </div>
            <div className="field">
              <label>{isUsdForm ? '연간 배당 · 주당 ($)' : '연간 배당 · 주당 (원)'}</label>
              <input
                inputMode="decimal"
                value={isUsdForm ? formatUsdInput(annual) : formatNumericInput(annual)}
                onChange={(e) =>
                  setAnnual(isUsdForm ? normalizeUsdInput(e.target.value) : normalizeNumericInput(e.target.value))
                }
                placeholder={isUsdForm ? '2.50' : '400000'}
              />
            </div>
            <div className="field">
              <label>배당 주기</label>
              <div className="segmented">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={frequency === f ? 'active' : ''}
                    onClick={() => {
                      frequencyTouched.current = true;
                      setFrequency(f);
                      if (f === 'monthly') setPayMonth('');
                    }}
                  >
                    {frequencyLabel(f)}
                  </button>
                ))}
              </div>
            </div>
            {frequency !== 'monthly' && (
              <div className="field">
                <label>다음 지급월 (선택)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={payMonth}
                  onChange={(e) => setPayMonth(e.target.value)}
                />
              </div>
            )}
            <button type="button" className="btn-cta" onClick={submit} disabled={loadingMeta}>
              저장
            </button>
            {editingId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  removeHolding(editingId);
                  setModalOpen(false);
                }}
              >
                삭제
              </button>
            )}
            <button type="button" className="btn-text btn-text--block" onClick={() => setModalOpen(false)}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
