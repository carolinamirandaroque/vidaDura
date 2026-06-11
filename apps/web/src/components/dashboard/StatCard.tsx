import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@lifehub/ui';

interface StatCardProps {
  to: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  className?: string;
}

export function StatCard({
  to,
  icon: Icon,
  label,
  value,
  hint,
  accent = 'from-primary/15 to-primary/5 border-primary/20',
  className,
}: StatCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-all hover:scale-[1.02] hover:shadow-md',
        accent,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-lg bg-background/60 p-2 shadow-sm backdrop-blur-sm transition-colors group-hover:bg-background">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
