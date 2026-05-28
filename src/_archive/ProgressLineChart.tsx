import { useMemo, useState } from 'react';
import type { ProgressSnapshot } from '../../types';
import { formatWon } from '../../utils/format';

interface ProgressLineChartProps {
  data: ProgressSnapshot[];
  metric: 'totalAssetsKRW' | 'monthlyNetKRW' | 'coveragePct';
  height?: number;
}

const PADDING = { top: 16, right: 12, bottom: 24, left: 8 };
const WIDTH = 320;

export function ProgressLineChart({ data, metric, height = 180 }: ProgressLineChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const { points, min, max, hasData } = useMemo(() => {
    if (data.length === 0) return { points: [], min: 0, max: 0, hasData: false };
    const values = data.map((d) => d[metric]);
    const mn = Math.min(...values);
    const mx = Math.max(...values);
    return { points: values, min: mn, max: mx, hasData: true };
  }, [data, metric]);

  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const span = Math.max(1, max - min || max || 1);

  const coords = points.map((v, i) => {
    const x = data.length === 1
      ? PADDING.left + innerW / 2
      : PADDING.left + (i / (data.length - 1)) * innerW;
    const y = PADDING.top + innerH - ((v - min) / span) * innerH;
    return { x, y, v };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x} ${PADDING.top + innerH} L ${coords[0].x} ${PADDING.top + innerH} Z`
      : '';

  const fmtValue = (v: number) => {
    if (metric === 'coveragePct') return `${v.toFixed(1)}%`;
    return formatWon(v);
  };

  const fmtDate = (d: string) => {
    const m = d.slice(5, 7);
    const day = d.slice(8, 10);
    return `${parseInt(m, 10)}/${parseInt(day, 10)}`;
  };

  if (!hasData) {
    return (
      <div className="progress-empty">
        아직 기록된 스냅샷이 없습니다. 자산·종목을 입력하면 자동으로 기록돼요.
      </div>
    );
  }

  return (
    <div className="progress-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="progress-chart__svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <line
            key={r}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={PADDING.top + innerH * (1 - r)}
            y2={PADDING.top + innerH * (1 - r)}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
        ))}
        {areaPath && <path d={areaPath} fill="rgba(255, 107, 44, 0.15)" />}
        <path
          d={linePath}
          fill="none"
          stroke="var(--orange)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => {
          const isHover = hover === i;
          return (
            <g key={i}>
              <circle
                cx={c.x}
                cy={c.y}
                r={isHover ? 5 : 3}
                fill={isHover ? 'var(--green)' : 'var(--orange)'}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              />
              {isHover && (
                <>
                  <text
                    x={c.x}
                    y={c.y - 10}
                    fill="var(--text)"
                    fontSize="9"
                    textAnchor="middle"
                    fontWeight={700}
                  >
                    {fmtValue(c.v)}
                  </text>
                  <text
                    x={c.x}
                    y={height - 4}
                    fill="var(--text-muted)"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    {fmtDate(data[i].date)}
                  </text>
                </>
              )}
            </g>
          );
        })}
        {/* X 축 - 양 끝 날짜 */}
        {data.length > 1 && hover == null && (
          <>
            <text
              x={PADDING.left}
              y={height - 4}
              fill="var(--text-muted)"
              fontSize="9"
              textAnchor="start"
            >
              {fmtDate(data[0].date)}
            </text>
            <text
              x={WIDTH - PADDING.right}
              y={height - 4}
              fill="var(--text-muted)"
              fontSize="9"
              textAnchor="end"
            >
              {fmtDate(data[data.length - 1].date)}
            </text>
          </>
        )}
      </svg>
      <div className="progress-chart__legend">
        <span>
          현재 <strong>{fmtValue(points[points.length - 1])}</strong>
        </span>
        <span className="progress-chart__delta">
          시작 {fmtValue(points[0])} ·{' '}
          {points.length > 1 && (
            <span
              className={
                points[points.length - 1] >= points[0] ? 'accent-green' : 'progress-chart__neg'
              }
            >
              {points[points.length - 1] >= points[0] ? '▲' : '▼'}{' '}
              {fmtValue(Math.abs(points[points.length - 1] - points[0]))}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
