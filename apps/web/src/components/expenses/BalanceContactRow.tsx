import { CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Button, cn } from '@lifehub/ui';
import { getInitials } from '@lifehub/utils';
import { hubRowClass } from '@/components/hub/hub-styles';
import type { Balance } from '@lifehub/types';

interface BalanceContactRowProps {
  balance: Balance;
  owesYouLabel: string;
  youOweLabel: string;
  settleLabel: string;
  formatCurrency: (amount: number) => string;
  onSettle: () => void;
  isSettling?: boolean;
  disabled?: boolean;
}

export function BalanceContactRow({
  balance,
  owesYouLabel,
  youOweLabel,
  settleLabel,
  formatCurrency,
  onSettle,
  isSettling,
  disabled,
}: BalanceContactRowProps) {
  const owesYou = balance.amount < 0;
  const amount = Math.abs(balance.amount);

  return (
    <div className={cn(hubRowClass, 'gap-3 p-3')}>
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={balance.user.avatar ?? undefined} />
        <AvatarFallback>{getInitials(balance.user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{balance.user.name}</p>
        <p
          className={cn(
            'text-sm',
            owesYou ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
          )}
        >
          {owesYou ? owesYouLabel : youOweLabel}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span
          className={cn(
            'text-lg font-semibold tabular-nums',
            owesYou ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
          )}
        >
          {owesYou ? '+' : '-'}
          {formatCurrency(amount)}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={disabled || isSettling}
          onClick={onSettle}
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {settleLabel}
        </Button>
      </div>
    </div>
  );
}
