import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types';
import { CHAT_EMOJIS, CHAT_QUICK_PHRASES, groupChatByDate } from '../../utils/communityUtils';

interface CommunityChatProps {
  messages: ChatMessage[];
  mode: 'local' | 'cloud';
  chatText: string;
  submitting: boolean;
  onChatTextChange: (v: string) => void;
  onSend: () => void;
}

export function CommunityChat({
  messages,
  mode,
  chatText,
  submitting,
  onChatTextChange,
  onSend,
}: CommunityChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const groups = groupChatByDate(messages);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const appendEmoji = (emoji: string) => {
    onChatTextChange(chatText + emoji);
  };

  return (
    <section className="card chat-card">
      <div className="card-title">
        1급 비밀 단톡
        <span className="card-title__sub"> {mode === 'cloud' ? '실시간' : '로컬 데모'}</span>
      </div>

      <div className="chat-emoji-row">
        {CHAT_EMOJIS.map((e) => (
          <button key={e} type="button" className="chat-emoji-btn" onClick={() => appendEmoji(e)}>
            {e}
          </button>
        ))}
      </div>

      <div className="composer-quick-row">
        {CHAT_QUICK_PHRASES.map((phrase) => (
          <button
            key={phrase}
            type="button"
            className="composer-quick-chip"
            onClick={() => onChatTextChange(phrase)}
          >
            {phrase}
          </button>
        ))}
      </div>

      <div className="chat-box chat-box--tall" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="hint-text chat-empty">아직 메시지가 없습니다. 첫 인사를 남겨 보세요!</p>
        )}
        {groups.map((g) => (
          <div key={g.label} className="chat-date-group">
            <div className="chat-date-label">{g.label}</div>
            {g.items.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble ${m.isMine ? 'chat-bubble--mine' : 'chat-bubble--other'}`}
              >
                <span className="chat-bubble__author">
                  {m.authorLabel ?? '소방관'}
                  {m.isMine ? ' (나)' : ''}
                </span>
                <p className="chat-bubble__text">{m.text}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          value={chatText}
          onChange={(e) => onChatTextChange(e.target.value)}
          placeholder="메시지 입력…"
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
        />
        <button
          type="button"
          className="btn-primary chat-send-btn"
          onClick={onSend}
          disabled={submitting || !chatText.trim()}
        >
          전송
        </button>
      </div>
    </section>
  );
}
