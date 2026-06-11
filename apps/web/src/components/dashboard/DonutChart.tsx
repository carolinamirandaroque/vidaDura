import { cn } from '@lifehub/ui';

interface DonutChartProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  children?: React.ReactNode;
}

export function DonutChart({
  value,
  max,
  size = 128,
  stroke = 10,
  className,
  trackClassName = 'text-muted/30',
  fillClassName = 'text-primary',
  children,
}: DonutChartProps) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(fillClassName, 'transition-all duration-700 ease-out')}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}
