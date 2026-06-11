import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, ArrowRight } from 'lucide-react';
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
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', userId],
    queryFn: () => api.getExpenses(),
    enabled: !!userId,
  });

  const { data: debts } = useQuery({
    queryKey: ['debts', userId],
    queryFn: () => api.getDebts(),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => {
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDialogOpen(false);
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const settleShareMutation = useMutation({
    mutationFn: ({ expenseId, shareId }: { expenseId: string; shareId: string }) =>
      api.settleExpenseShare(expenseId, shareId, true),
    onMutate: ({ shareId }) => setSettlingShareId(shareId),
    onSettled: () => setSettlingShareId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
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
          {!debts?.length ? (
            <p className="text-center text-muted-foreground">{t('expenses.allBalanced')}</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('expenses.debtsSummary')}</p>
              {debts.map((debt) => {
                const youOwe = debt.from.id === userId;
                const owesYou = debt.to.id === userId;
                const debtor = youOwe ? t('expenses.you') : debt.from.name;
                const creditor = owesYou ? t('expenses.you') : debt.to.name;

                return (
                  <Card key={`${debt.from.id}-${debt.to.id}-${debt.amount}`}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={debt.from.avatar ?? undefined} />
                        <AvatarFallback>{getInitials(debt.from.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span className={`font-medium ${youOwe ? 'text-destructive' : ''}`}>
                            {debtor}
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className={`font-medium ${owesYou ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                            {creditor}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {youOwe
                            ? t('expenses.youOweTo', { name: debt.to.name })
                            : owesYou
                              ? t('expenses.owesYou', { name: debt.from.name })
                              : t('expenses.debtBetween', {
                                  from: debt.from.name,
                                  to: debt.to.name,
                                })}
                        </p>
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={debt.to.avatar ?? undefined} />
                        <AvatarFallback>{getInitials(debt.to.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-destructive">
                        {formatCurrency(debt.amount, debt.currency)}
                      </span>
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
