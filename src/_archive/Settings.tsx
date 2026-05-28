import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { MoneyEditor } from './ui/MoneyEditor';

export function Settings() {
  const fire = useAppStore((s) => s.fire);
  const updateFire = useAppStore((s) => s.updateFire);
  const exportData = useAppStore((s) => s.exportData);
  const importData = useAppStore((s) => s.importData);

  const [msg, setMsg] = useState<string | null>(null);

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firefighter-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('저장했습니다.');
  };

  const handleImport = () => {
    const raw = window.prompt('백업 JSON을 붙여넣으세요');
    if (!raw) return;
    if (importData(raw)) setMsg('복원했습니다.');
    else setMsg('형식이 올바르지 않습니다.');
  };

  return (
    <div className="settings-page">
      <section className="card">
        <div className="card-title">매달 현금 저축</div>
        <p className="hint-text">
          배당주를 사지 않고 통장·예금 등에만 넣는 금액입니다. 월 배당과 합쳐 생활비 커버율에 반영됩니다.
        </p>
        <MoneyEditor
          title=""
          value={fire.monthlySavings}
          onChange={(v) => updateFire({ monthlySavings: v })}
          presets={[
            { label: '50만', value: 500_000 },
            { label: '100만', value: 1_000_000 },
            { label: '200만', value: 2_000_000 },
          ]}
          step={50_000}
          max={15_000_000}
        />
      </section>

      <section className="card">
        <div className="card-title">데이터</div>
        <p className="hint-text">이 기기에만 저장됩니다.</p>
        <button type="button" className="btn-secondary" onClick={handleExport}>
          백업보내기
        </button>
        <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={handleImport}>
          백업 복원
        </button>
        {msg && <p className="hint-text" style={{ marginTop: 8 }}>{msg}</p>}
      </section>
    </div>
  );
}
