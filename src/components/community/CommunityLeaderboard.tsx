import type { CommunityPost } from '../../types';
import { getBadgeEmoji } from '../../utils/badgeUtils';
import { sortPosts } from '../../utils/communityUtils';
import { formatWon } from '../../utils/format';
import { EmptyState } from '../ui/EmptyState';

interface CommunityLeaderboardProps {
  posts: CommunityPost[];
}

export function CommunityLeaderboard({ posts }: CommunityLeaderboardProps) {
  const top = sortPosts(posts, 'popular').slice(0, 5);
  const tierCounts = posts.reduce<Record<string, number>>((acc, p) => {
    const t = p.badgeTier ?? '견습소방관';
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  const topTiers = Object.entries(tierCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="rank-page">
      <section className="card">
        <div className="card-title">🔥 응원 TOP 5</div>
        {top.length === 0 ? (
          <EmptyState icon="🏆" title="아직 랭킹이 없어요" description="첫 글에 응원을 모아 보세요!" />
        ) : (
          <ol className="rank-list">
            {top.map((p, i) => (
              <li key={p.id} className="rank-item">
                <span className="rank-item__pos">{i + 1}</span>
                <div className="rank-item__body">
                  <div className="rank-item__head">
                    <span>{getBadgeEmoji(p.badgeTier ?? '견습소방관')} {p.authorLabel}</span>
                    <span className="rank-item__likes">🔥 {p.likes}</span>
                  </div>
                  <p className="rank-item__preview">{p.content.slice(0, 60)}{p.content.length > 60 ? '…' : ''}</p>
                  {p.attachFireStats && p.fireStats && (
                    <span className="rank-item__meta">
                      커버 {p.fireStats.coveragePct.toFixed(0)}% · {formatWon(p.fireStats.monthlyNetKRW)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card">
        <div className="card-title">활동 분포</div>
        {topTiers.length === 0 ? (
          <p className="hint-text">게시글이 쌓이면 등급 분포가 표시됩니다.</p>
        ) : (
          <ul className="tier-dist">
            {topTiers.map(([tier, count]) => (
              <li key={tier}>
                <span>{getBadgeEmoji(tier as Parameters<typeof getBadgeEmoji>[0])} {tier}</span>
                <span>{count}건</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card challenge-card">
        <div className="card-title">이번 주 미션</div>
        <p className="challenge-card__text">
          배당 커버율을 <strong>1%p</strong> 올리거나, 포트폴리오 인증 글을 1개 남겨 보세요.
        </p>
        <p className="hint-text">완료 시 단톡에 🔥 로 인증해 주세요.</p>
      </section>
    </div>
  );
}
