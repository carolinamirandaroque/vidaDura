import { Injectable } from '@nestjs/common';
import { ConnectionStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class ConnectionsRepository {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.connection.findUnique({
      where: { id },
      include: { requester: true, receiver: true },
    });
  }

  findBetweenUsers(userId1: string, userId2: string) {
    return this.prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId1, receiverId: userId2 },
          { requesterId: userId2, receiverId: userId1 },
        ],
      },
    });
  }

  findByUser(userId: string, status?: ConnectionStatus) {
    return this.prisma.connection.findMany({
      where: {
        OR: [{ requesterId: userId }, { receiverId: userId }],
        ...(status ? { status } : {}),
      },
      include: { requester: true, receiver: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(requesterId: string, receiverId: string) {
    return this.prisma.connection.create({
      data: { requesterId, receiverId },
      include: { requester: true, receiver: true },
    });
  }

  updateStatus(id: string, status: ConnectionStatus) {
    return this.prisma.connection.update({
      where: { id },
      data: { status },
      include: { requester: true, receiver: true },
    });
  }

  reopen(id: string, requesterId: string, receiverId: string) {
    return this.prisma.connection.update({
      where: { id },
      data: { requesterId, receiverId, status: 'pending' },
      include: { requester: true, receiver: true },
    });
  }

  delete(id: string) {
    return this.prisma.connection.delete({ where: { id } });
  }

  findAcceptedContacts(userId: string) {
    return this.prisma.connection.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: { requester: true, receiver: true },
    });
  }
}
