import { useState } from 'react';
import { formatFullWon, formatWon } from '../../utils/format';

const DEFAULT_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

interface MonthlyBarChartProps {
  values: number[];
  labels?: string[];
  highlightMonth?: number;
  showTotals?: boolean;
}

export function MonthlyBarChart({
  values,
  labels,
  highlightMonth,
  showTotals = true,
}: MonthlyBarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const baseLabels = labels ?? DEFAULT_LABELS.slice(0, values.length);
  const yearTotal = values.reduce((a, b) => a + b, 0);
  const chartValues = showTotals && values.length === 12 ? [...values, yearTotal] : values;
  const chartLabels =
    showTotals && values.length === 12
      ? [...baseLabels, '소계']
      : baseLabels.length >= chartValues.length
        ? baseLabels.slice(0, chartValues.length)
        : chartValues.map((_, i) => `${i + 1}`);

  const max = Math.max(...chartValues, 1);
  const now = highlightMonth ?? new Date().getMonth() + 1;

  return (
    <div className="bar-chart">
      <div className="bar-chart__bars">
        {chartValues.map((v, i) => {
          const isTotal = showTotals && values.length === 12 && i === 12;
          const month = !isTotal && values.length === 12 ? i + 1 : null;
          const h = max > 0 ? (v / max) * 100 : 0;
          const barHeight = Math.max(h, v > 0 ? 4 : 0);
          const isCurrent = month === now;
          const isActive = activeIndex === i;
          const label = chartLabels[i];
          const amountLabel = v > 0 ? formatFullWon(v) : '0원';
          const shortLabel = v > 0 ? formatWon(v) : '—';
          const tooltipBelow = barHeight < 22;

          return (
            <div
              key={`${label}-${i}`}
              className={`bar-chart__col ${isActive ? 'bar-chart__col--active' : ''}`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={() => setActiveIndex((prev) => (prev === i ? null : i))}
            >
              <button
                type="button"
                className="bar-chart__hit"
                aria-label={`${label} 예상 배당 ${amountLabel}`}
              >
                <div className="bar-chart__track">
                  <div className="bar-chart__bar" style={{ height: `${barHeight}%` }}>
                    <div
                      className={`bar-chart__tooltip ${tooltipBelow ? 'bar-chart__tooltip--below' : ''} ${isActive ? 'bar-chart__tooltip--visible' : ''}`}
                      role="tooltip"
                      aria-hidden={!isActive}
                    >
                      <span className="bar-chart__tooltip-month">{label}</span>
                      <strong className="bar-chart__tooltip-amount">{amountLabel}</strong>
                      {v > 0 && shortLabel !== amountLabel && (
                        <span className="bar-chart__tooltip-short">약 {shortLabel}</span>
                      )}
                    </div>
                    <div
                      className={`bar-chart__fill ${isCurrent ? 'bar-chart__fill--current' : ''} ${isTotal ? 'bar-chart__fill--total' : ''}`}
                    />
                  </div>
                </div>
              </button>
              <span
                className={`bar-chart__label ${isCurrent ? 'bar-chart__label--current' : ''} ${isTotal ? 'bar-chart__label--total' : ''}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
