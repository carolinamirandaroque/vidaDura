import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import {
  aggregateDebtsFromExpenses,
  calculateBalances,
  getPendingObligations,
  isExpenseFullySettled,
  validateShares,
} from '@lifehub/utils';
import { ExpensesRepository } from './expenses.repository';
import { ConnectionsRepository } from '../connections/connections.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { WebsocketGateway } from '../../infrastructure/websocket/websocket.gateway';
import { toUserDto } from '../../common/mappers/user.mapper';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import type { Expense, Balance, Debt } from '@lifehub/types';

type ExpenseRecord = NonNullable<Awaited<ReturnType<ExpensesRepository['findById']>>>;

@Injectable()
export class ExpensesService {
  constructor(
    private expensesRepo: ExpensesRepository,
    private connectionsRepo: ConnectionsRepository,
    private notificationsService: NotificationsService,
    private wsGateway: WebsocketGateway,
  ) {}

  private mapExpense(expense: ExpenseRecord): Expense {
    const shares = expense.shares?.map((s) => ({
      id: s.id,
      expenseId: s.expenseId,
      userId: s.userId,
      amountOwed: s.amountOwed,
      settled: s.settled,
      settledAt: s.settledAt?.toISOString() ?? null,
      user: s.user ? toUserDto(s.user) : undefined,
    }));

    const mapped: Expense = {
      id: expense.id,
      eventId: expense.eventId ?? null,
      creatorId: expense.creatorId,
      paidById: expense.paidById,
      settled: expense.settled,
      settledAt: expense.settledAt?.toISOString() ?? null,
      title: expense.title,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date.toISOString(),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
      shares,
      creator: expense.creator ? toUserDto(expense.creator) : undefined,
      paidBy: expense.paidBy ? toUserDto(expense.paidBy) : undefined,
      eventTitle: expense.event?.title ?? null,
    };

    mapped.settled = isExpenseFullySettled(mapped);

    return mapped;
  }

  private isInvolved(expense: ExpenseRecord, userId: string) {
    return (
      expense.creatorId === userId ||
      expense.paidById === userId ||
      expense.shares.some((s) => s.userId === userId)
    );
  }

  private async notifyExpenseUpdate(expense: ExpenseRecord, actorId: string) {
    const mapped = this.mapExpense(expense);
    for (const share of expense.shares) {
      if (share.userId !== actorId) {
        this.wsGateway.emitToUser(share.userId, 'expense_updated', mapped);
      }
    }
  }

  async findAll(userId: string) {
    const expenses = await this.expensesRepo.findByUser(userId);
    return expenses.map((e) => this.mapExpense(e));
  }

  async findOne(userId: string, id: string) {
    const expense = await this.expensesRepo.findById(id);
    if (!expense) throw new NotFoundException('Expense not found');
    if (!this.isInvolved(expense, userId)) throw new ForbiddenException('Not authorized');
    return this.mapExpense(expense);
  }

  async create(userId: string, dto: CreateExpenseDto) {
    if (!validateShares(dto.amount, dto.shares)) {
      throw new BadRequestException('Share amounts must equal total expense amount');
    }

    const expense = await this.expensesRepo.create(userId, dto);
    const mapped = this.mapExpense(expense);

    for (const share of dto.shares) {
      if (share.userId !== userId) {
        await this.notificationsService.create({
          userId: share.userId,
          type: 'expense_added',
          title: 'Nova despesa',
          message: `${expense.creator.name} adicionou "${expense.title}"`,
          data: { expenseId: expense.id },
        });
        this.wsGateway.emitToUser(share.userId, 'expense_updated', mapped);
      }
    }

    return mapped;
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const existing = await this.expensesRepo.findById(id);
    if (!existing) throw new NotFoundException('Expense not found');
    if (existing.creatorId !== userId) throw new ForbiddenException('Only creator can update');

    if (dto.shares && dto.amount && !validateShares(dto.amount, dto.shares)) {
      throw new BadRequestException('Share amounts must equal total expense amount');
    }

    const expense = await this.expensesRepo.update(id, dto);
    await this.notifyExpenseUpdate(expense, userId);
    return this.mapExpense(expense);
  }

  async settleShare(userId: string, expenseId: string, shareId: string, settled: boolean) {
    const expense = await this.expensesRepo.findById(expenseId);
    if (!expense) throw new NotFoundException('Expense not found');
    if (!this.isInvolved(expense, userId)) throw new ForbiddenException('Not authorized');

    const share = expense.shares.find((s) => s.id === shareId);
    if (!share) throw new NotFoundException('Share not found');

    if (share.userId === expense.paidById) {
      throw new BadRequestException('Payer share cannot be settled as a debt');
    }

    const canSettle =
      userId === share.userId || userId === expense.paidById || userId === expense.creatorId;
    if (!canSettle) {
      throw new ForbiddenException('Not authorized to settle this share');
    }

    await this.expensesRepo.settleShare(shareId, settled);
    await this.expensesRepo.syncExpenseSettlement(expenseId);

    const updated = await this.expensesRepo.findById(expenseId);
    if (!updated) throw new NotFoundException('Expense not found');

    await this.notifyExpenseUpdate(updated, userId);
    return this.mapExpense(updated);
  }

  private canSettleObligation(
    expense: ExpenseRecord,
    userId: string,
    debtorId: string,
    creditorId: string,
  ) {
    return (
      userId === debtorId ||
      userId === creditorId ||
      expense.creatorId === userId ||
      expense.paidById === userId
    );
  }

  async settleAllWithContact(userId: string, contactId: string) {
    const expenses = await this.expensesRepo.findByUser(userId);
    let settled = 0;

    for (const expense of expenses) {
      const mapped = this.mapExpense(expense);
      for (const obligation of getPendingObligations(mapped)) {
        const involvesContact =
          (obligation.from.id === userId && obligation.to.id === contactId) ||
          (obligation.from.id === contactId && obligation.to.id === userId);
        if (!involvesContact) continue;
        if (!this.canSettleObligation(expense, userId, obligation.from.id, obligation.to.id)) {
          continue;
        }
        await this.settleShare(userId, expense.id, obligation.shareId, true);
        settled++;
      }
    }

    return { settled };
  }

  async settleAll(userId: string) {
    const expenses = await this.expensesRepo.findByUser(userId);
    let settled = 0;

    for (const expense of expenses) {
      const mapped = this.mapExpense(expense);
      for (const obligation of getPendingObligations(mapped)) {
        if (!this.canSettleObligation(expense, userId, obligation.from.id, obligation.to.id)) {
          continue;
        }
        await this.settleShare(userId, expense.id, obligation.shareId, true);
        settled++;
      }
    }

    return { settled };
  }

  async remove(userId: string, id: string) {
    const existing = await this.expensesRepo.findById(id);
    if (!existing) throw new NotFoundException('Expense not found');
    if (existing.creatorId !== userId) throw new ForbiddenException('Only creator can delete');
    await this.expensesRepo.delete(id);
  }

  async getBalances(userId: string): Promise<Balance[]> {
    const expenses = await this.expensesRepo.findByUser(userId);
    const contacts = await this.connectionsRepo.findAcceptedContacts(userId);

    const users = contacts.map((c) =>
      c.requesterId === userId ? toUserDto(c.receiver) : toUserDto(c.requester),
    );

    const mappedExpenses = expenses.map((e) => this.mapExpense(e));
    return calculateBalances(mappedExpenses, users, userId);
  }

  async getDebts(userId: string): Promise<Debt[]> {
    const expenses = await this.expensesRepo.findByUser(userId);
    const mappedExpenses = expenses.map((e) => this.mapExpense(e));
    return aggregateDebtsFromExpenses(mappedExpenses);
  }
}
