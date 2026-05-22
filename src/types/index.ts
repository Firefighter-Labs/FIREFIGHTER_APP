export type Currency = 'KRW' | 'USD';

export type TabId = 'fire' | 'dividend' | 'community' | 'settings';

export type BadgeTier =
  | '소방훈련생'
  | '견습소방관'
  | '초급소방관'
  | '중급소방관'
  | '고급소방관'
  | '전설의 소방대장';

/** 배당 세후 수령액 추정 (간이 모델) */
export interface DividendTaxSettings {
  /** true: 중소형 등 감면 세율(krExemptionTaxPct) 적용 가정 */
  useKrExemption: boolean;
  /** 국내 분리과세 (%) */
  krSeparateTaxPct: number;
  /** 국내 감면 적용 시 유효 세율 (%) — 종목·요건별로 다름 */
  krExemptionTaxPct: number;
  /** 미국 ETF/주식 원천징수 (%) */
  usWithholdingPct: number;
}

export interface FireSettings {
  totalAssets: number;
  currency: Currency;
  monthlySavings: number;
  monthlyExpense: number;
  /** 은퇴 후 연간 인출률 (%) — 고급·참고용, 배당 FIRE와 별개 */
  withdrawalRatePct: number;
  /** 저축 → 배당주 매수 시 가정 배당 수익률 (%) */
  assumedDividendYieldPct: number;
  stockRatio: number;
  cashRatio: number;
}

export interface StockHolding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  market: 'KR' | 'US';
}

export interface DividendEvent {
  symbol: string;
  name: string;
  exDate: string;
  payDate: string;
  amountPerShare: number;
  currency: 'KRW' | 'USD';
}

export type PostType = 'cert' | 'question' | 'win' | 'tip';

export interface PostFireStats {
  coveragePct: number;
  monthlyNetKRW: number;
  holdingsCount: number;
  tier: BadgeTier;
}

export interface PostComment {
  id: string;
  postId: string;
  content: string;
  createdAt: number;
  authorLabel?: string;
  isMine?: boolean;
}

export interface CommunityPost {
  id: string;
  content: string;
  createdAt: number;
  postType: PostType;
  attachPortfolio: boolean;
  attachFireStats: boolean;
  fireStats?: PostFireStats;
  likes: number;
  commentCount: number;
  badgeTier?: BadgeTier;
  stockRatio?: number;
  cashRatio?: number;
  likedByMe?: boolean;
  authorLabel?: string;
  isMine?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  at: number;
  authorLabel?: string;
  isMine?: boolean;
}

export type DataMode = 'local' | 'cloud';

export interface ExpenseBreakdownItem {
  label: string;
  amount: number;
  covered: boolean;
  partial: number;
}
