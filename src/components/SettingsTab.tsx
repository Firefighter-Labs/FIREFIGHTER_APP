import { useState } from 'react';
import { useCoverage } from '../hooks/useCoverage';
import { useAppStore } from '../store/useAppStore';
import { formatFullWon, formatWon } from '../utils/format';
import { formatNumericInput, normalizeNumericInput, parseNumericInput } from '../utils/numberInput';

export function SettingsTab() {
  const goals = useAppStore((s) => s.goals);
  const updateGoals = useAppStore((s) => s.updateGoals);
  const categories = useAppStore((s) => s.expenseCategories);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const removeCategory = useAppStore((s) => s.removeCategory);
  const exportData = useAppStore((s) => s.exportData);
  const importData = useAppStore((s) => s.importData);
  const c = useCoverage();

  const [editing, setEditing] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="page settings-page">
      <section className="section">
        <h3 className="section-label">프로필</h3>
        <div className="surface-card">
          <div className="field">
            <label>이름</label>
            <input
              value={goals.userName}
              onChange={(e) => updateGoals({ userName: e.target.value })}
              placeholder="지훈"
            />
          </div>
          <div className="field">
            <label>현재 나이</label>
            <input
              type="number"
              value={goals.currentAge}
              onChange={(e) => updateGoals({ currentAge: Number(e.target.value) || 30 })}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>총 자산 (원)</label>
            <input
              inputMode="numeric"
              value={goals.totalAssetsKRW > 0 ? formatNumericInput(goals.totalAssetsKRW) : ''}
              onChange={(e) =>
                updateGoals({
                  totalAssetsKRW: parseNumericInput(e.target.value) || 0,
                })
              }
              placeholder="124500000"
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h3 className="section-label">지출 목표</h3>
          <button type="button" className="link-btn" onClick={() => setEditing((v) => !v)}>
            {editing ? '완료' : '편집'}
          </button>
        </div>
        <div className="surface-card">
          {editing ? (
            <>
              <ul className="row-list">
                {categories.map((cat) => (
                  <li key={cat.id} className="row-list__edit">
                    <input
                      value={cat.label}
                      onChange={(e) => updateCategory(cat.id, { label: e.target.value })}
                    />
                    <input
                      inputMode="numeric"
                      value={formatNumericInput(cat.amountKRW)}
                      onChange={(e) =>
                        updateCategory(cat.id, {
                          amountKRW: parseNumericInput(e.target.value) || 0,
                        })
                      }
                    />
                    <button type="button" className="btn-text" onClick={() => removeCategory(cat.id)}>
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
              <div className="row-list__add">
                <input placeholder="항목" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                <input
                  inputMode="numeric"
                  placeholder="금액"
                  value={formatNumericInput(newAmount)}
                  onChange={(e) => setNewAmount(normalizeNumericInput(e.target.value))}
                />
                <button
                  type="button"
                  className="btn-cta btn-cta--sm"
                  onClick={() => {
                    const n = parseNumericInput(newAmount) || 0;
                    if (!newLabel.trim() || !n) return;
                    addCategory({ label: newLabel.trim(), amountKRW: n });
                    setNewLabel('');
                    setNewAmount('');
                  }}
                >
                  +
                </button>
              </div>
            </>
          ) : (
            <ul className="row-list">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <span>{cat.label}</span>
                  <span>{formatWon(cat.amountKRW)}</span>
                </li>
              ))}
              <li className="row-list__total">
                <span>합계</span>
                <span>{formatFullWon(c.monthlyExpense)}</span>
              </li>
            </ul>
          )}
        </div>
      </section>

      <section className="section">
        <h3 className="section-label">파이어 시뮬레이터</h3>
        <div className="surface-card">
          <div className="field">
            <label>목표 파이어 나이</label>
            <div className="slider-value">{goals.targetFireAge}세</div>
            <input
              type="range"
              min={30}
              max={70}
              value={goals.targetFireAge}
              onChange={(e) => updateGoals({ targetFireAge: Number(e.target.value) })}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>매월 추가 투자 (원)</label>
            <input
              inputMode="numeric"
              value={formatNumericInput(goals.monthlyInvestmentKRW)}
              onChange={(e) =>
                updateGoals({
                  monthlyInvestmentKRW: parseNumericInput(e.target.value) || 0,
                })
              }
            />
          </div>
          <p className="sim-box">{c.simulation.message}</p>
        </div>
      </section>

      <section className="section">
        <h3 className="section-label">데이터</h3>
        <div className="surface-card">
          <p className="hint">기기에만 저장됩니다.</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const blob = new Blob([exportData()], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `firefighter-${Date.now()}.json`;
              a.click();
              setMsg('저장했습니다.');
            }}
          >
            백업보내기
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const raw = window.prompt('백업 JSON 붙여넣기');
              if (!raw) return;
              setMsg(importData(raw) ? '복원했습니다.' : '형식 오류');
            }}
          >
            백업 복원
          </button>
          {msg && <p className="hint">{msg}</p>}
        </div>
      </section>
    </div>
  );
}
