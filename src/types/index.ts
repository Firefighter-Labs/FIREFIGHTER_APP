export type TabId = 'home' | 'portfolio' | 'history' | 'settings';

export type HomeView = 'cumulative' | 'year' | 'dividend';

export type HistoryKind = 'balance' | 'dividend' | 'cashflow';

export type DividendFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

/** 배당 종목 */
export interface Holding {
  id: string;
  name: string;
  /** 티커 (예: SCHD, 005930) */
  symbol?: string;
  market?: 'KR' | 'US';
  logoUrl?: string;
  annualDividendKRW: number;
  frequency: DividendFrequency;
  nextPayMonth?: number;
  shares?: number;
  marketValueKRW?: number;
  costBasisKRW?: number;
  /** 미국 종목: 주당 연간 배당 (USD) */
  annualDividendUSD?: number;
  /** 미국 종목: 평가금액 (USD) */
  marketValueUSD?: number;
  /** 미국 종목: 총 매수금 (USD) */
  costBasisUSD?: number;
}

export interface ExpenseCategory {
  id: string;
  label: string;
  amountKRW: number;
}

/** 내역 탭 기록 */
export interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  year: number;
  month: number;
  amountKRW: number;
  note?: string;
}

export interface FireGoals {
  userName: string;
  currentAge: number;
  targetFireAge: number;
  totalAssetsKRW: number;
  monthlyExpenseFallback: number;
  monthlyInvestmentKRW: number;
  assumedYieldPct: number;
}

export const FREE_HOLDING_LIMIT = 5;
