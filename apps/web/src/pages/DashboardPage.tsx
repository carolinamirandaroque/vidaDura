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
  ArrowRight,
  TrendingUp,
  PartyPopper,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton, Button, cn } from '@lifehub/ui';
import { api } from '@/lib/api';
import { getEventTypeColor } from '@/lib/event-types';
import { useFormatters } from '@/hooks/useFormatters';
import { useAuthStore } from '@/stores/auth.store';
import { PaddleBoardIcon } from '@/components/shared/PaddleBoardIcon';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { StatCard } from '@/components/dashboard/StatCard';
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
  const maxWeekCount = useMemo(
    () => Math.max(1, ...(data?.weekActivity.map((d) => d.count) ?? [1])),
    [data?.weekActivity],
  );
  const flatTasks = useMemo(
    () => flattenTasks(data?.pendingTasks ?? []),
    [data?.pendingTasks],
  );
  const taskProgress = stats && stats.tasksTotal > 0 ? stats.tasksDone / stats.tasksTotal : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['a', 'b', 'c', 'd'].map((id) => (
            <Skeleton key={id} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const allClear =
    !flatTasks.length &&
    !data?.pendingExpenses.length &&
    !data?.pendingShoppingItems.length &&
    !data?.todayEvents.length &&
    !stats?.pendingInvites &&
    !stats?.connectionRequests;

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/20 via-orange-500/10 to-background p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <PaddleBoardIcon className="h-4 w-4 text-primary" />
              {formatDate(new Date())}
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              {t(getGreetingKey(), { name: firstName })}
            </h1>
            <p className="mt-1 max-w-lg text-muted-foreground">{t('dashboard.subtitle')}</p>
          </div>
          {allClear ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              <PartyPopper className="h-5 w-5 shrink-0" />
              {t('dashboard.allClear')}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link to="/calendar">
                  <Calendar className="mr-1.5 h-4 w-4" />
                  {t('nav.calendar')}
                </Link>
              </Button>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/tasks">
                  <CheckSquare className="mr-1.5 h-4 w-4" />
                  {t('nav.tasks')}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Stat pills */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            to="/tasks"
            icon={CheckSquare}
            label={t('dashboard.statTasks')}
            value={stats.tasksTodo}
            hint={t('dashboard.statTasksHint', { done: stats.tasksDone, total: stats.tasksTotal })}
            accent="from-emerald-500/15 to-emerald-500/5 border-emerald-500/20"
          />
          <StatCard
            to="/calendar"
            icon={Calendar}
            label={t('dashboard.statEvents')}
            value={stats.eventsToday}
            hint={t('dashboard.statEventsHint', { count: stats.eventsThisWeek })}
            accent="from-blue-500/15 to-blue-500/5 border-blue-500/20"
          />
          <StatCard
            to="/shopping"
            icon={ShoppingCart}
            label={t('dashboard.statShopping')}
            value={stats.shoppingPending}
            hint={t('dashboard.statShoppingHint')}
            accent="from-orange-500/15 to-orange-500/5 border-orange-500/20"
          />
          <StatCard
            to="/expenses"
            icon={Wallet}
            label={t('dashboard.statDebts')}
            value={formatCurrency(stats.expensesYouOwe)}
            hint={
              stats.expensesOwedToYou > 0
                ? t('dashboard.statOwedToYou', { amount: formatCurrency(stats.expensesOwedToYou) })
                : t('dashboard.statDebtsHint')
            }
            accent="from-orange-500/15 to-orange-500/5 border-orange-500/20"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Charts column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Week activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">{t('dashboard.weekActivity')}</CardTitle>
                <p className="text-xs text-muted-foreground">{t('dashboard.weekActivityHint')}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex h-36 items-end justify-between gap-2 pt-2">
                {data?.weekActivity.map((day) => (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                    <div className="relative flex w-full flex-1 items-end justify-center">
                      <div
                        className={cn(
                          'w-full max-w-[2.5rem] rounded-t-md transition-all duration-500',
                          day.count > 0
                            ? 'bg-gradient-to-t from-primary to-primary/50'
                            : 'bg-muted/40',
                        )}
                        style={{ height: `${Math.max(8, (day.count / maxWeekCount) * 100)}%` }}
                        title={t('dashboard.eventsOnDay', { count: day.count })}
                      />
                    </div>
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">
                      {day.label}
                    </span>
                    {day.count > 0 && (
                      <span className="text-[10px] font-semibold text-primary">{day.count}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tasks + Expenses row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('dashboard.taskProgress')}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <DonutChart
                  value={stats?.tasksDone ?? 0}
                  max={stats?.tasksTotal ?? 1}
                  fillClassName="text-emerald-500"
                >
                  <span className="text-2xl font-bold">{Math.round(taskProgress * 100)}%</span>
                  <span className="text-[10px] text-muted-foreground">{t('dashboard.done')}</span>
                </DonutChart>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    {t('tasks.status.todo')}: <strong>{stats?.tasksTodo}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {t('tasks.status.done')}: <strong>{stats?.tasksDone}</strong>
                  </div>
                  <Button variant="link" className="h-auto p-0" asChild>
                    <Link to="/tasks">{t('dashboard.viewAll')} →</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('dashboard.debtBalance')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!data?.debts.length ? (
                  <p className="text-sm text-muted-foreground">{t('dashboard.noDebts')}</p>
                ) : (
                  <div className="space-y-2">
                    {data.debts.slice(0, 3).map((debt) => {
                      const youOwe = debt.from.id === userId;
                      return (
                        <div
                          key={`${debt.from.id}-${debt.to.id}`}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                        >
                          <span className="truncate">
                            {youOwe
                              ? t('expenses.youOweTo', { name: debt.to.name })
                              : t('expenses.owesYou', { name: debt.from.name })}
                          </span>
                          <span className={cn('font-semibold', youOwe ? 'text-destructive' : 'text-emerald-600')}>
                            {formatCurrency(debt.amount, debt.currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/expenses">{t('dashboard.viewExpenses')}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity feed */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{t('dashboard.todayEvents')}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/calendar">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.todayEvents.length ? (
                data.todayEvents.map((event) => (
                  <Link
                    key={event.id}
                    to="/calendar"
                    className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-accent/50"
                  >
                    <div
                      className="h-8 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: getEventTypeColor(event.type) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(event.startDate)}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('dashboard.noTodayEvents')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{t('dashboard.pendingTasks')}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/tasks">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {flatTasks.length ? (
                flatTasks.slice(0, 5).map((task) => (
                  <Link
                    key={task.id}
                    to="/tasks"
                    className="flex items-center justify-between rounded-lg border px-2.5 py-2 text-sm hover:bg-accent/50"
                  >
                    <span className="truncate">{task.title}</span>
                    {task.eventTitle && (
                      <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                        {task.eventTitle}
                      </Badge>
                    )}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('dashboard.allDone')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{t('dashboard.shoppingList')}</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/shopping">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.pendingShoppingItems.length ? (
                data.pendingShoppingItems.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    to="/shopping"
                    className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm hover:bg-accent/50"
                  >
                    <ShoppingCart className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                    <span className="truncate font-medium">{item.title}</span>
                    {item.eventTitle && (
                      <span className="ml-auto truncate text-[10px] text-muted-foreground">
                        {item.eventTitle}
                      </span>
                    )}
                  </Link>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('dashboard.noShoppingItems')}</p>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          {(!!stats?.pendingInvites || !!stats?.connectionRequests || !!stats?.unreadNotifications) && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('dashboard.alerts')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!!stats?.pendingInvites && (
                  <Button variant="outline" size="sm" className="w-full justify-between" asChild>
                    <Link to="/calendar">
                      {t('dashboard.eventInvites', { count: stats.pendingInvites })}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {!!stats?.connectionRequests && (
                  <Button variant="outline" size="sm" className="w-full justify-between" asChild>
                    <Link to="/contacts">
                      {t('dashboard.pendingCount', { count: stats.connectionRequests })}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {!!stats?.unreadNotifications && (
                  <Button variant="outline" size="sm" className="w-full justify-between" asChild>
                    <Link to="/notifications">
                      <Bell className="mr-1.5 h-4 w-4" />
                      {t('dashboard.unreadCount', { count: stats.unreadNotifications })}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick nav */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t('dashboard.quickNav')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { to: '/calendar', icon: Calendar, label: t('nav.calendar'), color: 'text-blue-500' },
            { to: '/tasks', icon: CheckSquare, label: t('nav.tasks'), color: 'text-emerald-500' },
            { to: '/shopping', icon: ShoppingCart, label: t('nav.shopping'), color: 'text-orange-500' },
            { to: '/expenses', icon: Wallet, label: t('nav.expenses'), color: 'text-orange-500' },
            { to: '/contacts', icon: Users, label: t('nav.contacts'), color: 'text-pink-500' },
            { to: '/notifications', icon: Bell, label: t('dashboard.notifications'), color: 'text-amber-500' },
          ].map(({ to, icon: Icon, label, color }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <Icon className={cn('h-6 w-6', color)} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
