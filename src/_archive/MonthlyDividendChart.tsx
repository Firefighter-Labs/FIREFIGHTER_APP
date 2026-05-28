import { useMemo, useState } from 'react';
import type { MonthlyBucket } from '../../utils/dividendChartData';
import { formatWon } from '../../utils/format';

interface MonthlyDividendChartProps {
  data: MonthlyBucket[];
  highlightMonth?: number;
  height?: number;
}

const CHART_PADDING = { top: 20, right: 12, bottom: 24, left: 8 };

export function MonthlyDividendChart({
  data,
  highlightMonth,
  height = 180,
}: MonthlyDividendChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const { maxValue, hasData } = useMemo(() => {
    const max = data.reduce((m, d) => Math.max(m, d.grossKRW), 0);
    return { maxValue: max, hasData: max > 0 };
  }, [data]);

  const width = 320;
  const innerW = width - CHART_PADDING.left - CHART_PADDING.right;
  const innerH = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const barW = innerW / data.length;
  const barInner = barW * 0.6;

  return (
    <div className="monthly-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="monthly-chart__svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="월별 배당 추이"
      >
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <line
            key={r}
            x1={CHART_PADDING.left}
            x2={width - CHART_PADDING.right}
            y1={CHART_PADDING.top + innerH * (1 - r)}
            y2={CHART_PADDING.top + innerH * (1 - r)}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
        ))}

        {data.map((d, i) => {
          const grossH = hasData ? (d.grossKRW / maxValue) * innerH : 0;
          const x = CHART_PADDING.left + i * barW + (barW - barInner) / 2;
          const y = CHART_PADDING.top + innerH - grossH;
          const isHL = highlightMonth === d.month;
          const isHover = hover === i;

          return (
            <g
              key={d.month}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onTouchStart={() => setHover(i)}
            >
              <rect
                x={x}
                y={y}
                width={barInner}
                height={grossH}
                fill={isHL ? 'var(--orange)' : isHover ? 'var(--green)' : '#10d9a0'}
                rx={3}
              />
              <text
                x={x + barInner / 2}
                y={height - 6}
                fill={isHL ? 'var(--orange)' : 'var(--text-muted)'}
                fontSize="9"
                textAnchor="middle"
              >
                {d.month}
              </text>
              {(isHover || isHL) && d.grossKRW > 0 && (
                <text
                  x={x + barInner / 2}
                  y={y - 4}
                  fill="var(--text)"
                  fontSize="9"
                  textAnchor="middle"
                  fontWeight={600}
                >
                  {formatWon(d.grossKRW)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="monthly-chart__legend">
        {hasData && (
          <span className="monthly-chart__legend-sub">최대 {formatWon(maxValue)}</span>
        )}
      </div>
    </div>
  );
}
