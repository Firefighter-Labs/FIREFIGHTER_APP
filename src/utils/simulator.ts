/**
 * 단순 선형 파이어 시뮬: 매월 배당주에 N원 투자 시 가정 수익률만큼 월 배당이 늘어난다고 가정.
 */
export function simulateFireAge(
  currentAge: number,
  monthlyDividend: number,
  monthlyExpense: number,
  monthlyInvestment: number,
  assumedYieldPct: number
): { months: number; fireAge: number | null; message: string } {
  if (monthlyExpense <= 0) {
    return { months: 0, fireAge: null, message: '목표 생활비를 설정해 주세요.' };
  }
  if (monthlyDividend >= monthlyExpense) {
    return {
      months: 0,
      fireAge: currentAge,
      message: `이미 배당만으로 생활비를 충당할 수 있습니다.`,
    };
  }

  const monthlyBoost =
    monthlyInvestment > 0 && assumedYieldPct > 0
      ? (monthlyInvestment * assumedYieldPct) / 100 / 12
      : 0;

  if (monthlyBoost <= 0) {
    return {
      months: 9999,
      fireAge: null,
      message: '추가 투자 금액을 입력하면 예상 나이를 계산합니다.',
    };
  }

  let div = monthlyDividend;
  let months = 0;
  while (div < monthlyExpense && months < 1200) {
    div += monthlyBoost;
    months++;
  }

  if (months >= 1200) {
    return { months: 9999, fireAge: null, message: '현재 설정으로는 달성이 어렵습니다.' };
  }

  const fireAge = currentAge + months / 12;
  const ageRounded = Math.floor(fireAge);
  const investMan = Math.round(monthlyInvestment / 10_000);

  return {
    months,
    fireAge: ageRounded,
    message: `매월 ${investMan}만 원 추가 투자 시 약 ${ageRounded}세에 파이어 가능`,
  };
}
