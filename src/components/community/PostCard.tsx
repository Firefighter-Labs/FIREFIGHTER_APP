import { useEffect, useState } from 'react';
import type { CommunityPost } from '../../types';
import { getBadgeEmoji } from '../../utils/badgeUtils';
import { POST_TYPE_META, formatRelativeTime } from '../../utils/communityUtils';
import { formatWon } from '../../utils/format';
import type { PostComment } from '../../types';

interface PostCardProps {
  post: CommunityPost;
  fallbackStockRatio: number;
  fallbackCashRatio: number;
  onLike: (id: string) => void;
  onRemove?: (id: string) => void | Promise<void>;
  loadComments: (postId: string) => Promise<PostComment[]>;
  getComments: (postId: string) => PostComment[];
  onAddComment: (postId: string, content: string) => Promise<void>;
}

export function PostCard({
  post,
  fallbackStockRatio,
  fallbackCashRatio,
  onLike,
  onRemove,
  loadComments,
  getComments,
  onAddComment,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const postTier = post.badgeTier ?? '견습소방관';
  const postEmoji = getBadgeEmoji(postTier);
  const typeMeta = POST_TYPE_META[post.postType ?? 'cert'];
  const sRatio = post.stockRatio ?? fallbackStockRatio;
  const cRatio = post.cashRatio ?? fallbackCashRatio;
  const comments = getComments(post.id);
  const longContent = post.content.length > 120;

  useEffect(() => {
    if (commentOpen && comments.length === 0) {
      loadComments(post.id);
    }
  }, [commentOpen, comments.length, loadComments, post.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(post.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || commentBusy) return;
    setCommentBusy(true);
    try {
      await onAddComment(post.id, commentText.trim());
      setCommentText('');
    } finally {
      setCommentBusy(false);
    }
  };

  return (
    <article className="card post-card">
      <div className="post-meta">
        <span className="badge">
          {postEmoji} {post.authorLabel ?? '소방관'}
          {post.isMine ? ' (나)' : ''}
        </span>
        <span className={`post-chip ${typeMeta.chipClass}`}>
          {typeMeta.icon} {typeMeta.label}
        </span>
        <span className="post-time">{formatRelativeTime(post.createdAt)}</span>
      </div>
      <p className="post-tier-line">{postTier}</p>

      <p className={`post-body ${!expanded && longContent ? 'post-body--clamp' : ''}`}>{post.content}</p>
      {longContent && (
        <button type="button" className="btn-ghost post-expand" onClick={() => setExpanded((e) => !e)}>
          {expanded ? '접기' : '더 보기'}
        </button>
      )}

      {post.attachFireStats && post.fireStats && (
        <div className="post-fire-snapshot">
          <span>🔥 커버 {post.fireStats.coveragePct.toFixed(0)}%</span>
          <span>· 월 {formatWon(post.fireStats.monthlyNetKRW)}</span>
          <span>· 종목 {post.fireStats.holdingsCount}개</span>
        </div>
      )}

      {post.attachPortfolio && (
        <div className="post-portfolio-block">
          <div className="post-portfolio-block__label">✓ 포트폴리오 인증</div>
          <div className="portfolio-mini" title={`주식 ${sRatio}% / 현금 ${cRatio}%`}>
            <div className="stock" style={{ width: `${sRatio}%` }} />
            <div className="cash" style={{ width: `${cRatio}%` }} />
          </div>
          <span className="post-portfolio-block__ratio">
            주식 {sRatio}% · 현금 {cRatio}%
          </span>
        </div>
      )}

      <div className="post-actions">
        <button type="button" className="btn-ghost" onClick={() => onLike(post.id)} disabled={post.likedByMe}>
          🔥 응원 {post.likes}
          {post.likedByMe ? ' ✓' : ''}
        </button>
        <button
          type="button"
          className={`btn-ghost ${commentOpen ? 'active' : ''}`}
          onClick={() => setCommentOpen((o) => !o)}
        >
          💬 댓글 {post.commentCount > 0 ? post.commentCount : ''}
        </button>
        <button type="button" className="btn-ghost" onClick={handleCopy}>
          {copied ? '복사됨' : '복사'}
        </button>
        {post.isMine && onRemove && (
          <button
            type="button"
            className="btn-ghost post-delete"
            disabled={deleting}
            onClick={async () => {
              if (deleting) return;
              if (!window.confirm('이 글을 삭제할까요?')) return;
              setDeleting(true);
              try {
                await onRemove(post.id);
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? '삭제 중…' : '삭제'}
          </button>
        )}
      </div>

      {commentOpen && (
        <div className="post-comments">
          {comments.length === 0 && (
            <p className="hint-text">첫 댓글을 남겨 보세요.</p>
          )}
          <ul className="post-comments__list">
            {comments.map((c) => (
              <li key={c.id} className={c.isMine ? 'post-comment--mine' : ''}>
                <strong>{c.authorLabel}</strong>
                <span className="post-comment__time">{formatRelativeTime(c.createdAt)}</span>
                <p>{c.content}</p>
              </li>
            ))}
          </ul>
          <div className="post-comments__input">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글 입력…"
              maxLength={200}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
            />
            <button type="button" className="btn-primary" onClick={handleComment} disabled={commentBusy}>
              등록
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
