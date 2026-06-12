import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  CheckSquare,
  Wallet,
  Users,
  Bell,
  ShoppingCart,
  PartyPopper,
  Sparkles,
  Circle,
} from 'lucide-react';
import { Badge, Skeleton, cn } from '@lifehub/ui';
import { api } from '@/lib/api';
import { getEventTypeColor } from '@/lib/event-types';
import { useFormatters } from '@/hooks/useFormatters';
import { useAuthStore } from '@/stores/auth.store';
import { PaddleBoardIcon } from '@/components/shared/PaddleBoardIcon';
import { AttentionCard } from '@/components/dashboard/AttentionCard';
import { DashboardPanel } from '@/components/dashboard/DashboardPanel';
import { FinanceSummaryCard } from '@/components/dashboard/FinanceSummaryCard';
import { hubEmptyClass, hubRowClass } from '@/components/hub/hub-styles';
import type { Task } from '@lifehub/types';

function getGreetingKey(): 'dashboard.greetingMorning' | 'dashboard.greetingAfternoon' | 'dashboard.greetingEvening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'dashboard.greetingMorning';
  if (hour < 18) return 'dashboard.greetingAfternoon';
  return 'dashboard.greetingEvening';
}

function flattenTasks(tasks: Task[]): Task[] {
  return tasks.flatMap((t) => [t, ...flattenTasks(t.children ?? [])]);
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { formatDateTime, formatCurrency, formatDate } = useFormatters();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => api.getDashboard(),
    enabled: !!userId,
  });

  const firstName = user?.name?.split(' ')[0] ?? '';
  const stats = data?.stats;
  const flatTasks = useMemo(
    () => flattenTasks(data?.pendingTasks ?? []),
    [data?.pendingTasks],
  );
  const debtsYouOweCount = useMemo(
    () => data?.debts.filter((debt) => debt.from.id === userId).length ?? 0,
    [data?.debts, userId],
  );
  const financesDetail = useMemo(() => {
    if (!stats) return '';
    const { expensesYouOwe, expensesOwedToYou } = stats;
    if (expensesYouOwe === 0 && expensesOwedToYou === 0) {
      return t('dashboard.financesClear');
    }
    if (expensesYouOwe > 0 && expensesOwedToYou > 0) {
      return t('dashboard.statDebtsBoth', {
        amount: formatCurrency(expensesOwedToYou),
        count: debtsYouOweCount,
      });
    }
    if (expensesYouOwe > 0) {
      return t('dashboard.statDebtsPending', { count: debtsYouOweCount });
    }
    return t('dashboard.statOwedToYou', { amount: formatCurrency(expensesOwedToYou) });
  }, [stats, debtsYouOweCount, t, formatCurrency]);
  const taskProgress = stats && stats.tasksTotal > 0 ? stats.tasksDone / stats.tasksTotal : 0;

  const hasPendingDebts =
    (stats?.expensesYouOwe ?? 0) > 0 || (stats?.expensesOwedToYou ?? 0) > 0;
  const alertCount =
    (stats?.pendingInvites ?? 0) +
    (stats?.connectionRequests ?? 0) +
    (stats?.unreadNotifications ?? 0);
  const allClear =
    !flatTasks.length &&
    !data?.pendingExpenses.length &&
    !data?.pendingShoppingItems.length &&
    !data?.todayEvents.length &&
    !data?.upcomingEvents.length &&
    !hasPendingDebts &&
    !stats?.pendingInvites &&
    !stats?.connectionRequests;

  const attentionChips = useMemo(() => {
    if (!stats || allClear) return [];
    const chips: { to: string; label: string; icon: typeof CheckSquare }[] = [];
    if (stats.tasksTodo > 0) {
      chips.push({
        to: '/tasks',
        icon: CheckSquare,
        label: t('dashboard.chipTasks', { count: stats.tasksTodo }),
      });
    }
    if (stats.eventsToday > 0) {
      chips.push({
        to: '/calendar',
        icon: Calendar,
        label: t('dashboard.chipEvents', { count: stats.eventsToday }),
      });
    }
    if (stats.shoppingPending > 0) {
      chips.push({
        to: '/shopping',
        icon: ShoppingCart,
        label: t('dashboard.chipShopping', { count: stats.shoppingPending }),
      });
    }
    if (hasPendingDebts) {
      chips.push({
        to: '/expenses',
        icon: Wallet,
        label: t('dashboard.chipFinances'),
      });
    }
    if (alertCount > 0) {
      chips.push({
        to: stats.unreadNotifications ? '/notifications' : stats.pendingInvites ? '/calendar' : '/contacts',
        icon: Bell,
        label: t('dashboard.chipAlerts', { count: alertCount }),
      });
    }
    return chips;
  }, [stats, allClear, hasPendingDebts, alertCount, t]);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-8">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {['a', 'b', 'c', 'd'].map((id) => (
            <Skeleton key={id} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-80 rounded-xl lg:col-span-3" />
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-background to-orange-500/10 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/4 h-36 w-36 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="relative space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <PaddleBoardIcon className="h-4 w-4 text-primary" />
                {formatDate(new Date())}
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t(getGreetingKey(), { name: firstName })}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground sm:text-base">
                {allClear ? t('dashboard.subtitleClear') : t('dashboard.subtitleBusy')}
              </p>
            </div>
            {allClear ? (
              <div className="flex items-center gap-2 self-start rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <PartyPopper className="h-5 w-5 shrink-0" />
                {t('dashboard.allClear')}
              </div>
            ) : (
              <div className="flex items-center gap-2 self-start rounded-2xl border border-primary/20 bg-background/70 px-4 py-3 text-sm backdrop-blur-sm">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium">{t('dashboard.needsAttention')}</span>
              </div>
            )}
          </div>

          {attentionChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attentionChips.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to + label}
                  to={to}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-background"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Overview */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AttentionCard
            to="/tasks"
            icon={CheckSquare}
            title={t('dashboard.statTasks')}
            value={stats.tasksTodo}
            detail={
              stats.tasksTodo > 0
                ? t('dashboard.statTasksHint', { done: stats.tasksDone, total: stats.tasksTotal })
                : t('dashboard.tasksEmpty')
            }
            active={stats.tasksTodo > 0}
            accent="from-emerald-500/20 to-emerald-500/5 border-emerald-500/25"
            iconColor="text-emerald-600 dark:text-emerald-400"
            progress={taskProgress}
          />
          <AttentionCard
            to="/calendar"
            icon={Calendar}
            title={t('dashboard.statEvents')}
            value={stats.eventsToday}
            detail={
              stats.eventsToday > 0
                ? t('dashboard.statEventsHint', { count: stats.eventsThisWeek })
                : t('dashboard.eventsEmpty')
            }
            active={stats.eventsToday > 0}
            accent="from-sky-500/20 to-sky-500/5 border-sky-500/25"
            iconColor="text-sky-600 dark:text-sky-400"
          />
          <AttentionCard
            to="/shopping"
            icon={ShoppingCart}
            title={t('dashboard.statShopping')}
            value={stats.shoppingPending}
            detail={stats.shoppingPending > 0 ? t('dashboard.statShoppingHint') : t('dashboard.shoppingEmpty')}
            active={stats.shoppingPending > 0}
            accent="from-orange-500/20 to-orange-500/5 border-orange-500/25"
            iconColor="text-orange-600 dark:text-orange-400"
          />
          <FinanceSummaryCard
            to="/expenses"
            title={t('dashboard.statFinances')}
            youOwe={stats.expensesYouOwe}
            owedToYou={stats.expensesOwedToYou}
            detail={financesDetail}
            youOweLabel={t('dashboard.youOwe')}
            owedToYouLabel={t('dashboard.owedToYou')}
            formatCurrency={formatCurrency}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Agenda */}
        <div className="space-y-4 lg:col-span-3">
          <DashboardPanel
            title={t('dashboard.agenda')}
            icon={Calendar}
            iconClassName="text-sky-500"
            to="/calendar"
            linkLabel={t('dashboard.viewAll')}
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('dashboard.todayEvents')}
                </p>
                {data?.todayEvents.length ? (
                  <div className="space-y-1.5">
                    {data.todayEvents.map((event) => (
                      <Link key={event.id} to="/calendar" className={hubRowClass}>
                        <div
                          className="h-9 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: getEventTypeColor(event.type) }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(event.startDate)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className={hubEmptyClass}>{t('dashboard.noTodayEvents')}</p>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('dashboard.comingUp')}
                </p>
                {data?.upcomingEvents.length ? (
                  <div className="space-y-1.5">
                    {data.upcomingEvents.slice(0, 4).map((event) => (
                      <Link key={event.id} to="/calendar" className={hubRowClass}>
                        <div
                          className="h-9 w-1 shrink-0 rounded-full opacity-70"
                          style={{ backgroundColor: getEventTypeColor(event.type) }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(event.startDate)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className={hubEmptyClass}>{t('dashboard.noUpcomingEvents')}</p>
                )}
              </div>
            </div>
          </DashboardPanel>

          {!!data?.debts.length && (
            <DashboardPanel
              title={t('dashboard.debtBalance')}
              icon={Wallet}
              iconClassName="text-violet-500"
              to="/expenses"
              linkLabel={t('dashboard.viewExpenses')}
            >
              <div className="space-y-1.5">
                {data.debts.slice(0, 4).map((debt) => {
                  const youOwe = debt.from.id === userId;
                  return (
                    <div key={`${debt.from.id}-${debt.to.id}`} className={hubRowClass}>
                      <Circle
                        className={cn(
                          'h-2 w-2 shrink-0 fill-current',
                          youOwe ? 'text-destructive' : 'text-emerald-500',
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {youOwe
                          ? t('expenses.youOweTo', { name: debt.to.name })
                          : t('expenses.owesYou', { name: debt.from.name })}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 text-sm font-semibold tabular-nums',
                          youOwe ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {formatCurrency(debt.amount, debt.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </DashboardPanel>
          )}
        </div>

        {/* To-do column */}
        <div className="space-y-4 lg:col-span-2">
          <DashboardPanel
            title={t('dashboard.pendingTasks')}
            icon={CheckSquare}
            iconClassName="text-emerald-500"
            to="/tasks"
            linkLabel={t('dashboard.viewAll')}
          >
            {flatTasks.length ? (
              <div className="space-y-1.5">
                {flatTasks.slice(0, 6).map((task) => (
                  <Link key={task.id} to="/tasks" className={cn(hubRowClass, 'justify-between')}>
                    <span className="min-w-0 truncate text-sm">{task.title}</span>
                    {task.eventTitle && (
                      <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                        {task.eventTitle}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className={hubEmptyClass}>{t('dashboard.allDone')}</p>
            )}
          </DashboardPanel>

          <DashboardPanel
            title={t('dashboard.shoppingList')}
            icon={ShoppingCart}
            iconClassName="text-orange-500"
            to="/shopping"
            linkLabel={t('dashboard.viewShoppingList')}
          >
            {data?.pendingShoppingItems.length ? (
              <div className="space-y-1.5">
                {data.pendingShoppingItems.slice(0, 6).map((item) => (
                  <Link key={item.id} to="/shopping" className={hubRowClass}>
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title}</span>
                    {item.eventTitle && (
                      <span className="ml-auto truncate text-[10px] text-muted-foreground">{item.eventTitle}</span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className={hubEmptyClass}>{t('dashboard.noShoppingItems')}</p>
            )}
          </DashboardPanel>

          {alertCount > 0 && (
            <DashboardPanel
              title={t('dashboard.alerts')}
              icon={Bell}
              iconClassName="text-amber-500"
              headerClassName="border-amber-500/20 bg-amber-500/5"
            >
              <div className="space-y-1.5">
                {!!stats?.pendingInvites && (
                  <Link to="/calendar" className={hubRowClass}>
                    <Calendar className="h-4 w-4 shrink-0 text-sky-500" />
                    <span className="flex-1 text-sm">{t('dashboard.eventInvites', { count: stats.pendingInvites })}</span>
                  </Link>
                )}
                {!!stats?.connectionRequests && (
                  <Link to="/contacts" className={hubRowClass}>
                    <Users className="h-4 w-4 shrink-0 text-pink-500" />
                    <span className="flex-1 text-sm">
                      {t('dashboard.pendingCount', { count: stats.connectionRequests })}
                    </span>
                  </Link>
                )}
                {!!stats?.unreadNotifications && (
                  <Link to="/notifications" className={hubRowClass}>
                    <Bell className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="flex-1 text-sm">
                      {t('dashboard.unreadCount', { count: stats.unreadNotifications })}
                    </span>
                  </Link>
                )}
              </div>
            </DashboardPanel>
          )}
        </div>
      </div>
    </div>
  );
}
