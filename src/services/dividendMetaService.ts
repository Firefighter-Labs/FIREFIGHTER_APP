import { getDividendScheduleForSymbol as localSchedule } from '../data/dividendCatalog';
import type { DbDividendEvent, DbStock } from '../lib/database.types';
import { getSupabase, isSupabaseEnabled } from '../lib/supabase';
import type { DividendEvent, StockHolding } from '../types';
import {
  fetchDividendsFromApi,
  getCachedDividendEvents,
  getDividendApiStatus,
  isLiveDividendApiEnabled,
} from './dividendApiService';

let supabaseCache: Map<string, DividendEvent[]> | null = null;
let lastSyncSource: 'api' | 'supabase' | 'local' = 'local';
let lastSyncError: string | null = null;
let lastSyncKey = '';
let lastSyncAt = 0;

const SYNC_COOLDOWN_MS = 1000 * 60 * 5;

function buildSyncKey(holdings: StockHolding[], year: number): string {
  const symbols = holdings
    .map((h) => `${h.symbol}:${h.market}`)
    .sort()
    .join('|');
  return `${year}::${symbols}`;
}

export function getLastDividendDataSource(): typeof lastSyncSource {
  return lastSyncSource;
}

export function getLastDividendSyncError(): string | null {
  return lastSyncError;
}

export async function preloadDividendMeta(year: number): Promise<void> {
  if (!isSupabaseEnabled()) return;

  const supabase = getSupabase();
  if (!supabase) return;

  const [{ data: events, error: evErr }, { data: stocks, error: stErr }] = await Promise.all([
    supabase.from('dividend_events').select('*').eq('year', year),
    supabase.from('stocks').select('*'),
  ]);

  if (evErr || stErr || !events?.length) {
    supabaseCache = null;
    return;
  }

  const stockMap = new Map(((stocks ?? []) as DbStock[]).map((s) => [s.symbol, s]));
  supabaseCache = new Map();

  for (const ev of (events ?? []) as DbDividendEvent[]) {
    const stock = stockMap.get(ev.symbol);
    const item: DividendEvent = {
      symbol: ev.symbol,
      name: stock?.name ?? ev.symbol,
      exDate: ev.ex_date,
      payDate: ev.pay_date,
      amountPerShare: Number(ev.amount_per_share),
      currency: stock?.currency ?? 'USD',
    };
    const list = supabaseCache.get(ev.symbol) ?? [];
    list.push(item);
    supabaseCache.set(ev.symbol, list);
  }
  lastSyncSource = 'supabase';
}

export async function syncHoldingsDividends(
  holdings: StockHolding[],
  year: number,
  options?: { force?: boolean }
): Promise<void> {
  lastSyncError = null;
  const syncKey = buildSyncKey(holdings, year);

  if (
    !options?.force &&
    syncKey === lastSyncKey &&
    Date.now() - lastSyncAt < SYNC_COOLDOWN_MS
  ) {
    return;
  }

  if (holdings.length === 0) {
    lastSyncSource = isLiveDividendApiEnabled() ? 'api' : 'local';
    return;
  }

  if (isLiveDividendApiEnabled()) {
    await Promise.all(
      holdings.map((h) => fetchDividendsFromApi(h.symbol, h.name, h.market, year))
    );
    const st = getDividendApiStatus();
    lastSyncError = st.lastError;
    lastSyncSource =
      st.lastProvider === 'local' && st.lastError && st.isEstimate
        ? 'local'
        : st.lastProvider !== 'local'
          ? 'api'
          : 'local';
    lastSyncKey = syncKey;
    lastSyncAt = Date.now();
    return;
  }

  if (isSupabaseEnabled()) {
    await preloadDividendMeta(year);
    if (supabaseCache && supabaseCache.size > 0) return;
  }

  lastSyncSource = 'local';
  lastSyncKey = syncKey;
  lastSyncAt = Date.now();
}

export function getDividendScheduleForSymbol(
  symbol: string,
  name: string,
  market: 'KR' | 'US',
  year: number
): DividendEvent[] {
  const fromApi = getCachedDividendEvents(symbol, market, year);
  if (fromApi.length) return fromApi;

  if (supabaseCache?.has(symbol)) {
    return (supabaseCache.get(symbol) ?? []).filter(
      (e) => e.payDate.startsWith(String(year)) || e.exDate.startsWith(String(year))
    );
  }

  return localSchedule(symbol, name, year);
}
