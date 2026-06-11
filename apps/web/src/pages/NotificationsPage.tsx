import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@lifehub/ui';
import { api } from '@/lib/api';
import { useFormatters } from '@/hooks/useFormatters';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';

export function NotificationsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useFormatters();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  });

  const markAllMutation = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
          <p className="text-muted-foreground">{t('notifications.subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()}>
          <CheckCheck className="mr-2 h-4 w-4" /> {t('notifications.markAllRead')}
        </Button>
      </div>

      {!notifications?.length ? (
        <EmptyState
          icon={Bell}
          title={t('notifications.noNotifications')}
          description={t('notifications.noNotificationsDescription')}
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.read ? 'opacity-60' : ''}
              onClick={() => !notification.read && markReadMutation.mutate(notification.id)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{notification.title}</h3>
                    {!notification.read && <Badge>{t('notifications.new')}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
