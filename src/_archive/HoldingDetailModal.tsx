import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useUsdKrwRate } from '../hooks/useUsdKrwRate';
import { usePortfolioAllocation } from '../hooks/usePortfolioAllocation';
import { getCachedDividendMeta } from '../services/dividendApiService';
import { formatFrequencyLabel } from '../services/dividendHistoryService';
import { calcHoldingAnnualDividend } from '../utils/dividendChartData';
import { frequencyLabelKr } from '../utils/dividendCalculator';
import { formatWon, formatFullWon, toKRW } from '../utils/format';
import type { DividendFrequency } from '../types';
import { DividendAmountDisplay } from './ui/DividendAmountDisplay';
import { Modal } from './ui/Modal';
import { MonthlyDividendChart } from './ui/MonthlyDividendChart';

interface HoldingDetailModalProps {
  holdingId: string | null;
  onClose: () => void;
}

export function HoldingDetailModal({ holdingId, onClose }: HoldingDetailModalProps) {
  // ─── Hooks (반드시 unconditional · 항상 같은 순서로 호출) ───
  const holdings = useAppStore((s) => s.holdings);
  const updateHolding = useAppStore((s) => s.updateHolding);
  const removeHolding = useAppStore((s) => s.removeHolding);
  const fire = useAppStore((s) => s.fire);
  const year = useAppStore((s) => s.calendarMonth.year);
  const { usdKrw } = useUsdKrwRate();

  const holding = holdingId ? holdings.find((h) => h.id === holdingId) ?? null : null;

  const { allocation } = usePortfolioAllocation(holdings, fire.totalAssets, fire.currency, usdKrw);

  const divOpts = useMemo(() => ({ usdKrw }), [usdKrw]);

  const annual = useMemo(() => {
    if (!holding) return null;
    return calcHoldingAnnualDividend(holding, year, divOpts);
  }, [holding, year, divOpts]);

  const upcoming = useMemo(() => {
    if (!annual) return null;
    const todayStr = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < annual.byMonth.length; i++) {
      if (annual.byMonth[i].grossKRW <= 0) continue;
      const monthStart = `${year}-${String(annual.byMonth[i].month).padStart(2, '0')}-01`;
      if (monthStart >= todayStr.slice(0, 7) + '-01') return annual.byMonth[i];
    }
    return null;
  }, [annual, year]);

  const costBasisKRW = useMemo(() => {
    if (!holding) return 0;
    if (!holding.avgBuyPrice || holding.avgBuyPrice <= 0 || holding.shares <= 0) return 0;
    const native = holding.avgBuyPrice * holding.shares;
    return holding.market === 'US' ? native * usdKrw : native;
  }, [holding, usdKrw]);

  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState<string>('');
  const [editingDiv, setEditingDiv] = useState(false);
  const [freqDraft, setFreqDraft] = useState<DividendFrequency | ''>('');
  const [yieldDraft, setYieldDraft] = useState<string>('');

  // ─── early return (모든 hook 호출 이후) ───
  if (!holding || !annual) {
    return (
      <Modal open={false} onClose={onClose}>
        {null}
      </Modal>
    );
  }

  const annualGrossKRW = annual.grossKRW;
  const monthlyAvg = annualGrossKRW / 12;
  const slice = allocation.slices.find((s) => s.holdingId === holding.id) ?? null;

  const meta = getCachedDividendMeta(holding.symbol, holding.market, year);
  const hasManualDiv =
    !!holding.manualFrequency &&
    !!holding.manualYieldPct &&
    holding.manualYieldPct > 0 &&
    !!holding.avgBuyPrice &&
    holding.avgBuyPrice > 0;
  const freqLabel = hasManualDiv
    ? frequencyLabelKr(holding.manualFrequency!)
    : meta?.frequency
      ? formatFrequencyLabel(meta.frequency)
      : '주기 미상';

  const evaluatedKRW = slice?.valueKRW ?? 0;

  const yieldOnCost =
    costBasisKRW > 0
      ? (annualGrossKRW / costBasisKRW) * 100
      : evaluatedKRW > 0
        ? (annualGrossKRW / evaluatedKRW) * 100
        : 0;

  const pnlKRW = costBasisKRW > 0 && evaluatedKRW > 0 ? evaluatedKRW - costBasisKRW : 0;
  const pnlPct = costBasisKRW > 0 && evaluatedKRW > 0 ? (pnlKRW / costBasisKRW) * 100 : 0;

  const priceDisplay = slice?.price
    ? `${holding.market === 'US' ? '$' : ''}${slice.price.toLocaleString()}`
    : '시가 미확인';

  const priceCurrencyLabel = holding.market === 'US' ? 'USD' : 'KRW';

  const startEditPrice = () => {
    setPriceDraft(holding.avgBuyPrice ? String(holding.avgBuyPrice) : '');
    setEditingPrice(true);
  };

  const savePrice = () => {
    const trimmed = priceDraft.trim();
    if (trimmed === '') {
      updateHolding(holding.id, { avgBuyPrice: undefined });
    } else {
      const num = Number(trimmed);
      if (Number.isFinite(num) && num > 0) {
        updateHolding(holding.id, { avgBuyPrice: num });
      }
    }
    setEditingPrice(false);
  };

  const startEditDiv = () => {
    setFreqDraft(holding.manualFrequency ?? '');
    setYieldDraft(holding.manualYieldPct ? String(holding.manualYieldPct) : '');
    setEditingDiv(true);
  };

  const saveDiv = () => {
    const yNum = Number(yieldDraft.trim());
    const patch: { manualFrequency?: DividendFrequency; manualYieldPct?: number } = {
      manualFrequency: freqDraft || undefined,
      manualYieldPct: yieldDraft.trim() && yNum > 0 ? yNum : undefined,
    };
    updateHolding(holding.id, patch);
    setEditingDiv(false);
  };

  const clearDiv = () => {
    updateHolding(holding.id, {
      manualFrequency: undefined,
      manualYieldPct: undefined,
    });
    setEditingDiv(false);
  };

  const handleSharesChange = (delta: number) => {
    const next = Math.max(0, holding.shares + delta);
    updateHolding(holding.id, next);
  };

  const handleRemove = () => {
    if (window.confirm(`${holding.symbol} 보유 종목을 삭제할까요?`)) {
      removeHolding(holding.id);
      onClose();
    }
  };

  return (
    <Modal open={true} title={`${holding.symbol} · ${holding.name}`} onClose={onClose}>
      <section className="hd-section hd-section--summary">
        <div className="hd-summary-row">
          <div>
            <span className="hd-label">평가액 (KRW)</span>
            <strong>{evaluatedKRW > 0 ? formatFullWon(evaluatedKRW) : '시가 미확인'}</strong>
            <span className="hd-sub">
              {holding.shares}주 × {priceDisplay}
            </span>
          </div>
          <div>
            <span className="hd-label">종목 비중</span>
            <strong>{slice ? `${slice.pctOfHoldings.toFixed(1)}%` : '—'}</strong>
            <span className="hd-sub">등록 종목 합계 대비</span>
          </div>
        </div>
      </section>

      <section className="hd-section">
        <div className="hd-section-title">
          <span>평균 매수가</span>
          {!editingPrice && (
            <button type="button" className="btn-ghost hd-edit-btn" onClick={startEditPrice}>
              {holding.avgBuyPrice ? '수정' : '입력'} ›
            </button>
          )}
        </div>
        {editingPrice ? (
          <div className="hd-price-edit">
            <input
              type="number"
              min={0}
              step={holding.market === 'US' ? 0.01 : 1}
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value)}
              placeholder={`${priceCurrencyLabel} (비우면 미설정)`}
              inputMode="decimal"
              autoFocus
            />
            <span className="hd-price-edit__unit">{priceCurrencyLabel}</span>
            <button type="button" className="btn-primary hd-price-save" onClick={savePrice}>
              저장
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setEditingPrice(false)}
            >
              취소
            </button>
          </div>
        ) : holding.avgBuyPrice ? (
          <div className="hd-grid">
            <div className="hd-grid-card">
              <span className="hd-label">매수 원가</span>
              <strong>{formatFullWon(costBasisKRW)}</strong>
              <span className="hd-sub">
                {holding.shares}주 × {priceCurrencyLabel === 'USD' ? '$' : ''}
                {holding.avgBuyPrice.toLocaleString()}
              </span>
            </div>
            <div className="hd-grid-card">
              <span className="hd-label">평가손익</span>
              {evaluatedKRW > 0 ? (
                <>
                  <strong className={pnlKRW >= 0 ? 'accent-green' : 'accent-red'}>
                    {pnlKRW >= 0 ? '+' : ''}
                    {formatFullWon(pnlKRW)}
                  </strong>
                  <span className="hd-sub">
                    {pnlPct >= 0 ? '+' : ''}
                    {pnlPct.toFixed(2)}%
                  </span>
                </>
              ) : (
                <>
                  <strong>—</strong>
                  <span className="hd-sub">시가 미확인</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="hint-text">
            평단가를 입력하면 매수 원가·평가손익·매수가 기준 YoC를 계산합니다.
          </p>
        )}
      </section>

      <section className="hd-section">
        <div className="hd-section-title">
          <span>배당 설정</span>
          {!editingDiv && (
            <button type="button" className="btn-ghost hd-edit-btn" onClick={startEditDiv}>
              {hasManualDiv ? '수정' : '입력'} ›
            </button>
          )}
        </div>
        {editingDiv ? (
          <div className="hd-div-edit">
            <div className="field">
              <label>배당 주기</label>
              <div className="segmented segmented--compact">
                {(
                  [
                    ['', '자동'],
                    ['monthly', '월'],
                    ['quarterly', '분기'],
                    ['semiannual', '반기'],
                    ['annual', '연'],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val || 'auto'}
                    type="button"
                    className={freqDraft === val ? 'active' : ''}
                    onClick={() => setFreqDraft(val as DividendFrequency | '')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>연 배당률 (%)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={yieldDraft}
                onChange={(e) => setYieldDraft(e.target.value)}
                placeholder="예: 3.5 (비우면 자동)"
                inputMode="decimal"
              />
              {!holding.avgBuyPrice && (
                <p className="hint-text" style={{ marginTop: 6, color: 'var(--orange)' }}>
                  평단가가 없어 배당률 입력이 적용되지 않습니다. 평균 매수가를 먼저 입력해 주세요.
                </p>
              )}
            </div>
            <div className="hd-div-edit__actions">
              <button type="button" className="btn-ghost" onClick={clearDiv}>
                초기화
              </button>
              <button type="button" className="btn-ghost" onClick={() => setEditingDiv(false)}>
                취소
              </button>
              <button type="button" className="btn-primary" onClick={saveDiv}>
                저장
              </button>
            </div>
          </div>
        ) : hasManualDiv ? (
          <div className="hd-grid">
            <div className="hd-grid-card">
              <span className="hd-label">주기</span>
              <strong>{frequencyLabelKr(holding.manualFrequency!)}</strong>
            </div>
            <div className="hd-grid-card">
              <span className="hd-label">연 배당률</span>
              <strong className="accent-green">
                {holding.manualYieldPct!.toFixed(2)}%
              </strong>
              <span className="hd-sub">평단가 기준 수동 설정</span>
            </div>
          </div>
        ) : (
          <p className="hint-text">
            배당 주기와 연 배당률을 직접 입력하면 API 데이터 없이도 배당 캘린더가 계산됩니다.
          </p>
        )}
      </section>

      <section className="hd-section">
        <div className="hd-section-title">
          <span>{year}년 예상 배당</span>
          <span className="hd-pill">{freqLabel}</span>
        </div>
        <DividendAmountDisplay grossKRW={annualGrossKRW} size="hero" />
        <div className="hd-grid">
          <div className="hd-grid-card">
            <span className="hd-label">월 평균</span>
            <strong className="accent-green">{formatWon(monthlyAvg)}</strong>
          </div>
          <div className="hd-grid-card">
            <span className="hd-label">예상 수익률 (YoC)</span>
            <strong>{yieldOnCost > 0 ? `${yieldOnCost.toFixed(2)}%` : '—'}</strong>
            <span className="hd-sub">
              {costBasisKRW > 0 ? '연 배당 / 매수원가' : '연 배당 / 평가액'}
            </span>
          </div>
        </div>
      </section>

      <section className="hd-section">
        <div className="hd-section-title">월별 추이</div>
        <MonthlyDividendChart data={annual.byMonth} highlightMonth={upcoming?.month} />
        {upcoming && (
          <p className="hint-text">
            다음 예상 지급: <strong>{upcoming.month}월</strong> · 약{' '}
            {formatWon(upcoming.grossKRW)}
          </p>
        )}
      </section>

      <section className="hd-section">
        <div className="hd-section-title">수량 조정</div>
        <div className="hd-shares-row">
          <button type="button" className="btn-ghost hd-step" onClick={() => handleSharesChange(-10)}>
            −10
          </button>
          <button type="button" className="btn-ghost hd-step" onClick={() => handleSharesChange(-1)}>
            −1
          </button>
          <input
            type="number"
            className="hd-shares-input"
            value={holding.shares}
            min={0}
            onChange={(e) => updateHolding(holding.id, Math.max(0, Number(e.target.value) || 0))}
          />
          <button type="button" className="btn-ghost hd-step" onClick={() => handleSharesChange(1)}>
            +1
          </button>
          <button type="button" className="btn-ghost hd-step" onClick={() => handleSharesChange(10)}>
            +10
          </button>
        </div>
        <p className="hint-text">
          10주 더 매수 시 연 배당 ≈{' '}
          <strong>
            {formatWon(
              holding.shares > 0 ? (annualGrossKRW / holding.shares) * 10 : 0
            )}
          </strong>{' '}
          증가
        </p>
      </section>

      <section className="hd-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>
          닫기
        </button>
        <button type="button" className="btn-ghost hd-delete" onClick={handleRemove}>
          종목 삭제
        </button>
      </section>
    </Modal>
  );
}

// helper for tree-shake friendly toKRW import (silence ts-prune)
void toKRW;
