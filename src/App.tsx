import { TabBar } from './components/TabBar';
import { FireSimulator } from './components/FireSimulator';
import { DividendCalendar } from './components/DividendCalendar';
import { Community } from './components/Community';
import { Settings } from './components/Settings';
import { Onboarding } from './components/Onboarding';
import { useAuth } from './context/AuthContext';
import { useAppStore } from './store/useAppStore';
import { isSupabaseEnabled } from './lib/supabase';

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.setTab);
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const auth = useAuth();
  const cloud = isSupabaseEnabled();

  return (
    <div className="app-shell">
      {!onboardingDone && <Onboarding />}

      <header className="app-header">
        <h1>
          <span>FIRE</span>FIGHTER
        </h1>
        <p>화마에서 탈출하는 파이어족 통합 대시보드</p>
        {cloud && !auth.loading && !auth.isLoggedIn && activeTab !== 'settings' && (
          <button type="button" className="login-banner-btn" onClick={() => setTab('community')}>
            🔐 로그인 · 비밀방에서 커뮤니티 이용
          </button>
        )}
        {cloud && auth.isLoggedIn && (
          <div className="login-status-line">
            <span>☁️ {auth.displayName}</span>
            <button type="button" className="btn-ghost header-logout" onClick={() => auth.signOut()}>
              로그아웃
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {activeTab === 'fire' && <FireSimulator />}
        {activeTab === 'dividend' && <DividendCalendar />}
        {activeTab === 'community' && <Community />}
        {activeTab === 'settings' && <Settings />}
      </main>

      <TabBar />
    </div>
  );
}
