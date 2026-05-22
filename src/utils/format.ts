import { getCachedUsdKrwRate } from '../services/exchangeRateService';

export function toKRW(amount: number, currency: 'KRW' | 'USD', usdKrw?: number): number {
  const rate = usdKrw ?? getCachedUsdKrwRate();
  return currency === 'USD' ? amount * rate : amount;
}

export function formatUsdKrwRate(rate: number): string {
  return `1 USD = ${Math.round(rate).toLocaleString('ko-KR')}원`;
}

export function formatWon(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만`;
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

export function formatFullWon(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

export function formatCountdown(ms: number): { years: number; months: number; days: number; hours: number; minutes: number; seconds: number; totalSeconds: number } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainDays = days % 30;

  return { years, months, days: remainDays, hours, minutes, seconds, totalSeconds };
}
