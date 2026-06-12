import { useTranslation } from 'react-i18next';
import { Shield, UserMinus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, Button } from '@lifehub/ui';
import { getInitials } from '@lifehub/utils';
import type { User } from '@lifehub/types';

export interface EntityAccessEntry {
  user: User;
  role: 'creator' | 'collaborator';
}

interface EntityAccessPanelProps {
  entries: EntityAccessEntry[];
  className?: string;
  canManage?: boolean;
  onRemove?: (userId: string, name: string) => void;
  removingUserId?: string | null;
}

export function EntityAccessPanel({
  entries,
  className,
  canManage,
  onRemove,
  removingUserId,
}: EntityAccessPanelProps) {
  const { t } = useTranslation();

  if (entries.length === 0) return null;

  return (
    <div className={className ?? 'rounded-lg border bg-muted/30 p-3 space-y-2'}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Shield className="h-4 w-4 text-muted-foreground" />
        {t('access.title')}
      </div>
      <p className="text-xs text-muted-foreground">{t('access.hint')}</p>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.user.id} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={entry.user.avatar ?? undefined} />
                <AvatarFallback className="text-[9px]">{getInitials(entry.user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{entry.user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.role === 'creator' ? t('access.creator') : t('access.collaborator')}
                </p>
              </div>
            </div>
            {canManage && entry.role === 'collaborator' && onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={removingUserId === entry.user.id}
                title={t('access.remove')}
                onClick={() => onRemove(entry.user.id, entry.user.name)}
              >
                <UserMinus className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
