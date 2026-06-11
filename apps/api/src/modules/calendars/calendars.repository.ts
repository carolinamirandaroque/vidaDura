import { Injectable } from '@nestjs/common';
import { CalendarRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';

@Injectable()
export class CalendarsRepository {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.calendar.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });
  }

  findByUser(userId: string) {
    return this.prisma.calendar.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: { members: { include: { user: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(ownerId: string, dto: CreateCalendarDto) {
    return this.prisma.calendar.create({
      data: {
        name: dto.name,
        color: dto.color ?? '#6366f1',
        description: dto.description,
        ownerId,
        members: { create: { userId: ownerId, role: 'owner' } },
      },
      include: { members: { include: { user: true } } },
    });
  }

  update(id: string, dto: UpdateCalendarDto) {
    return this.prisma.calendar.update({
      where: { id },
      data: dto,
      include: { members: { include: { user: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.calendar.delete({ where: { id } });
  }

  addMember(calendarId: string, userId: string, role: CalendarRole) {
    return this.prisma.calendarMember.create({
      data: { calendarId, userId, role },
      include: { user: true },
    });
  }

  removeMember(calendarId: string, userId: string) {
    return this.prisma.calendarMember.delete({
      where: { calendarId_userId: { calendarId, userId } },
    });
  }

  getMemberRole(calendarId: string, userId: string) {
    return this.prisma.calendarMember.findUnique({
      where: { calendarId_userId: { calendarId, userId } },
    });
  }
}
