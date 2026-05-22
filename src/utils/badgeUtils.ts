import type { BadgeTier } from '../types';

const TIERS: { tier: BadgeTier; min: number; emoji: string }[] = [
  { tier: '전설의 소방대장', min: 1_000_000_000, emoji: '👑' },
  { tier: '고급소방관', min: 500_000_000, emoji: '🏅' },
  { tier: '중급소방관', min: 300_000_000, emoji: '⭐' },
  { tier: '초급소방관', min: 100_000_000, emoji: '🔥' },
  { tier: '견습소방관', min: 50_000_000, emoji: '🚒' },
  { tier: '소방훈련생', min: 0, emoji: '🧯' },
];

export function getBadgeTier(totalAssetsKRW: number): BadgeTier {
  for (const t of TIERS) {
    if (totalAssetsKRW >= t.min) return t.tier;
  }
  return '소방훈련생';
}

export function getBadgeEmoji(tier: BadgeTier): string {
  return TIERS.find((t) => t.tier === tier)?.emoji ?? '🧯';
}

export function getNextTierProgress(totalAssetsKRW: number): {
  current: BadgeTier;
  next: BadgeTier | null;
  progress: number;
  remainingKRW: number;
} {
  const current = getBadgeTier(totalAssetsKRW);
  const idx = TIERS.findIndex((t) => t.tier === current);
  const nextEntry = idx > 0 ? TIERS[idx - 1] : null;

  if (!nextEntry) {
    return { current, next: null, progress: 100, remainingKRW: 0 };
  }

  const floor = TIERS[idx].min;
  const ceiling = nextEntry.min;
  const progress = Math.min(100, ((totalAssetsKRW - floor) / (ceiling - floor)) * 100);
  return {
    current,
    next: nextEntry.tier,
    progress,
    remainingKRW: Math.max(0, ceiling - totalAssetsKRW),
  };
}
