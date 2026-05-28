import { getDividendScheduleForSymbol as localSchedule } from '../data/dividendCatalog';
import type { DividendEvent, StockHolding } from '../types';
import {
  fetchDividendsFromApi,
  getCachedDividendEvents,
  getDividendApiStatus,
  isLiveDividendApiEnabled,
} from './dividendApiService';

let lastSyncSource: 'api' | 'local' = 'local';
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

  return localSchedule(symbol, name, year);
}
