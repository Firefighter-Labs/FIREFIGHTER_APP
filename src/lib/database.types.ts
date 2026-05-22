/** Supabase 테이블 Row 타입 (수동 정의) */

export interface DbProfile {
  id: string;
  anon_label: string;
  created_at: string;
}

export interface DbPost {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  attach_portfolio: boolean;
  attach_fire_stats: boolean;
  coverage_pct: number | null;
  monthly_dividend_krw: number | null;
  holdings_count: number | null;
  badge_tier: string;
  stock_ratio: number | null;
  cash_ratio: number | null;
  likes_count: number;
  created_at: string;
}

export interface DbPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface DbPostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface DbChatMessage {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface DbStock {
  symbol: string;
  name: string;
  market: 'KR' | 'US';
  currency: 'KRW' | 'USD';
}

export interface DbDividendEvent {
  id: string;
  symbol: string;
  ex_date: string;
  pay_date: string;
  amount_per_share: number;
  year: number;
}
