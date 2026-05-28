/** 커버율 구간별 동기부여 메시지 (v1 기획) */
const MILESTONES: { minPct: number; message: string }[] = [
  { minPct: 100, message: '배당만으로 생활비를 충당합니다. FIRE 달성!' },
  { minPct: 75, message: '결승선이 보입니다' },
  { minPct: 50, message: '절반의 자유를 얻었습니다' },
  { minPct: 25, message: '생활비의 1/4을 배당이 벌어줍니다' },
];

export function getMilestoneMessage(coveragePct: number): string | null {
  for (const m of MILESTONES) {
    if (coveragePct >= m.minPct) return m.message;
  }
  return null;
}
