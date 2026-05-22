import { useState } from 'react';
import type { PostType } from '../../types';
import { POST_TYPE_META, QUICK_POST_PHRASES } from '../../utils/communityUtils';

const MAX_LEN = 500;

interface PostComposerProps {
  portfolioLabel: string;
  fireStatsLabel: string;
  onSubmit: (input: {
    content: string;
    postType: PostType;
    attachPortfolio: boolean;
    attachFireStats: boolean;
  }) => Promise<void>;
  submitting: boolean;
}

export function PostComposer({ portfolioLabel, fireStatsLabel, onSubmit, submitting }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('cert');
  const [attachPortfolio, setAttachPortfolio] = useState(true);
  const [attachFireStats, setAttachFireStats] = useState(true);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    await onSubmit({ content: content.trim(), postType, attachPortfolio, attachFireStats });
    setContent('');
  };

  return (
    <section className="card composer-card">
      <div className="card-title">글쓰기</div>

      <div className="composer-type-row" role="tablist" aria-label="게시 유형">
        {(Object.keys(POST_TYPE_META) as PostType[]).map((t) => {
          const meta = POST_TYPE_META[t];
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={postType === t}
              className={`composer-type-chip ${postType === t ? 'active' : ''} ${meta.chipClass}`}
              onClick={() => setPostType(t)}
            >
              {meta.icon} {meta.label}
            </button>
          );
        })}
      </div>

      <div className="composer-quick-row">
        {QUICK_POST_PHRASES.map((phrase) => (
          <button
            key={phrase}
            type="button"
            className="composer-quick-chip"
            onClick={() => setContent(phrase)}
          >
            {phrase.slice(0, 18)}…
          </button>
        ))}
      </div>

      <textarea
        className="composer-textarea"
        rows={4}
        placeholder="경험, 질문, 성과를 나눠 보세요…"
        value={content}
        maxLength={MAX_LEN}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="composer-meta">
        <span className={content.length > MAX_LEN * 0.9 ? 'composer-meta--warn' : ''}>
          {content.length}/{MAX_LEN}
        </span>
      </div>

      <div className="composer-attach">
        <label className="composer-attach__item">
          <input
            type="checkbox"
            checked={attachPortfolio}
            onChange={(e) => setAttachPortfolio(e.target.checked)}
          />
          <span>📊 포트폴리오 인증</span>
          <span className="composer-attach__hint">{portfolioLabel}</span>
        </label>
        <label className="composer-attach__item">
          <input
            type="checkbox"
            checked={attachFireStats}
            onChange={(e) => setAttachFireStats(e.target.checked)}
          />
          <span>🔥 FIRE 스냅샷</span>
          <span className="composer-attach__hint">{fireStatsLabel}</span>
        </label>
      </div>

      <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting || !content.trim()}>
        {submitting ? '게시 중…' : '게시하기'}
      </button>
    </section>
  );
}
