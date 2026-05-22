import { useDashboard } from '../hooks/useDashboard';
import { useAppStore } from '../store/useAppStore';
import { formatWon } from '../utils/format';
import { StatCard } from './ui/StatCard';

export function DashboardStrip() {
  const d = useDashboard();
  const setTab = useAppStore((s) => s.setTab);

  return (
    <section className="card dashboard-strip">
      <div className="dashboard-strip__badge">
        <span className="dashboard-strip__emoji">{d.tierEmoji}</span>
        <div>
          <strong>{d.tier}</strong>
          {d.tierProgress.next && (
            <p className="dashboard-strip__next">
              다음 {d.tierProgress.next}까지 {formatWon(d.tierProgress.remainingKRW)} ({d.tierProgress.progress.toFixed(0)}%)
            </p>
          )}
        </div>
      </div>
      <div className="stat-grid">
        <StatCard
          label="배당 커버"
          value={`${d.dividendFire.coveragePct.toFixed(0)}%`}
          sub={d.dividendFire.isFIRE ? '달성!' : `월 ${formatWon(d.dividendFire.monthlyGapKRW)} 부족`}
          accent="green"
          onClick={() => setTab('fire')}
        />
        <StatCard
          label="이번 달 배당"
          value={formatWon(d.monthDiv.totalNetKRW)}
          sub={`세전 ${formatWon(d.monthDiv.totalGrossKRW)} · 연 ${formatWon(d.yearDiv.netKRW)}`}
          accent="orange"
          onClick={() => setTab('dividend')}
        />
        <StatCard
          label="보유 종목"
          value={`${d.holdingsCount}개`}
          sub="탭해서 관리"
          onClick={() => setTab('dividend')}
        />
      </div>
    </section>
  );
}
