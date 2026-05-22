import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseEnabled } from '../lib/supabase';
import { updateDisplayName } from '../services/authService';
import { useAppStore } from '../store/useAppStore';
import { useDashboard } from '../hooks/useDashboard';
import { formatWon } from '../utils/format';

const APP_VERSION = '1.0.0';

export function Settings() {
  const auth = useAuth();
  const cloud = isSupabaseEnabled();
  const d = useDashboard();
  const exportData = useAppStore((s) => s.exportData);
  const importData = useAppStore((s) => s.importData);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const setTab = useAppStore((s) => s.setTab);

  const [nickname, setNickname] = useState(auth.displayName);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firefighter-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('백업 파일을 저장했습니다.');
  };

  const handleImport = () => {
    const raw = window.prompt('백업 JSON 전체를 붙여넣으세요');
    if (!raw) return;
    if (importData(raw)) setMsg('데이터를 복원했습니다.');
    else setMsg('JSON 형식이 올바르지 않습니다.');
  };

  const saveNickname = async () => {
    if (!cloud || !auth.isLoggedIn) return;
    setBusy(true);
    setMsg(null);
    try {
      await updateDisplayName(nickname);
      await auth.refreshProfile();
      setMsg('표시명이 저장되었습니다.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <section className="card">
        <div className="card-title">내 FIRE 요약</div>
        <div className="settings-profile">
          <span className="settings-profile__emoji">{d.tierEmoji}</span>
          <div>
            <strong>{d.tier}</strong>
            <p>
              배당 커버 {d.dividendFire.coveragePct.toFixed(0)}% · 월 수령{' '}
              {formatWon(d.monthDiv.totalNetKRW)} (세전 {formatWon(d.monthDiv.totalGrossKRW)})
            </p>
          </div>
        </div>
      </section>

      {cloud && auth.isLoggedIn && (
        <section className="card">
          <div className="card-title">커뮤니티 표시명</div>
          <div className="field">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              placeholder="표시명"
            />
          </div>
          <button type="button" className="btn-primary" disabled={busy} onClick={saveNickname}>
            저장
          </button>
        </section>
      )}

      <section className="card">
        <div className="card-title">데이터</div>
        <button type="button" className="btn-secondary" onClick={handleExport}>
          JSON 백업보내기
        </button>
        <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={handleImport}>
          JSON 복원
        </button>
        <p className="hint-text">자산·종목은 기기에 저장됩니다. 백업으로 기기 이전이 가능합니다.</p>
      </section>

      <section className="card">
        <div className="card-title">앱</div>
        <button type="button" className="btn-ghost settings-row" onClick={resetOnboarding}>
          온보딩 다시 보기
        </button>
        <button type="button" className="btn-ghost settings-row" onClick={() => setTab('community')}>
          커뮤니티 이동
        </button>
        {cloud && auth.isLoggedIn && (
          <button type="button" className="btn-ghost settings-row" onClick={() => auth.signOut()}>
            로그아웃
          </button>
        )}
      </section>

      <section className="card">
        <div className="card-title">앱스토어 출시</div>
        <p className="hint-text">
          iOS 출시: <code>npm run cap:sync</code> 후 Xcode에서 Archive. 자세한 절차는 docs/APP_STORE.md
        </p>
        <p className="hint-text">버전 {APP_VERSION}</p>
      </section>

      {msg && <p className="settings-msg">{msg}</p>}
    </div>
  );
}
