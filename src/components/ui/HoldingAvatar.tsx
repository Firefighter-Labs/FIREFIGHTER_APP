import { useState } from 'react';

interface HoldingAvatarProps {
  name: string;
  symbol?: string;
  logoUrl?: string;
  size?: number;
}

export function HoldingAvatar({ name, symbol, logoUrl, size = 40 }: HoldingAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = (name.trim()[0] ?? symbol?.[0] ?? '?').toUpperCase();

  if (logoUrl && !failed) {
    return (
      <img
        className="holding-avatar"
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="holding-avatar holding-avatar--fallback" style={{ width: size, height: size }}>
      {initial}
    </div>
  );
}
