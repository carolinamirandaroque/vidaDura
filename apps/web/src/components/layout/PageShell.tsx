import { cn } from '@lifehub/ui';

type PageWidth = 'narrow' | 'content' | 'wide' | 'full';

const widthClass: Record<PageWidth, string> = {
  narrow: 'page-container-narrow',
  content: 'page-container',
  wide: 'page-container-wide',
  full: 'w-full space-y-5 sm:space-y-6',
};

interface PageShellProps {
  children: React.ReactNode;
  width?: PageWidth;
  className?: string;
}

export function PageShell({ children, width = 'content', className }: PageShellProps) {
  return <div className={cn(widthClass[width], className)}>{children}</div>;
}
