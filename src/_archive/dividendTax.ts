import type { DividendTaxSettings } from '../types';

/**
 * @deprecated 세금 개념을 UI에서 제거했습니다. 배당 금액은 전부 세전(gross) 기준으로 표시합니다.
 * 데이터 호환성을 위해 타입과 상수는 남아 있지만 계산에 사용되지 않습니다.
 */
export const defaultDividendTax: DividendTaxSettings = {
  useKrExemption: false,
  krSeparateTaxPct: 0,
  krExemptionTaxPct: 0,
  usWithholdingPct: 0,
};

/**
 * 세전 그대로 반환. (세금 개념 제거: 세율 적용 없음)
 * @deprecated 세금 계산은 더 이상 적용되지 않습니다. 세전 금액을 그대로 사용하세요.
 */
export function calcNetDividendKRW(
  grossKRW: number,
  _market: 'KR' | 'US',
  _tax: DividendTaxSettings = defaultDividendTax
): number {
  return Math.max(0, grossKRW);
}
