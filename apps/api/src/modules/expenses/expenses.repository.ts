import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

const expenseInclude = {
  shares: { include: { user: true } },
  creator: true,
  paidBy: true,
  event: { select: { id: true, title: true } },
} as const;

@Injectable()
export class ExpensesRepository {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.expense.findUnique({
      where: { id },
      include: expenseInclude,
    });
  }

  findByUser(userId: string) {
    return this.prisma.expense.findMany({
      where: {
        OR: [{ creatorId: userId }, { shares: { some: { userId } } }],
      },
      include: expenseInclude,
      orderBy: { date: 'desc' },
    });
  }

  create(creatorId: string, dto: CreateExpenseDto, eventId?: string) {
    return this.prisma.expense.create({
      data: {
        creatorId,
        paidById: dto.paidById ?? creatorId,
        eventId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'EUR',
        date: new Date(dto.date),
        shares: {
          create: dto.shares.map((s) => ({
            userId: s.userId,
            amountOwed: s.amountOwed,
          })),
        },
      },
      include: expenseInclude,
    });
  }

  update(id: string, dto: UpdateExpenseDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.shares) {
        await tx.expenseShare.deleteMany({ where: { expenseId: id } });
        await tx.expenseShare.createMany({
          data: dto.shares.map((s) => ({
            expenseId: id,
            userId: s.userId,
            amountOwed: s.amountOwed,
          })),
        });
      }

      const settledAt =
        dto.settled === true ? new Date() : dto.settled === false ? null : undefined;

      return tx.expense.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          amount: dto.amount,
          currency: dto.currency,
          date: dto.date ? new Date(dto.date) : undefined,
          paidById: dto.paidById,
          settled: dto.settled,
          settledAt,
        },
        include: expenseInclude,
      });
    });
  }

  settleShare(shareId: string, settled: boolean) {
    return this.prisma.expenseShare.update({
      where: { id: shareId },
      data: {
        settled,
        settledAt: settled ? new Date() : null,
      },
    });
  }

  async syncExpenseSettlement(expenseId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: { shares: true },
    });
    if (!expense) return;

    const debtorShares = expense.shares.filter(
      (s) => s.userId !== expense.paidById && s.amountOwed > 0.01,
    );
    const allSettled = debtorShares.length === 0 || debtorShares.every((s) => s.settled);
    const latestSettledAt = debtorShares
      .filter((s) => s.settledAt)
      .map((s) => s.settledAt!)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        settled: allSettled,
        settledAt: allSettled ? (latestSettledAt ?? new Date()) : null,
      },
    });
  }

  delete(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
