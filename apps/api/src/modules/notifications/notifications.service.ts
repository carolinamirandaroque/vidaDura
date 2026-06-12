import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { NotificationsRepository } from './notifications.repository';
import { WebsocketGateway } from '../../infrastructure/websocket/websocket.gateway';
import type { Notification } from '@lifehub/types';

@Injectable()
export class NotificationsService {
  constructor(
    private notificationsRepo: NotificationsRepository,
    private wsGateway: WebsocketGateway,
  ) {}

  private mapNotification(n: {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data: unknown;
    read: boolean;
    createdAt: Date;
  }): Notification {
    return {
      id: n.id,
      userId: n.userId,
      type: n.type as Notification['type'],
      title: n.title,
      message: n.message,
      data: n.data as Record<string, unknown> | null,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    };
  }

  async findAll(userId: string, unreadOnly = false) {
    const notifications = await this.notificationsRepo.findByUser(userId, unreadOnly);
    return notifications.map((n) => this.mapNotification(n));
  }

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Prisma.InputJsonValue;
  }) {
    const notification = await this.notificationsRepo.create(data);
    const mapped = this.mapNotification(notification);
    this.wsGateway.emitToUser(data.userId, 'notification', mapped);
    return mapped;
  }

  async markAsRead(userId: string, id: string) {
    await this.notificationsRepo.markAsRead(id, userId);
  }

  async markAllAsRead(userId: string) {
    await this.notificationsRepo.markAllAsRead(userId);
  }

  async countUnread(userId: string) {
    return this.notificationsRepo.countUnread(userId);
  }

  async markEventInvitesRead(userId: string, eventId: string) {
    await this.notificationsRepo.markEventInvitesRead(userId, eventId);
    this.wsGateway.emitToUser(userId, 'notification', { eventId, read: true });
  }
}
