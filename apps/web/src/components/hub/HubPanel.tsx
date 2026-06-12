import type { LucideIcon } from 'lucide-react';
import { cn } from '@lifehub/ui';
import { hubIconWrapClass, hubPanelClass } from './hub-styles';

interface HubPanelProps {
  title?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function HubPanel({
  title,
  icon: Icon,
  iconClassName,
  children,
  className,
  bodyClassName,
}: HubPanelProps) {
  return (
    <div className={cn(hubPanelClass, className)}>
      {title && (
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/15 px-4 py-3">
          {Icon && (
            <div className={hubIconWrapClass}>
              <Icon className={cn('h-3.5 w-3.5 text-primary', iconClassName)} />
            </div>
          )}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </div>
  );
}
