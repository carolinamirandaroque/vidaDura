import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { buildTaskTree, collectVisibleEventTaskIds } from '@lifehub/utils';
import { TasksRepository } from './tasks.repository';
import { EventsRepository } from '../events/events.repository';
import { ConnectionsRepository } from '../connections/connections.repository';
import { WebsocketGateway } from '../../infrastructure/websocket/websocket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { toUserDto } from '../../common/mappers/user.mapper';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { Task, TaskFilters } from '@lifehub/types';

type TaskRecord = NonNullable<Awaited<ReturnType<TasksRepository['findById']>>>;

@Injectable()
export class TasksService {
  constructor(
    private tasksRepo: TasksRepository,
    private eventsRepo: EventsRepository,
    private connectionsRepo: ConnectionsRepository,
    private wsGateway: WebsocketGateway,
    private notificationsService: NotificationsService,
  ) {}

  private mapTask(task: TaskRecord): Task {
    return {
      id: task.id,
      eventId: task.eventId ?? null,
      eventTitle: task.event?.title ?? null,
      parentTaskId: task.parentTaskId,
      ownerId: task.ownerId,
      assigneeId: task.assigneeId ?? null,
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

  private async canModifyTask(userId: string, task: TaskRecord) {
    if (task.ownerId === userId || task.assigneeId === userId) return true;
    if (task.eventId) {
      return this.eventsRepo.isCollaborator(task.eventId, userId);
    }
    return false;
  }

  private async notifyTaskChange(
    task: TaskRecord,
    mapped: Task,
    actorId: string,
    previousAssigneeId?: string | null,
  ) {
    const recipientIds = new Set(
      [task.ownerId, task.assigneeId, previousAssigneeId].filter((id): id is string => Boolean(id)),
    );
    recipientIds.delete(actorId);
    for (const userId of recipientIds) {
      this.wsGateway.emitToUser(userId, 'task_updated', mapped);
    }

    if (
      mapped.assigneeId &&
      mapped.assigneeId !== actorId &&
      mapped.assigneeId !== previousAssigneeId
    ) {
      const eventTitle = task.event?.title;
      await this.notificationsService.create({
        userId: mapped.assigneeId,
        type: 'task_shared',
        title: 'Tarefa atribuída',
        message: eventTitle ? `"${mapped.title}" em ${eventTitle}` : `"${mapped.title}"`,
        data: { taskId: mapped.id, eventId: task.eventId },
      });
    }

    if (task.eventId) {
      const event = await this.eventsRepo.findById(task.eventId);
      if (event) {
        const collaboratorIds = [
          ...new Set([event.createdById, ...event.participants.map((p) => p.userId)]),
        ].filter((id) => id !== actorId);
        this.wsGateway.emitToUsers(collaboratorIds, 'event_updated', {
          eventId: task.eventId,
        });
      }
    }
  }

  private async validateAssignee(
    userId: string,
    assigneeId?: string | null,
    eventId?: string | null,
  ) {
    if (!assigneeId) return;
    if (assigneeId === userId) return;

    if (eventId) {
      const event = await this.eventsRepo.findById(eventId);
      if (event) {
        const collaboratorIds = [
          event.createdById,
          ...event.participants.map((participant) => participant.userId),
        ];
        if (collaboratorIds.includes(assigneeId)) return;
      }
    }

    const contacts = await this.connectionsRepo.findAcceptedContacts(userId);
    const allowed = contacts.some(
      (c) =>
        (c.requesterId === userId && c.receiverId === assigneeId) ||
        (c.receiverId === userId && c.requesterId === assigneeId),
    );

    if (!allowed) {
      throw new BadRequestException('Assignee must be you, an event participant, or an accepted contact');
    }
  }

  async ensureEventRootTask(event: { id: string; title: string; createdById: string }) {
    let root = await this.tasksRepo.findEventRootTask(event.id, event.title);
    if (root) {
      if (root.title !== event.title) {
        root = await this.tasksRepo.update(root.id, { title: event.title });
      }
      const rootId = root.id;
      const existing = await this.tasksRepo.findByEvent(event.id);
      for (const orphan of existing.filter(
        (task) => task.parentTaskId === null && task.id !== rootId,
      )) {
        await this.tasksRepo.update(orphan.id, { parentTaskId: rootId });
      }
      return root;
    }

    const existing = await this.tasksRepo.findByEvent(event.id);
    const orphans = existing.filter((task) => task.parentTaskId === null);

    root = await this.tasksRepo.create(
      event.createdById,
      { title: event.title, status: 'todo' },
      0,
      { eventId: event.id },
    );

    for (const orphan of orphans) {
      if (orphan.id !== root.id) {
        await this.tasksRepo.update(orphan.id, { parentTaskId: root.id });
      }
    }

    return root;
  }

  async findAll(userId: string, filters?: TaskFilters) {
    const tasks = await this.tasksRepo.findForUser(userId, filters);
    const byId = new Map(tasks.map((task) => [task.id, task]));

    const eventIds = [
      ...new Set(tasks.filter((task) => task.eventId).map((task) => task.eventId as string)),
    ];

    if (eventIds.length > 0) {
      const events = await this.eventsRepo.findByIds(eventIds);
      const collaboratorEventIds: string[] = [];

      for (const event of events) {
        const isCollaborator =
          event.createdById === userId ||
          event.participants.some((participant) => participant.userId === userId);
        if (!isCollaborator) continue;

        collaboratorEventIds.push(event.id);
      }

      if (collaboratorEventIds.length > 0) {
        const allEventTasks = await this.tasksRepo.findByEvents(collaboratorEventIds);
        const tasksByEvent = new Map<string, TaskRecord[]>();

        for (const task of allEventTasks) {
          if (!task.eventId) continue;
          const list = tasksByEvent.get(task.eventId) ?? [];
          list.push(task);
          tasksByEvent.set(task.eventId, list);
        }

        for (const eventId of collaboratorEventIds) {
          const eventTasks = tasksByEvent.get(eventId) ?? [];
          const visibleIds = collectVisibleEventTaskIds(eventTasks, userId);

          for (const task of eventTasks) {
            if (visibleIds.has(task.id) && !byId.has(task.id)) {
              tasks.push(task);
              byId.set(task.id, task);
            }
          }
        }
      }
    }

    const mapped = tasks.map((t) => this.mapTask(t));
    return buildTaskTree(mapped);
  }

  async findOne(userId: string, id: string) {
    const task = await this.tasksRepo.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (task.ownerId !== userId) throw new ForbiddenException('Not authorized');
    return this.mapTask(task);
  }

  async create(userId: string, dto: CreateTaskDto) {
    let parentEventId: string | null | undefined;
    if (dto.parentTaskId) {
      const parent = await this.tasksRepo.findById(dto.parentTaskId);
      if (!parent) throw new NotFoundException('Parent task not found');
      if (parent.ownerId !== userId) throw new ForbiddenException('Not authorized');
      parentEventId = parent.eventId;
    }

    await this.validateAssignee(userId, dto.assigneeId, parentEventId);

    const maxPos = await this.tasksRepo.getMaxPosition(userId, dto.parentTaskId);
    const position = (maxPos._max.position ?? -1) + 1;

    const task = await this.tasksRepo.create(userId, dto, position);
    const mapped = this.mapTask(task);
    await this.notifyTaskChange(task, mapped, userId);
    return mapped;
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const existing = await this.tasksRepo.findById(id);
    if (!existing) throw new NotFoundException('Task not found');
    if (!(await this.canModifyTask(userId, existing))) {
      throw new ForbiddenException('Not authorized');
    }

    if (dto.parentTaskId === id) throw new BadRequestException('Task cannot be its own parent');

    if (dto.assigneeId !== undefined) {
      await this.validateAssignee(userId, dto.assigneeId, existing.eventId);
    }

    const previousAssigneeId = existing.assigneeId;
    const task = await this.tasksRepo.update(id, dto);

    if (dto.assigneeId !== undefined && dto.assigneeId !== previousAssigneeId) {
      await this.tasksRepo.updateDescendantAssignees(id, dto.assigneeId);
    }

    const refreshed = await this.tasksRepo.findById(id);
    const mapped = this.mapTask(refreshed!);
    await this.notifyTaskChange(refreshed!, mapped, userId, previousAssigneeId);
    return mapped;
  }

  async remove(userId: string, id: string) {
    const existing = await this.tasksRepo.findById(id);
    if (!existing) throw new NotFoundException('Task not found');
    if (!(await this.canModifyTask(userId, existing))) {
      throw new ForbiddenException('Not authorized');
    }
    if (existing.eventId && !existing.parentTaskId) {
      throw new BadRequestException('Cannot delete the event root task');
    }
    await this.tasksRepo.delete(id);
    await this.notifyTaskChange(existing, { id, deleted: true } as unknown as Task, userId);
  }

  async reorder(
    userId: string,
    updates: { id: string; position: number; parentTaskId?: string | null }[],
  ) {
    for (const update of updates) {
      const task = await this.tasksRepo.findById(update.id);
      if (!task) throw new NotFoundException('Task not found');
      if (!(await this.canModifyTask(userId, task))) {
        throw new ForbiddenException('Not authorized');
      }
    }
    await this.tasksRepo.updatePositions(updates);
    return this.findAll(userId);
  }
}
