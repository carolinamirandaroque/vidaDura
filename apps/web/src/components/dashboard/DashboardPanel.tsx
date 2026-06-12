import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, cn } from '@lifehub/ui';
import { hubIconWrapClass } from '@/components/hub/hub-styles';

interface DashboardPanelProps {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  to?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export function DashboardPanel({
  title,
  icon: Icon,
  iconClassName,
  to,
  linkLabel,
  children,
  className,
  headerClassName,
}: DashboardPanelProps) {
  return (
    <Card className={cn('overflow-hidden shadow-sm', className)}>
      <CardHeader
        className={cn(
          'flex flex-row items-center justify-between gap-2 border-b bg-muted/15 px-4 py-3',
          headerClassName,
        )}
      >
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={hubIconWrapClass}>
              <Icon className={cn('h-3.5 w-3.5 text-primary', iconClassName)} />
            </div>
          )}
          <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
        </div>
        {to && linkLabel && (
          <Link
            to={to}
            className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
