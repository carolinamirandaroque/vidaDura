/**
 * One-shot repair for event-linked shopping items whose owner/section drifted from assignee.
 * Run: npm run repair:shopping -w @lifehub/api
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureEventsSection(ownerId: string) {
  const existing = await prisma.shoppingSection.findFirst({
    where: { ownerId, name: 'Eventos' },
  });
  if (existing) return existing;
  const maxPos = await prisma.shoppingSection.aggregate({
    where: { ownerId },
    _max: { position: true },
  });
  return prisma.shoppingSection.create({
    data: {
      ownerId,
      name: 'Eventos',
      position: (maxPos._max.position ?? -1) + 1,
    },
  });
}

async function main() {
  const linked = await prisma.shoppingListItem.findMany({
    where: { eventItemId: { not: null } },
    include: {
      eventItem: { select: { assigneeId: true, title: true, done: true } },
    },
  });

  let repaired = 0;
  for (const row of linked) {
    if (!row.eventItemId || !row.eventItem) continue;
    const assigneeId = row.eventItem.assigneeId;
    const targetOwnerId =
      assigneeId != null && assigneeId !== '' ? assigneeId : row.ownerId;
    const section = await ensureEventsSection(targetOwnerId);

    if (row.ownerId !== targetOwnerId || row.sectionId !== section.id) {
      await prisma.shoppingListItem.update({
        where: { id: row.id },
        data: {
          ownerId: targetOwnerId,
          sectionId: section.id,
          title: row.eventItem.title ?? row.title,
          done: row.eventItem.done ?? row.done,
        },
      });
      repaired += 1;
    }
  }

  console.log(`Repaired ${repaired} shopping item(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
