import { AppHeader } from './components/AppHeader';
import { HistoryTab } from './components/HistoryTab';
import { HomeTab } from './components/HomeTab';
import { Onboarding } from './components/Onboarding';
import { PortfolioTab } from './components/PortfolioTab';
import { SettingsTab } from './components/SettingsTab';
import { TabBar } from './components/TabBar';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const activeTab = useAppStore((s) => s.activeTab);
  const onboardingDone = useAppStore((s) => s.onboardingDone);

  return (
    <div className="app-shell">
      {!onboardingDone && <Onboarding />}

      {onboardingDone && (
        <>
          <AppHeader />
          <main className="app-main">
            {activeTab === 'home' && <HomeTab />}
            {activeTab === 'portfolio' && <PortfolioTab />}
            {activeTab === 'history' && <HistoryTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </main>
          <TabBar />
        </>
      )}
    </div>
  );
}
