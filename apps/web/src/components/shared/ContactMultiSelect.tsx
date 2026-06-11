import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage, cn } from '@lifehub/ui';
import { api } from '@/lib/api';
import { getInitials } from '@lifehub/utils';
import type { ConnectionWithUser } from '@lifehub/types';

function contactUser(conn: ConnectionWithUser, currentUserId: string) {
  return conn.requesterId === currentUserId ? conn.receiver ?? conn.user : conn.requester ?? conn.user;
}

interface ContactMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  currentUserId?: string;
  className?: string;
}

export function ContactMultiSelect({
  selectedIds,
  onChange,
  currentUserId,
  className,
}: ContactMultiSelectProps) {
  const { t } = useTranslation();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', currentUserId],
    queryFn: () => api.getContacts(),
    enabled: !!currentUserId,
  });

  const people = contacts
    .map((c) => contactUser(c, currentUserId!))
    .filter((u): u is NonNullable<typeof u> => !!u && u.id !== currentUserId);

  const toggle = (userId: string) => {
    onChange(
      selectedIds.includes(userId)
        ? selectedIds.filter((id) => id !== userId)
        : [...selectedIds, userId],
    );
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>;
  }

  if (people.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('eventHub.noContactsHint')}{' '}
        <Link to="/contacts" className="font-medium text-primary underline">
          {t('nav.contacts')}
        </Link>
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {people.map((person) => {
        const checked = selectedIds.includes(person.id);
        return (
          <label
            key={person.id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
              checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50',
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(person.id)}
              className="h-4 w-4 rounded"
            />
            <Avatar className="h-8 w-8">
              <AvatarImage src={person.avatar ?? undefined} />
              <AvatarFallback className="text-xs">{getInitials(person.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{person.name}</p>
              <p className="truncate text-xs text-muted-foreground">{person.email}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
