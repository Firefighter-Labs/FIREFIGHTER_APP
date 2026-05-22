import type { CommunityPost, PostType } from '../types';

export const POST_TYPE_META: Record<
  PostType,
  { label: string; icon: string; chipClass: string }
> = {
  cert: { label: '인증', icon: '📊', chipClass: 'post-chip--cert' },
  question: { label: '질문', icon: '❓', chipClass: 'post-chip--question' },
  win: { label: '성과', icon: '🏆', chipClass: 'post-chip--win' },
  tip: { label: '팁', icon: '💡', chipClass: 'post-chip--tip' },
};

export const QUICK_POST_PHRASES = [
  '이번 달 배당으로 통신비 커버했어요!',
  'JEPI·SCHD 비중 조정했습니다. 피드백 부탁해요.',
  '배당 FIRE 커버율이 드디어 50% 넘었습니다 🔥',
  '신규 입문자인데 월배당 ETF 추천 있을까요?',
];

export const CHAT_QUICK_PHRASES = [
  '오늘도 화이팅 🔥',
  '배당 재투자 중입니다',
  '커버율 얼마나 되세요?',
  '좋은 종목 공유해 주세요',
];

export const CHAT_EMOJIS = ['🔥', '💪', '📈', '🎯', '☕', '👏', '🛡️', '💰'];

export type FeedFilter = 'all' | 'cert' | 'question' | 'mine';
export type FeedSort = 'recent' | 'popular';

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return '방금';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function filterPosts(posts: CommunityPost[], filter: FeedFilter): CommunityPost[] {
  return posts.filter((p) => {
    const type = p.postType ?? 'cert';
    if (filter === 'mine') return p.isMine;
    if (filter === 'cert') return type === 'cert' || p.attachPortfolio;
    if (filter === 'question') return type === 'question';
    return true;
  });
}

export function sortPosts(posts: CommunityPost[], sort: FeedSort): CommunityPost[] {
  const copy = [...posts];
  if (sort === 'popular') {
    return copy.sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt);
  }
  return copy.sort((a, b) => b.createdAt - a.createdAt);
}

export function groupChatByDate<T extends { at: number }>(
  messages: T[]
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const m of messages) {
    const d = new Date(m.at);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = '오늘';
    else if (d.getTime() === yesterday.getTime()) label = '어제';
    else label = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(m);
    else groups.push({ label, items: [m] });
  }
  return groups;
}

export function calcRoomStats(posts: CommunityPost[]) {
  const totalCheers = posts.reduce((s, p) => s + p.likes, 0);
  const certCount = posts.filter((p) => p.attachPortfolio || p.postType === 'cert').length;
  const questionCount = posts.filter((p) => p.postType === 'question').length;
  return { postCount: posts.length, totalCheers, certCount, questionCount };
}
