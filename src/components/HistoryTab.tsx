import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { HistoryKind } from '../types';
import { countByKind, filterHistory } from '../utils/historyStats';
import { formatFullWon } from '../utils/format';
import { formatNumericInput, normalizeNumericInput, parseNumericInput } from '../utils/numberInput';
import { EmptyState } from './ui/EmptyState';
import { IconPen, IconPiggy } from './ui/Icons';

const KIND_TABS: { id: HistoryKind; label: string; icon: string }[] = [
  { id: 'balance', label: '계좌총액', icon: '🐷' },
  { id: 'dividend', label: '배당', icon: '💵' },
  { id: 'cashflow', label: '입출금', icon: '👛' },
];

const EMPTY_COPY: Record<HistoryKind, { title: string; desc: string }> = {
  balance: {
    title: '계좌총액 기록이 없습니다',
    desc: '펜 버튼을 눌러 월별 계좌총액을 입력해보세요.',
  },
  dividend: {
    title: '배당 기록이 없습니다',
    desc: '펜 버튼을 눌러 받은 배당금을 입력해보세요.',
  },
  cashflow: {
    title: '입출금 기록이 없습니다',
    desc: '펜 버튼을 눌러 입금·출금 내역을 입력해보세요.',
  },
};

export function HistoryTab() {
  const entries = useAppStore((s) => s.historyEntries);
  const addHistoryEntry = useAppStore((s) => s.addHistoryEntry);
  const removeHistoryEntry = useAppStore((s) => s.removeHistoryEntry);

  const [kind, setKind] = useState<HistoryKind>('balance');
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [note, setNote] = useState('');

  const openModal = () => {
    const d = new Date();
    setYear(String(d.getFullYear()));
    setMonth(String(d.getMonth() + 1));
    setAmount('');
    setNote('');
    setModalOpen(true);
  };

  const filtered = useMemo(
    () =>
      filterHistory(entries, kind).sort(
        (a, b) => b.year - a.year || b.month - a.month
      ),
    [entries, kind]
  );

  const submit = () => {
    const n = parseNumericInput(amount, true);
    if (n == null) return;
    const y = Number(year);
    if (!Number.isFinite(y) || y < 2000 || y > 2100) return;
    addHistoryEntry({
      kind,
      year: y,
      month: Math.min(12, Math.max(1, Number(month) || 1)),
      amountKRW: n,
      note: note.trim() || undefined,
    });
    setModalOpen(false);
    setAmount('');
    setNote('');
  };

  return (
    <div className="page history-page">
      <div className="history-kind-tabs">
        {KIND_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`history-kind-tabs__btn ${kind === t.id ? 'active' : ''}`}
            onClick={() => setKind(t.id)}
          >
            <span className="history-kind-tabs__icon" aria-hidden>
              {t.icon}
            </span>
            {t.label} {countByKind(entries, t.id)}
          </button>
        ))}
      </div>

      <div className="mdd-banner">
        <div>
          <p className="mdd-banner__title">생활비 커버율</p>
          <p className="mdd-banner__sub">월 배당과 생활비 목표를 설정 탭에서 관리하세요</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<IconPiggy className="empty-state__svg empty-state__svg--faint" />}
          title={EMPTY_COPY[kind].title}
          description={EMPTY_COPY[kind].desc}
        />
      ) : (
        <ul className="history-list">
          {filtered.map((e) => (
            <li key={e.id} className="history-list__item">
              <div>
                <span className="history-list__date">
                  {e.year}.{e.month}월
                </span>
                {e.note && <span className="history-list__note">{e.note}</span>}
              </div>
              <div className="history-list__right">
                <span className={e.amountKRW >= 0 ? 'text-pos' : 'text-neg'}>
                  {formatFullWon(e.amountKRW)}
                </span>
                <button
                  type="button"
                  className="history-list__del"
                  aria-label="삭제"
                  onClick={() => removeHistoryEntry(e.id)}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="fab-pen"
        aria-label="기록 추가"
        onClick={openModal}
      >
        <IconPen />
      </button>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)} role="presentation">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog">
            <h3>
              {kind === 'balance' && '계좌총액 기록'}
              {kind === 'dividend' && '배당 기록'}
              {kind === 'cashflow' && '입출금 기록'}
            </h3>
            <div className="field-row">
              <div className="field">
                <label>연도</label>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="field">
                <label>월</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>금액 (원)</label>
              <input
                inputMode="numeric"
                value={formatNumericInput(amount)}
                onChange={(e) => setAmount(normalizeNumericInput(e.target.value, true))}
                placeholder={kind === 'cashflow' ? '출금은 음수' : '1000000'}
              />
            </div>
            <div className="field">
              <label>메모 (선택)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모" />
            </div>
            <button type="button" className="btn-cta" onClick={submit}>
              저장
            </button>
            <button type="button" className="btn-text btn-text--block" onClick={() => setModalOpen(false)}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
