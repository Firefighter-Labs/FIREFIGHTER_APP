import { useMemo, useState } from 'react';
import { AuthPanel } from './AuthPanel';
import { CommunityChat } from './community/CommunityChat';
import { CommunityLeaderboard } from './community/CommunityLeaderboard';
import { CommunityRoomStats } from './community/CommunityRoomStats';
import { PostCard } from './community/PostCard';
import { PostComposer } from './community/PostComposer';
import { useAuth } from '../context/AuthContext';
import { useCommunity, type CommunityView } from '../hooks/useCommunity';
import { useDashboard } from '../hooks/useDashboard';
import { usePortfolioAllocation } from '../hooks/usePortfolioAllocation';
import { useAppStore } from '../store/useAppStore';
import type { PostFireStats } from '../types';
import {
  filterPosts,
  sortPosts,
  type FeedFilter,
  type FeedSort,
} from '../utils/communityUtils';
import { EmptyState } from './ui/EmptyState';

export function Community() {
  const fire = useAppStore((s) => s.fire);
  const holdings = useAppStore((s) => s.holdings);
  const dash = useDashboard();
  const { allocation: portfolio } = usePortfolioAllocation(
    holdings,
    fire.totalAssets,
    fire.currency,
    dash.usdKrw
  );

  const auth = useAuth();
  const tier = dash.tier;
  const emoji = dash.tierEmoji;
  const df = dash.dividendFire;

  const [view, setView] = useState<CommunityView>('feed');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [feedSort, setFeedSort] = useState<FeedSort>('recent');

  const {
    mode,
    posts,
    chatMessages,
    loading,
    error,
    addPost,
    likePost,
    addChatMessage,
    removePost,
    loadComments,
    addComment,
    getComments,
    refresh,
  } = useCommunity(tier, auth.isLoggedIn, auth.user?.id ?? null, view);

  const [chatText, setChatText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const needsLogin = mode === 'cloud' && !auth.isLoggedIn;

  const displayedPosts = useMemo(() => {
    const filtered = filterPosts(posts, feedFilter);
    return sortPosts(filtered, feedSort);
  }, [posts, feedFilter, feedSort]);

  const portfolioLabel = portfolio.fromHoldings
    ? `${portfolio.slices.length}종목 · 주식 ${portfolio.stockRatio}%`
    : '배당 탭 종목 등록 필요';

  const fireStatsLabel = `커버 ${df.coveragePct.toFixed(0)}% · 월 ${(dash.monthDiv.totalNetKRW / 10000).toFixed(0)}만 · ${holdings.length}종목`;

  const buildFireStats = (): PostFireStats => ({
    coveragePct: df.coveragePct,
    monthlyNetKRW: dash.monthDiv.totalNetKRW,
    holdingsCount: holdings.length,
    tier,
  });

  const handlePost = async (input: {
    content: string;
    postType: import('../types').PostType;
    attachPortfolio: boolean;
    attachFireStats: boolean;
  }) => {
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await addPost({
        ...input,
        stockRatio: portfolio.fromHoldings ? portfolio.stockRatio : fire.stockRatio,
        cashRatio: portfolio.fromHoldings ? portfolio.cashRatio : fire.cashRatio,
        fireStats: input.attachFireStats ? buildFireStats() : undefined,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '게시에 실패했습니다.';
      setFormError(msg);
      if (msg.includes('로그인') || msg.includes('계정')) {
        await auth.signOut();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await removePost(postId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '삭제에 실패했습니다.';
      setFormError(msg);
      if (msg.includes('로그인') || msg.includes('계정')) {
        await auth.signOut();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChat = async () => {
    if (!chatText.trim() || submitting) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await addChatMessage(chatText.trim());
      setChatText('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '전송에 실패했습니다.';
      setFormError(msg);
      if (msg.includes('로그인') || msg.includes('계정')) {
        await auth.signOut();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="community-page">
      <section className="card community-header-card">
        <div className="post-meta">
          <span className="badge">
            {emoji} {tier}
          </span>
          {mode === 'cloud' ? (
            auth.isLoggedIn ? (
              <span className="badge badge--muted">☁️ {auth.displayName}</span>
            ) : (
              <span className="community-login-hint">로그인 필요</span>
            )
          ) : (
            <span className="community-login-hint">📱 로컬 MVP</span>
          )}
        </div>

        {!needsLogin && (
          <>
            <CommunityRoomStats
              posts={posts}
              coveragePct={df.coveragePct}
              monthlyNetKRW={dash.monthDiv.totalNetKRW}
              tierEmoji={emoji}
              tier={tier}
            />
            <div className="segmented community-tabs">
              <button type="button" className={view === 'feed' ? 'active' : ''} onClick={() => setView('feed')}>
                📋 피드
              </button>
              <button type="button" className={view === 'chat' ? 'active' : ''} onClick={() => setView('chat')}>
                💬 단톡
              </button>
              <button type="button" className={view === 'rank' ? 'active' : ''} onClick={() => setView('rank')}>
                🏆 랭킹
              </button>
            </div>
            {mode === 'cloud' && (
              <button type="button" className="btn-ghost community-refresh" onClick={() => refresh()}>
                ↻ 새로고침
              </button>
            )}
          </>
        )}

        {(error || formError) && <p className="community-error">{formError ?? error}</p>}
      </section>

      {needsLogin ? (
        <AuthPanel
          onSendOtp={auth.sendEmailOtp}
          onVerifyOtp={auth.verifyEmailOtp}
          onGoogle={auth.signInWithGoogle}
        />
      ) : loading && mode === 'cloud' ? (
        <p className="community-loading">불러오는 중…</p>
      ) : view === 'feed' ? (
        <>
          <PostComposer
            portfolioLabel={portfolioLabel}
            fireStatsLabel={fireStatsLabel}
            onSubmit={handlePost}
            submitting={submitting}
          />

          <div className="feed-toolbar card">
            <div className="feed-filter-row">
              {(
                [
                  ['all', '전체'],
                  ['cert', '📊 인증'],
                  ['question', '❓ 질문'],
                  ['mine', '내 글'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`feed-filter-chip ${feedFilter === key ? 'active' : ''}`}
                  onClick={() => setFeedFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="feed-sort-row">
              <button
                type="button"
                className={feedSort === 'recent' ? 'active' : ''}
                onClick={() => setFeedSort('recent')}
              >
                최신
              </button>
              <button
                type="button"
                className={feedSort === 'popular' ? 'active' : ''}
                onClick={() => setFeedSort('popular')}
              >
                🔥 인기
              </button>
            </div>
          </div>

          {displayedPosts.length === 0 ? (
            <EmptyState
              icon="📝"
              title="표시할 글이 없어요"
              description={
                feedFilter === 'mine'
                  ? '첫 인증 글을 작성해 보세요.'
                  : '필터를 바꾸거나 새 글을 남겨 보세요.'
              }
            />
          ) : (
            displayedPosts.map((p) => (
              <PostCard
                key={p.id}
                post={{
                  ...p,
                  postType: p.postType ?? 'cert',
                  attachFireStats: p.attachFireStats ?? false,
                  commentCount: p.commentCount ?? 0,
                }}
                fallbackStockRatio={fire.stockRatio}
                fallbackCashRatio={fire.cashRatio}
                onLike={likePost}
                onRemove={handleDeletePost}
                loadComments={loadComments}
                getComments={getComments}
                onAddComment={addComment}
              />
            ))
          )}
        </>
      ) : view === 'chat' ? (
        <CommunityChat
          messages={chatMessages}
          mode={mode}
          chatText={chatText}
          submitting={submitting}
          onChatTextChange={setChatText}
          onSend={handleChat}
        />
      ) : (
        <CommunityLeaderboard posts={posts} />
      )}
    </div>
  );
}
