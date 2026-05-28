import { useAppStore } from '../store/useAppStore';
import type { TabId } from '../types';
import { IconRefresh } from './ui/Icons';

const TITLES: Record<TabId, string> = {
  home: 'FIREFIGHTER',
  portfolio: '포트폴리오',
  history: '내역',
  settings: '설정',
};

export function AppHeader() {
  const activeTab = useAppStore((s) => s.activeTab);
  const goals = useAppStore((s) => s.goals);
  const initial = (goals.userName.trim()[0] ?? 'F').toUpperCase();

  return (
    <header className="app-header">
      <h1 className="app-header__title">{TITLES[activeTab]}</h1>
      <div className="app-header__actions">
        <button type="button" className="icon-btn" aria-label="새로고침" onClick={() => window.location.reload()}>
          <IconRefresh />
        </button>
        <div className="app-header__avatar" aria-hidden>
          {initial}
        </div>
      </div>
    </header>
  );
}
