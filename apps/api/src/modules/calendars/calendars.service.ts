import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CalendarRole } from '@prisma/client';
import { CalendarsRepository } from './calendars.repository';
import { CreateCalendarDto } from './dto/create-calendar.dto';
import { UpdateCalendarDto } from './dto/update-calendar.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { toUserDto } from '../../common/mappers/user.mapper';
import type { Calendar, CalendarMember } from '@lifehub/types';

@Injectable()
export class CalendarsService {
  constructor(private calendarsRepo: CalendarsRepository) {}

  private mapCalendar(cal: {
    id: string;
    name: string;
    color: string;
    description: string | null;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    members?: Array<{
      id: string;
      calendarId: string;
      userId: string;
      role: string;
      user?: Parameters<typeof toUserDto>[0];
    }>;
  }): Calendar & { members?: CalendarMember[] } {
    return {
      id: cal.id,
      name: cal.name,
      color: cal.color,
      description: cal.description,
      ownerId: cal.ownerId,
      createdAt: cal.createdAt.toISOString(),
      updatedAt: cal.updatedAt.toISOString(),
      members: cal.members?.map((m) => ({
        id: m.id,
        calendarId: m.calendarId,
        userId: m.userId,
        role: m.role as CalendarMember['role'],
        user: m.user ? toUserDto(m.user) : undefined,
      })),
    };
  }

  private async checkAccess(calendarId: string, userId: string, minRole: CalendarRole = 'viewer') {
    const member = await this.calendarsRepo.getMemberRole(calendarId, userId);
    if (!member) throw new ForbiddenException('No access to this calendar');

    const roleHierarchy: Record<CalendarRole, number> = { viewer: 0, editor: 1, owner: 2 };
    if (roleHierarchy[member.role] < roleHierarchy[minRole]) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return member;
  }

  async ensureDefaultCalendar(userId: string) {
    const calendars = await this.calendarsRepo.findByUser(userId);
    if (calendars.length) return this.mapCalendar(calendars[0]);

    const calendar = await this.calendarsRepo.create(userId, {
      name: 'Pessoal',
      color: '#6366f1',
      description: 'Calendário pessoal',
    });
    return this.mapCalendar(calendar);
  }

  async findAll(userId: string) {
    await this.ensureDefaultCalendar(userId);
    const calendars = await this.calendarsRepo.findByUser(userId);
    return calendars.map((c) => this.mapCalendar(c));
  }

  async findOne(userId: string, id: string) {
    await this.checkAccess(id, userId);
    const calendar = await this.calendarsRepo.findById(id);
    if (!calendar) throw new NotFoundException('Calendar not found');
    return this.mapCalendar(calendar);
  }

  async create(userId: string, dto: CreateCalendarDto) {
    const calendar = await this.calendarsRepo.create(userId, dto);
    return this.mapCalendar(calendar);
  }

  async update(userId: string, id: string, dto: UpdateCalendarDto) {
    await this.checkAccess(id, userId, 'editor');
    const calendar = await this.calendarsRepo.update(id, dto);
    return this.mapCalendar(calendar);
  }

  async remove(userId: string, id: string) {
    await this.checkAccess(id, userId, 'owner');
    await this.calendarsRepo.delete(id);
  }

  async addMember(userId: string, calendarId: string, dto: AddMemberDto) {
    await this.checkAccess(calendarId, userId, 'owner');
    const member = await this.calendarsRepo.addMember(calendarId, dto.userId, dto.role);
    return {
      id: member.id,
      calendarId: member.calendarId,
      userId: member.userId,
      role: member.role as CalendarMember['role'],
      user: toUserDto(member.user),
    };
  }

  async removeMember(userId: string, calendarId: string, memberUserId: string) {
    await this.checkAccess(calendarId, userId, 'owner');
    await this.calendarsRepo.removeMember(calendarId, memberUserId);
  }
}
