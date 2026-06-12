import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ShoppingListRepository } from './shopping-list.repository';
import { ConnectionsRepository } from '../connections/connections.repository';
import { CreateShoppingItemDto } from './dto/create-shopping-item.dto';
import { UpdateShoppingItemDto } from './dto/update-shopping-item.dto';
import { CreateShoppingSectionDto } from './dto/create-shopping-section.dto';
import { UpdateShoppingSectionDto } from './dto/update-shopping-section.dto';
import { toUserDto } from '../../common/mappers/user.mapper';
import type { ShoppingListItem, ShoppingSection, ShoppingSectionMember } from '@lifehub/types';

@Injectable()
export class ShoppingListService {
  constructor(
    private repo: ShoppingListRepository,
    private connectionsRepo: ConnectionsRepository,
  ) {}

  private mapMember(member: {
    id: string;
    sectionId: string;
    userId: string;
    role: string;
    createdAt: Date;
    user?: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      timezone: string;
      createdAt: Date;
    };
  }): ShoppingSectionMember {
    return {
      id: member.id,
      sectionId: member.sectionId,
      userId: member.userId,
      role: member.role as ShoppingSectionMember['role'],
      createdAt: member.createdAt.toISOString(),
      user: member.user ? toUserDto(member.user as Parameters<typeof toUserDto>[0]) : undefined,
    };
  }

  private mapSection(section: {
    id: string;
    ownerId: string;
    name: string;
    position: number;
    hidden?: boolean;
    createdAt: Date;
    updatedAt: Date;
    owner?: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
      timezone: string;
      createdAt: Date;
    };
    members?: Array<{
      id: string;
      sectionId: string;
      userId: string;
      role: string;
      createdAt: Date;
      user?: {
        id: string;
        name: string;
        email: string;
        avatar: string | null;
        timezone: string;
        createdAt: Date;
      };
    }>;
  }): ShoppingSection {
    const members = section.members?.map((m) => this.mapMember(m)) ?? [];
    return {
      id: section.id,
      ownerId: section.ownerId,
      name: section.name,
      position: section.position,
      hidden: section.hidden ?? false,
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString(),
      isShared: members.length > 0,
      owner: section.owner
        ? toUserDto(section.owner as Parameters<typeof toUserDto>[0])
        : undefined,
      members,
    };
  }

  private mapItem(item: {
    id: string;
    ownerId: string;
    sectionId: string | null;
    eventItemId?: string | null;
    title: string;
    done: boolean;
    boughtAt: Date | null;
    position: number;
    createdAt: Date;
    updatedAt: Date;
    section?: Parameters<ShoppingListService['mapSection']>[0] | null;
    eventItem?: {
      eventId: string;
      assigneeId: string | null;
      assignee?: Parameters<typeof toUserDto>[0] | null;
      event?: { id: string; title: string } | null;
    } | null;
  }): ShoppingListItem {
    return {
      id: item.id,
      ownerId: item.ownerId,
      sectionId: item.sectionId,
      eventItemId: item.eventItemId ?? null,
      eventId: item.eventItem?.eventId ?? item.eventItem?.event?.id ?? null,
      eventTitle: item.eventItem?.event?.title ?? null,
      assigneeId: item.eventItem?.assigneeId ?? null,
      assignee: item.eventItem?.assignee
        ? toUserDto(item.eventItem.assignee as Parameters<typeof toUserDto>[0])
        : undefined,
      title: item.title,
      done: item.done,
      boughtAt: item.boughtAt?.toISOString() ?? null,
      position: item.position,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      section: item.section ? this.mapSection(item.section) : undefined,
    };
  }

  private async validateContactIds(userId: string, memberIds: string[]) {
    const unique = [...new Set(memberIds.filter((id) => id !== userId))];
    if (!unique.length) return [];

    const contacts = await this.connectionsRepo.findAcceptedContacts(userId);
    const contactIds = new Set(
      contacts.map((c) => (c.requesterId === userId ? c.receiverId : c.requesterId)),
    );

    for (const id of unique) {
      if (!contactIds.has(id)) {
        throw new BadRequestException('One or more members are not in your contacts');
      }
    }
    return unique;
  }

  private getSectionRole(
    section: NonNullable<Awaited<ReturnType<ShoppingListRepository['findSectionById']>>>,
    userId: string,
  ): 'owner' | 'editor' | 'viewer' | null {
    if (section.ownerId === userId) return 'owner';
    const member = section.members.find((m) => m.userId === userId);
    if (!member) return null;
    return member.role as 'editor' | 'viewer';
  }

  private async assertSectionAccess(
    userId: string,
    sectionId: string,
    minRole: 'viewer' | 'editor' | 'owner' = 'editor',
  ) {
    const section = await this.repo.findSectionById(sectionId);
    if (!section) throw new NotFoundException('Section not found');

    const role = this.getSectionRole(section, userId);
    if (!role) throw new ForbiddenException();

    if (minRole === 'owner' && role !== 'owner') throw new ForbiddenException();
    if (minRole === 'editor' && role === 'viewer') throw new ForbiddenException();

    return section;
  }

  async findSections(userId: string) {
    const sections = await this.repo.findSectionsForUser(userId);
    return sections.map((s) => this.mapSection(s));
  }

  async createSection(userId: string, dto: CreateShoppingSectionDto) {
    const name = dto.name.trim();
    const owned = await this.repo.findSectionsForUser(userId);
    const existing = owned.find(
      (s) => s.ownerId === userId && s.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) throw new ConflictException('Section already exists');

    const memberIds = dto.memberIds?.length
      ? await this.validateContactIds(userId, dto.memberIds)
      : [];

    const maxPos = await this.repo.getOwnedSectionMaxPosition(userId);
    const position = (maxPos._max.position ?? -1) + 1;
    const section = await this.repo.createSection(userId, { name }, position, memberIds);
    return this.mapSection(section);
  }

  async updateSection(userId: string, id: string, dto: UpdateShoppingSectionDto) {
    const section = await this.assertSectionAccess(userId, id, 'editor');

    if (dto.name) {
      const ownerSections = await this.repo.findSectionsForUser(section.ownerId);
      const duplicate = ownerSections.find(
        (s) =>
          s.ownerId === section.ownerId &&
          s.id !== id &&
          s.name.toLowerCase() === dto.name!.trim().toLowerCase(),
      );
      if (duplicate) throw new ConflictException('Section already exists');
    }

    let updated = section;
    if (dto.name !== undefined || dto.position !== undefined || dto.hidden !== undefined) {
      updated = (await this.repo.updateSection(id, dto))!;
    }

    if (dto.memberIds !== undefined) {
      if (section.ownerId !== userId) {
        throw new ForbiddenException('Only the section creator can change who has access');
      }
      const memberIds = await this.validateContactIds(userId, dto.memberIds);
      updated = (await this.repo.setSectionMembers(id, memberIds))!;
    }

    return this.mapSection(updated);
  }

  async removeSection(userId: string, id: string) {
    await this.assertSectionAccess(userId, id, 'editor');
    await this.repo.deleteSection(id);
  }

  private isEventItemVisibleToUser(item: ShoppingListItem, userId: string) {
    if (!item.eventItemId) return true;
    if (item.assigneeId) return item.assigneeId === userId;
    return item.ownerId === userId;
  }

  async findAll(userId: string, done?: boolean) {
    const items = await this.repo.findByUser(userId, done);
    return items
      .map((i) => this.mapItem(i))
      .filter((item) => this.isEventItemVisibleToUser(item, userId));
  }

  async findPending(userId: string, limit?: number) {
    const items = await this.repo.findPending(userId, limit);
    return items
      .map((i) => this.mapItem(i))
      .filter((item) => this.isEventItemVisibleToUser(item, userId));
  }

  async create(userId: string, dto: CreateShoppingItemDto) {
    await this.assertSectionAccess(userId, dto.sectionId, 'editor');

    if (!dto.inStock) {
      const existing = await this.repo.findPendingInSection(dto.sectionId, dto.title);
      if (existing) return this.mapItem(existing);
    }

    const maxPos = await this.repo.getMaxPosition(dto.sectionId);
    const position = (maxPos._max.position ?? -1) + 1;
    const item = await this.repo.create(userId, dto, position);
    return this.mapItem(item);
  }

  async update(userId: string, id: string, dto: UpdateShoppingItemDto) {
    const item = await this.repo.findItemById(id);
    if (!item) throw new NotFoundException('Item not found');

    const sectionId = dto.sectionId ?? item.sectionId;
    if (!sectionId) throw new ForbiddenException();

    await this.assertSectionAccess(userId, sectionId, 'editor');

    const updated = await this.repo.update(id, dto);
    if (updated.eventItemId) {
      if (dto.done !== undefined) {
        await this.repo.syncEventItemDone(updated.eventItemId, dto.done);
      }
      if (dto.title !== undefined) {
        await this.repo.syncEventItemTitle(updated.eventItemId, dto.title);
      }
    }
    return this.mapItem(updated);
  }

  async remove(userId: string, id: string) {
    const item = await this.repo.findItemById(id);
    if (!item) throw new NotFoundException('Item not found');
    if (!item.sectionId) {
      if (item.ownerId !== userId) throw new ForbiddenException();
    } else {
      await this.assertSectionAccess(userId, item.sectionId, 'editor');
    }
    await this.repo.delete(id);
  }

  async reorder(userId: string, updates: { id: string; position: number }[]) {
    if (!updates.length) return this.findAll(userId);

    const items = await Promise.all(updates.map((update) => this.repo.findItemById(update.id)));
    const sectionIds = new Set<string>();

    for (const item of items) {
      if (!item) throw new NotFoundException('Item not found');
      if (!item.sectionId) {
        if (item.ownerId !== userId) throw new ForbiddenException();
        continue;
      }
      sectionIds.add(item.sectionId);
    }

    for (const sectionId of sectionIds) {
      await this.assertSectionAccess(userId, sectionId, 'editor');
    }

    await this.repo.updatePositions(updates);
    return this.findAll(userId);
  }
}
