import { Injectable } from '@nestjs/common';
import {
  startOfDay,
  endOfDay,
  addDays,
  addDaysInTimeZone,
  buildTaskTree,
  endOfDayInTimeZone,
  eventOverlapsRange,
  startOfDayInTimeZone,
} from '@lifehub/utils';
import { EventsRepository } from '../events/events.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { ExpensesService } from '../expenses/expenses.service';
import { ConnectionsRepository } from '../connections/connections.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { ShoppingListRepository } from '../shopping-list/shopping-list.repository';
import { EventsService } from '../events/events.service';
import { UsersRepository } from '../users/users.repository';
import type { DashboardData, DashboardWeekDay, Task } from '@lifehub/types';

@Injectable()
export class DashboardService {
  constructor(
    private eventsRepo: EventsRepository,
    private tasksRepo: TasksRepository,
    private expensesRepo: ExpensesRepository,
    private expensesService: ExpensesService,
    private connectionsRepo: ConnectionsRepository,
    private notificationsRepo: NotificationsRepository,
    private shoppingListRepo: ShoppingListRepository,
    private eventsService: EventsService,
    private usersRepo: UsersRepository,
  ) {}

  private buildWeekActivity(
    now: Date,
    timeZone: string,
    todayEvents: { startDate: Date; endDate: Date }[],
    upcomingEvents: { startDate: Date; endDate: Date }[],
    locale = 'pt-PT',
  ): DashboardWeekDay[] {
    const all = [...todayEvents, ...upcomingEvents];
    const days: DashboardWeekDay[] = [];

    for (let i = 0; i < 7; i++) {
      const dayStart = addDaysInTimeZone(timeZone, now, i);
      const dayEnd = endOfDayInTimeZone(timeZone, dayStart);
      const count = all.filter((e) =>
        eventOverlapsRange(e.startDate, e.endDate, dayStart, dayEnd),
      ).length;

      days.push({
        date: dayStart.toISOString(),
        label: dayStart.toLocaleDateString(locale, { weekday: 'short', timeZone }),
        count,
      });
    }

    return days;
  }

  async getDashboard(userId: string): Promise<DashboardData> {
    const user = await this.usersRepo.findById(userId);
    const timeZone = user?.timezone ?? 'Europe/Lisbon';
    const now = new Date();
    const todayStart = startOfDayInTimeZone(timeZone, now);
    const todayEnd = endOfDayInTimeZone(timeZone, now);
    const weekEnd = addDaysInTimeZone(timeZone, now, 7);

    const [todayEvents, upcomingEvents, allTasks, expenses, shoppingItems, pendingInvites, connections, unreadCount, debts] =
      await Promise.all([
        this.eventsRepo.findByUser(userId, todayStart, todayEnd),
        this.eventsRepo.findByUser(userId, todayEnd, weekEnd),
        this.tasksRepo.findForUser(userId),
        this.expensesRepo.findByUser(userId),
        this.shoppingListRepo.findPending(userId, 8),
        this.eventsRepo.findPendingInvites(userId),
        this.connectionsRepo.findByUser(userId, 'pending'),
        this.notificationsRepo.countUnread(userId),
        this.expensesService.getDebts(userId),
      ]);

    const pendingTasksRaw = allTasks.filter((t) => t.status !== 'done');
    const taskTree = buildTaskTree(
      pendingTasksRaw.map(
        (t): Task => ({
          id: t.id,
          eventId: t.eventId,
          eventTitle: t.event?.title ?? null,
          parentTaskId: t.parentTaskId,
          ownerId: t.ownerId,
          assigneeId: t.assigneeId,
          title: t.title,
          description: t.description,
          status: t.status as Task['status'],
          priority: t.priority as Task['priority'],
          dueDate: t.dueDate?.toISOString() ?? null,
          position: t.position,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        }),
      ),
    );

    const pendingExpenses = expenses.filter((e) =>
      e.shares.some(
        (s) =>
          !s.settled && s.userId === userId && s.amountOwed > 0 && e.paidById !== userId,
      ),
    );

    const connectionRequests = connections.filter((c) => c.receiverId === userId);

    const expensesYouOwe = debts
      .filter((d) => d.from.id === userId)
      .reduce((sum, d) => sum + d.amount, 0);
    const expensesOwedToYou = debts
      .filter((d) => d.to.id === userId)
      .reduce((sum, d) => sum + d.amount, 0);

    const stats = {
      tasksTotal: allTasks.length,
      tasksTodo: allTasks.filter((t) => t.status !== 'done').length,
      tasksDoing: 0,
      tasksDone: allTasks.filter((t) => t.status === 'done').length,
      shoppingPending: shoppingItems.length,
      expensesYouOwe: Math.round(expensesYouOwe * 100) / 100,
      expensesOwedToYou: Math.round(expensesOwedToYou * 100) / 100,
      eventsToday: todayEvents.length,
      eventsThisWeek: todayEvents.length + upcomingEvents.length,
      pendingInvites: pendingInvites.length,
      connectionRequests: connectionRequests.length,
      unreadNotifications: unreadCount,
    };

    return {
      stats,
      debts,
      weekActivity: this.buildWeekActivity(now, timeZone, todayEvents, upcomingEvents),
      todayEvents: todayEvents.map((e) => this.eventsService.mapEvent(e)),
      upcomingEvents: upcomingEvents.map((e) => this.eventsService.mapEvent(e)),
      pendingTasks: taskTree,
      pendingExpenses: pendingExpenses.map((e) => ({
        id: e.id,
        eventId: e.eventId,
        eventTitle: e.event?.title ?? null,
        creatorId: e.creatorId,
        paidById: e.paidById,
        settled: e.settled,
        settledAt: e.settledAt?.toISOString() ?? null,
        title: e.title,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        date: e.date.toISOString(),
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      pendingShoppingItems: shoppingItems.map((item) => ({
        id: item.id,
        ownerId: item.ownerId,
        sectionId: item.sectionId,
        eventItemId: item.eventItemId ?? null,
        eventId: item.eventItem?.eventId ?? item.eventItem?.event?.id ?? null,
        eventTitle: item.eventItem?.event?.title ?? null,
        title: item.title,
        done: item.done,
        boughtAt: item.boughtAt?.toISOString() ?? null,
        position: item.position,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        section: item.section
          ? {
              id: item.section.id,
              ownerId: item.section.ownerId,
              name: item.section.name,
              position: item.section.position,
              createdAt: item.section.createdAt.toISOString(),
              updatedAt: item.section.updatedAt.toISOString(),
            }
          : undefined,
      })),
      pendingInvites: pendingInvites.map((inv) => ({
        id: inv.id,
        eventId: inv.eventId,
        userId: inv.userId,
        status: inv.status as 'pending' | 'accepted' | 'declined',
        event: this.eventsService.mapEvent(inv.event),
      })),
      connectionRequests: connectionRequests.map((c) => ({
        id: c.id,
        requesterId: c.requesterId,
        receiverId: c.receiverId,
        status: c.status as 'pending' | 'accepted' | 'rejected',
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      unreadNotifications: unreadCount,
    };
  }
}
