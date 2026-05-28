import { useMemo, useState } from 'react';
import { formatFullWon } from '../../utils/format';

type BalancePoint = { label: string; value: number };

interface AccountGrowthChartProps {
  points: BalancePoint[];
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function AccountGrowthChart({ points }: AccountGrowthChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const PAD_X = 8;
  const PAD_Y = 5;

  const stats = useMemo(() => {
    const values = points.map((p) => p.value);
    const rawMin = values.length ? Math.min(...values) : 0;
    const rawMax = values.length ? Math.max(...values) : 0;
    const delta = values.length ? values[values.length - 1] - values[0] : 0;

    const n = points.length;
    const width = 100;
    const height = 46;
    const padY = PAD_Y;
    const padX = PAD_X;

    const range = rawMax - rawMin;
    // 데이터 포인트가 적을 때(예: 2개월) 값이 min/max에 딱 붙어서
    // 에어리어가 과하게 꽉 차 보이는 걸 완화하기 위한 여유 공간입니다.
    const pad = range === 0 ? (rawMax !== 0 ? Math.abs(rawMax) * 0.08 : 1) : Math.abs(range) * 0.12;
    const min = rawMin - pad;
    const max = rawMax + pad;

    const denom = max - min;
    const yFor = (v: number) => {
      if (denom === 0) return height / 2;
      const t = (v - min) / denom; // 0..1
      return padY + (1 - t) * (height - padY * 2);
    };

    const xFor = (i: number) =>
      n <= 1 ? width / 2 : padX + (i / (n - 1)) * (width - padX * 2);

    const linePairs = points.map((p, i) => `${xFor(i)},${yFor(p.value)}`);
    const baselineY = yFor(min);

    // 면적 폴리곤: baseline -> line -> baseline 닫기
    const areaPath =
      n >= 3
        ? `M ${xFor(0)} ${baselineY} L ${linePairs.join(' L ')} L ${xFor(n - 1)} ${baselineY} Z`
        : '';

    const active = activeIndex != null ? clamp(activeIndex, 0, n - 1) : null;
    const activePoint = active != null ? points[active] : null;
    const activeCx = active != null ? xFor(active) : 0;
    const activeCy = active != null ? yFor(points[active].value) : 0;

    const isGain = delta >= 0;
    return {
      min,
      max,
      delta,
      width,
      height,
      baselineY,
      linePairs,
      areaPath,
      active,
      activePoint,
      activeCx,
      activeCy,
      isGain,
    };
  }, [points, activeIndex]);

  if (points.length === 0) return null;

  // CSS 변수 기반이 아니라 인라인으로 색만 바꿔서, 기존 테마를 크게 안 건드리려는 의도입니다.
  const stroke = stats.isGain ? 'var(--green)' : 'var(--loss)';
  const fillTop = stats.isGain ? 'rgba(43, 176, 115, 0.16)' : 'rgba(240, 68, 82, 0.16)';

  return (
    <div className="growth-chart" aria-label="계좌 성장 차트">
      <div className="growth-chart__wrap">
        <svg
          className="growth-chart__svg"
          viewBox={`0 0 ${stats.width} ${stats.height}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id="growth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillTop} />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </linearGradient>
          </defs>

          {/* 가로 격자선(예시처럼 차트 느낌 강화) */}
          <g aria-hidden>
            {[1, 2, 3].map((k) => {
              const t = k / 4; // 0.25, 0.5, 0.75
              const y = PAD_Y + t * (stats.height - PAD_Y * 2);
              return (
                <line
                  key={k}
                  x1={PAD_X}
                  x2={stats.width - PAD_X}
                  y1={y}
                  y2={y}
                  stroke="rgba(120, 130, 150, 0.12)"
                  strokeWidth={1}
                />
              );
            })}
          </g>

          {/* 면(에어리어) */}
          {stats.areaPath && (
            <path d={stats.areaPath} fill="url(#growth-fill)" stroke="none" />
          )}

          {/* 라인 */}
          <polyline
            points={stats.linePairs.join(' ')}
            fill="none"
            stroke={stroke}
            strokeWidth={1.6}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* 포인트(호버/클릭 대상) */}
          {points.map((p, i) => {
            const x =
              points.length <= 1
                ? stats.width / 2
                : PAD_X + (i / (points.length - 1)) * (stats.width - PAD_X * 2);
            const denom = stats.max - stats.min;
            const height = stats.height;
            const padY = 6;
            const y =
              denom === 0 ? height / 2 : padY + (1 - (p.value - stats.min) / denom) * (height - padY * 2);

            const isActive = stats.active === i;
            return (
              <g
                key={`${p.label}-${i}`}
                onMouseEnter={() => setActiveIndex(i)}
                onFocus={() => setActiveIndex(i)}
                onClick={() => setActiveIndex((prev) => (prev === i ? null : i))}
                role="button"
                tabIndex={0}
                aria-label={`${p.label} ${formatFullWon(p.value)}`}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 3.4 : 2.6}
                  fill="#fff"
                  stroke={stroke}
                  strokeWidth={1.8}
                  style={{ cursor: 'pointer' }}
                />
              </g>
            );
          })}

          {/* x축 라벨(너무 꽉 차지 않게: 6개 이하면 양끝만 표시) */}
          {points.length > 1 && points.length <= 6 &&
            points.map((p, i) => {
              const isEdge = i === 0 || i === points.length - 1;
              if (!isEdge) return null;
              const x =
                points.length <= 1
                  ? stats.width / 2
                  : PAD_X + (i / (points.length - 1)) * (stats.width - PAD_X * 2);
              return (
                <text
                  key={`x-${p.label}-${i}`}
                  x={x}
                  y={stats.height - 1}
                  textAnchor={i === 0 ? 'start' : 'end'}
                  fontSize={5.6}
                  fill="rgba(110, 120, 140, 0.75)"
                >
                  {p.label}
                </text>
              );
            })}
        </svg>

        {stats.activePoint && (
          <div
            className="growth-chart__tooltip"
            style={{
              left: `${stats.activeCx}%`,
              top: `${(stats.activeCy / stats.height) * 100}%`,
              borderColor: stroke,
            }}
          >
            <div className="growth-chart__tooltip-title">{stats.activePoint.label}</div>
            <strong className="growth-chart__tooltip-value">{formatFullWon(stats.activePoint.value)}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

