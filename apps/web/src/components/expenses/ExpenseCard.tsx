import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2, Trash2 } from 'lucide-react';
import { Badge, Button, Input, cn } from '@lifehub/ui';
import { hubRowClass } from '@/components/hub';
import { EntityAccessPanel } from '@/components/shared/EntityAccessPanel';
import { buildExpenseAccessEntries, canManageExpense } from '@/lib/entity-access';
import { getExpenseObligations, getExpenseSettlementStatus } from '@lifehub/utils';
import { useFormatters } from '@/hooks/useFormatters';
import type { Expense } from '@lifehub/types';

interface ExpenseCardProps {
  expense: Expense;
  currentUserId: string;
  onSettleShare?: (expenseId: string, shareId: string) => void;
  onDelete?: (expenseId: string) => void;
  onAmountChange?: (expenseId: string, amount: number) => void;
  canEditAmount?: boolean;
  canDelete?: boolean;
  showAccess?: boolean;
  updatingAmount?: boolean;
  deleting?: boolean;
  settlingShareId?: string | null;
  compact?: boolean;
}

export function ExpenseCard({
  expense,
  currentUserId,
  onSettleShare,
  onDelete,
  onAmountChange,
  canEditAmount,
  canDelete,
  showAccess = true,
  updatingAmount,
  deleting,
  settlingShareId,
  compact,
}: ExpenseCardProps) {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormatters();
  const [editingAmount, setEditingAmount] = useState(false);
  const [editAmount, setEditAmount] = useState(String(expense.amount));

  useEffect(() => {
    if (!editingAmount) setEditAmount(String(expense.amount));
  }, [expense.amount, editingAmount]);
  const payer = expense.paidBy ?? expense.creator;
  const obligations = getExpenseObligations(expense);
  const status = getExpenseSettlementStatus(expense);

  const canSettleShare = (shareUserId: string) =>
    currentUserId === shareUserId ||
    currentUserId === expense.paidById ||
    currentUserId === expense.creatorId;

  const userOwes = obligations.some((o) => o.from.id === currentUserId && !o.settled);
  const userIsOwed = obligations.some((o) => o.to.id === currentUserId && !o.settled);

  const statusKey =
    status === 'settled'
      ? 'settled'
      : status === 'partial'
        ? 'partial'
        : userIsOwed && !userOwes
          ? 'awaiting'
          : userOwes
            ? 'toPay'
            : 'pending';

  const statusBadge = {
    settled: {
      label: t('expenses.settled'),
      className:
        'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    partial: {
      label: t('expenses.partiallySettled'),
      className: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    },
    awaiting: {
      label: t('expenses.awaitingPayment'),
      className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    toPay: {
      label: t('expenses.toPay'),
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    },
    pending: {
      label: t('expenses.pending'),
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    },
  }[statusKey];

  const canRemove =
    canDelete ?? canManageExpense(expense, currentUserId, canEditAmount);
  const accessEntries = buildExpenseAccessEntries(expense);

  const saveAmount = () => {
    const value = parseFloat(editAmount);
    setEditingAmount(false);
    if (!value || value <= 0 || value === expense.amount) return;
    onAmountChange?.(expense.id, value);
  };

  return (
    <div className={cn(hubRowClass, 'flex-col items-stretch gap-2', !compact && 'p-3')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{expense.title}</h3>
            <Badge variant="outline" className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
          </div>
          {!compact && (
            <p className="text-sm text-muted-foreground">
              {formatDate(expense.date)} · {expense.creator?.name}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('expenses.paidBy', { name: payer?.name ?? '…' })}
            {expense.eventTitle && ` · ${expense.eventTitle}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {editingAmount && canEditAmount && onAmountChange ? (
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              onBlur={saveAmount}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveAmount();
                if (e.key === 'Escape') {
                  setEditAmount(String(expense.amount));
                  setEditingAmount(false);
                }
              }}
              className="h-8 w-24 text-right text-lg font-semibold"
              autoFocus
              disabled={updatingAmount}
            />
          ) : (
            <button
              type="button"
              disabled={!canEditAmount || !onAmountChange || updatingAmount}
              onClick={() => canEditAmount && onAmountChange && setEditingAmount(true)}
              className={cn(
                'text-lg font-semibold',
                canEditAmount && onAmountChange && 'hover:underline',
              )}
            >
              {formatCurrency(expense.amount, expense.currency)}
            </button>
          )}
          {canRemove && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={deleting}
              onClick={() => {
                if (window.confirm(t('expenses.deleteConfirm'))) {
                  onDelete(expense.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {obligations.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-dashed px-2.5 py-2">
          <p className="text-xs font-medium text-muted-foreground">{t('expenses.owes')}</p>
          {obligations.map((obligation) => (
            <div
              key={obligation.shareId}
              className={cn(
                'flex flex-wrap items-center gap-1.5 text-sm',
                obligation.settled && 'opacity-60',
              )}
            >
              <span className={cn('font-medium', obligation.settled && 'line-through')}>
                {obligation.from.name}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className={cn('font-medium', obligation.settled && 'line-through')}>
                {obligation.to.name}
              </span>
              <span
                className={cn(
                  'ml-auto font-semibold',
                  obligation.settled ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
                )}
              >
                {formatCurrency(obligation.amount, expense.currency)}
              </span>
              {obligation.settled ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('expenses.shareSettled')}
                </span>
              ) : (
                onSettleShare &&
                canSettleShare(obligation.from.id) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={settlingShareId === obligation.shareId}
                    onClick={() => onSettleShare(expense.id, obligation.shareId)}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {currentUserId === obligation.from.id
                      ? t('expenses.markSelfPaid')
                      : currentUserId === expense.paidById || currentUserId === expense.creatorId
                        ? t('expenses.markReceived', { name: obligation.from.name })
                        : t('expenses.markShareSettled', { name: obligation.from.name })}
                  </Button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {obligations.length === 0 && (
        <p className="text-xs text-muted-foreground">{t('expenses.noDebtsOnExpense')}</p>
      )}

      {showAccess && accessEntries.length > 1 && (
        <EntityAccessPanel entries={accessEntries} className="rounded-md border bg-muted/20 p-2" />
      )}
    </div>
  );
}
