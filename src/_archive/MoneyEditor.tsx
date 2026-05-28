import { Amount } from './Amount';
import { formatWon } from '../../utils/format';

export interface MoneyPreset {
  label: string;
  value: number;
}

interface MoneyEditorProps {
  icon?: string;
  title: string;
  subtitle?: string;
  value: number;
  onChange: (value: number) => void;
  presets: MoneyPreset[];
  step?: number;
  max?: number;
  showSlider?: boolean;
}

export function MoneyEditor({
  title,
  subtitle,
  value,
  onChange,
  presets,
  step = 1_000_000,
  max = 2_000_000_000,
  showSlider = true,
}: MoneyEditorProps) {
  const clamp = (n: number) => Math.max(0, Math.min(max, n));
  const bump = (delta: number) => onChange(clamp(value + delta));
  const showHead = !!title || !!subtitle;

  return (
    <div className="money-editor">
      {showHead && (
        <div className="money-editor__head">
          <div>
            {title && <div className="money-editor__title">{title}</div>}
            {subtitle && <div className="money-editor__sub">{subtitle}</div>}
          </div>
        </div>
      )}

      <div className="money-editor__display">
        <button type="button" className="step-btn" onClick={() => bump(-step)} aria-label="감소">
          −
        </button>
        <div className="money-editor__amount">
          <Amount value={value} size="lg" />
          <span className="money-editor__compact">{formatWon(value)}</span>
        </div>
        <button type="button" className="step-btn" onClick={() => bump(step)} aria-label="증가">
          +
        </button>
      </div>

      <div className="preset-grid">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`preset-chip ${value === p.value ? 'active' : ''}`}
            onClick={() => onChange(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showSlider && (
        <input
          type="range"
          className="money-editor__slider"
          min={0}
          max={max}
          step={step / 10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
    </div>
  );
}
