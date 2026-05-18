import { tierStyle } from '@/lib/utils';

interface TierBadgeProps {
  name?: string | null;
  className?: string;
}

export function TierBadge({ name, className }: TierBadgeProps) {
  if (!name) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${className ?? ''}`}
      style={tierStyle(name)}
    >
      {name}
    </span>
  );
}
