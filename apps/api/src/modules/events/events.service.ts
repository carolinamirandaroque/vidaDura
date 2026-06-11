import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { buildTaskTree, validateShares } from '@lifehub/utils';
import { CalendarsRepository } from '../calendars/calendars.repository';
import { CalendarsService } from '../calendars/calendars.service';
import { EventsRepository } from './events.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { ExpensesRepository } from '../expenses/expenses.repository';
import { ShoppingListRepository } from '../shopping-list/shopping-list.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { WebsocketGateway } from '../../infrastructure/websocket/websocket.gateway';
import { toUserDto } from '../../common/mappers/user.mapper';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateEventTaskDto } from './dto/create-event-task.dto';
import { CreateEventItemDto } from './dto/create-event-item.dto';
import { UpdateEventItemDto } from './dto/update-event-item.dto';
import { CreateExpenseDto } from '../expenses/dto/create-expense.dto';
import type {
  Event,
  EventParticipant,
  EventDetail,
  EventItem,
  Task,
  Expense,
} from '@lifehub/types';

@Injectable()
export class EventsService {
  constructor(
    private eventsRepo: EventsRepository,
    private calendarsRepo: CalendarsRepository,
    private calendarsService: CalendarsService,
    private tasksRepo: TasksRepository,
    private expensesRepo: ExpensesRepository,
    private shoppingRepo: ShoppingListRepository,
    private notificationsService: NotificationsService,
    private wsGateway: WebsocketGateway,
  ) {}

  mapEvent(event: {
    id: string;
    calendarId: string;
    type?: string;
    title: string;
    description: string | null;
    location: string | null;
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    recurrence: string;
    recurrenceEnd: Date | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    participants?: Array<{
      id: string;
      eventId: string;
      userId: string;
      status: string;
      user?: Parameters<typeof toUserDto>[0];
    }>;
    calendar?: { id: string; name: string; color: string; description: string | null; ownerId: string; createdAt: Date; updatedAt: Date };
  }): Event {
    return {
      id: event.id,
      calendarId: event.calendarId,
      type: (event.type ?? 'general') as Event['type'],
      title: event.title,
      description: event.description,
      location: event.location,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      allDay: event.allDay,
      recurrence: event.recurrence as Event['recurrence'],
      recurrenceEnd: event.recurrenceEnd?.toISOString() ?? null,
      createdById: event.createdById,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      participants: event.participants?.map((p) => ({
        id: p.id,
        eventId: p.eventId,
        userId: p.userId,
        status: p.status as EventParticipant['status'],
        user: p.user ? toUserDto(p.user) : undefined,
      })),
      calendar: event.calendar
        ? {
            id: event.calendar.id,
            name: event.calendar.name,
            color: event.calendar.color,
            description: event.calendar.description,
            ownerId: event.calendar.ownerId,
            createdAt: event.calendar.createdAt.toISOString(),
            updatedAt: event.calendar.updatedAt.toISOString(),
          }
        : undefined,
    };
  }

  private async checkCalendarAccess(calendarId: string, userId: string, minRole: 'viewer' | 'editor' = 'viewer') {
    const member = await this.calendarsRepo.getMemberRole(calendarId, userId);
    if (!member) throw new ForbiddenException('No access to this calendar');
    if (minRole === 'editor' && member.role === 'viewer') {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  async findAll(userId: string, start?: string, end?: string) {
    const events = await this.eventsRepo.findByUser(
      userId,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
    );
    return events.map((e) => this.mapEvent(e));
  }

  async findOne(userId: string, id: string) {
    const event = await this.eventsRepo.findById(id);
    if (!event) throw new NotFoundException('Event not found');
    await this.checkCalendarAccess(event.calendarId, userId);
    return this.mapEvent(event);
  }

  async create(userId: string, dto: CreateEventDto) {
    const calendarId = dto.calendarId?.trim()
      ? dto.calendarId
      : (await this.calendarsService.ensureDefaultCalendar(userId)).id;

    await this.checkCalendarAccess(calendarId, userId, 'editor');
    const event = await this.eventsRepo.create(userId, { ...dto, calendarId });
    const mapped = this.mapEvent(event);

    if (dto.participantIds?.length) {
      for (const participantId of dto.participantIds) {
        if (participantId !== userId) {
          await this.notificationsService.create({
            userId: participantId,
            type: 'event_invite',
            title: 'Convite para evento',
            message: `Foste convidado para "${event.title}"`,
            data: { eventId: event.id },
          });
          this.wsGateway.emitToUser(participantId, 'event_updated', mapped);
        }
      }
    }

    return mapped;
  }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    const existing = await this.eventsRepo.findById(id);
    if (!existing) throw new NotFoundException('Event not found');
    await this.checkCalendarAccess(existing.calendarId, userId, 'editor');

    const event = await this.eventsRepo.update(id, dto);
    const mapped = this.mapEvent(event);

    const notifyIds = event.participants?.map((p) => p.userId) ?? [];
    this.wsGateway.emitToUsers(notifyIds, 'event_updated', mapped);
    return mapped;
  }

  async remove(userId: string, id: string) {
    const existing = await this.eventsRepo.findById(id);
    if (!existing) throw new NotFoundException('Event not found');
    await this.checkCalendarAccess(existing.calendarId, userId, 'editor');
    await this.eventsRepo.delete(id);
  }

  async respondToInvite(userId: string, eventId: string, status: 'accepted' | 'declined') {
    const participant = await this.eventsRepo.updateParticipantStatus(eventId, userId, status);
    return {
      id: participant.id,
      eventId: participant.eventId,
      userId: participant.userId,
      status: participant.status as EventParticipant['status'],
      user: toUserDto(participant.user),
    };
  }

  async getPendingInvites(userId: string) {
    const invites = await this.eventsRepo.findPendingInvites(userId);
    return invites.map((inv) => ({
      id: inv.id,
      eventId: inv.eventId,
      userId: inv.userId,
      status: inv.status as EventParticipant['status'],
      event: this.mapEvent(inv.event),
    }));
  }

  private mapTask(task: {
    id: string;
    eventId: string | null;
    parentTaskId: string | null;
    ownerId: string;
    assigneeId: string | null;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: Date | null;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    assignee?: Parameters<typeof toUserDto>[0] | null;
    event?: { id: string; title: string } | null;
  }): Task {
    return {
      id: task.id,
      eventId: task.eventId,
      eventTitle: task.event?.title ?? null,
      parentTaskId: task.parentTaskId,
      ownerId: task.ownerId,
      assigneeId: task.assigneeId,
      title: task.title,
      description: task.description,
      status: task.status as Task['status'],
      priority: task.priority as Task['priority'],
      dueDate: task.dueDate?.toISOString() ?? null,
      position: task.position,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      assignee: task.assignee ? toUserDto(task.assignee) : undefined,
    };
  }

  private mapExpense(expense: {
    id: string;
    eventId: string | null;
    creatorId: string;
    paidById: string;
    settled: boolean;
    settledAt: Date | null;
    title: string;
    description: string | null;
    amount: number;
    currency: string;
    date: Date;
    createdAt: Date;
    updatedAt: Date;
    shares?: Array<{
      id: string;
      expenseId: string;
      userId: string;
      amountOwed: number;
      settled: boolean;
      settledAt: Date | null;
      user?: Parameters<typeof toUserDto>[0];
    }>;
    creator?: Parameters<typeof toUserDto>[0];
    paidBy?: Parameters<typeof toUserDto>[0];
    event?: { id: string; title: string } | null;
  }): Expense {
    return {
      id: expense.id,
      eventId: expense.eventId,
      creatorId: expense.creatorId,
      paidById: expense.paidById,
      settled: expense.settled,
      settledAt: expense.settledAt?.toISOString() ?? null,
      title: expense.title,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date.toISOString(),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
      shares: expense.shares?.map((s) => ({
        id: s.id,
        expenseId: s.expenseId,
        userId: s.userId,
        amountOwed: s.amountOwed,
        settled: s.settled,
        settledAt: s.settledAt?.toISOString() ?? null,
        user: s.user ? toUserDto(s.user) : undefined,
      })),
      creator: expense.creator ? toUserDto(expense.creator) : undefined,
      paidBy: expense.paidBy ? toUserDto(expense.paidBy) : undefined,
      eventTitle: expense.event?.title ?? null,
    };
  }

  private mapItem(item: {
    id: string;
    eventId: string;
    title: string;
    description: string | null;
    type: string;
    done: boolean;
    assigneeId: string | null;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    assignee?: Parameters<typeof toUserDto>[0] | null;
  }): EventItem {
    return {
      id: item.id,
      eventId: item.eventId,
      title: item.title,
      description: item.description,
      type: item.type as EventItem['type'],
      done: item.done,
      assigneeId: item.assigneeId,
      position: item.position,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      assignee: item.assignee ? toUserDto(item.assignee) : undefined,
    };
  }

  async getDetail(userId: string, id: string): Promise<EventDetail> {
    const event = await this.eventsRepo.findDetailById(id);
    if (!event) throw new NotFoundException('Event not found');
    await this.checkCalendarAccess(event.calendarId, userId);

    const flatTasks = event.tasks.map((t) => this.mapTask(t));
    const taskTree = buildTaskTree(flatTasks);
    const expenses = event.expenses.map((e) => this.mapExpense(e));
    const items = event.items.map((i) => this.mapItem(i));

    const allTasks = flatTasks;
    const tasksDone = allTasks.filter((t) => t.status === 'done').length;

    return {
      ...this.mapEvent(event),
      createdBy: event.createdBy ? toUserDto(event.createdBy) : undefined,
      tasks: taskTree,
      expenses,
      items,
      stats: {
        tasksTotal: allTasks.length,
        tasksDone,
        expensesTotal: expenses.reduce((sum, e) => sum + e.amount, 0),
        itemsTotal: items.length,
        itemsDone: items.filter((i) => i.done).length,
      },
    };
  }

  async addTask(userId: string, eventId: string, dto: CreateEventTaskDto) {
    const event = await this.eventsRepo.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    await this.checkCalendarAccess(event.calendarId, userId, 'editor');

    const maxPos = await this.tasksRepo.getMaxPosition(userId, dto.parentTaskId, eventId);
    const position = (maxPos._max.position ?? -1) + 1;

    const task = await this.tasksRepo.create(
      userId,
      {
        title: dto.title,
        description: dto.description,
        parentTaskId: dto.parentTaskId,
        assigneeId: dto.assigneeId,
        priority: dto.priority,
        dueDate: dto.dueDate,
      },
      position,
      { eventId },
    );

    return this.mapTask(task);
  }

  async addExpense(userId: string, eventId: string, dto: CreateExpenseDto) {
    const event = await this.eventsRepo.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    await this.checkCalendarAccess(event.calendarId, userId, 'editor');

    if (!validateShares(dto.amount, dto.shares)) {
      throw new BadRequestException('Share amounts must equal total expense amount');
    }

    const paidById = dto.paidById ?? userId;
    if (!dto.shares.some((s) => s.userId === paidById)) {
      throw new BadRequestException('Payer must be included in the expense split');
    }

    const expense = await this.expensesRepo.create(userId, dto, eventId);
    const mapped = this.mapExpense(expense);

    for (const share of dto.shares) {
      if (share.userId !== userId) {
        await this.notificationsService.create({
          userId: share.userId,
          type: 'expense_added',
          title: 'Nova despesa',
          message: `${expense.creator?.name ?? 'Alguém'} adicionou "${expense.title}"`,
          data: { expenseId: expense.id, eventId },
        });
        this.wsGateway.emitToUser(share.userId, 'expense_updated', mapped);
      }
    }

    return mapped;
  }

  async addItem(userId: string, eventId: string, dto: CreateEventItemDto) {
    const event = await this.eventsRepo.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    await this.checkCalendarAccess(event.calendarId, userId, 'editor');

    const maxPos = await this.eventsRepo.getItemMaxPosition(eventId);
    const position = (maxPos._max.position ?? -1) + 1;

    const itemType = dto.type ?? 'reminder';
    const item = await this.eventsRepo.createItem(eventId, {
      title: dto.title,
      description: dto.description,
      type: itemType,
      assigneeId: dto.assigneeId,
      position,
    });

    if (itemType === 'buy') {
      const section = await this.shoppingRepo.ensureEventsSection(userId);
      const maxPos = await this.shoppingRepo.getMaxPosition(section.id);
      const shopPosition = (maxPos._max.position ?? -1) + 1;
      await this.shoppingRepo.createFromEventItem(
        userId,
        section.id,
        item.id,
        item.title,
        shopPosition,
      );
    }

    return this.mapItem(item);
  }

  async updateItem(userId: string, eventId: string, itemId: string, dto: UpdateEventItemDto) {
    const event = await this.eventsRepo.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    await this.checkCalendarAccess(event.calendarId, userId, 'editor');

    const existing = await this.eventsRepo.findItemById(itemId);
    const item = await this.eventsRepo.updateItem(itemId, dto);

    if (existing?.type === 'buy' && dto.done !== undefined) {
      await this.shoppingRepo.syncDoneFromEventItem(itemId, dto.done);
    }

    return this.mapItem(item);
  }

  async removeItem(userId: string, eventId: string, itemId: string) {
    const event = await this.eventsRepo.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    await this.checkCalendarAccess(event.calendarId, userId, 'editor');
    await this.shoppingRepo.deleteByEventItemId(itemId);
    await this.eventsRepo.deleteItem(itemId);
  }
}
