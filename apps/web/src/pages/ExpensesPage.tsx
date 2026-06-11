import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, CheckCircle2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@lifehub/ui';
import { api } from '@/lib/api';
import { ExpenseSplitForm } from '@/components/expenses/ExpenseSplitForm';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { getInitials, hasPendingDebts } from '@lifehub/utils';
import { useFormatters } from '@/hooks/useFormatters';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Wallet } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export function ExpensesPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatters();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [settlingShareId, setSettlingShareId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [settlingContactId, setSettlingContactId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', userId],
    queryFn: () => api.getExpenses(),
    enabled: !!userId,
  });

  const { data: balances, isLoading: loadingBalances } = useQuery({
    queryKey: ['balances', userId],
    queryFn: () => api.getBalances(),
    enabled: !!userId,
  });

  const invalidateExpenseQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['debts'] });
    queryClient.invalidateQueries({ queryKey: ['balances'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const createMutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => {
      setCreateError(null);
      invalidateExpenseQueries();
      setDialogOpen(false);
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteExpense,
    onMutate: (id) => setDeletingExpenseId(id),
    onSettled: () => setDeletingExpenseId(null),
    onSuccess: invalidateExpenseQueries,
  });

  const settleAllMutation = useMutation({
    mutationFn: api.settleAllExpenses,
    onSuccess: invalidateExpenseQueries,
  });

  const settleWithContactMutation = useMutation({
    mutationFn: api.settleExpensesWithContact,
    onMutate: (contactId) => setSettlingContactId(contactId),
    onSettled: () => setSettlingContactId(null),
    onSuccess: invalidateExpenseQueries,
  });

  const settleShareMutation = useMutation({
    mutationFn: ({ expenseId, shareId }: { expenseId: string; shareId: string }) =>
      api.settleExpenseShare(expenseId, shareId, true),
    onMutate: ({ shareId }) => setSettlingShareId(shareId),
    onSettled: () => setSettlingShareId(null),
    onSuccess: invalidateExpenseQueries,
  });

  if (isLoading) return <LoadingSpinner />;

  const pendingCount = expenses?.filter((e) => hasPendingDebts(e)).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('expenses.title')}</h1>
          <p className="text-muted-foreground">{t('expenses.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> {t('expenses.expense')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('expenses.newExpense')}</DialogTitle>
            </DialogHeader>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
            <ExpenseSplitForm
              currentUserId={userId ?? ''}
              isPending={createMutation.isPending}
              onSubmit={(data) =>
                createMutation.mutate({
                  ...data,
                  date: new Date().toISOString(),
                })
              }
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">{t('expenses.history')}</TabsTrigger>
          <TabsTrigger value="balances">{t('expenses.balances')}</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          {!expenses?.length ? (
            <EmptyState
              icon={Wallet}
              title={t('expenses.noExpenses')}
              description={t('expenses.noExpensesDescription')}
            />
          ) : (
            <div className="space-y-3">
              {pendingCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t('expenses.pendingCount', { count: pendingCount })}
                </p>
              )}
              {expenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-4">
                    <ExpenseCard
                      expense={expense}
                      currentUserId={userId ?? ''}
                      onSettleShare={(expenseId, shareId) =>
                        settleShareMutation.mutate({ expenseId, shareId })
                      }
                      onDelete={(id) => deleteMutation.mutate(id)}
                      deleting={deleteMutation.isPending && deletingExpenseId === expense.id}
                      settlingShareId={
                        settleShareMutation.isPending ? settlingShareId : null
                      }
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          {loadingBalances ? (
            <LoadingSpinner />
          ) : !balances?.length ? (
            <p className="text-center text-muted-foreground">{t('expenses.allBalanced')}</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{t('expenses.balancesAutoHint')}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={settleAllMutation.isPending}
                  onClick={() => {
                    if (window.confirm(t('expenses.settleAllConfirm'))) {
                      settleAllMutation.mutate();
                    }
                  }}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {t('expenses.settleAll')}
                </Button>
              </div>
              {balances.map((balance) => {
                const owesYou = balance.amount < 0;
                const amount = Math.abs(balance.amount);
                const isSettling =
                  settleWithContactMutation.isPending && settlingContactId === balance.userId;

                return (
                  <Card key={balance.userId}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={balance.user.avatar ?? undefined} />
                        <AvatarFallback>{getInitials(balance.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{balance.user.name}</p>
                        <p
                          className={
                            owesYou
                              ? 'text-sm text-emerald-600 dark:text-emerald-400'
                              : 'text-sm text-destructive'
                          }
                        >
                          {owesYou ? t('expenses.balanceOwesYou') : t('expenses.balanceYouOwe')}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span
                          className={`text-lg font-semibold tabular-nums ${
                            owesYou
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-destructive'
                          }`}
                        >
                          {owesYou ? '+' : '-'}
                          {formatCurrency(amount)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={isSettling || settleAllMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                t('expenses.settleWithConfirm', { name: balance.user.name }),
                              )
                            ) {
                              settleWithContactMutation.mutate(balance.userId);
                            }
                          }}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {t('expenses.settleWith')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
