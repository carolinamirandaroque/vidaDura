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
  eventItem: {
    include: {
      event: { select: { id: true, title: true } },
      assignee: true,
    },
  },
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
      AND: [
        {
          OR: [
            { section: this.sectionWhereForUser(userId) },
            { sectionId: null, ownerId: userId },
          ],
        },
        {
          NOT: {
            eventItem: {
              is: {
                assigneeId: { not: null },
                NOT: { assigneeId: userId },
              },
            },
          },
        },
        ...(done !== undefined ? [{ done }] : []),
      ],
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
        hidden: dto.hidden,
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
        position: dto.position,
        boughtAt: dto.done === true ? new Date() : dto.done === false ? null : undefined,
      },
      include: itemInclude,
    });
  }

  updatePositions(updates: { id: string; position: number }[]) {
    return this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.shoppingListItem.update({
          where: { id: update.id },
          data: { position: update.position },
        }),
      ),
    );
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

  findByEventItemId(eventItemId: string) {
    return this.prisma.shoppingListItem.findUnique({
      where: { eventItemId },
      include: itemInclude,
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

  async syncAssigneeFromEventItem(
    eventItemId: string,
    assigneeId: string | null | undefined,
    fallbackOwnerId: string,
    title: string,
    done: boolean,
  ) {
    const listOwnerId = assigneeId != null && assigneeId !== '' ? assigneeId : fallbackOwnerId;
    const section = await this.ensureEventsSection(listOwnerId);
    const existing = await this.findByEventItemId(eventItemId);

    if (existing) {
      const movedSection = existing.sectionId !== section.id;
      const maxPos = movedSection ? await this.getMaxPosition(section.id) : null;
      return this.prisma.shoppingListItem.update({
        where: { id: existing.id },
        data: {
          ownerId: listOwnerId,
          sectionId: section.id,
          title: title.trim(),
          done,
          boughtAt: done ? existing.boughtAt ?? new Date() : null,
          ...(movedSection
            ? { position: (maxPos!._max.position ?? -1) + 1 }
            : {}),
        },
        include: itemInclude,
      });
    }

    const maxPos = await this.getMaxPosition(section.id);
    return this.createFromEventItem(
      listOwnerId,
      section.id,
      eventItemId,
      title,
      (maxPos._max.position ?? -1) + 1,
    );
  }

  syncDoneFromEventItem(eventItemId: string, done: boolean) {
    return this.prisma.shoppingListItem.updateMany({
      where: { eventItemId },
      data: { done, boughtAt: done ? new Date() : null },
    });
  }

  syncTitleFromEventItem(eventItemId: string, title: string) {
    return this.prisma.shoppingListItem.updateMany({
      where: { eventItemId },
      data: { title: title.trim() },
    });
  }

  syncEventItemDone(eventItemId: string, done: boolean) {
    return this.prisma.eventItem.update({
      where: { id: eventItemId },
      data: { done },
    });
  }

  syncEventItemTitle(eventItemId: string, title: string) {
    return this.prisma.eventItem.update({
      where: { id: eventItemId },
      data: { title: title.trim() },
    });
  }

  deleteByEventItemId(eventItemId: string) {
    return this.prisma.shoppingListItem.deleteMany({ where: { eventItemId } });
  }

  async repairMisplacedEventItems() {
    const linked = await this.prisma.shoppingListItem.findMany({
      where: { eventItemId: { not: null } },
      include: {
        eventItem: { select: { assigneeId: true, title: true, done: true } },
      },
    });

    for (const row of linked) {
      if (!row.eventItemId || !row.eventItem) continue;
      const assigneeId = row.eventItem.assigneeId;
      const targetOwnerId =
        assigneeId != null && assigneeId !== '' ? assigneeId : row.ownerId;
      const section = await this.ensureEventsSection(targetOwnerId);
      if (row.ownerId !== targetOwnerId || row.sectionId !== section.id) {
        await this.syncAssigneeFromEventItem(
          row.eventItemId,
          assigneeId,
          row.ownerId,
          row.eventItem.title ?? row.title,
          row.eventItem.done ?? row.done,
        );
      }
    }
  }
}
