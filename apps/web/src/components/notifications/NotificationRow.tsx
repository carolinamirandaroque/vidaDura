import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { Badge, Button, cn } from '@lifehub/ui';
import { hubRowClass } from '@/components/hub/hub-styles';
import type { Notification } from '@lifehub/types';

interface NotificationRowProps {
  notification: Notification;
  formattedDate: string;
  showInviteActions?: boolean;
  onMarkRead?: () => void;
  onAcceptInvite?: () => void;
  onDeclineInvite?: () => void;
  isResponding?: boolean;
}

export function NotificationRow({
  notification,
  formattedDate,
  showInviteActions,
  onMarkRead,
  onAcceptInvite,
  onDeclineInvite,
  isResponding,
}: NotificationRowProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        hubRowClass,
        'flex-col items-stretch gap-3 p-3',
        !notification.read && 'border-primary/20',
        notification.read && 'opacity-70',
        !showInviteActions && !notification.read && onMarkRead && 'cursor-pointer',
      )}
      onClick={() => {
        if (!showInviteActions && !notification.read) onMarkRead?.();
      }}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{notification.title}</h3>
          {!notification.read && <Badge>{t('notifications.new')}</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formattedDate}</p>
      </div>

      {showInviteActions && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-9 flex-1"
            disabled={isResponding}
            onClick={(e) => {
              e.stopPropagation();
              onAcceptInvite?.();
            }}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            {t('notifications.acceptInvite')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1"
            disabled={isResponding}
            onClick={(e) => {
              e.stopPropagation();
              onDeclineInvite?.();
            }}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            {t('notifications.declineInvite')}
          </Button>
        </div>
      )}
    </div>
  );
}
