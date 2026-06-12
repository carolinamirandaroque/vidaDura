import type { LucideIcon } from 'lucide-react';

interface HubSectionProps {
  icon: LucideIcon;
  title: string;
  count?: string;
  children: React.ReactNode;
}

export function HubSection({ icon: Icon, title, count, children }: HubSectionProps) {
  return (
    <section className="space-y-2 sm:space-y-3">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold sm:text-base">{title}</h3>
        {count && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
