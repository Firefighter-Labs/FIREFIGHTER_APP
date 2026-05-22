import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CommunityPost,
  DividendTaxSettings,
  FireSettings,
  PostComment,
  PostFireStats,
  PostType,
  StockHolding,
  TabId,
} from '../types';
import { defaultDividendTax } from '../utils/dividendTax';

interface AppState {
  activeTab: TabId;
  fire: FireSettings;
  dividendTax: DividendTaxSettings;
  holdings: StockHolding[];
  calendarMonth: { year: number; month: number };
  posts: CommunityPost[];
  postComments: Record<string, PostComment[]>;
  chatMessages: { id: string; text: string; at: number }[];
  onboardingDone: boolean;
  onboardingStep: number;

  setTab: (tab: TabId) => void;
  updateFire: (partial: Partial<FireSettings>) => void;
  updateDividendTax: (partial: Partial<DividendTaxSettings>) => void;
  addHolding: (holding: Omit<StockHolding, 'id'>) => void;
  updateHolding: (id: string, shares: number) => void;
  removeHolding: (id: string) => void;
  setCalendarMonth: (year: number, month: number) => void;
  addPost: (input: {
    content: string;
    postType: PostType;
    attachPortfolio: boolean;
    attachFireStats: boolean;
    stockRatio?: number;
    cashRatio?: number;
    fireStats?: PostFireStats;
    badgeTier?: string;
  }) => void;
  removePostLocal: (id: string) => void;
  likePost: (id: string) => void;
  addCommentLocal: (postId: string, content: string, authorLabel?: string) => void;
  addChatMessage: (text: string) => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
}

export const defaultFire: FireSettings = {
  totalAssets: 50_000_000,
  currency: 'KRW',
  monthlySavings: 2_000_000,
  monthlyExpense: 2_000_000,
  withdrawalRatePct: 4,
  assumedDividendYieldPct: 4,
  stockRatio: 70,
  cashRatio: 30,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'fire',
      fire: defaultFire,
      dividendTax: defaultDividendTax,
      holdings: [],
      calendarMonth: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
      posts: [],
      postComments: {},
      chatMessages: [],
      onboardingDone: false,
      onboardingStep: 0,

      setTab: (tab) => set({ activeTab: tab }),
      updateFire: (partial) =>
        set((s) => {
          const next = { ...defaultFire, ...s.fire, ...partial };
          if (partial.withdrawalRatePct !== undefined) {
            next.withdrawalRatePct = Math.min(6, Math.max(2.5, partial.withdrawalRatePct));
          }
          if (partial.assumedDividendYieldPct !== undefined) {
            next.assumedDividendYieldPct = Math.min(12, Math.max(2, partial.assumedDividendYieldPct));
          }
          if (partial.stockRatio !== undefined) {
            next.cashRatio = 100 - (partial.stockRatio ?? next.stockRatio);
          }
          if (partial.cashRatio !== undefined) {
            next.stockRatio = 100 - (partial.cashRatio ?? next.cashRatio);
          }
          return { fire: next };
        }),
      updateDividendTax: (partial) =>
        set((s) => ({
          dividendTax: {
            ...defaultDividendTax,
            ...s.dividendTax,
            ...partial,
            krSeparateTaxPct:
              partial.krSeparateTaxPct != null
                ? Math.min(30, Math.max(0, partial.krSeparateTaxPct))
                : s.dividendTax.krSeparateTaxPct,
            krExemptionTaxPct:
              partial.krExemptionTaxPct != null
                ? Math.min(30, Math.max(0, partial.krExemptionTaxPct))
                : s.dividendTax.krExemptionTaxPct,
            usWithholdingPct:
              partial.usWithholdingPct != null
                ? Math.min(30, Math.max(0, partial.usWithholdingPct))
                : s.dividendTax.usWithholdingPct,
          },
        })),
      addHolding: (h) =>
        set((s) => ({
          holdings: [...s.holdings, { ...h, id: crypto.randomUUID() }],
        })),
      updateHolding: (id, shares) =>
        set((s) => ({
          holdings: s.holdings.map((x) => (x.id === id ? { ...x, shares } : x)),
        })),
      removeHolding: (id) =>
        set((s) => ({
          holdings: s.holdings.filter((x) => x.id !== id),
        })),
      setCalendarMonth: (year, month) => set({ calendarMonth: { year, month } }),
      addPost: (input) =>
        set((s) => ({
          posts: [
            {
              id: crypto.randomUUID(),
              content: input.content,
              createdAt: Date.now(),
              postType: input.postType,
              attachPortfolio: input.attachPortfolio,
              attachFireStats: input.attachFireStats,
              fireStats: input.attachFireStats ? input.fireStats : undefined,
              likes: 0,
              commentCount: 0,
              badgeTier: input.badgeTier as CommunityPost['badgeTier'],
              stockRatio: input.attachPortfolio ? input.stockRatio : undefined,
              cashRatio: input.attachPortfolio ? input.cashRatio : undefined,
              isMine: true,
              authorLabel: '나',
            },
            ...s.posts,
          ],
        })),
      removePostLocal: (id) =>
        set((s) => {
          const { [id]: _, ...restComments } = s.postComments;
          return {
            posts: s.posts.filter((p) => p.id !== id),
            postComments: restComments,
          };
        }),
      likePost: (id) =>
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === id ? { ...p, likes: p.likes + 1, likedByMe: true } : p
          ),
        })),
      addCommentLocal: (postId, content, authorLabel = '나') =>
        set((s) => {
          const comment: PostComment = {
            id: crypto.randomUUID(),
            postId,
            content,
            createdAt: Date.now(),
            authorLabel,
            isMine: true,
          };
          const prev = s.postComments[postId] ?? [];
          return {
            postComments: { ...s.postComments, [postId]: [...prev, comment] },
            posts: s.posts.map((p) =>
              p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
            ),
          };
        }),
      addChatMessage: (text) =>
        set((s) => ({
          chatMessages: [...s.chatMessages, { id: crypto.randomUUID(), text, at: Date.now() }].slice(-50),
        })),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
      completeOnboarding: () => set({ onboardingDone: true, onboardingStep: 0 }),
      resetOnboarding: () => set({ onboardingDone: false, onboardingStep: 0 }),
      exportData: () => {
        const { fire, dividendTax, holdings, calendarMonth } = get();
        return JSON.stringify(
          { fire, dividendTax, holdings, calendarMonth, exportedAt: new Date().toISOString() },
          null,
          2
        );
      },
      importData: (json) => {
        try {
          const data = JSON.parse(json) as {
            fire?: FireSettings;
            holdings?: StockHolding[];
            dividendTax?: DividendTaxSettings;
          };
          if (data.fire) set({ fire: { ...defaultFire, ...data.fire } });
          if (data.dividendTax) set({ dividendTax: { ...defaultDividendTax, ...data.dividendTax } });
          if (data.holdings) set({ holdings: data.holdings });
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'firefighter-storage',
      version: 6,
      migrate: (persisted, version) => {
        const state = persisted as AppState;
        if (version < 4) {
          state.fire = {
            ...defaultFire,
            ...state.fire,
            withdrawalRatePct: state.fire?.withdrawalRatePct ?? 4,
            assumedDividendYieldPct: state.fire?.assumedDividendYieldPct ?? 4,
          };
        }
        if (version < 5) {
          state.dividendTax = { ...defaultDividendTax, ...state.dividendTax };
        }
        if (version < 6) {
          state.postComments = state.postComments ?? {};
          state.posts = (state.posts ?? []).map((p) => ({
            ...p,
            postType: p.postType ?? 'cert',
            attachFireStats: p.attachFireStats ?? false,
            commentCount: p.commentCount ?? 0,
          }));
        }
        return state;
      },
    }
  )
);
