import { useState } from 'react';

interface AuthPanelProps {
  onSendOtp: (email: string) => Promise<void>;
  onVerifyOtp: (email: string, token: string) => Promise<void>;
  onGoogle: () => Promise<void>;
}

export function AuthPanel({ onSendOtp, onVerifyOtp, onGoogle }: AuthPanelProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <div className="card-title">커뮤니티 입장 (로그인 필수)</div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
        익명이 아닌 <strong>계정 단위</strong>로 구분됩니다. 이메일 인증 또는 Google로 로그인하세요.
      </p>

      {step === 'email' ? (
        <>
          <div className="field">
            <label>이메일</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !email.includes('@')}
            onClick={() =>
              run(async () => {
                await onSendOtp(email);
                setStep('otp');
                setMessage('이메일로 인증 코드(6자리)를 보냈습니다. 메일함을 확인하세요.');
              })
            }
          >
            인증 코드 받기
          </button>
        </>
      ) : (
        <>
          <div className="field">
            <label>인증 코드 (6자리)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={busy || otp.length < 6}
            onClick={() =>
              run(async () => {
                await onVerifyOtp(email, otp);
                setMessage('로그인 완료!');
              })
            }
          >
            로그인
          </button>
          <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setStep('email')}>
            이메일 다시 입력
          </button>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>또는</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <button
        type="button"
        className="btn-primary"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)' }}
        disabled={busy}
        onClick={() => {
          setMessage('Google 로그인 페이지로 이동합니다…');
          setBusy(true);
          onGoogle().catch((e) => {
            setMessage(e instanceof Error ? e.message : 'Google 로그인 실패');
            setBusy(false);
          });
        }}
      >
        {busy ? '이동 중…' : 'Google로 계속하기'}
      </button>

      {message && (
        <p style={{ fontSize: '0.8rem', color: 'var(--green)', marginTop: 12, lineHeight: 1.4 }}>{message}</p>
      )}
    </section>
  );
}
