import { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useDashboard } from './useDashboard';
import { findNewMilestones } from '../utils/milestones';
import type { ProgressSnapshot } from '../types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 앱이 열려 있고 데이터가 준비되면 하루 1회 스냅샷을 자동 기록하고,
 * 마일스톤 달성을 자동 감지해 저장합니다.
 */
export function useProgressTracker() {
  const dash = useDashboard();
  const snapshots = useAppStore((s) => s.snapshots);
  const milestones = useAppStore((s) => s.milestones);
  const recordSnapshot = useAppStore((s) => s.recordSnapshot);
  const recordMilestone = useAppStore((s) => s.recordMilestone);

  const todayDate = todayISO();
  const lastDate = snapshots[snapshots.length - 1]?.date;

  const ready = dash.holdingsCount >= 0; // 데이터가 준비되면
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const snap: ProgressSnapshot = {
        date: todayDate,
        totalAssetsKRW: Math.round(dash.assetsKRW),
        monthlyNetKRW: Math.round(dash.monthDiv.totalNetKRW),
        coveragePct: dash.dividendFire.coveragePct,
        holdingsCount: dash.holdingsCount,
        tier: dash.tier,
      };
      // 오늘 데이터가 없거나 값이 바뀌면 기록
      const last = snapshots.find((s) => s.date === todayDate);
      if (
        !last ||
        last.totalAssetsKRW !== snap.totalAssetsKRW ||
        last.monthlyNetKRW !== snap.monthlyNetKRW ||
        last.holdingsCount !== snap.holdingsCount
      ) {
        recordSnapshot(snap);
      }

      // 마일스톤 감지
      const achievedIds = milestones.map((m) => m.id);
      const newly = findNewMilestones(achievedIds, {
        coveragePct: snap.coveragePct,
        monthlyNetKRW: snap.monthlyNetKRW,
        holdingsCount: snap.holdingsCount,
      });
      for (const id of newly) {
        recordMilestone({
          id,
          achievedAt: Date.now(),
          snapshot: {
            totalAssetsKRW: snap.totalAssetsKRW,
            monthlyNetKRW: snap.monthlyNetKRW,
            coveragePct: snap.coveragePct,
            holdingsCount: snap.holdingsCount,
          },
        });
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    ready,
    todayDate,
    lastDate,
    dash.assetsKRW,
    dash.monthDiv.totalNetKRW,
    dash.dividendFire.coveragePct,
    dash.holdingsCount,
    dash.tier,
    snapshots,
    milestones,
    recordSnapshot,
    recordMilestone,
  ]);

  return useMemo(
    () => ({
      todaySnapshot: snapshots.find((s) => s.date === todayDate) ?? null,
      snapshots,
      milestones,
    }),
    [snapshots, milestones, todayDate]
  );
}
