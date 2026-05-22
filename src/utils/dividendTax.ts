import type { DividendTaxSettings } from '../types';

export const defaultDividendTax: DividendTaxSettings = {
  useKrExemption: false,
  krSeparateTaxPct: 15.4,
  krExemptionTaxPct: 9.9,
  usWithholdingPct: 15,
};

/** 국내: 분리과세 15.4% 또는 감면 세율 / 미국: 원천징수 15% 가정 */
export function calcNetDividendKRW(
  grossKRW: number,
  market: 'KR' | 'US',
  tax: DividendTaxSettings = defaultDividendTax
): number {
  if (grossKRW <= 0) return 0;
  if (market === 'US') {
    return grossKRW * (1 - tax.usWithholdingPct / 100);
  }
  const pct = tax.useKrExemption ? tax.krExemptionTaxPct : tax.krSeparateTaxPct;
  return grossKRW * (1 - pct / 100);
}

export function describeTaxRule(market: 'KR' | 'US', tax: DividendTaxSettings): string {
  if (market === 'US') {
    return `미국 원천징수 ${tax.usWithholdingPct}% 반영`;
  }
  if (tax.useKrExemption) {
    return `국내 배당소득세 감면 가정 (${tax.krExemptionTaxPct}%)`;
  }
  return `국내 분리과세 ${tax.krSeparateTaxPct}% 반영`;
}
