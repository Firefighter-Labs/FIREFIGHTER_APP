interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: 'orange' | 'green' | 'default';
  onClick?: () => void;
}

export function StatCard({ label, value, sub, accent = 'default', onClick }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`stat-card stat-card--${accent}`}
      onClick={onClick}
    >
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {sub && <span className="stat-card__sub">{sub}</span>}
    </Tag>
  );
}
