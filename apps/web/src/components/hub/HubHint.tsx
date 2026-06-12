import { cn } from '@lifehub/ui';
import { hubHintClass } from './hub-styles';

interface HubHintProps {
  children: React.ReactNode;
  className?: string;
}

export function HubHint({ children, className }: HubHintProps) {
  return <p className={cn(hubHintClass, className)}>{children}</p>;
}
