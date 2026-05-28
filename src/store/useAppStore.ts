import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ExpenseCategory,
  FireGoals,
  HistoryEntry,
  Holding,
  HomeView,
  TabId,
} from '../types';
import { FREE_HOLDING_LIMIT } from '../types';
import { getCachedUsdKrwRate, krwToUsd } from '../services/exchangeRateService';

export const defaultGoals: FireGoals = {
  userName: '',
  currentAge: 34,
  targetFireAge: 45,
  totalAssetsKRW: 0,
  monthlyExpenseFallback: 3_000_000,
  monthlyInvestmentKRW: 500_000,
  assumedYieldPct: 4,
};

const DEFAULT_CATEGORIES: Omit<ExpenseCategory, 'id'>[] = [
  { label: '주거비', amountKRW: 1_000_000 },
  { label: '식비', amountKRW: 600_000 },
  { label: '교통비', amountKRW: 200_000 },
  { label: '여가비', amountKRW: 200_000 },
];

function seedCategories(): ExpenseCategory[] {
  return DEFAULT_CATEGORIES.map((c) => ({ ...c, id: crypto.randomUUID() }));
}

interface AppState {
  activeTab: TabId;
  homeView: HomeView;
  goals: FireGoals;
  holdings: Holding[];
  historyEntries: HistoryEntry[];
  expenseCategories: ExpenseCategory[];
  onboardingDone: boolean;
  onboardingStep: number;
  isPro: boolean;

  setTab: (tab: TabId) => void;
  setHomeView: (view: HomeView) => void;
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id'>) => void;
  removeHistoryEntry: (id: string) => void;
  updateGoals: (partial: Partial<FireGoals>) => void;
  addHolding: (h: Omit<Holding, 'id'>) => boolean;
  updateHolding: (id: string, partial: Partial<Omit<Holding, 'id'>>) => void;
  removeHolding: (id: string) => void;
  addCategory: (c: Omit<ExpenseCategory, 'id'>) => void;
  updateCategory: (id: string, partial: Partial<Omit<ExpenseCategory, 'id'>>) => void;
  removeCategory: (id: string) => void;
  resetCategories: () => void;
  /** 온보딩 1단계: 단일 월 생활비 목표 */
  setPrimaryMonthlyExpense: (amountKRW: number) => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      homeView: 'cumulative',
      goals: defaultGoals,
      holdings: [],
      historyEntries: [],
      expenseCategories: seedCategories(),
      onboardingDone: false,
      onboardingStep: 0,
      isPro: false,

      setTab: (tab) => set({ activeTab: tab }),
      setHomeView: (view) => set({ homeView: view }),
      addHistoryEntry: (entry) =>
        set((s) => ({
          historyEntries: [
            ...s.historyEntries,
            {
              ...entry,
              id: crypto.randomUUID(),
              year: entry.year,
              month: Math.min(12, Math.max(1, entry.month)),
              amountKRW: entry.amountKRW,
            },
          ],
        })),
      removeHistoryEntry: (id) =>
        set((s) => ({ historyEntries: s.historyEntries.filter((e) => e.id !== id) })),
      updateGoals: (partial) =>
        set((s) => ({
          goals: {
            ...defaultGoals,
            ...s.goals,
            ...partial,
            assumedYieldPct:
              partial.assumedYieldPct != null
                ? Math.min(12, Math.max(2, partial.assumedYieldPct))
                : s.goals.assumedYieldPct,
            currentAge:
              partial.currentAge != null
                ? Math.min(80, Math.max(18, partial.currentAge))
                : s.goals.currentAge,
            targetFireAge:
              partial.targetFireAge != null
                ? Math.min(80, Math.max(25, partial.targetFireAge))
                : s.goals.targetFireAge,
          },
        })),
      addHolding: (h) => {
        const { holdings, isPro } = get();
        if (!isPro && holdings.length >= FREE_HOLDING_LIMIT) return false;
        set({
          holdings: [
            ...holdings,
            {
              ...h,
              id: crypto.randomUUID(),
              annualDividendKRW: Math.max(0, h.annualDividendKRW),
            },
          ],
        });
        return true;
      },
      updateHolding: (id, partial) =>
        set((s) => ({
          holdings: s.holdings.map((x) =>
            x.id === id
              ? {
                  ...x,
                  ...partial,
                  ...(partial.annualDividendKRW !== undefined
                    ? { annualDividendKRW: Math.max(0, partial.annualDividendKRW) }
                    : {}),
                }
              : x
          ),
        })),
      removeHolding: (id) =>
        set((s) => ({ holdings: s.holdings.filter((x) => x.id !== id) })),
      addCategory: (c) =>
        set((s) => ({
          expenseCategories: [
            ...s.expenseCategories,
            {
              id: crypto.randomUUID(),
              label: c.label.trim() || '지출',
              amountKRW: Math.max(0, c.amountKRW),
            },
          ],
        })),
      updateCategory: (id, partial) =>
        set((s) => ({
          expenseCategories: s.expenseCategories.map((x) =>
            x.id === id
              ? {
                  ...x,
                  ...(partial.label !== undefined ? { label: partial.label.trim() || x.label } : {}),
                  ...(partial.amountKRW !== undefined
                    ? { amountKRW: Math.max(0, partial.amountKRW) }
                    : {}),
                }
              : x
          ),
        })),
      removeCategory: (id) =>
        set((s) => ({
          expenseCategories: s.expenseCategories.filter((x) => x.id !== id),
        })),
      resetCategories: () => set({ expenseCategories: seedCategories() }),
      setPrimaryMonthlyExpense: (amountKRW) =>
        set((s) => ({
          goals: { ...s.goals, monthlyExpenseFallback: amountKRW },
          expenseCategories: [
            { id: crypto.randomUUID(), label: '월 생활비', amountKRW },
          ],
        })),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      completeOnboarding: () => set({ onboardingDone: true, onboardingStep: 0 }),
      resetOnboarding: () => set({ onboardingDone: false, onboardingStep: 0 }),
      exportData: () => {
        const { goals, holdings, historyEntries, expenseCategories, isPro } = get();
        return JSON.stringify(
          {
            goals,
            holdings,
            historyEntries,
            expenseCategories,
            isPro,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        );
      },
      importData: (json) => {
        try {
          const data = JSON.parse(json) as {
            goals?: FireGoals;
            holdings?: Holding[];
            historyEntries?: HistoryEntry[];
            expenseCategories?: ExpenseCategory[];
            isPro?: boolean;
          };
          if (data.goals) set({ goals: { ...defaultGoals, ...data.goals } });
          if (data.holdings) set({ holdings: data.holdings });
          if (data.historyEntries) set({ historyEntries: data.historyEntries });
          if (data.expenseCategories) set({ expenseCategories: data.expenseCategories });
          if (data.isPro != null) set({ isPro: data.isPro });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'firefighter-storage',
      version: 16,
      migrate: (persisted, version) => {
        if (version >= 16) return persisted as AppState;
        if (version >= 15) {
          const state = persisted as AppState;
          const rate = getCachedUsdKrwRate();
          return {
            ...state,
            holdings: (state.holdings ?? []).map((h) => {
              if (h.market !== 'US') return h;
              return {
                ...h,
                annualDividendUSD:
                  h.annualDividendUSD ??
                  (h.annualDividendKRW > 0 ? krwToUsd(h.annualDividendKRW, rate) : undefined),
                marketValueUSD:
                  h.marketValueUSD ??
                  ((h.marketValueKRW ?? 0) > 0 ? krwToUsd(h.marketValueKRW!, rate) : undefined),
                costBasisUSD:
                  h.costBasisUSD ??
                  ((h.costBasisKRW ?? 0) > 0 ? krwToUsd(h.costBasisKRW!, rate) : undefined),
              };
            }),
          };
        }
        if (version >= 14) {
          const state = persisted as AppState;
          // 과거 로직에서는 annualDividendKRW를 "총 연간 배당"으로 저장하고 shares는 배당 계산에 곱하지 않았습니다.
          // 이제 annualDividendKRW를 "주당 연간 배당"으로 바꾸면서, shares가 있는 기존 데이터는 나눠서 마이그레이션합니다.
          return {
            ...state,
            holdings: (state.holdings ?? []).map((h) => {
              const sh = h.shares != null && h.shares > 0 ? h.shares : 1;
              const next = sh > 0 ? h.annualDividendKRW / sh : h.annualDividendKRW;
              return {
                ...h,
                annualDividendKRW: Math.max(0, Math.round(next)),
              };
            }),
          };
        }
        if (version >= 13) {
          const state = persisted as AppState & { activeTab?: string };
          return {
            ...state,
            holdings: (state.holdings ?? []).map((h) => {
              const sh = h.shares != null && h.shares > 0 ? h.shares : 1;
              const perShare = h.annualDividendKRW / sh;
              return {
                ...h,
                symbol: h.symbol,
                market: h.market,
                logoUrl: h.logoUrl,
                shares: h.shares,
                // annualDividendKRW를 "총 연간 배당"에서 "주당 연간 배당"으로 변경
                annualDividendKRW: Math.max(0, Math.round(perShare)),
              };
            }),
          };
        }
        if (version >= 12) {
          const state = persisted as AppState & { activeTab?: string };
          const rawTab = state.activeTab as string | undefined;
          const tab: TabId =
            rawTab === 'myfire'
              ? 'settings'
              : rawTab === 'portfolio' || rawTab === 'history' || rawTab === 'settings'
                ? rawTab
                : 'home';
          return {
            ...state,
            activeTab: tab,
            homeView: 'cumulative' as HomeView,
            historyEntries: state.historyEntries ?? [],
          };
        }
        if (version >= 11) {
          const state = persisted as AppState;
          return {
            ...state,
            activeTab:
              (state.activeTab as string) === 'myfire' ? 'settings' : (state.activeTab as TabId),
            homeView: 'cumulative' as HomeView,
            historyEntries: [],
            goals: {
              ...defaultGoals,
              ...state.goals,
              totalAssetsKRW: state.goals?.totalAssetsKRW ?? 0,
            },
          };
        }
        const legacy = persisted as {
          fire?: { monthlyExpense?: number; monthlySavings?: number; assumedDividendYieldPct?: number };
          holdings?: Array<{
            id: string;
            name: string;
            symbol?: string;
            manualYieldPct?: number;
            avgBuyPrice?: number;
            shares?: number;
          }>;
          expenses?: Array<{ id: string; label: string; amountKRW: number }>;
          goals?: FireGoals;
        };

        const goals: FireGoals = {
          ...defaultGoals,
          ...legacy.goals,
          totalAssetsKRW: legacy.goals?.totalAssetsKRW ?? defaultGoals.totalAssetsKRW,
          monthlyExpenseFallback:
            legacy.goals?.monthlyExpenseFallback ??
            legacy.fire?.monthlyExpense ??
            defaultGoals.monthlyExpenseFallback,
          monthlyInvestmentKRW:
            legacy.goals?.monthlyInvestmentKRW ??
            legacy.fire?.monthlySavings ??
            defaultGoals.monthlyInvestmentKRW,
          assumedYieldPct:
            legacy.goals?.assumedYieldPct ??
            legacy.fire?.assumedDividendYieldPct ??
            defaultGoals.assumedYieldPct,
        };

        const holdings: Holding[] =
          legacy.holdings?.map((h) => ({
            id: h.id,
            name: h.name || h.symbol || '종목',
            annualDividendKRW: 0,
            frequency: 'quarterly' as const,
          })) ?? [];

        const expenseCategories: ExpenseCategory[] =
          legacy.expenses?.map((e) => ({
            id: e.id,
            label: e.label,
            amountKRW: e.amountKRW,
          })) ?? seedCategories();

        const oldTab = (persisted as { activeTab?: string }).activeTab;
        const tab: TabId =
          oldTab === 'portfolio'
            ? 'portfolio'
            : oldTab === 'myfire' || oldTab === 'settings'
              ? 'settings'
              : oldTab === 'history'
                ? 'history'
                : 'home';

        return {
          activeTab: tab,
          homeView: 'cumulative' as HomeView,
          goals,
          holdings,
          historyEntries: [],
          expenseCategories,
          onboardingDone: Boolean((persisted as { onboardingDone?: boolean }).onboardingDone),
          onboardingStep: 0,
          isPro: false,
        };
      },
    }
  )
);
