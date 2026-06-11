import { Injectable } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const taskInclude = {
  assignee: true,
  event: { select: { id: true, title: true } },
} as const;

@Injectable()
export class TasksRepository {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });
  }

  findForUser(
    userId: string,
    filters?: { status?: TaskStatus; priority?: TaskPriority; search?: string },
  ) {
    return this.prisma.task.findMany({
      where: {
        AND: [
          { OR: [{ ownerId: userId }, { assigneeId: userId }] },
          ...(filters?.status ? [{ status: filters.status }] : []),
          ...(filters?.priority ? [{ priority: filters.priority }] : []),
          ...(filters?.search
            ? [
                {
                  OR: [
                    { title: { contains: filters.search, mode: 'insensitive' as const } },
                    { description: { contains: filters.search, mode: 'insensitive' as const } },
                  ],
                },
              ]
            : []),
        ],
      },
      include: taskInclude,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** @deprecated use findForUser */
  findByOwner(
    ownerId: string,
    filters?: { status?: TaskStatus; priority?: TaskPriority; search?: string },
  ) {
    return this.findForUser(ownerId, filters);
  }

  create(
    ownerId: string,
    dto: CreateTaskDto,
    position: number,
    extras?: { eventId?: string },
  ) {
    return this.prisma.task.create({
      data: {
        ownerId,
        eventId: extras?.eventId,
        assigneeId: dto.assigneeId,
        parentTaskId: dto.parentTaskId,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? 'todo',
        priority: dto.priority ?? 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        position,
      },
      include: taskInclude,
    });
  }

  findByEvent(eventId: string) {
    return this.prisma.task.findMany({
      where: { eventId },
      include: taskInclude,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  update(id: string, dto: UpdateTaskDto) {
    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId !== undefined ? dto.assigneeId : undefined,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : dto.dueDate === null ? null : undefined,
        parentTaskId: dto.parentTaskId,
        position: dto.position,
      },
      include: taskInclude,
    });
  }

  delete(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }

  countChildren(parentTaskId: string) {
    return this.prisma.task.count({ where: { parentTaskId } });
  }

  getMaxPosition(ownerId: string, parentTaskId?: string | null, eventId?: string | null) {
    return this.prisma.task.aggregate({
      where: {
        ownerId,
        parentTaskId: parentTaskId ?? null,
        eventId: eventId ?? null,
      },
      _max: { position: true },
    });
  }

  updatePositions(updates: { id: string; position: number; parentTaskId?: string | null }[]) {
    return this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.task.update({
          where: { id: u.id },
          data: { position: u.position, parentTaskId: u.parentTaskId },
        }),
      ),
    );
  }
}
