import { useAppStore } from '../store/useAppStore';
import type { TabId } from '../types';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'fire', label: '탈출', icon: '🔥' },
  { id: 'dividend', label: '배당', icon: '📅' },
  { id: 'community', label: '비밀방', icon: '🛡️' },
  { id: 'settings', label: '설정', icon: '⚙️' },
];

export function TabBar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.setTab);

  return (
    <nav className="tab-bar" aria-label="메인 탭">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => setTab(t.id)}
          aria-current={activeTab === t.id ? 'page' : undefined}
        >
          <span className="icon" aria-hidden>
            {t.icon}
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
