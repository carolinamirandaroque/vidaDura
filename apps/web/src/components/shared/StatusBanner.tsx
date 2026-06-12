import { cn } from '@lifehub/ui';

type StatusBannerVariant = 'error' | 'success';

const variantClass: Record<StatusBannerVariant, string> = {
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

interface StatusBannerProps {
  variant: StatusBannerVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBanner({ variant, children, className }: StatusBannerProps) {
  return (
    <p className={cn('rounded-lg border px-3 py-2 text-sm', variantClass[variant], className)}>
      {children}
    </p>
  );
}
