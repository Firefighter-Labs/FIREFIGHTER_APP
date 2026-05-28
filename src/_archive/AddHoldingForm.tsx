import { useEffect, useState } from 'react';

export interface AddHoldingFormSeed {
  symbol?: string;
  name?: string;
  market?: 'US' | 'KR';
}

export interface AddHoldingFormSubmit {
  symbol: string;
  name: string;
  market: 'US' | 'KR';
  shares: number;
  manual: boolean;
}

interface AddHoldingFormProps {
  seed?: AddHoldingFormSeed;
  onSubmit: (payload: AddHoldingFormSubmit) => void;
  onCancel: () => void;
}

export function AddHoldingForm({ seed, onSubmit, onCancel }: AddHoldingFormProps) {
  const [symbol, setSymbol] = useState((seed?.symbol ?? '').toUpperCase());
  const [name, setName] = useState(seed?.name ?? '');
  const [market, setMarket] = useState<'US' | 'KR'>(seed?.market ?? 'US');
  const [shares, setShares] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSymbol((seed?.symbol ?? '').toUpperCase());
    setName(seed?.name ?? '');
    setMarket(seed?.market ?? 'US');
    setShares('');
    setError(null);
  }, [seed?.symbol, seed?.name, seed?.market]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sharesNum = Number(shares);
    if (!symbol.trim()) {
      setError('티커를 입력하세요.');
      return;
    }
    if (!name.trim()) {
      setError('종목명을 입력하세요.');
      return;
    }
    if (!Number.isFinite(sharesNum) || sharesNum <= 0) {
      setError('수량은 1 이상이어야 합니다.');
      return;
    }
    onSubmit({
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
      market,
      shares: sharesNum,
      manual: true,
    });
  };

  return (
    <form className="add-holding-form" onSubmit={handleSubmit}>
      <div className="field">
        <label>티커</label>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="SCHD"
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label>종목명</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="종목 이름"
        />
      </div>
      <div className="field">
        <label>시장</label>
        <div className="segmented segmented--compact">
          <button
            type="button"
            className={market === 'US' ? 'active' : ''}
            onClick={() => setMarket('US')}
          >
            미국
          </button>
          <button
            type="button"
            className={market === 'KR' ? 'active' : ''}
            onClick={() => setMarket('KR')}
          >
            국내
          </button>
        </div>
      </div>
      <div className="field">
        <label>수량</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="10"
        />
      </div>
      {error && <p className="add-holding-form__error">{error}</p>}
      <div className="add-holding-form__actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn-primary">
          추가
        </button>
      </div>
    </form>
  );
}
