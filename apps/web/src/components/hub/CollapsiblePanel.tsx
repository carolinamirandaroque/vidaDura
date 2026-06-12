import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@lifehub/ui';

type CollapsiblePanelVariant = 'default' | 'success';

const variantClass: Record<CollapsiblePanelVariant, string> = {
  default: 'border bg-card',
  success: 'border-emerald-500/20 bg-emerald-500/5',
};

interface CollapsiblePanelProps {
  title: React.ReactNode;
  hint?: string;
  variant?: CollapsiblePanelVariant;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsiblePanel({
  title,
  hint,
  variant = 'default',
  defaultOpen = false,
  children,
  className,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-xl p-3 sm:p-4', variantClass[variant], className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center justify-between gap-2 text-left text-sm font-semibold',
          variant === 'success' && 'text-emerald-700 dark:text-emerald-400',
        )}
      >
        <span className="min-w-0 flex-1">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
      </button>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
