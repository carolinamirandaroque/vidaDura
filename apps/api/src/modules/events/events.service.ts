import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { advanceDeadlineDates, buildTaskTree, startOfDay, validateShares } from '@lifehub/utils';
import { CalendarsRepository } from '../calendars/calendars.repository';
import { CalendarsService } from '../calendars/calendars.service';
import { EventsRepository } from './events.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { TasksService } from '../tasks/tasks.service';
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
import { UpdateEventTaskDto } from './dto/update-event-task.dto';
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
    @Inject(forwardRef(() => TasksService))
    private tasksService: TasksService,
    private expensesRepo: ExpensesRepository,
    private shoppingRepo: ShoppingListRepository,
    private notificationsService: NotificationsService,
    private wsGateway: WebsocketGateway,
  ) {}

  mapEvent(event: {
    id: string;
    calendarId: string;
    kind?: string;
    type?: string;
    title: string;
    description: string | null;
    location: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    recurrence: string;
    recurrenceEnd: Date | null;
    deadlineStatus?: string | null;
    completedAt?: Date | null;
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
    recurrenceExceptions?: Array<{ occursOn: Date }>;
  }): Event {
    return {
      id: event.id,
      calendarId: event.calendarId,
      kind: (event.kind ?? 'appointment') as Event['kind'],
      type: (event.type ?? 'social') as Event['type'],
      title: event.title,
      description: event.description,
      location: event.location,
      locationLat: event.locationLat ?? null,
      locationLng: event.locationLng ?? null,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      allDay: event.allDay,
      recurrence: event.recurrence as Event['recurrence'],
      recurrenceEnd: event.recurrenceEnd?.toISOString() ?? null,
      recurrenceExceptions: event.recurrenceExceptions?.map((exception) =>
        exception.occursOn.toISOString(),
      ),
      deadlineStatus: (event.deadlineStatus as Event['deadlineStatus']) ?? null,
      completedAt: event.completedAt?.toISOString() ?? null,
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

  private async assertCanViewEvent(
    event: {
      id: string;
      calendarId: string;
      createdById: string;
      participants?: Array<{ userId: string; status?: string }>;
    },
    userId: string,
  ) {
    if (await this.eventsRepo.isDismissed(event.id, userId)) {
      throw new NotFoundException('Event not found');
    }
    const isCreator = event.createdById === userId;
    const isParticipant = event.participants?.some((p) => p.userId === userId);
    if (isCreator || isParticipant) return;
    await this.checkCalendarAccess(event.calendarId, userId);
  }

  private assertIsEventCollaborator(
    event: {
      createdById: string;
      participants?: Array<{ userId: string; status?: string }>;
    },
    userId: string,
  ) {
    const isCreator = event.createdById === userId;
    const isAcceptedParticipant = event.participants?.some(
      (p) => p.userId === userId && p.status === 'accepted',
    );
    if (!isCreator && !isAcceptedParticipant) {
      throw new ForbiddenException('Only event participants can modify this');
    }
  }

  private getEventCollaboratorIds(event: {
    createdById: string;
    participants?: Array<{ userId: string; status?: string }>;
  }) {
    return [
      ...new Set([
        event.createdById,
        ...(event.participants
          ?.filter((p) => p.status === 'accepted')
          .map((p) => p.userId) ?? []),
      ]),
    ];
  }

  private notifyEventHubUpdated(
    event: {
      id: string;
      createdById: string;
      participants?: Array<{ userId: string }>;
    },
    payload: { eventId: string },
  ) {
    this.wsGateway.emitToUsers(
      this.getEventCollaboratorIds(event),
      'event_updated',
      payload,
    );
  }

  private async notifyTaskUpdated(
    event: {
      id: string;
      title: string;
      createdById: string;
      participants?: Array<{ userId: string }>;
    },
    task: Task,
    actorId: string,
    previousAssigneeId?: string | null,
  ) {
    const recipientIds = new Set(
      [
        task.ownerId,
        task.assigneeId,
        previousAssigneeId,
        ...this.getEventCollaboratorIds(event),
      ].filter((id): id is string => Boolean(id)),
    );
    recipientIds.delete(actorId);
    for (const userId of recipientIds) {
      this.wsGateway.emitToUser(userId, 'task_updated', task);
    }

    if (
      task.assigneeId &&
      task.assigneeId !== actorId &&
      task.assigneeId !== previousAssigneeId
    ) {
      await this.notificationsService.create({
        userId: task.assigneeId,
        type: 'task_shared',
        title: 'Tarefa atribuída',
        message: `"${task.title}" em ${event.title}`,
        data: { taskId: task.id, eventId: event.id },
      });
    }

    this.notifyEventHubUpdated(event, { eventId: event.id });
  }

  private notifyShoppingListUsers(
    userIds: Array<string | null | undefined>,
    actorId: string,
  ) {
    const recipients = new Set(userIds.filter((id): id is string => Boolean(id)));
    recipients.delete(actorId);
    for (const userId of recipients) {
      this.wsGateway.emitToUser(userId, 'shopping_list_updated', { userId });
    }
  }

  private async loadEventForCollaboration(eventId: string, userId: string) {
    const event = await this.eventsRepo.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    await this.assertCanViewEvent(event, userId);
    this.assertIsEventCollaborator(event, userId);
    return event;
  }

  private validateEventAssignee(
    event: {
      createdById: string;
      participants?: Array<{ userId: string }>;
    },
    assigneeId?: string | null,
  ) {
    if (!assigneeId) return;
    const allowed = this.getEventCollaboratorIds(event);
    if (!allowed.includes(assigneeId)) {
      throw new BadRequestException('Assignee must be part of this event');
    }
  }

  private getEventSubtasks(
    flatTasks: Task[],
    rootId?: string,
  ): { subtasks: Task[]; rootId: string | null } {
    if (!rootId) {
      const root = flatTasks.find((task) => !task.parentTaskId);
      rootId = root?.id;
    }
    if (!rootId) {
      return { subtasks: flatTasks, rootId: null };
    }
    return {
      subtasks: flatTasks.filter((task) => task.id !== rootId),
      rootId,
    };
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
    await this.assertCanViewEvent(event, userId);
    return this.mapEvent(event);
  }

  async create(userId: string, dto: CreateEventDto) {
    const calendarId = dto.calendarId?.trim()
      ? dto.calendarId
      : (await this.calendarsService.ensureDefaultCalendar(userId)).id;

    await this.checkCalendarAccess(calendarId, userId, 'editor');
    const event = await this.eventsRepo.create(userId, { ...dto, calendarId });
    const mapped = this.mapEvent(event);

    if (dto.kind !== 'deadline' && dto.participantIds?.length) {
      for (const participantId of dto.participantIds) {
        if (participantId !== userId) {
          await this.notificationsService.create({
            userId: participantId,
            type: 'event_invite',
            title: 'Convite para evento',
            message: `Foste convidado para "${event.title}"`,
            data: { eventId: event.id },
          });
        }
      }
    }

    return mapped;
  }

  async completeDeadline(userId: string, id: string) {
    const existing = await this.eventsRepo.findById(id);
    if (!existing) throw new NotFoundException('Event not found');
    await this.assertCanViewEvent(existing, userId);

    if (existing.kind !== 'deadline') {
      throw new BadRequestException('Not a deadline reminder');
    }

    const now = new Date();

    if (existing.recurrence !== 'none') {
      const { startDate, endDate } = advanceDeadlineDates(
        existing.endDate,
        existing.recurrence as Event['recurrence'],
      );

      if (existing.recurrenceEnd && endDate > existing.recurrenceEnd) {
        const event = await this.eventsRepo.update(id, {
          deadlineStatus: 'done',
          completedAt: now.toISOString(),
        });
        const mapped = this.mapEvent(event);
        this.wsGateway.emitToUsers([existing.createdById], 'event_updated', mapped);
        return mapped;
      }

      const event = await this.eventsRepo.update(id, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        deadlineStatus: 'pending',
        completedAt: null,
      });
      const mapped = this.mapEvent(event);
      this.wsGateway.emitToUsers([existing.createdById], 'event_updated', mapped);
      return mapped;
    }

    const event = await this.eventsRepo.update(id, {
      deadlineStatus: 'done',
      completedAt: now.toISOString(),
    });
    const mapped = this.mapEvent(event);
    this.wsGateway.emitToUsers([existing.createdById], 'event_updated', mapped);
    return mapped;
  }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    const existing = await this.eventsRepo.findById(id);
    if (!existing) throw new NotFoundException('Event not found');
    const isCollaborator =
      existing.createdById === userId ||
      existing.participants?.some((p) => p.userId === userId && p.status === 'accepted');
    if (!isCollaborator) {
      await this.checkCalendarAccess(existing.calendarId, userId, 'editor');
    }

    if (dto.participantIds !== undefined && existing.createdById !== userId) {
      throw new ForbiddenException('Only the creator can change who has access');
    }

    const previousParticipantIds = new Set(
      existing.participants?.map((p) => p.userId) ?? [],
    );

    const event = await this.eventsRepo.update(id, dto);
    const mapped = this.mapEvent(event);

    if (dto.title && existing.title !== dto.title) {
      const root = await this.tasksRepo.findEventRootTask(id, existing.title);
      if (root) {
        await this.tasksRepo.update(root.id, { title: dto.title });
      }
    }

    if (dto.participantIds !== undefined) {
      const newParticipantIds = new Set(dto.participantIds);
      for (const prevId of previousParticipantIds) {
        if (!newParticipantIds.has(prevId)) {
          this.wsGateway.emitToUser(prevId, 'event_removed', { id });
          await this.notificationsService.create({
            userId: prevId,
            type: 'general',
            title: 'Removido do evento',
            message: `Já não tens acesso a "${event.title}"`,
            data: { eventId: event.id },
          });
        }
      }
      for (const participantId of dto.participantIds) {
        if (participantId !== userId && !previousParticipantIds.has(participantId)) {
          await this.notificationsService.create({
            userId: participantId,
            type: 'event_invite',
            title: 'Convite para evento',
            message: `Foste convidado para "${event.title}"`,
            data: { eventId: event.id },
          });
        }
      }
    }

    const notifyIds = [
      existing.createdById,
      ...(event.participants?.map((p) => p.userId) ?? []),
    ];
    this.wsGateway.emitToUsers([...new Set(notifyIds)], 'event_updated', mapped);
    return mapped;
  }

  async deleteEvent(userId: string, id: string) {
    const existing = await this.eventsRepo.findById(id);
    if (!existing) throw new NotFoundException('Event not found');
    this.assertIsEventCollaborator(existing, userId);

    const notifyIds = this.getEventCollaboratorIds(existing);
    await this.eventsRepo.delete(id);
    this.wsGateway.emitToUsers(notifyIds, 'event_deleted', { id });
  }

  async deleteRecurringOccurrence(userId: string, id: string, occursOn: string) {
    const existing = await this.eventsRepo.findById(id);
    if (!existing) throw new NotFoundException('Event not found');
    this.assertIsEventCollaborator(existing, userId);
    if (existing.recurrence === 'none') {
      throw new BadRequestException('Event does not repeat');
    }

    const occurrenceDate = startOfDay(new Date(occursOn));
    if (Number.isNaN(occurrenceDate.getTime())) {
      throw new BadRequestException('Invalid occurrence date');
    }

    await this.eventsRepo.addRecurrenceException(id, occurrenceDate);
    const updated = await this.eventsRepo.findById(id);
    const mapped = this.mapEvent(updated!);
    this.wsGateway.emitToUsers([existing.createdById], 'event_updated', mapped);
    return mapped;
  }

  async leaveEvent(userId: string, id: string) {
    const existing = await this.eventsRepo.findById(id);
    if (!existing) throw new NotFoundException('Event not found');
    await this.assertCanViewEvent(existing, userId);

    const isCreator = existing.createdById === userId;
    const isParticipant = existing.participants?.some((p) => p.userId === userId);

    if (!isCreator && !isParticipant) {
      throw new ForbiddenException('Only the creator or invited participants can leave this event');
    }

    const otherParticipantIds = (existing.participants ?? [])
      .map((p) => p.userId)
      .filter((uid) => uid !== userId);

    if (isCreator) {
      if (otherParticipantIds.length === 0) {
        await this.eventsRepo.delete(id);
        this.wsGateway.emitToUsers([], 'event_deleted', { id });
        return;
      }
      await this.eventsRepo.transferCreator(id, otherParticipantIds[0], userId);
    } else {
      await this.eventsRepo.removeParticipant(id, userId);
    }

    const notifyIds = [...new Set([existing.createdById, ...otherParticipantIds])].filter(
      (uid) => uid !== userId,
    );
    this.wsGateway.emitToUsers(notifyIds, 'event_updated', { id, leftBy: userId });
  }

  async respondToInvite(userId: string, eventId: string, status: 'accepted' | 'declined') {
    const existing = await this.eventsRepo.findById(eventId);
    if (!existing) throw new NotFoundException('Event not found');

    const invite = existing.participants?.find((p) => p.userId === userId);
    if (!invite || invite.status !== 'pending') {
      throw new BadRequestException('No pending invite for this event');
    }

    const participant = await this.eventsRepo.updateParticipantStatus(eventId, userId, status);
    const refreshed = await this.eventsRepo.findById(eventId);
    const mapped = this.mapEvent(refreshed!);
    await this.notificationsService.markEventInvitesRead(userId, eventId);

    if (status === 'accepted') {
      this.wsGateway.emitToUser(userId, 'event_updated', mapped);
      this.wsGateway.emitToUsers(this.getEventCollaboratorIds(refreshed!), 'event_updated', mapped);
    } else {
      this.wsGateway.emitToUser(userId, 'event_removed', { id: eventId });
      this.wsGateway.emitToUser(existing.createdById, 'event_updated', mapped);
    }

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
    await this.assertCanViewEvent(event, userId);

    const eventTasks =
      event.kind !== 'deadline'
        ? await this.tasksRepo.findByEvent(id)
        : event.tasks;
    const flatTasks = eventTasks.map((t) => this.mapTask(t));
    const { subtasks } = this.getEventSubtasks(flatTasks);
    const taskTree = buildTaskTree(subtasks);
    const expenses = event.expenses.map((e) => this.mapExpense(e));
    const items = event.items.filter((i) => i.type === 'buy').map((i) => this.mapItem(i));

    const allTasks = subtasks;
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
    const event = await this.loadEventForCollaboration(eventId, userId);
    this.validateEventAssignee(event, dto.assigneeId);

    const root = await this.tasksService.ensureEventRootTask(event);
    let parentTaskId = dto.parentTaskId ?? root.id;

    if (parentTaskId !== root.id) {
      const parent = await this.tasksRepo.findById(parentTaskId);
      if (!parent || parent.eventId !== eventId) {
        throw new BadRequestException('Parent task must belong to this event');
      }
    }

    const maxPos = await this.tasksRepo.getMaxPosition(userId, parentTaskId, eventId);
    const position = (maxPos._max.position ?? -1) + 1;

    const task = await this.tasksRepo.create(
      userId,
      {
        title: dto.title,
        description: dto.description,
        parentTaskId,
        assigneeId: dto.assigneeId,
        priority: dto.priority,
        dueDate: dto.dueDate,
      },
      position,
      { eventId },
    );

    const mapped = this.mapTask(task);
    await this.notifyTaskUpdated(event, mapped, userId);
    return mapped;
  }

  async updateTask(userId: string, eventId: string, taskId: string, dto: UpdateEventTaskDto) {
    const event = await this.loadEventForCollaboration(eventId, userId);
    const existing = await this.tasksRepo.findById(taskId);
    if (!existing || existing.eventId !== eventId) {
      throw new NotFoundException('Task not found');
    }
    if (dto.assigneeId !== undefined) {
      this.validateEventAssignee(event, dto.assigneeId);
    }

    const previousAssigneeId = existing.assigneeId;
    const task = await this.tasksRepo.update(taskId, {
      title: dto.title,
      status: dto.status,
      assigneeId: dto.assigneeId,
    });

    if (dto.assigneeId !== undefined && dto.assigneeId !== previousAssigneeId) {
      await this.tasksRepo.updateDescendantAssignees(taskId, dto.assigneeId);
    }

    const refreshed = await this.tasksRepo.findById(taskId);
    const mapped = this.mapTask(refreshed!);
    await this.notifyTaskUpdated(event, mapped, userId, previousAssigneeId);
    return mapped;
  }

  async removeTask(userId: string, eventId: string, taskId: string) {
    const event = await this.loadEventForCollaboration(eventId, userId);
    const existing = await this.tasksRepo.findById(taskId);
    if (!existing || existing.eventId !== eventId) {
      throw new NotFoundException('Task not found');
    }

    await this.tasksRepo.delete(taskId);
    await this.notifyTaskUpdated(event, { id: taskId, deleted: true } as unknown as Task, userId);
  }

  async addExpense(userId: string, eventId: string, dto: CreateExpenseDto) {
    const event = await this.loadEventForCollaboration(eventId, userId);

    if (!validateShares(dto.amount, dto.shares)) {
      throw new BadRequestException('Share amounts must equal total expense amount');
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
    const event = await this.loadEventForCollaboration(eventId, userId);
    this.validateEventAssignee(event, dto.assigneeId);

    const maxPos = await this.eventsRepo.getItemMaxPosition(eventId);
    const position = (maxPos._max.position ?? -1) + 1;

    const item = await this.eventsRepo.createItem(eventId, {
      title: dto.title,
      description: dto.description,
      type: 'buy',
      assigneeId: dto.assigneeId,
      position,
    });

    await this.syncEventItemShoppingList(item.id, item.assigneeId, userId, item.title, item.done);

    this.notifyShoppingListUsers([item.assigneeId, userId], userId);

    if (item.assigneeId && item.assigneeId !== userId) {
      await this.notificationsService.create({
        userId: item.assigneeId,
        type: 'general',
        title: 'Item de compras atribuído',
        message: `"${item.title}" em ${event.title}`,
        data: { eventId, itemId: item.id },
      });
    }

    this.notifyEventHubUpdated(event, { eventId });
    return this.mapItem(item);
  }

  private async syncEventItemShoppingList(
    eventItemId: string,
    assigneeId: string | null | undefined,
    actorId: string,
    title: string,
    done: boolean,
  ) {
    const shoppingItem = await this.shoppingRepo.findByEventItemId(eventItemId);
    const cleared = assigneeId == null || assigneeId === '';
    const fallbackOwnerId = cleared ? actorId : (shoppingItem?.ownerId ?? actorId);
    await this.shoppingRepo.syncAssigneeFromEventItem(
      eventItemId,
      assigneeId,
      fallbackOwnerId,
      title,
      done,
    );
  }

  async updateItem(userId: string, eventId: string, itemId: string, dto: UpdateEventItemDto) {
    const event = await this.loadEventForCollaboration(eventId, userId);
    const existing = await this.eventsRepo.findItemById(itemId);
    if (!existing || existing.eventId !== eventId) {
      throw new NotFoundException('Item not found');
    }
    if (dto.assigneeId !== undefined) {
      this.validateEventAssignee(event, dto.assigneeId);
    }

    const item = await this.eventsRepo.updateItem(itemId, {
      ...dto,
      type: dto.type ?? 'buy',
    });

    if (dto.done !== undefined) {
      await this.shoppingRepo.syncDoneFromEventItem(itemId, dto.done);
    }
    if (dto.title !== undefined) {
      await this.shoppingRepo.syncTitleFromEventItem(itemId, dto.title);
    }

    const previousAssigneeId = existing.assigneeId;
    const shoppingItem = await this.shoppingRepo.findByEventItemId(itemId);
    await this.syncEventItemShoppingList(itemId, item.assigneeId, userId, item.title, item.done);

    this.notifyShoppingListUsers(
      [item.assigneeId, previousAssigneeId, shoppingItem?.ownerId],
      userId,
    );

    if (
      dto.assigneeId !== undefined &&
      item.assigneeId &&
      item.assigneeId !== userId &&
      item.assigneeId !== previousAssigneeId
    ) {
      await this.notificationsService.create({
        userId: item.assigneeId,
        type: 'general',
        title: 'Item de compras atribuído',
        message: `"${item.title}" em ${event.title}`,
        data: { eventId, itemId: item.id },
      });
    }

    const mapped = this.mapItem(item);
    this.notifyEventHubUpdated(event, { eventId });
    return mapped;
  }

  async removeItem(userId: string, eventId: string, itemId: string) {
    const event = await this.loadEventForCollaboration(eventId, userId);
    const existing = await this.eventsRepo.findItemById(itemId);
    if (!existing || existing.eventId !== eventId) {
      throw new NotFoundException('Item not found');
    }
    await this.shoppingRepo.deleteByEventItemId(itemId);
    await this.eventsRepo.deleteItem(itemId);
    this.notifyEventHubUpdated(event, { eventId });
  }
}
