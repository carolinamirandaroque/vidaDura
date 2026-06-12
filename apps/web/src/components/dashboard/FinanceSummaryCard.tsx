import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { cn } from '@lifehub/ui';

interface FinanceSummaryCardProps {
  to: string;
  title: string;
  youOwe: number;
  owedToYou: number;
  detail: string;
  youOweLabel: string;
  owedToYouLabel: string;
  formatCurrency: (amount: number) => string;
  className?: string;
}

export function FinanceSummaryCard({
  to,
  title,
  youOwe,
  owedToYou,
  detail,
  youOweLabel,
  owedToYouLabel,
  formatCurrency,
  className,
}: FinanceSummaryCardProps) {
  const active = youOwe > 0 || owedToYou > 0;

  return (
    <Link
      to={to}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border p-4 transition-all duration-200',
        active
          ? 'border-violet-500/25 bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-background shadow-sm hover:-translate-y-0.5 hover:shadow-md'
          : 'bg-card/60 hover:border-muted-foreground/20 hover:bg-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {youOweLabel}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-lg font-bold tabular-nums',
                  youOwe > 0 ? 'text-destructive' : 'text-muted-foreground/70',
                )}
              >
                {formatCurrency(youOwe)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {owedToYouLabel}
              </p>
              <p
                className={cn(
                  'mt-0.5 text-lg font-bold tabular-nums',
                  owedToYou > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/70',
                )}
              >
                {formatCurrency(owedToYou)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">{detail}</p>
        </div>
        <div
          className={cn(
            'rounded-xl border p-2.5 shadow-sm',
            active ? 'border-background/40 bg-background/70' : 'border-transparent bg-muted/40',
          )}
        >
          <Wallet className={cn('h-4 w-4', active ? 'text-violet-500' : 'text-muted-foreground/60')} />
        </div>
      </div>
    </Link>
  );
}
