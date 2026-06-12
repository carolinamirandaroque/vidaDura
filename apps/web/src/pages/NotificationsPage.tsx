import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@lifehub/ui';
import { api } from '@/lib/api';
import { useFormatters } from '@/hooks/useFormatters';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoading } from '@/components/layout/PageLoading';
import { EmptyState } from '@/components/shared/EmptyState';
import { NotificationRow } from '@/components/notifications/NotificationRow';
import { HubSection, hubListClass, hubSectionClass } from '@/components/hub';
import type { Notification } from '@lifehub/types';

function getEventId(notification: Notification): string | null {
  const eventId = notification.data?.eventId;
  return typeof eventId === 'string' ? eventId : null;
}

export function NotificationsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  });

  const { data: pendingInvites } = useQuery({
    queryKey: ['events', 'invites'],
    queryFn: () => api.getPendingInvites(),
  });

  const pendingEventIds = useMemo(
    () => new Set(pendingInvites?.map((invite) => invite.eventId) ?? []),
    [pendingInvites],
  );

  const refreshState = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['events', 'invites'] });
    queryClient.invalidateQueries({ queryKey: ['event-detail'] });
  };

  const markAllMutation = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: refreshState,
  });

  const markReadMutation = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: refreshState,
  });

  const respondInviteMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: 'accepted' | 'declined' }) =>
      api.respondToInvite(eventId, status),
    onSuccess: refreshState,
  });

  if (isLoading) return <PageLoading />;

  return (
    <PageShell width="wide" className="pb-6">
      <PageHeader
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        actions={
          <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()}>
            <CheckCheck className="mr-2 h-4 w-4" /> {t('notifications.markAllRead')}
          </Button>
        }
      />

      <div className={hubSectionClass}>
        {!notifications?.length ? (
          <EmptyState
            icon={Bell}
            title={t('notifications.noNotifications')}
            description={t('notifications.noNotificationsDescription')}
          />
        ) : (
          <HubSection icon={Bell} title={t('notifications.title')}>
            <div className={hubListClass}>
              {notifications.map((notification) => {
                const eventId = getEventId(notification);
                const isEventInvite = notification.type === 'event_invite' && !!eventId;
                const showInviteActions =
                  isEventInvite && !!eventId && pendingEventIds.has(eventId);

                return (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    formattedDate={formatDateTime(notification.createdAt)}
                    showInviteActions={showInviteActions}
                    isResponding={respondInviteMutation.isPending}
                    onMarkRead={() => markReadMutation.mutate(notification.id)}
                    onAcceptInvite={() => {
                      if (!eventId) return;
                      respondInviteMutation.mutate({ eventId, status: 'accepted' });
                    }}
                    onDeclineInvite={() => {
                      if (!eventId) return;
                      respondInviteMutation.mutate({ eventId, status: 'declined' });
                    }}
                  />
                );
              })}
            </div>
          </HubSection>
        )}
      </div>
    </PageShell>
  );
}
