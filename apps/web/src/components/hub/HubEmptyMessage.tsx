import { hubEmptyClass } from './hub-styles';
import { cn } from '@lifehub/ui';

interface HubEmptyMessageProps {
  children: React.ReactNode;
  className?: string;
}

export function HubEmptyMessage({ children, className }: HubEmptyMessageProps) {
  return <p className={cn(hubEmptyClass, className)}>{children}</p>;
}
