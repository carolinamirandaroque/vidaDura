import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage, cn } from '@lifehub/ui';
import { getInitials } from '@lifehub/utils';
import type { ConnectionWithUser } from '@lifehub/types';

interface ContactChipPickerProps {
  contacts: ConnectionWithUser[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyMessage?: string;
}

function toggleId(ids: string[], userId: string) {
  return ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId];
}

export const ContactChipPicker = memo(function ContactChipPicker({
  contacts,
  selectedIds,
  onChange,
  emptyMessage,
}: ContactChipPickerProps) {
  const { t } = useTranslation();

  if (!contacts.length) {
    return (
      <p className="text-xs text-muted-foreground">
        {emptyMessage ?? t('shopping.noContacts')}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {contacts.map((c) => {
        const user = c.user;
        const checked = selectedIds.includes(user.id);
        return (
          <label
            key={c.id}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
              checked
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/40',
            )}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={() => onChange(toggleId(selectedIds, user.id))}
            />
            <Avatar className="h-4 w-4">
              <AvatarImage src={user.avatar ?? undefined} />
              <AvatarFallback className="text-[6px]">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="max-w-[8rem] truncate">{user.name}</span>
          </label>
        );
      })}
    </div>
  );
});
