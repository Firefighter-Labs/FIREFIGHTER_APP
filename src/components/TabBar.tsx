import { useAppStore } from '../store/useAppStore';
import type { TabId } from '../types';
import { IconHistory, IconHome, IconPortfolio, IconSettings } from './ui/Icons';

const TABS: { id: TabId; label: string; Icon: typeof IconHome }[] = [
  { id: 'home', label: '홈', Icon: IconHome },
  { id: 'portfolio', label: '포트폴리오', Icon: IconPortfolio },
  { id: 'history', label: '내역', Icon: IconHistory },
  { id: 'settings', label: '설정', Icon: IconSettings },
];

export function TabBar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.setTab);

  return (
    <nav className="tab-bar" aria-label="메인">
      {TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            className={`tab-bar__btn ${active ? 'active' : ''}`}
            onClick={() => setTab(id)}
            aria-current={active ? 'page' : undefined}
          >
            <span className={`tab-bar__icon ${active ? 'tab-bar__icon--active' : ''}`}>
              <Icon />
            </span>
            <span className="tab-bar__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
