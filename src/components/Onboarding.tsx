import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getCachedUsdKrwRate } from '../services/exchangeRateService';
import { calcCoveragePct, totalMonthlyDividend } from '../utils/coverage';
import { formatNumericInput, normalizeNumericInput, parseNumericInput } from '../utils/numberInput';

export function Onboarding() {
  const step = useAppStore((s) => s.onboardingStep);
  const setStep = useAppStore((s) => s.setOnboardingStep);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const setPrimaryMonthlyExpense = useAppStore((s) => s.setPrimaryMonthlyExpense);
  const updateGoals = useAppStore((s) => s.updateGoals);
  const addHolding = useAppStore((s) => s.addHolding);
  const holdings = useAppStore((s) => s.holdings);
  const goals = useAppStore((s) => s.goals);

  const [expense, setExpense] = useState('3000000');
  const [targetAge, setTargetAge] = useState(45);
  const [stockName, setStockName] = useState('');
  const [stockAnnual, setStockAnnual] = useState('');

  const previewPct = calcCoveragePct(
    totalMonthlyDividend(holdings, getCachedUsdKrwRate()),
    parseNumericInput(expense) || goals.monthlyExpenseFallback
  );

  return (
    <div className="onboarding">
      <div className="onboarding__progress">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`onboarding__dot ${i <= step ? 'active' : ''}`} />
        ))}
      </div>

      <div className="onboarding__body">
        {step === 0 && (
          <>
            <h1>파이어 후 월 얼마로<br />생활하고 싶으신가요?</h1>
            <p className="hint" style={{ marginBottom: 20 }}>
              이 금액이 커버율의 기준이 됩니다.
            </p>
            <div className="field">
              <label>월 목표 생활비 (원)</label>
              <input
                inputMode="numeric"
                value={formatNumericInput(expense)}
                onChange={(e) => setExpense(normalizeNumericInput(e.target.value))}
              />
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1>몇 살에 파이어를<br />달성하고 싶으신가요?</h1>
            <div className="slider-value">{targetAge}세</div>
            <input
              type="range"
              min={30}
              max={65}
              value={targetAge}
              onChange={(e) => setTargetAge(Number(e.target.value))}
            />
          </>
        )}
        {step === 2 && (
          <>
            <h1>배당주 하나만<br />입력해 보세요</h1>
            <p className="hint" style={{ marginBottom: 16 }}>건너뛸 수 있어요.</p>
            <div className="field">
              <label>종목명</label>
              <input value={stockName} onChange={(e) => setStockName(e.target.value)} placeholder="SCHD" />
            </div>
            <div className="field">
              <label>연간 배당(주당, 원)</label>
              <input
                inputMode="numeric"
                value={formatNumericInput(stockAnnual)}
                onChange={(e) => setStockAnnual(normalizeNumericInput(e.target.value))}
                placeholder="1200000"
              />
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1>첫걸음을 내딛었습니다</h1>
            <div className="onboarding__preview">
              <div className="onboarding__preview-pct">{previewPct.toFixed(0)}%</div>
              <p className="hint">현재 생활비 커버율</p>
            </div>
          </>
        )}
      </div>

      <div className="onboarding__actions">
        {step === 0 && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setPrimaryMonthlyExpense(parseNumericInput(expense) || 3_000_000);
              setStep(1);
            }}
          >
            다음
          </button>
        )}
        {step === 1 && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              updateGoals({ targetFireAge: targetAge });
              setStep(2);
            }}
          >
            다음
          </button>
        )}
        {step === 2 && (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (stockName.trim() && stockAnnual) {
                  const annual = parseNumericInput(stockAnnual) || 0;
                  addHolding({
                    name: stockName.trim(),
                    annualDividendKRW: annual,
                    shares: 1,
                    frequency: 'quarterly',
                  });
                }
                setStep(3);
              }}
            >
              {stockName.trim() ? '다음' : '건너뛰기'}
            </button>
          </>
        )}
        {step === 3 && (
          <button type="button" className="btn-primary" onClick={completeOnboarding}>
            시작하기
          </button>
        )}
      </div>
    </div>
  );
}
