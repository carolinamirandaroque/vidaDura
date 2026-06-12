import { useTranslation } from 'react-i18next';
import { UserPlus, Check, X, Clock } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback, Badge, Button, cn } from '@lifehub/ui';
import { getInitials } from '@lifehub/utils';
import { DeleteButton } from '@/components/hub/DeleteButton';
import { hubRowClass } from '@/components/hub/hub-styles';
import type { User } from '@lifehub/types';

export type ConnectionStatus = 'none' | 'accepted' | 'pending_sent' | 'pending_received';

interface ContactRowProps {
  user: User;
  status: ConnectionStatus;
  onAdd?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onRemove?: () => void;
  isLoading?: boolean;
}

export function ContactRow({
  user,
  status,
  onAdd,
  onAccept,
  onReject,
  onCancel,
  onRemove,
  isLoading,
}: ContactRowProps) {
  const { t } = useTranslation();
  const showPendingActions = status === 'pending_received' && onAccept && onReject;

  return (
    <div className={cn(hubRowClass, 'items-start gap-3 p-3')}>
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarImage src={user.avatar ?? undefined} />
        <AvatarFallback className="text-sm">{getInitials(user.name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium leading-tight">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>

          {!showPendingActions && (
            <div className="flex shrink-0 items-center gap-1">
              {status === 'accepted' && (
                <>
                  <Badge variant="success" className="px-2 py-0.5 text-[10px]">
                    {t('contacts.contact')}
                  </Badge>
                  {onRemove && (
                    <DeleteButton
                      onClick={onRemove}
                      disabled={isLoading}
                      confirmMessage={t('contacts.removeConfirm', { name: user.name })}
                      title={t('contacts.remove')}
                    />
                  )}
                </>
              )}
              {status === 'pending_sent' && (
                <>
                  <Badge variant="warning" className="gap-1 px-2 py-0.5 text-[10px]">
                    <Clock className="h-3 w-3" />
                    {t('contacts.waiting')}
                  </Badge>
                  {onCancel && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled={isLoading} onClick={onCancel}>
                      {t('contacts.cancel')}
                    </Button>
                  )}
                </>
              )}
              {status === 'none' && onAdd && (
                <Button size="sm" className="h-8" disabled={isLoading} onClick={onAdd}>
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  {t('contacts.add')}
                </Button>
              )}
            </div>
          )}
        </div>

        {showPendingActions && (
          <div className="flex gap-2">
            <Button size="sm" className="h-9 flex-1" disabled={isLoading} onClick={onAccept}>
              <Check className="mr-1 h-3.5 w-3.5" />
              {t('contacts.accept')}
            </Button>
            <Button size="sm" variant="outline" className="h-9 flex-1" disabled={isLoading} onClick={onReject}>
              <X className="mr-1 h-3.5 w-3.5" />
              {t('contacts.reject')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
