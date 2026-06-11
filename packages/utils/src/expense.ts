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

export function extractExpenseUsers(expenses: Expense[]): User[] {
  const map = new Map<string, User>();
  for (const expense of expenses) {
    if (expense.creator) map.set(expense.creator.id, expense.creator);
    if (expense.paidBy) map.set(expense.paidBy.id, expense.paidBy);
    expense.shares?.forEach((share) => {
      if (share.user) map.set(share.user.id, share.user);
    });
  }
  return Array.from(map.values());
}

export function calculateGlobalBalances(expenses: Expense[]): Balance[] {
  const users = extractExpenseUsers(expenses);
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
    .map(([userId, amount]) => ({
      userId,
      user: users.find((u) => u.id === userId)!,
      amount: Math.round(amount * 100) / 100,
    }))
    .filter((b) => b.user && Math.abs(b.amount) > 0.01);
}

/** Net balance per contact relative to the current user (negative = they owe you). */
export function calculateBalances(
  expenses: Expense[],
  users: User[],
  currentUserId: string,
): Balance[] {
  const contactIds = new Set(users.map((u) => u.id));

  return calculateGlobalBalances(expenses)
    .filter((b) => b.userId !== currentUserId && contactIds.has(b.userId))
    .map((b) => ({
      ...b,
      user: users.find((u) => u.id === b.userId) ?? b.user,
    }));
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

/** Minimized who-should-pay-whom list after netting all pending expenses. */
export function aggregateDebtsFromExpenses(expenses: Expense[], currency = 'EUR'): Debt[] {
  const balances = calculateGlobalBalances(expenses);
  if (!balances.length) return [];
  const resolvedCurrency = expenses.find((e) => e.currency)?.currency ?? currency;
  return simplifyDebts(balances, resolvedCurrency);
}
