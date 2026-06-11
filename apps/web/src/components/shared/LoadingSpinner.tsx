import { Loader2 } from 'lucide-react';
import { cn } from '@lifehub/ui';

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-6 w-6 animate-spin text-primary', className)} />;
}
