import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useDashboard } from '../hooks/useDashboard';
import { useProgressTracker } from '../hooks/useProgressTracker';
import { MILESTONE_DEFS, getMilestoneDef } from '../utils/milestones';
import { formatWon } from '../utils/format';
import { Amount } from './ui/Amount';
import { ProgressLineChart } from './ui/ProgressLineChart';
import { EmptyState } from './ui/EmptyState';

type MetricKey = 'totalAssetsKRW' | 'monthlyNetKRW' | 'coveragePct';

const METRIC_TABS: { key: MetricKey; label: string }[] = [
  { key: 'totalAssetsKRW', label: '총자산' },
  { key: 'monthlyNetKRW', label: '월 배당' },
  { key: 'coveragePct', label: '커버율' },
];

export function Progress() {
  const dash = useDashboard();
  const { snapshots, milestones } = useProgressTracker();
  const setSnapshotNote = useAppStore((s) => s.setSnapshotNote);
  const acknowledgeMilestones = useAppStore((s) => s.acknowledgeMilestones);
  const acknowledgedIds = useAppStore((s) => s.acknowledgedMilestoneIds);

  const [metric, setMetric] = useState<MetricKey>('coveragePct');
  const [noteDraft, setNoteDraft] = useState('');

  const todayISO = new Date().toISOString().slice(0, 10);
  const todaySnap = snapshots.find((s) => s.date === todayISO);

  const unseenMilestones = useMemo(
    () => milestones.filter((m) => !acknowledgedIds.includes(m.id)),
    [milestones, acknowledgedIds]
  );

  const handleAckAll = () => {
    if (unseenMilestones.length > 0) {
      acknowledgeMilestones(unseenMilestones.map((m) => m.id));
    }
  };

  const handleSaveNote = () => {
    if (!todaySnap) return;
    setSnapshotNote(todaySnap.date, noteDraft);
    setNoteDraft('');
  };

  const firstSnap = snapshots[0];
  const sinceDays = firstSnap
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - new Date(firstSnap.date).getTime()) / 86400000
        )
      )
    : 0;

  // 다음 마일스톤 1순위
  const nextMilestone = useMemo(() => {
    const achievedIds = new Set(milestones.map((m) => m.id));
    return MILESTONE_DEFS.find((def) => !achievedIds.has(def.id)) ?? null;
  }, [milestones]);

  const coveragePct = dash.dividendFire.coveragePct;
  const monthlyNetKRW = dash.monthDiv.totalNetKRW;
  const holdingsCount = dash.holdingsCount;

  return (
    <div className="progress-page">
      {unseenMilestones.length > 0 && (
        <section className="card milestone-celebrate">
          <div className="milestone-celebrate__head">
            <span className="milestone-celebrate__title">
              새 마일스톤 {unseenMilestones.length}개 달성
            </span>
            <button type="button" className="btn-ghost" onClick={handleAckAll}>
              확인
            </button>
          </div>
          <div className="milestone-celebrate__list">
            {unseenMilestones.map((m) => {
              const def = getMilestoneDef(m.id);
              if (!def) return null;
              return (
                <div key={m.id} className="milestone-celebrate__item">
                  <span className="milestone-celebrate__icon">{def.icon}</span>
                  <div>
                    <strong>{def.label}</strong>
                    <p>{def.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="card progress-hero">
        <div className="progress-hero__head">
          <div>
            <span className="metric-label">현재 등급</span>
            <strong className="progress-hero__title">{dash.tier}</strong>
            {dash.tierProgress.next && (
              <p>
                다음 <strong>{dash.tierProgress.next}</strong>까지{' '}
                <Amount value={dash.tierProgress.remainingKRW} size="sm" />
              </p>
            )}
          </div>
        </div>
        <div className="progress-hero__bar">
          <div
            className="progress-hero__bar-fill"
            style={{ width: `${dash.tierProgress.progress}%` }}
          />
          <span className="progress-hero__bar-text">
            {dash.tierProgress.progress.toFixed(0)}%
          </span>
        </div>
        <div className="progress-hero__stats">
          <div>
            <span className="metric-label">총자산</span>
            <Amount value={dash.assetsKRW} size="md" compact />
          </div>
          <div>
            <span className="metric-label">커버율</span>
            <strong className="progress-hero__stat-val accent-green">{coveragePct.toFixed(0)}%</strong>
          </div>
          <div>
            <span className="metric-label">월 배당</span>
            <Amount value={monthlyNetKRW} size="md" tone="pos" />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-title">
          {firstSnap ? `${sinceDays}일간 성장 추이` : '성장 추이'}
        </div>
        <div className="segmented progress-metric-tabs">
          {METRIC_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={metric === t.key ? 'active' : ''}
              onClick={() => setMetric(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <ProgressLineChart data={snapshots} metric={metric} />
        <p className="hint-text" style={{ marginTop: 8 }}>
          앱을 열거나 데이터를 수정할 때마다 하루 1회 자동 기록됩니다 (최근 365일).
        </p>
      </section>

      <section className="card">
        <div className="card-title">마일스톤 진행</div>
        {nextMilestone && (
          <div className="next-milestone">
            <span className="next-milestone__icon">{nextMilestone.icon}</span>
            <div>
              <strong>다음: {nextMilestone.label}</strong>
              <p>{nextMilestone.description}</p>
            </div>
          </div>
        )}
        <ul className="milestone-grid">
          {MILESTONE_DEFS.map((def) => {
            const achieved = milestones.find((m) => m.id === def.id);
            return (
              <li
                key={def.id}
                className={`milestone-chip ${achieved ? 'milestone-chip--done' : ''}`}
                title={def.description}
              >
                <span className="milestone-chip__icon">{achieved ? def.icon : '·'}</span>
                <span className="milestone-chip__label">{def.label}</span>
                {achieved && (
                  <span className="milestone-chip__date">
                    {new Date(achieved.achievedAt).toISOString().slice(0, 10)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <div className="card-title">오늘의 회고</div>
        {todaySnap ? (
          <>
            <p className="hint-text">
              자산 <Amount value={todaySnap.totalAssetsKRW} size="sm" /> · 월 배당{' '}
              <Amount value={todaySnap.monthlyNetKRW} size="sm" tone="pos" /> · 종목 {holdingsCount}개
            </p>
            {todaySnap.note && (
              <p className="snap-note">{todaySnap.note}</p>
            )}
            <textarea
              className="composer-textarea"
              rows={3}
              placeholder="오늘의 매수·절약·기분을 한 줄로… (선택)"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              maxLength={200}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={!noteDraft.trim()}
              onClick={handleSaveNote}
            >
              저장
            </button>
          </>
        ) : (
          <EmptyState
            icon="·"
            title="오늘 스냅샷이 아직 없어요"
            description="자산·종목을 입력하면 자동으로 기록됩니다."
          />
        )}
      </section>

      {snapshots.length > 1 && (
        <section className="card">
          <div className="card-title">최근 기록</div>
          <ul className="snap-history">
            {snapshots
              .slice(-14)
              .reverse()
              .map((s) => (
                <li key={s.date}>
                  <span className="snap-history__date">{s.date.slice(5)}</span>
                  <span className="snap-history__cov">
                    {s.coveragePct.toFixed(0)}%
                  </span>
                  <span className="snap-history__amt">{formatWon(s.monthlyNetKRW)}</span>
                  {s.note && <span className="snap-history__note">·</span>}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
