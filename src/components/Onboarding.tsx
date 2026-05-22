import { useAppStore } from '../store/useAppStore';

const STEPS = [
  {
    icon: '🔥',
    title: '탈출 D-Day',
    desc: '월·분기 배당이 생활비를 얼마나 덮는지 보고, 탈출 D-Day를 초 단위로 확인하세요.',
  },
  {
    icon: '📅',
    title: '배당 캘린더',
    desc: '보유 종목 배당으로 이번 달 생활비 어디까지 커버되는지 봅니다.',
  },
  {
    icon: '🛡️',
    title: '비밀 방',
    desc: '등급 뱃지·포트폴리오 인증으로 파이어족들과 익명 소통합니다.',
  },
];

export function Onboarding() {
  const step = useAppStore((s) => s.onboardingStep);
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const current = STEPS[step];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <span className="onboarding-icon">{current.icon}</span>
        <h2>{current.title}</h2>
        <p>{current.desc}</p>
        <div className="onboarding-dots" role="tablist" aria-label="온보딩 단계">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={`${i + 1}단계: ${s.title}`}
              className={`onboarding-dot ${i === step ? 'active' : ''}`}
              onClick={() => setOnboardingStep(i)}
            />
          ))}
        </div>
        <div className="onboarding-actions">
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary" onClick={() => setOnboardingStep(step + 1)}>
              다음
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={completeOnboarding}>
              시작하기
            </button>
          )}
        </div>
        <button type="button" className="btn-ghost onboarding-skip" onClick={completeOnboarding}>
          건너뛰기
        </button>
      </div>
    </div>
  );
}
