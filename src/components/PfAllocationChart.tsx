import { useMemo } from 'react';
import type { Holding } from '../types';
import { holdingMarketValueKRW } from '../utils/holdingMoney';
import { usdToKrw } from '../services/exchangeRateService';

const CHART_COLORS = ['#3182f6', '#ffb020', '#00c471', '#7c5cfc', '#f04452', '#14b8a6'];
/** 막대 너비(%)가 이보다 작으면 안쪽 라벨 대신 하단 범례만 사용 */
const MIN_PCT_FOR_LABEL = 14;
const MIN_PCT_FOR_PCT_ONLY = 8;

type ChartSlice = {
  id: string;
  label: string;
  pct: number;
  color: string;
};

function buildSlices(
  holdings: Holding[],
  totalMarket: number,
  annualDividend: number,
  rate: number
): ChartSlice[] {
  const base = totalMarket > 0 ? totalMarket : annualDividend;
  if (base <= 0) return [];

  return holdings.map((h, i) => {
    const sharesN = h.shares && h.shares > 0 ? h.shares : 1;
    const mv = holdingMarketValueKRW(h, rate);
    const perShareKrw =
      h.market === 'US' && h.annualDividendUSD
        ? usdToKrw(h.annualDividendUSD, rate)
        : h.annualDividendKRW;
    const value = totalMarket > 0 ? mv : perShareKrw * sharesN;
    const pct = (value / base) * 100;
    return {
      id: h.id,
      label: h.symbol ?? h.name,
      pct,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });
}

interface PfAllocationChartProps {
  holdings: Holding[];
  totalMarket: number;
  annualDividend: number;
  rate: number;
}

export function PfAllocationChart({
  holdings,
  totalMarket,
  annualDividend,
  rate,
}: PfAllocationChartProps) {
  const slices = useMemo(
    () => buildSlices(holdings, totalMarket, annualDividend, rate),
    [holdings, totalMarket, annualDividend, rate]
  );

  if (slices.length === 0) return null;

  return (
    <div className="pf-chart-surface">
      <div className="pf-chart" role="img" aria-label="포트폴리오 비중 막대 차트">
        {slices.map((s) => {
          const widthPct = Math.max(0, Math.min(100, s.pct));
          const showLabel = s.pct >= MIN_PCT_FOR_LABEL;
          const showPctOnly = !showLabel && s.pct >= MIN_PCT_FOR_PCT_ONLY;
          return (
            <div
              key={s.id}
              className="pf-chart-block"
              style={{ width: `${widthPct}%`, background: s.color }}
              title={`${s.label} ${s.pct.toFixed(1)}%`}
            >
              {showLabel && (
                <div className="pf-chart-block__bottom">
                  <div className="pf-chart-block__label">{s.label}</div>
                  <div className="pf-chart-block__pct">{s.pct.toFixed(0)}%</div>
                </div>
              )}
              {showPctOnly && (
                <div className="pf-chart-block__pct-only">{s.pct.toFixed(0)}%</div>
              )}
            </div>
          );
        })}
      </div>
      <ul className="pf-chart-legend">
        {slices.map((s) => (
          <li key={s.id}>
            <span className="pf-chart-legend__dot" style={{ background: s.color }} />
            <span className="pf-chart-legend__name">{s.label}</span>
            <span className="pf-chart-legend__pct">{s.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
