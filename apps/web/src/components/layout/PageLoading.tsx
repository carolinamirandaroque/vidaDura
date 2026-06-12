import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@lifehub/ui';

interface PageLoadingProps {
  className?: string;
}

export function PageLoading({ className }: PageLoadingProps) {
  return (
    <div
      className={cn(
        'flex min-h-[min(50vh,320px)] items-center justify-center',
        className,
      )}
    >
      <LoadingSpinner className="h-8 w-8" />
    </div>
  );
}
