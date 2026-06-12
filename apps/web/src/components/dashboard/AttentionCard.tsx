import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@lifehub/ui';

interface AttentionCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  value: string | number;
  detail: string;
  active: boolean;
  accent: string;
  iconColor: string;
  progress?: number;
  className?: string;
}

export function AttentionCard({
  to,
  icon: Icon,
  title,
  value,
  detail,
  active,
  accent,
  iconColor,
  progress,
  className,
}: AttentionCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border p-4 transition-all duration-200',
        active
          ? cn('bg-gradient-to-br shadow-sm hover:-translate-y-0.5 hover:shadow-md', accent)
          : 'bg-card/60 hover:border-muted-foreground/20 hover:bg-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              'mt-1 text-2xl font-bold tracking-tight',
              active ? 'text-foreground' : 'text-muted-foreground/70',
            )}
          >
            {value}
          </p>
          <p
            className={cn(
              'mt-1 text-xs leading-snug',
              active ? 'text-muted-foreground' : 'text-muted-foreground/80',
            )}
          >
            {detail}
          </p>
        </div>
        <div
          className={cn(
            'rounded-xl border p-2.5 shadow-sm transition-colors',
            active ? 'border-background/40 bg-background/70' : 'border-transparent bg-muted/40',
          )}
        >
          {active ? (
            <Icon className={cn('h-4 w-4', iconColor)} />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500/80" />
          )}
        </div>
      </div>
      {progress !== undefined && active && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background/50">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}
