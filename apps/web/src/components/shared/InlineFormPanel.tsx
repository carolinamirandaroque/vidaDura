import { cn } from '@lifehub/ui';

interface InlineFormPanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function InlineFormPanel({ title, children, className }: InlineFormPanelProps) {
  return (
    <div className={cn('panel-muted space-y-3', className)}>
      {title && <p className="text-sm font-medium">{title}</p>}
      {children}
    </div>
  );
}
