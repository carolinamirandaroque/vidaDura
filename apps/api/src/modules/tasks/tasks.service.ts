import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { buildTaskTree } from '@lifehub/utils';
import { TasksRepository } from './tasks.repository';
import { ConnectionsRepository } from '../connections/connections.repository';
import { WebsocketGateway } from '../../infrastructure/websocket/websocket.gateway';
import { toUserDto } from '../../common/mappers/user.mapper';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import type { Task, TaskFilters } from '@lifehub/types';

type TaskRecord = NonNullable<Awaited<ReturnType<TasksRepository['findById']>>>;

@Injectable()
export class TasksService {
  constructor(
    private tasksRepo: TasksRepository,
    private connectionsRepo: ConnectionsRepository,
    private wsGateway: WebsocketGateway,
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

  private async validateAssignee(userId: string, assigneeId?: string | null) {
    if (!assigneeId) return;
    if (assigneeId === userId) return;

    const contacts = await this.connectionsRepo.findAcceptedContacts(userId);
    const allowed = contacts.some(
      (c) =>
        (c.requesterId === userId && c.receiverId === assigneeId) ||
        (c.receiverId === userId && c.requesterId === assigneeId),
    );

    if (!allowed) {
      throw new BadRequestException('Assignee must be you or an accepted contact');
    }
  }

  async findAll(userId: string, filters?: TaskFilters) {
    const tasks = await this.tasksRepo.findForUser(userId, filters);
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
    if (dto.parentTaskId) {
      const parent = await this.tasksRepo.findById(dto.parentTaskId);
      if (!parent) throw new NotFoundException('Parent task not found');
      if (parent.ownerId !== userId) throw new ForbiddenException('Not authorized');
    }

    await this.validateAssignee(userId, dto.assigneeId);

    const maxPos = await this.tasksRepo.getMaxPosition(userId, dto.parentTaskId);
    const position = (maxPos._max.position ?? -1) + 1;

    const task = await this.tasksRepo.create(userId, dto, position);
    const mapped = this.mapTask(task);
    this.wsGateway.emitToUser(userId, 'task_updated', mapped);
    if (task.assigneeId && task.assigneeId !== userId) {
      this.wsGateway.emitToUser(task.assigneeId, 'task_updated', mapped);
    }
    return mapped;
  }

  async update(userId: string, id: string, dto: UpdateTaskDto) {
    const existing = await this.tasksRepo.findById(id);
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.ownerId !== userId) throw new ForbiddenException('Not authorized');

    if (dto.parentTaskId === id) throw new BadRequestException('Task cannot be its own parent');

    if (dto.assigneeId !== undefined) {
      await this.validateAssignee(userId, dto.assigneeId);
    }

    const task = await this.tasksRepo.update(id, dto);
    const mapped = this.mapTask(task);
    this.wsGateway.emitToUser(userId, 'task_updated', mapped);
    if (task.assigneeId && task.assigneeId !== userId) {
      this.wsGateway.emitToUser(task.assigneeId, 'task_updated', mapped);
    }
    return mapped;
  }

  async remove(userId: string, id: string) {
    const existing = await this.tasksRepo.findById(id);
    if (!existing) throw new NotFoundException('Task not found');
    if (existing.ownerId !== userId) throw new ForbiddenException('Not authorized');
    await this.tasksRepo.delete(id);
    this.wsGateway.emitToUser(userId, 'task_updated', { id, deleted: true });
  }

  async reorder(
    userId: string,
    updates: { id: string; position: number; parentTaskId?: string | null }[],
  ) {
    for (const update of updates) {
      const task = await this.tasksRepo.findById(update.id);
      if (!task || task.ownerId !== userId) throw new ForbiddenException('Not authorized');
    }
    await this.tasksRepo.updatePositions(updates);
    return this.findAll(userId);
  }
}
