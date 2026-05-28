export function normalizeNumericInput(value: string, allowNegative = false): string {
  const stripped = value.replace(/,/g, '').replace(/[^\d-]/g, '');
  if (!allowNegative) return stripped.replace(/-/g, '');
  if (stripped === '-') return '-';
  const negative = stripped.startsWith('-');
  const digits = stripped.replace(/-/g, '');
  return negative ? `-${digits}` : digits;
}

export function formatNumericInput(value: string | number): string {
  const raw = typeof value === 'number' ? String(value) : value;
  const normalized = normalizeNumericInput(raw, true);
  if (!normalized) return '';
  if (normalized === '-') return '-';

  const negative = normalized.startsWith('-');
  const digits = normalized.replace('-', '');
  if (!digits) return negative ? '-' : '';

  const formatted = Number(digits).toLocaleString('ko-KR');
  return negative ? `-${formatted}` : formatted;
}

export function parseNumericInput(value: string, allowNegative = false): number | null {
  const normalized = normalizeNumericInput(value, allowNegative);
  if (!normalized || normalized === '-') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** 평단(원/주) × 주수 → 총 매수금 문자열 */
export function costFromAvgPerShare(avgPerShare: string, shares: string): string {
  const avg = parseNumericInput(avgPerShare);
  const sh = Math.max(0, Number(shares) || 0);
  if (avg == null || avg <= 0 || sh <= 0) return '';
  return String(Math.round(avg * sh));
}

/** 총 매수금 ÷ 주수 → 평단(원/주) 문자열 */
export function avgFromCost(cost: string, shares: string): string {
  const total = parseNumericInput(cost);
  const sh = Math.max(0, Number(shares) || 0);
  if (total == null || total <= 0 || sh <= 0) return '';
  return String(Math.round(total / sh));
}

/** USD 입력 (소수 2자리) */
export function normalizeUsdInput(value: string): string {
  let v = value.replace(/,/g, '').replace(/[^\d.]/g, '');
  const dot = v.indexOf('.');
  if (dot >= 0) {
    const intPart = v.slice(0, dot).replace(/\./g, '');
    const frac = v.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    v = frac.length > 0 ? `${intPart}.${frac}` : `${intPart}.`;
  }
  return v;
}

export function formatUsdInput(value: string | number): string {
  const raw = typeof value === 'number' ? String(value) : value;
  const normalized = normalizeUsdInput(raw);
  if (!normalized || normalized === '.') return normalized === '.' ? '.' : '';

  const [intPart, frac] = normalized.split('.');
  const formattedInt = intPart ? Number(intPart).toLocaleString('en-US') : '0';
  return frac !== undefined ? `${formattedInt}.${frac}` : formattedInt;
}

export function parseUsdInput(value: string): number | null {
  const normalized = normalizeUsdInput(value);
  if (!normalized || normalized === '.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function costFromAvgPerShareUsd(avgPerShare: string, shares: string): string {
  const avg = parseUsdInput(avgPerShare);
  const sh = Math.max(0, Number(shares) || 0);
  if (avg == null || avg <= 0 || sh <= 0) return '';
  return String(Math.round(avg * sh * 100) / 100);
}

export function avgFromCostUsd(cost: string, shares: string): string {
  const total = parseUsdInput(cost);
  const sh = Math.max(0, Number(shares) || 0);
  if (total == null || total <= 0 || sh <= 0) return '';
  return String(Math.round((total / sh) * 100) / 100);
}
