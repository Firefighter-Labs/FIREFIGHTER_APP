import type { CommunityPost } from '../../types';
import { calcRoomStats } from '../../utils/communityUtils';
import { formatWon } from '../../utils/format';

interface CommunityRoomStatsProps {
  posts: CommunityPost[];
  coveragePct: number;
  monthlyNetKRW: number;
  tierEmoji: string;
  tier: string;
}

export function CommunityRoomStats({
  posts,
  coveragePct,
  monthlyNetKRW,
  tierEmoji,
  tier,
}: CommunityRoomStatsProps) {
  const stats = calcRoomStats(posts);

  return (
    <section className="room-stats">
      <div className="room-stats__hero">
        <span className="room-stats__emoji">{tierEmoji}</span>
        <div>
          <strong className="room-stats__title">1급 비밀 대피소</strong>
          <p className="room-stats__sub">
            {tier} · 배당 커버 {coveragePct.toFixed(0)}% · 월 {formatWon(monthlyNetKRW)}
          </p>
        </div>
      </div>
      <div className="room-stats__grid">
        <div className="room-stat-pill">
          <span className="room-stat-pill__val">{stats.postCount}</span>
          <span className="room-stat-pill__lbl">게시글</span>
        </div>
        <div className="room-stat-pill">
          <span className="room-stat-pill__val">{stats.totalCheers}</span>
          <span className="room-stat-pill__lbl">응원</span>
        </div>
        <div className="room-stat-pill">
          <span className="room-stat-pill__val">{stats.certCount}</span>
          <span className="room-stat-pill__lbl">인증</span>
        </div>
        <div className="room-stat-pill">
          <span className="room-stat-pill__val">{stats.questionCount}</span>
          <span className="room-stat-pill__lbl">질문</span>
        </div>
      </div>
    </section>
  );
}
