import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateShoppingItemDto } from './dto/create-shopping-item.dto';
import { UpdateShoppingItemDto } from './dto/update-shopping-item.dto';
import { CreateShoppingSectionDto } from './dto/create-shopping-section.dto';
import { UpdateShoppingSectionDto } from './dto/update-shopping-section.dto';

const sectionInclude = {
  owner: true,
  members: { include: { user: true } },
} as const;

const itemInclude = {
  section: { include: sectionInclude },
  eventItem: { include: { event: { select: { id: true, title: true } } } },
} as const;

@Injectable()
export class ShoppingListRepository {
  constructor(private prisma: PrismaService) {}

  private sectionWhereForUser(userId: string) {
    return {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    };
  }

  private itemWhereForUser(userId: string, done?: boolean) {
    return {
      OR: [
        {
          section: this.sectionWhereForUser(userId),
        },
        { sectionId: null, ownerId: userId },
      ],
      ...(done !== undefined ? { done } : {}),
    };
  }

  findSectionsForUser(userId: string) {
    return this.prisma.shoppingSection.findMany({
      where: this.sectionWhereForUser(userId),
      include: sectionInclude,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findSectionById(id: string) {
    return this.prisma.shoppingSection.findUnique({
      where: { id },
      include: sectionInclude,
    });
  }

  countOwnedSections(ownerId: string) {
    return this.prisma.shoppingSection.count({ where: { ownerId } });
  }

  createSection(
    ownerId: string,
    dto: CreateShoppingSectionDto,
    position: number,
    memberIds: string[] = [],
  ) {
    return this.prisma.shoppingSection.create({
      data: {
        ownerId,
        name: dto.name.trim(),
        position,
        members: {
          create: memberIds.map((userId) => ({ userId, role: 'editor' })),
        },
      },
      include: sectionInclude,
    });
  }

  updateSection(id: string, dto: UpdateShoppingSectionDto) {
    return this.prisma.shoppingSection.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        position: dto.position,
      },
      include: sectionInclude,
    });
  }

  async setSectionMembers(sectionId: string, memberIds: string[]) {
    await this.prisma.shoppingSectionMember.deleteMany({
      where: { sectionId },
    });
    if (memberIds.length) {
      await this.prisma.shoppingSectionMember.createMany({
        data: memberIds.map((userId) => ({
          sectionId,
          userId,
          role: 'editor' as const,
        })),
      });
    }
    return this.findSectionById(sectionId);
  }

  deleteSection(id: string) {
    return this.prisma.shoppingSection.delete({ where: { id } });
  }

  getOwnedSectionMaxPosition(ownerId: string) {
    return this.prisma.shoppingSection.aggregate({
      where: { ownerId },
      _max: { position: true },
    });
  }

  findItemById(id: string) {
    return this.prisma.shoppingListItem.findUnique({
      where: { id },
      include: itemInclude,
    });
  }

  findByUser(userId: string, done?: boolean) {
    return this.prisma.shoppingListItem.findMany({
      where: this.itemWhereForUser(userId, done),
      include: itemInclude,
      orderBy: [
        { section: { position: 'asc' } },
        { position: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  findPending(userId: string, limit?: number) {
    return this.prisma.shoppingListItem.findMany({
      where: this.itemWhereForUser(userId, false),
      include: itemInclude,
      orderBy: [
        { section: { position: 'asc' } },
        { position: 'asc' },
        { createdAt: 'asc' },
      ],
      ...(limit ? { take: limit } : {}),
    });
  }

  findPendingInSection(sectionId: string, title: string) {
    return this.prisma.shoppingListItem.findFirst({
      where: {
        sectionId,
        done: false,
        title: { equals: title.trim(), mode: 'insensitive' },
      },
      include: itemInclude,
    });
  }

  getMaxPosition(sectionId: string) {
    return this.prisma.shoppingListItem.aggregate({
      where: { sectionId, done: false },
      _max: { position: true },
    });
  }

  create(userId: string, dto: CreateShoppingItemDto, position: number) {
    const inStock = dto.inStock ?? false;
    return this.prisma.shoppingListItem.create({
      data: {
        ownerId: userId,
        sectionId: dto.sectionId,
        title: dto.title.trim(),
        position,
        done: inStock,
        boughtAt: inStock ? new Date() : null,
      },
      include: itemInclude,
    });
  }

  update(id: string, dto: UpdateShoppingItemDto) {
    return this.prisma.shoppingListItem.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        done: dto.done,
        sectionId: dto.sectionId,
        boughtAt: dto.done === true ? new Date() : dto.done === false ? null : undefined,
      },
      include: itemInclude,
    });
  }

  delete(id: string) {
    return this.prisma.shoppingListItem.delete({ where: { id } });
  }

  findEventsSection(ownerId: string) {
    return this.prisma.shoppingSection.findFirst({
      where: { ownerId, name: 'Eventos' },
    });
  }

  async ensureEventsSection(ownerId: string) {
    const existing = await this.findEventsSection(ownerId);
    if (existing) return existing;

    const maxPos = await this.getOwnedSectionMaxPosition(ownerId);
    return this.prisma.shoppingSection.create({
      data: {
        ownerId,
        name: 'Eventos',
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
  }

  createFromEventItem(
    ownerId: string,
    sectionId: string,
    eventItemId: string,
    title: string,
    position: number,
  ) {
    return this.prisma.shoppingListItem.create({
      data: {
        ownerId,
        sectionId,
        eventItemId,
        title: title.trim(),
        position,
        done: false,
      },
      include: itemInclude,
    });
  }

  syncDoneFromEventItem(eventItemId: string, done: boolean) {
    return this.prisma.shoppingListItem.updateMany({
      where: { eventItemId },
      data: { done, boughtAt: done ? new Date() : null },
    });
  }

  syncEventItemDone(eventItemId: string, done: boolean) {
    return this.prisma.eventItem.update({
      where: { id: eventItemId },
      data: { done },
    });
  }

  deleteByEventItemId(eventItemId: string) {
    return this.prisma.shoppingListItem.deleteMany({ where: { eventItemId } });
  }
}
