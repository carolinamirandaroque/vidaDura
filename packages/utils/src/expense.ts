import type { Balance, Debt, Expense, ExpenseObligation, ExpenseShare, User } from '@lifehub/types';

export function getPayerId(expense: Expense): string {
  return expense.paidById ?? expense.creatorId;
}

export function splitEqually(amount: number, participantCount: number): number {
  if (participantCount <= 0) return 0;
  return Math.round((amount / participantCount) * 100) / 100;
}

export function buildEqualShares(
  amount: number,
  userIds: string[],
): { userId: string; amountOwed: number }[] {
  if (!userIds.length) return [];

  const totalCents = Math.round(amount * 100);
  const baseCents = Math.floor(totalCents / userIds.length);
  const remainder = totalCents - baseCents * userIds.length;

  return userIds.map((userId, index) => ({
    userId,
    amountOwed: (baseCents + (index < remainder ? 1 : 0)) / 100,
  }));
}

export function getExpenseObligations(expense: Expense): ExpenseObligation[] {
  if (!expense.shares?.length) return [];

  const paidById = getPayerId(expense);
  const payer = expense.paidBy ?? expense.creator;
  if (!payer) return [];

  return expense.shares
    .filter((s) => s.userId !== paidById && s.amountOwed > 0.01)
    .map((s) => ({
      shareId: s.id,
      from: s.user!,
      to: payer,
      amount: Math.round(s.amountOwed * 100) / 100,
      settled: s.settled ?? false,
      settledAt: s.settledAt ?? null,
    }))
    .filter((o) => o.from);
}

export function getPendingObligations(expense: Expense): ExpenseObligation[] {
  return getExpenseObligations(expense).filter((o) => !o.settled);
}

export function hasPendingDebts(expense: Expense): boolean {
  return getPendingObligations(expense).length > 0;
}

export function isExpenseFullySettled(expense: Expense): boolean {
  return getExpenseObligations(expense).every((o) => o.settled);
}

export function getExpenseSettlementStatus(expense: Expense): 'pending' | 'partial' | 'settled' {
  const obligations = getExpenseObligations(expense);
  if (!obligations.length) return 'settled';
  const pending = obligations.filter((o) => !o.settled).length;
  if (pending === 0) return 'settled';
  if (pending === obligations.length) return 'pending';
  return 'partial';
}

export function calculateBalances(
  expenses: Expense[],
  users: User[],
  currentUserId: string,
): Balance[] {
  const balanceMap = new Map<string, number>();

  for (const user of users) {
    balanceMap.set(user.id, 0);
  }

  for (const expense of expenses) {
    if (!expense.shares) continue;

    const paidById = getPayerId(expense);

    for (const share of expense.shares) {
      if (share.userId !== paidById && !share.settled) {
        balanceMap.set(share.userId, (balanceMap.get(share.userId) ?? 0) - share.amountOwed);
        balanceMap.set(paidById, (balanceMap.get(paidById) ?? 0) + share.amountOwed);
      }
    }
  }

  return Array.from(balanceMap.entries())
    .filter(([userId]) => userId !== currentUserId)
    .map(([userId, amount]) => ({
      userId,
      user: users.find((u) => u.id === userId)!,
      amount: Math.round(amount * 100) / 100,
    }))
    .filter((b) => b.user && Math.abs(b.amount) > 0.01);
}

export function simplifyDebts(balances: Balance[], currency = 'EUR'): Debt[] {
  const creditors = balances.filter((b) => b.amount > 0).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.amount < 0).map((b) => ({ ...b, amount: -b.amount }));
  const debts: Debt[] = [];

  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.01) {
      debts.push({
        from: debtor.user,
        to: creditor.user,
        amount: Math.round(amount * 100) / 100,
        currency,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return debts;
}

export function validateShares(amount: number, shares: Pick<ExpenseShare, 'amountOwed'>[]): boolean {
  const total = shares.reduce((sum, s) => sum + s.amountOwed, 0);
  return Math.abs(total - amount) < 0.01;
}

/** Aggregate pending per-share obligations into who-owes-whom debts */
export function aggregateDebtsFromExpenses(expenses: Expense[]): Debt[] {
  const debtMap = new Map<string, Debt>();

  for (const expense of expenses) {
    for (const obligation of getPendingObligations(expense)) {
      const key = `${obligation.from.id}->${obligation.to.id}`;
      const existing = debtMap.get(key);

      if (existing) {
        existing.amount = Math.round((existing.amount + obligation.amount) * 100) / 100;
      } else {
        debtMap.set(key, {
          from: obligation.from,
          to: obligation.to,
          amount: obligation.amount,
          currency: expense.currency,
        });
      }
    }
  }

  return Array.from(debtMap.values()).filter((d) => d.amount > 0.01);
}
