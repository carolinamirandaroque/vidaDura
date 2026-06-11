import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConnectionsRepository } from './connections.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { WebsocketGateway } from '../../infrastructure/websocket/websocket.gateway';
import { toUserDto } from '../../common/mappers/user.mapper';
import type { Connection, ConnectionWithUser } from '@lifehub/types';

@Injectable()
export class ConnectionsService {
  constructor(
    private connectionsRepo: ConnectionsRepository,
    private notificationsService: NotificationsService,
    private wsGateway: WebsocketGateway,
  ) {}

  private mapConnection(conn: {
    id: string;
    requesterId: string;
    receiverId: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    requester?: { id: string; name: string; email: string; avatar: string | null; timezone: string; createdAt: Date };
    receiver?: { id: string; name: string; email: string; avatar: string | null; timezone: string; createdAt: Date };
  }): Connection {
    return {
      id: conn.id,
      requesterId: conn.requesterId,
      receiverId: conn.receiverId,
      status: conn.status as Connection['status'],
      createdAt: conn.createdAt.toISOString(),
      updatedAt: conn.updatedAt.toISOString(),
      requester: conn.requester ? toUserDto(conn.requester as Parameters<typeof toUserDto>[0]) : undefined,
      receiver: conn.receiver ? toUserDto(conn.receiver as Parameters<typeof toUserDto>[0]) : undefined,
    };
  }

  async sendRequest(requesterId: string, receiverId: string): Promise<Connection> {
    if (requesterId === receiverId) throw new BadRequestException('Cannot connect with yourself');

    const existing = await this.connectionsRepo.findBetweenUsers(requesterId, receiverId);
    let connection: Awaited<ReturnType<ConnectionsRepository['create']>> | undefined;
    if (existing) {
      if (existing.status === 'accepted') throw new ConflictException('Already connected');
      if (existing.status === 'pending') throw new ConflictException('Request already pending');
      connection = await this.connectionsRepo.reopen(existing.id, requesterId, receiverId);
    }

    if (!connection) {
      try {
        connection = await this.connectionsRepo.create(requesterId, receiverId);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const retry = await this.connectionsRepo.findBetweenUsers(requesterId, receiverId);
          if (!retry) throw new ConflictException('Request already pending');
          if (retry.status === 'pending') throw new ConflictException('Request already pending');
          connection = await this.connectionsRepo.reopen(retry.id, requesterId, receiverId);
        } else if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2003'
        ) {
          throw new BadRequestException('User not found — try logging out and back in');
        } else {
          throw error;
        }
      }
    }
    const mapped = this.mapConnection(connection);

    await this.notificationsService.create({
      userId: receiverId,
      type: 'connection_request',
      title: 'Novo pedido de contacto',
      message: `${connection.requester.name} enviou-te um pedido de contacto`,
      data: { connectionId: connection.id, requesterId },
    });

    this.wsGateway.emitToUser(receiverId, 'connection_updated', mapped);
    return mapped;
  }

  async acceptRequest(userId: string, connectionId: string): Promise<Connection> {
    const connection = await this.connectionsRepo.findById(connectionId);
    if (!connection) throw new NotFoundException('Connection not found');
    if (connection.receiverId !== userId) throw new ForbiddenException('Not authorized');
    if (connection.status !== 'pending') throw new BadRequestException('Request is not pending');

    const updated = await this.connectionsRepo.updateStatus(connectionId, 'accepted');
    const mapped = this.mapConnection(updated);
    this.wsGateway.emitToUser(connection.requesterId, 'connection_updated', mapped);
    return mapped;
  }

  async rejectRequest(userId: string, connectionId: string): Promise<Connection> {
    const connection = await this.connectionsRepo.findById(connectionId);
    if (!connection) throw new NotFoundException('Connection not found');
    if (connection.receiverId !== userId) throw new ForbiddenException('Not authorized');

    const updated = await this.connectionsRepo.updateStatus(connectionId, 'rejected');
    return this.mapConnection(updated);
  }

  async removeConnection(userId: string, connectionId: string): Promise<void> {
    const connection = await this.connectionsRepo.findById(connectionId);
    if (!connection) throw new NotFoundException('Connection not found');
    if (connection.requesterId !== userId && connection.receiverId !== userId) {
      throw new ForbiddenException('Not authorized');
    }
    await this.connectionsRepo.delete(connectionId);
  }

  async getConnections(userId: string, status?: string): Promise<ConnectionWithUser[]> {
    const connections = await this.connectionsRepo.findByUser(
      userId,
      status as 'pending' | 'accepted' | 'rejected' | undefined,
    );

    return connections.map((conn) => {
      const otherUser = conn.requesterId === userId ? conn.receiver : conn.requester;
      return {
        ...this.mapConnection(conn),
        user: toUserDto(otherUser),
      };
    });
  }

  async getContacts(userId: string): Promise<ConnectionWithUser[]> {
    return this.getConnections(userId, 'accepted');
  }
}
