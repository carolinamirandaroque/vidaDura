import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class NotificationsRepository {
  constructor(private prisma: PrismaService) {}

  findByUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Prisma.InputJsonValue;
  }) {
    return this.prisma.notification.create({ data });
  }

  markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }
}
