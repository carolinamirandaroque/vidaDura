import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, CheckCircle2, Wallet, History } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@lifehub/ui';
import { api } from '@/lib/api';
import { ExpenseSplitForm } from '@/components/expenses/ExpenseSplitForm';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { BalanceContactRow } from '@/components/expenses/BalanceContactRow';
import {
  HubEmptyMessage,
  HubGroupLabel,
  HubHint,
  HubMetricCard,
  HubSection,
  SectionChipTabs,
  hubListClass,
  hubSectionClass,
} from '@/components/hub';
import { useFormatters } from '@/hooks/useFormatters';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoading } from '@/components/layout/PageLoading';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAuthStore } from '@/stores/auth.store';
import { canManageExpense } from '@/lib/entity-access';
import type { Expense } from '@lifehub/types';

type ExpensesTab = 'balances' | 'history';

function groupExpensesByMonth(expenses: Expense[], locale: string) {
  const groups = new Map<string, Expense[]>();

  for (const expense of expenses) {
    const key = new Date(expense.date).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
    const list = groups.get(key) ?? [];
    list.push(expense);
    groups.set(key, list);
  }

  return Array.from(groups.entries());
}

export function ExpensesPage() {
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useFormatters();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const locale = i18n.language === 'pt-PT' ? 'pt-PT' : 'en';
  const [activeTab, setActiveTab] = useState<ExpensesTab>('balances');
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

  const balanceTotals = useMemo(() => {
    let youOwe = 0;
    let owedToYou = 0;
    for (const balance of balances ?? []) {
      if (balance.amount < 0) owedToYou += Math.abs(balance.amount);
      else youOwe += balance.amount;
    }
    return { youOwe, owedToYou };
  }, [balances]);

  const historyGroups = useMemo(
    () => groupExpensesByMonth(expenses ?? [], locale),
    [expenses, locale],
  );

  if (isLoading) return <PageLoading />;

  const tabs = [
    {
      id: 'balances' as const,
      label: t('expenses.balances'),
      icon: <Wallet className="h-3.5 w-3.5" />,
    },
    {
      id: 'history' as const,
      label: t('expenses.history'),
      icon: <History className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <PageShell width="wide" className="pb-6">
      <PageHeader
        title={t('expenses.title')}
        subtitle={t('expenses.subtitle')}
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> {t('expenses.expense')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('expenses.newExpense')}</DialogTitle>
              </DialogHeader>
              {createError && <p className="text-sm text-destructive">{createError}</p>}
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
        }
      />

      <div className={hubSectionClass}>
        <SectionChipTabs
          tabs={tabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as ExpensesTab)}
        />

        {activeTab === 'balances' && (
          <HubSection icon={Wallet} title={t('expenses.balances')}>
            <HubHint>{t('expenses.balancesHint')}</HubHint>

            {(balanceTotals.youOwe > 0 || balanceTotals.owedToYou > 0) && (
              <div className="grid gap-2 sm:grid-cols-2">
                <HubMetricCard
                  label={t('expenses.totalYouOwe')}
                  value={formatCurrency(balanceTotals.youOwe)}
                  tone="negative"
                />
                <HubMetricCard
                  label={t('expenses.totalOwedToYou')}
                  value={formatCurrency(balanceTotals.owedToYou)}
                  tone="positive"
                />
              </div>
            )}

            {loadingBalances ? (
              <PageLoading className="min-h-[200px]" />
            ) : !balances?.length ? (
              <HubEmptyMessage>{t('expenses.allBalanced')}</HubEmptyMessage>
            ) : (
              <div className={hubSectionClass}>
                <div className="flex flex-wrap items-center justify-end gap-2">
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
                <div className={hubListClass}>
                  {balances.map((balance) => (
                    <BalanceContactRow
                      key={balance.userId}
                      balance={balance}
                      owesYouLabel={t('expenses.balanceOwesYou')}
                      youOweLabel={t('expenses.balanceYouOwe')}
                      settleLabel={t('expenses.settleWith')}
                      formatCurrency={formatCurrency}
                      isSettling={
                        settleWithContactMutation.isPending &&
                        settlingContactId === balance.userId
                      }
                      disabled={settleAllMutation.isPending}
                      onSettle={() => {
                        if (
                          window.confirm(
                            t('expenses.settleWithConfirm', { name: balance.user.name }),
                          )
                        ) {
                          settleWithContactMutation.mutate(balance.userId);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </HubSection>
        )}

        {activeTab === 'history' && (
          <HubSection icon={History} title={t('expenses.history')}>
            <HubHint>{t('expenses.historyHint')}</HubHint>

            {!expenses?.length ? (
              <EmptyState
                icon={Wallet}
                title={t('expenses.noExpenses')}
                description={t('expenses.noExpensesDescription')}
              />
            ) : (
              historyGroups.map(([monthLabel, monthExpenses]) => (
                <div key={monthLabel} className={hubSectionClass}>
                  <HubGroupLabel>{monthLabel}</HubGroupLabel>
                  <div className={hubListClass}>
                    {monthExpenses.map((expense) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        currentUserId={userId ?? ''}
                        variant="history"
                        canEditAmount={canManageExpense(expense, userId ?? '')}
                        onSettleShare={(expenseId, shareId) =>
                          settleShareMutation.mutate({ expenseId, shareId })
                        }
                        onDelete={(id) => deleteMutation.mutate(id)}
                        deleting={deleteMutation.isPending && deletingExpenseId === expense.id}
                        settlingShareId={
                          settleShareMutation.isPending ? settlingShareId : null
                        }
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </HubSection>
        )}
      </div>
    </PageShell>
  );
}
