import type { PortfolioAllocation } from '../../utils/portfolioAllocation';
import { buildHoldingsConicGradient } from '../../utils/portfolioAllocation';
import { formatWon } from '../../utils/format';

const HOLDING_COLORS = [
  'var(--green)',
  '#3b82f6',
  '#f59e0b',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
];

interface PortfolioEditorProps {
  allocation: PortfolioAllocation;
  loading?: boolean;
  onOpenDividendTab?: () => void;
}

export function PortfolioEditor({ allocation, loading, onOpenDividendTab }: PortfolioEditorProps) {
  const { slices, stockRatio, cashRatio, fromHoldings, pricedCount, usedShareFallback, totalStockKRW } =
    allocation;

  if (!fromHoldings) {
    return (
      <div className="portfolio-editor">
        <div className="money-editor__head">
          <span className="money-editor__icon">📊</span>
          <div>
            <div className="money-editor__title">포트폴리오 비율</div>
            <div className="money-editor__sub">배당 탭에서 종목을 등록하면 자동 계산됩니다</div>
          </div>
        </div>
        <p className="hint-text" style={{ marginBottom: 12 }}>
          SCHD, JEPI 등 보유 종목·수량을 넣으면 시가 기준 비중과 주식/현금 비율이 표시됩니다.
        </p>
        {onOpenDividendTab && (
          <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={onOpenDividendTab}>
            배당 탭에서 종목 등록
          </button>
        )}
      </div>
    );
  }

  const conic = buildHoldingsConicGradient(slices, HOLDING_COLORS);

  return (
    <div className="portfolio-editor">
      <div className="money-editor__head">
        <span className="money-editor__icon">📊</span>
        <div>
          <div className="money-editor__title">포트폴리오 비율</div>
          <div className="money-editor__sub">
            배당 탭 등록 종목 {slices.length}개 ·{' '}
            {loading ? '시가 조회 중…' : pricedCount < slices.length ? '일부 시가 추정' : '시가 반영'}
          </div>
        </div>
      </div>

      <div className="portfolio-donut-wrap">
        <div className="portfolio-donut" style={{ background: conic }}>
          <div className="portfolio-donut__hole">
            <span className="portfolio-donut__stock">{stockRatio}%</span>
            <span className="portfolio-donut__label">주식</span>
          </div>
        </div>
        <div className="portfolio-legend">
          <div>
            <span className="dot dot--stock" /> 주식(등록 종목){' '}
            <strong>{stockRatio}%</strong>
            <span className="portfolio-legend__sub"> ≈ {formatWon(totalStockKRW)}</span>
          </div>
          <div>
            <span className="dot dot--cash" /> 현금·기타 <strong>{cashRatio}%</strong>
          </div>
        </div>
      </div>

      <ul className="portfolio-holdings-list">
        {slices.map((s, i) => (
          <li key={s.holdingId} className="portfolio-holding-row">
            <span className="portfolio-holding-row__dot" style={{ background: HOLDING_COLORS[i % HOLDING_COLORS.length] }} />
            <span className="portfolio-holding-row__sym">{s.symbol}</span>
            <span className="portfolio-holding-row__name">{s.name}</span>
            <span className="portfolio-holding-row__pct">{s.pctOfHoldings.toFixed(1)}%</span>
            <span className="portfolio-holding-row__meta">
              {s.shares}주
              {s.price != null ? ` · ${s.market === 'US' ? '$' : ''}${s.price.toLocaleString()}` : ''}
            </span>
          </li>
        ))}
      </ul>

      {usedShareFallback && (
        <p className="hint-text">
          시가를 가져오지 못해 <strong>보유 수량 비율</strong>로만 종목 간 비중을 표시했습니다. FMP 키 또는 개발
          서버(Yahoo)에서 시가 조회가 가능합니다.
        </p>
      )}
      {cashRatio === 0 && totalStockKRW > 0 && allocation.totalAssetsKRW > 0 && (
        <p className="hint-text">
          등록 종목 평가액이 총 자산({formatWon(allocation.totalAssetsKRW)}) 이상으로 보입니다. 총 자산을 올리거나
          수량을 조정해 보세요.
        </p>
      )}
    </div>
  );
}
