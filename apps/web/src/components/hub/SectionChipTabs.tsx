import { cn, Button } from '@lifehub/ui';

export type SectionChipTab = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  menu?: React.ReactNode;
};

interface SectionChipTabsProps {
  tabs: SectionChipTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SectionChipTabs({ tabs, activeId, onChange, className }: SectionChipTabsProps) {
  return (
    <div className={cn('-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none', className)}>
      {tabs.map((tab) => (
        <div key={tab.id} className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            size="sm"
            variant={activeId === tab.id ? 'default' : 'outline'}
            onClick={() => onChange(tab.id)}
            className="gap-1.5 whitespace-nowrap"
          >
            {tab.icon}
            {tab.label}
          </Button>
          {tab.menu}
        </div>
      ))}
    </div>
  );
}
