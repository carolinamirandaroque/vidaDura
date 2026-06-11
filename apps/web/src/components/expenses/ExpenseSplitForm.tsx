import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, Input, Label } from '@lifehub/ui';
import { buildEqualShares } from '@lifehub/utils';
import { useFormatters } from '@/hooks/useFormatters';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import type { User } from '@lifehub/types';

interface ExpenseSplitFormProps {
  /** Event participants etc. — merged with accepted contacts */
  extraParticipants?: User[];
  currentUserId: string;
  onSubmit: (data: {
    title: string;
    amount: number;
    paidById: string;
    shares: { userId: string; amountOwed: number }[];
  }) => void;
  isPending?: boolean;
  submitLabel?: string;
}

export function ExpenseSplitForm({
  extraParticipants = [],
  currentUserId,
  onSubmit,
  isPending,
  submitLabel,
}: ExpenseSplitFormProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatters();
  const currentUser = useAuthStore((s) => s.user);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(currentUserId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: contacts, isLoading: loadingContacts } = useQuery({
    queryKey: ['contacts', currentUserId],
    queryFn: () => api.getContacts(),
    enabled: !!currentUserId,
  });

  const participants = useMemo(() => {
    const map = new Map<string, User>();
    if (currentUser) map.set(currentUser.id, currentUser);
    extraParticipants.forEach((p) => map.set(p.id, p));
    contacts?.forEach((c) => {
      if (c.user) map.set(c.user.id, c.user);
    });
    return Array.from(map.values());
  }, [currentUser, extraParticipants, contacts]);

  const participantKey = participants.map((p) => p.id).join(',');

  useEffect(() => {
    const ids = participants.map((p) => p.id);
    const others = ids.filter((id) => id !== currentUserId);
    setSelectedIds(others.length > 0 ? others : ids);
  }, [participantKey, currentUserId]);

  useEffect(() => {
    if (!participants.some((p) => p.id === paidById)) {
      setPaidById(currentUserId);
    }
  }, [participants, paidById, currentUserId]);

  const parsedAmount = parseFloat(amount);
  const hasDebtors = selectedIds.some((id) => id !== paidById);

  const shares = useMemo(() => {
    if (!parsedAmount || selectedIds.length === 0) return [];
    return buildEqualShares(parsedAmount, selectedIds);
  }, [parsedAmount, selectedIds]);

  const otherCount = participants.filter((p) => p.id !== currentUserId).length;

  const toggleParticipant = (userId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(userId)) {
        const debtorsAfter = prev.filter((id) => id !== userId && id !== paidById);
        if (debtorsAfter.length === 0) return prev;
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleSubmit = () => {
    const value = parseFloat(amount);
    if (!title.trim()) {
      setError(t('expenses.titleRequired'));
      return;
    }
    if (!value || value <= 0) {
      setError(t('expenses.amountRequired'));
      return;
    }
    if (!selectedIds.length) {
      setError(t('expenses.selectParticipants'));
      return;
    }
    if (!selectedIds.some((id) => id !== paidById)) {
      setError(t('expenses.selectDebtors'));
      return;
    }
    setError(null);
    onSubmit({
      title: title.trim(),
      amount: value,
      paidById,
      shares: buildEqualShares(value, selectedIds),
    });
    setTitle('');
    setAmount('');
    setPaidById(currentUserId);
    const ids = participants.map((p) => p.id);
    const others = ids.filter((id) => id !== currentUserId);
    setSelectedIds(others.length > 0 ? others : ids);
  };

  if (loadingContacts) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  if (!currentUser) return null;

  const payerName = participants.find((p) => p.id === paidById)?.name;

  return (
    <div className="space-y-3">
      {otherCount === 0 && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          {t('expenses.noContactsHint')}{' '}
          <Link to="/contacts" className="font-medium underline">
            {t('nav.contacts')}
          </Link>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-[140px] flex-1"
          placeholder={t('expenses.expenseTitlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          type="number"
          step="0.01"
          min="0.01"
          className="w-28"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('expenses.whoPaid')}</Label>
        <div className="flex flex-wrap gap-2">
          {participants.map((person) => {
            const isYou = person.id === currentUserId;
            const selected = paidById === person.id;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => setPaidById(person.id)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {person.name}
                {isYou && ` (${t('expenses.you')})`}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('expenses.whoOwes')}</Label>
        <p className="text-xs text-muted-foreground">{t('expenses.splitHint')}</p>
        <div className="flex flex-wrap gap-2">
          {participants.map((person) => {
            const selected = selectedIds.includes(person.id);
            const isYou = person.id === currentUserId;
            const debtorsIfRemoved =
              selectedIds.filter((id) => id !== person.id && id !== paidById).length;
            const cannotDeselect = selected && debtorsIfRemoved === 0;
            return (
              <button
                key={person.id}
                type="button"
                disabled={cannotDeselect}
                onClick={() => toggleParticipant(person.id)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                } ${cannotDeselect ? 'cursor-default' : 'cursor-pointer hover:border-primary/50'}`}
              >
                {person.name}
                {isYou && ` (${t('expenses.you')})`}
              </button>
            );
          })}
        </div>
      </div>

      {shares.length > 0 && parsedAmount > 0 && payerName && hasDebtors && (
        <p className="text-xs text-muted-foreground">
          {(() => {
            const debtShares = shares.filter((s) => s.userId !== paidById);
            if (debtShares.length === 0) return null;
            return debtShares.length === 1
              ? t('expenses.splitPreviewSingle', {
                  name: participants.find((p) => p.id === debtShares[0].userId)?.name,
                  amount: formatCurrency(debtShares[0].amountOwed),
                })
              : t('expenses.splitPreview', {
                  count: debtShares.length,
                  each: formatCurrency(debtShares[0]?.amountOwed ?? 0),
                });
          })()}
          {' · '}
          {t('expenses.paidByPreview', { name: payerName })}
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        size="sm"
        className="w-full sm:w-auto"
        disabled={isPending || !title.trim() || !parsedAmount || !hasDebtors}
        onClick={handleSubmit}
      >
        {submitLabel ?? t('expenses.addExpense')}
      </Button>
    </div>
  );
}
