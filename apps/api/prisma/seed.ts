import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function clearDatabase() {
  await prisma.notification.deleteMany();
  await prisma.shoppingSectionMember.deleteMany();
  await prisma.shoppingListItem.deleteMany();
  await prisma.shoppingSection.deleteMany();
  await prisma.expenseShare.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.eventItem.deleteMany();
  await prisma.task.deleteMany();
  await prisma.eventDismissal.deleteMany();
  await prisma.eventParticipant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.calendarMember.deleteMany();
  await prisma.calendar.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await clearDatabase();

  const password = await bcrypt.hash('password123', 12);

  async function createUserWithCalendar(data: {
    name: string;
    email: string;
    password: string;
    timezone: string;
    avatar: string;
  }) {
    const user = await prisma.user.create({ data });
    await prisma.calendar.create({
      data: {
        name: 'Pessoal',
        color: '#6366f1',
        description: 'Calendário pessoal',
        ownerId: user.id,
        members: { create: { userId: user.id, role: 'owner' } },
      },
    });
    return user;
  }

  const maria = await createUserWithCalendar({
    name: 'Maria Correia',
    email: 'maria@vidadura.pt',
    password,
    timezone: 'Europe/Lisbon',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
  });

  const carolina = await createUserWithCalendar({
    name: 'Carolina Roque',
    email: 'carolina@vidadura.pt',
    password,
    timezone: 'Europe/Lisbon',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carolina',
  });

  await prisma.connection.create({
    data: {
      requesterId: maria.id,
      receiverId: carolina.id,
      status: 'accepted',
    },
  });

  console.log('Seed completed:');
  console.log(`  ${maria.email} — ${maria.name}`);
  console.log(`  ${carolina.email} — ${carolina.name}`);
  console.log('  Password for both: password123');
  console.log('  Connection: Maria ↔ Carolina (accepted)');
  console.log('');
  console.log('');
  console.log('Dados limpos. Faz logout/login para refrescar a sessão.');
  console.log('');
  console.log('Test flow:');
  console.log('  1. Calendário → evento → tarefas/compras/despesas aparecem nas páginas principais');
  console.log('  2. Login → Despesas or Evento → dividir com o outro contacto');
  console.log('  2. Tab Saldos para ver quem deve a quem');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
