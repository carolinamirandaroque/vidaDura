import type { EntityAccessEntry } from '@/components/shared/EntityAccessPanel';
import type { Event, Expense, ShoppingSection, Task, User } from '@lifehub/types';

export function buildEventAccessEntries(
  event: Pick<Event, 'createdById' | 'createdBy' | 'participants'>,
): EntityAccessEntry[] {
  const entries: EntityAccessEntry[] = [];
  if (event.createdBy) {
    entries.push({ user: event.createdBy, role: 'creator' });
  }
  for (const participant of event.participants ?? []) {
    if (participant.user && participant.userId !== event.createdById) {
      entries.push({ user: participant.user, role: 'collaborator' });
    }
  }
  return entries;
}

export function canManageExpense(expense: Expense, userId: string, isEventCollaborator = false) {
  if (expense.creatorId === userId) return true;
  if (expense.shares?.some((share) => share.userId === userId)) return true;
  if (expense.eventId && isEventCollaborator) return true;
  return false;
}

export function buildExpenseAccessEntries(expense: Expense): EntityAccessEntry[] {
  const entries: EntityAccessEntry[] = [];
  const seen = new Set<string>();
  if (expense.creator) {
    entries.push({ user: expense.creator, role: 'creator' });
    seen.add(expense.creator.id);
  }
  for (const share of expense.shares ?? []) {
    if (share.user && !seen.has(share.userId)) {
      entries.push({ user: share.user, role: 'collaborator' });
      seen.add(share.userId);
    }
  }
  return entries;
}

export function canManageShoppingSection(section: ShoppingSection, userId: string) {
  return (
    section.ownerId === userId ||
    (section.members?.some((member) => member.userId === userId) ?? false)
  );
}

export function buildShoppingSectionAccessEntries(section: ShoppingSection): EntityAccessEntry[] {
  const entries: EntityAccessEntry[] = [];
  if (section.owner) {
    entries.push({ user: section.owner, role: 'creator' });
  }
  for (const member of section.members ?? []) {
    if (member.user) {
      entries.push({ user: member.user, role: 'collaborator' });
    }
  }
  return entries;
}

export function buildTaskAccessEntries(task: Task, people: User[]): EntityAccessEntry[] {
  const entries: EntityAccessEntry[] = [];
  const owner = people.find((person) => person.id === task.ownerId);
  if (owner) {
    entries.push({ user: owner, role: 'creator' });
  }
  if (task.assignee && task.assigneeId !== task.ownerId) {
    entries.push({ user: task.assignee, role: 'collaborator' });
  }
  return entries;
}
