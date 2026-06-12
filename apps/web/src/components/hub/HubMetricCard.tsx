import { cn } from '@lifehub/ui';
import { hubMetricCardClass } from './hub-styles';

type HubMetricTone = 'positive' | 'negative' | 'neutral';

const toneClass: Record<HubMetricTone, string> = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-destructive',
  neutral: 'text-foreground',
};

interface HubMetricCardProps {
  label: string;
  value: string;
  tone?: HubMetricTone;
  className?: string;
}

export function HubMetricCard({ label, value, tone = 'neutral', className }: HubMetricCardProps) {
  return (
    <div className={cn(hubMetricCardClass, className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-bold tabular-nums', toneClass[tone])}>{value}</p>
    </div>
  );
}
