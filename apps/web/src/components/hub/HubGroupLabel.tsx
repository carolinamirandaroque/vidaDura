import { cn } from '@lifehub/ui';
import { hubGroupLabelClass } from './hub-styles';

interface HubGroupLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function HubGroupLabel({ children, className }: HubGroupLabelProps) {
  return <h3 className={cn(hubGroupLabelClass, className)}>{children}</h3>;
}
