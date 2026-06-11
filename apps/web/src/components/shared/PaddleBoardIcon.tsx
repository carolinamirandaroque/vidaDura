import { cn } from '@lifehub/ui';

interface PaddleBoardIconProps {
  className?: string;
}

export function PaddleBoardIcon({ className }: PaddleBoardIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <ellipse cx="12" cy="14.5" rx="8.5" ry="3.25" transform="rotate(-18 12 14.5)" />
      <line x1="10.5" y1="5" x2="13.5" y2="19" />
      <path d="M8.75 6.25 10.5 4.75" />
      <path d="M8.75 6.25 10.5 7.75" />
    </svg>
  );
}
