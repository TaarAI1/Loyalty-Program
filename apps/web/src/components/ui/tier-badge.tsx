interface TierBadgeProps {
  name?: string | null;
  className?: string;
  size?: number;
}

const TIER_COLORS: Record<string, {
  outerRing: string;
  innerFace: string;
  innerFace2: string;
  text: string;
  ring: string;
}> = {
  classic:  { outerRing: '#A0522D', innerFace: '#E8A86A', innerFace2: '#CD7F32', text: '#5C3317', ring: '#8B4513' },
  silver:   { outerRing: '#888888', innerFace: '#E8E8E8', innerFace2: '#A8A8A8', text: '#2a2a2a', ring: '#666666' },
  gold:     { outerRing: '#A07800', innerFace: '#FFD700', innerFace2: '#C9A000', text: '#3a2000', ring: '#8a6500' },
  platinum: { outerRing: '#111111', innerFace: '#3a3a3a', innerFace2: '#1a1a1a', text: '#f0f0f0', ring: '#050505' },
  diamond:  { outerRing: '#2a6fa0', innerFace: '#87CEEB', innerFace2: '#4DAAEE', text: '#0a2040', ring: '#1a4f7a' },
};

function starburstPoints(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  numPoints: number,
): string {
  const pts: string[] = [];
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (i * Math.PI) / numPoints - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(
      `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`,
    );
  }
  return pts.join(' ');
}

export function TierBadge({ name, className, size = 44 }: TierBadgeProps) {
  if (!name) return <span className="text-muted-foreground text-xs">—</span>;

  const key = name.toLowerCase();
  const colors = TIER_COLORS[key] ?? {
    outerRing: '#888',
    innerFace: '#ccc',
    innerFace2: '#aaa',
    text: '#333',
    ring: '#666',
  };

  // Unique gradient IDs per tier so multiple badges on same page don't clash
  const gradId = `tbg-${key}`;
  const ringGradId = `tbrg-${key}`;

  const points = starburstPoints(50, 50, 48, 40, 24);
  const fontSize = name.length > 7 ? '10' : name.length > 5 ? '11' : '12';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-label={name}
      style={{ display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' }}
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor={colors.innerFace} />
          <stop offset="100%" stopColor={colors.innerFace2} />
        </radialGradient>
        <radialGradient id={ringGradId} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor={colors.outerRing} />
          <stop offset="100%" stopColor={colors.ring} />
        </radialGradient>
      </defs>
      {/* Outer starburst ring */}
      <polygon points={points} fill={`url(#${ringGradId})`} />
      {/* Inner face circle */}
      <circle cx="50" cy="50" r="36" fill={`url(#${gradId})`} />
      {/* Tier name */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill={colors.text}
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.5"
      >
        {name.toUpperCase()}
      </text>
    </svg>
  );
}
