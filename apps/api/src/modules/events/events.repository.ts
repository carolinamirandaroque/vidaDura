import { RecurrenceType } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsRepository {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        participants: { include: { user: true } },
        calendar: true,
        recurrenceExceptions: { orderBy: { occursOn: 'asc' } },
      },
    });
  }

  findByIds(ids: string[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.prisma.event.findMany({
      where: { id: { in: ids } },
      include: {
        participants: { select: { userId: true } },
      },
    });
  }

  findDetailById(id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: true,
        participants: { include: { user: true } },
        calendar: true,
        recurrenceExceptions: { orderBy: { occursOn: 'asc' } },
        tasks: {
          include: { assignee: true, event: { select: { id: true, title: true } } },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        },
        expenses: {
          include: {
            shares: { include: { user: true } },
            creator: true,
            paidBy: true,
            event: { select: { id: true, title: true } },
          },
          orderBy: { date: 'desc' },
        },
        items: {
          include: { assignee: true },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
  }

  findByCalendar(calendarId: string, start?: Date, end?: Date) {
    return this.prisma.event.findMany({
      where: {
        calendarId,
        ...(start && end
          ? { startDate: { lte: end }, endDate: { gte: start } }
          : {}),
      },
      include: { participants: { include: { user: true } } },
      orderBy: { startDate: 'asc' },
    });
  }

  findByUser(userId: string, start?: Date, end?: Date) {
    return this.prisma.event.findMany({
      where: {
        dismissals: { none: { userId } },
        AND: [
          {
            OR: [
              { createdById: userId },
              { participants: { some: { userId } } },
              { calendar: { members: { some: { userId } } } },
            ],
          },
          ...(start && end
            ? [
                {
                  OR: [
                    { startDate: { lte: end }, endDate: { gte: start } },
                    {
                      recurrence: { not: RecurrenceType.none },
                      startDate: { lte: end },
                      OR: [{ recurrenceEnd: null }, { recurrenceEnd: { gte: start } }],
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      include: {
        participants: { include: { user: true } },
        calendar: true,
        recurrenceExceptions: { orderBy: { occursOn: 'asc' } },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  addRecurrenceException(eventId: string, occursOn: Date) {
    return this.prisma.eventRecurrenceException.upsert({
      where: { eventId_occursOn: { eventId, occursOn } },
      create: { eventId, occursOn },
      update: {},
    });
  }

  create(createdById: string, dto: CreateEventDto) {
    const isDeadline = dto.kind === 'deadline';
    return this.prisma.event.create({
      data: {
        calendarId: dto.calendarId,
        kind: dto.kind ?? 'appointment',
        type: dto.type ?? (isDeadline ? 'other' : 'social'),
        title: dto.title,
        description: dto.description,
        location: dto.location,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        allDay: isDeadline ? true : (dto.allDay ?? false),
        recurrence: dto.recurrence ?? 'none',
        recurrenceEnd: dto.recurrenceEnd ? new Date(dto.recurrenceEnd) : null,
        deadlineStatus: isDeadline ? 'pending' : null,
        createdById,
        participants: dto.participantIds?.length
          ? {
              create: dto.participantIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        participants: { include: { user: true } },
        calendar: true,
      },
    });
  }

  update(id: string, dto: UpdateEventDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.participantIds) {
        await tx.eventParticipant.deleteMany({ where: { eventId: id } });
        if (dto.participantIds.length) {
          await tx.eventParticipant.createMany({
            data: dto.participantIds.map((userId) => ({ eventId: id, userId })),
          });
        }
      }

      return tx.event.update({
        where: { id },
        data: {
          kind: dto.kind,
          type: dto.type,
          title: dto.title,
          description: dto.description,
          location: dto.location,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          allDay: dto.allDay,
          recurrence: dto.recurrence,
          recurrenceEnd:
            dto.recurrence === 'none'
              ? null
              : dto.recurrenceEnd === undefined
                ? undefined
                : dto.recurrenceEnd
                  ? new Date(dto.recurrenceEnd)
                  : null,
          deadlineStatus: dto.deadlineStatus,
          completedAt:
            dto.completedAt === undefined
              ? undefined
              : dto.completedAt
                ? new Date(dto.completedAt)
                : null,
        },
        include: {
          participants: { include: { user: true } },
          calendar: true,
        },
      });
    });
  }

  delete(id: string) {
    return this.prisma.event.delete({ where: { id } });
  }

  isDismissed(eventId: string, userId: string) {
    return this.prisma.eventDismissal.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
  }

  dismissForUser(eventId: string, userId: string) {
    return this.prisma.eventDismissal.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId },
      update: {},
    });
  }

  removeParticipant(eventId: string, userId: string) {
    return this.prisma.eventParticipant.deleteMany({
      where: { eventId, userId },
    });
  }

  transferCreator(eventId: string, newCreatorId: string, previousCreatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: eventId },
        data: { createdById: newCreatorId },
      });
      await tx.eventParticipant.deleteMany({
        where: { eventId, userId: newCreatorId },
      });
      await tx.eventDismissal.upsert({
        where: { eventId_userId: { eventId, userId: previousCreatorId } },
        create: { eventId, userId: previousCreatorId },
        update: {},
      });
    });
  }

  updateParticipantStatus(eventId: string, userId: string, status: 'accepted' | 'declined') {
    return this.prisma.eventParticipant.update({
      where: { eventId_userId: { eventId, userId } },
      data: { status },
      include: { user: true, event: true },
    });
  }

  findItemById(id: string) {
    return this.prisma.eventItem.findUnique({ where: { id } });
  }

  createItem(eventId: string, data: {
    title: string;
    description?: string;
    type?: 'buy' | 'bring' | 'reminder';
    assigneeId?: string;
    position: number;
  }) {
    return this.prisma.eventItem.create({
      data: { eventId, ...data },
      include: { assignee: true },
    });
  }

  updateItem(id: string, data: {
    title?: string;
    description?: string;
    type?: 'buy' | 'bring' | 'reminder';
    done?: boolean;
    assigneeId?: string | null;
  }) {
    return this.prisma.eventItem.update({
      where: { id },
      data,
      include: { assignee: true },
    });
  }

  deleteItem(id: string) {
    return this.prisma.eventItem.delete({ where: { id } });
  }

  getItemMaxPosition(eventId: string) {
    return this.prisma.eventItem.aggregate({
      where: { eventId },
      _max: { position: true },
    });
  }

  findPendingInvites(userId: string) {
    return this.prisma.eventParticipant.findMany({
      where: { userId, status: 'pending' },
      include: { event: { include: { calendar: true } }, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isCollaborator(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        createdById: true,
        participants: { select: { userId: true } },
      },
    });
    if (!event) return false;
    return (
      event.createdById === userId ||
      event.participants.some((participant) => participant.userId === userId)
    );
  }
}
