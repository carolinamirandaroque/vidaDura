import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserPlus, Check, X, Trash2, Clock, Users } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@lifehub/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { getInitials } from '@lifehub/utils';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoading } from '@/components/layout/PageLoading';
import { SearchField } from '@/components/shared/SearchField';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import type { ConnectionWithUser, User } from '@lifehub/types';

type ConnectionStatus = 'none' | 'accepted' | 'pending_sent' | 'pending_received';

function otherUserId(conn: ConnectionWithUser, currentUserId: string) {
  return conn.requesterId === currentUserId ? conn.receiverId : conn.requesterId;
}

function resolveOtherUser(conn: ConnectionWithUser, currentUserId: string): User {
  if (conn.requesterId === currentUserId) {
    return conn.receiver ?? conn.user;
  }
  return conn.requester ?? conn.user;
}

function getConnectionStatus(
  userId: string,
  currentUserId: string | undefined,
  contacts: ConnectionWithUser[] | undefined,
  pending: ConnectionWithUser[] | undefined,
): ConnectionStatus {
  if (!currentUserId || userId === currentUserId) return 'none';
  if (contacts?.some((c) => otherUserId(c, currentUserId) === userId)) return 'accepted';

  const pendingConn = pending?.find((c) => otherUserId(c, currentUserId) === userId);
  if (!pendingConn) return 'none';
  return pendingConn.requesterId === currentUserId ? 'pending_sent' : 'pending_received';
}

function UserRow({
  user,
  status,
  onAdd,
  onAccept,
  onReject,
  onCancel,
  onRemove,
  isLoading,
}: {
  user: User;
  status: ConnectionStatus;
  onAdd?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onRemove?: () => void;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Card className="rounded-xl">
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <Avatar>
          <AvatarImage src={user.avatar ?? undefined} />
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{user.name}</p>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
        {status === 'accepted' && (
          <>
            <Badge variant="success">{t('contacts.contact')}</Badge>
            {onRemove && (
              <Button variant="ghost" size="icon" disabled={isLoading} onClick={onRemove}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </>
        )}
        {status === 'pending_sent' && (
          <>
            <Badge variant="warning" className="gap-1">
              <Clock className="h-3 w-3" />
              {t('contacts.waiting')}
            </Badge>
            {onCancel && (
              <Button variant="ghost" size="sm" disabled={isLoading} onClick={onCancel}>
                {t('contacts.cancel')}
              </Button>
            )}
          </>
        )}
        {status === 'pending_received' && onAccept && onReject && (
          <>
            <Button size="sm" disabled={isLoading} onClick={onAccept}>
              <Check className="mr-1 h-4 w-4" /> {t('contacts.accept')}
            </Button>
            <Button size="sm" variant="outline" disabled={isLoading} onClick={onReject}>
              <X className="mr-1 h-4 w-4" /> {t('contacts.reject')}
            </Button>
          </>
        )}
        {status === 'none' && onAdd && (
          <Button size="sm" disabled={isLoading} onClick={onAdd}>
            <UserPlus className="mr-1 h-4 w-4" /> {t('contacts.add')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ContactsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const userId = currentUser?.id;

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts', userId],
    queryFn: () => api.getContacts(),
    enabled: !!userId,
  });

  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['connections', 'pending', userId],
    queryFn: () => api.getConnections('pending'),
    enabled: !!userId,
  });

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['users', 'search', search],
    queryFn: () => api.searchUsers(search),
    enabled: search.trim().length >= 2,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] });
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  };

  const acceptMutation = useMutation({
    mutationFn: api.acceptConnection,
    onSuccess: () => {
      setActionError(null);
      setActionSuccess(t('contacts.accepted'));
      invalidateAll();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: api.rejectConnection,
    onSuccess: () => {
      setActionError(null);
      invalidateAll();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const sendMutation = useMutation({
    mutationFn: api.sendConnectionRequest,
    onSuccess: () => {
      setActionError(null);
      setActionSuccess(t('contacts.requestSent'));
      invalidateAll();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: api.removeConnection,
    onSuccess: () => {
      setActionError(null);
      invalidateAll();
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const incomingPending = useMemo(
    () => pending?.filter((c) => c.receiverId === currentUser?.id) ?? [],
    [pending, currentUser?.id],
  );

  const outgoingPending = useMemo(
    () => pending?.filter((c) => c.requesterId === currentUser?.id) ?? [],
    [pending, currentUser?.id],
  );

  const isMutating =
    acceptMutation.isPending ||
    rejectMutation.isPending ||
    sendMutation.isPending ||
    removeMutation.isPending;

  if (contactsLoading || pendingLoading) return <PageLoading />;

  const getStatus = (userId: string) =>
    getConnectionStatus(userId, currentUser?.id, contacts, pending);

  const findPendingConn = (targetUserId: string) =>
    userId ? pending?.find((c) => otherUserId(c, userId) === targetUserId) : undefined;

  return (
    <PageShell width="wide">
      <PageHeader title={t('contacts.title')} subtitle={t('contacts.subtitle')} />

      <SearchField
        value={search}
        onChange={(value) => {
          setSearch(value);
          setActionSuccess(null);
          setActionError(null);
        }}
        placeholder={t('contacts.searchPlaceholder')}
      />

      {actionError && <StatusBanner variant="error">{actionError}</StatusBanner>}
      {actionSuccess && <StatusBanner variant="success">{actionSuccess}</StatusBanner>}

      {search.trim().length >= 2 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t('contacts.results')}</h3>
          {searching ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : !searchResults?.length ? (
            <p className="text-sm text-muted-foreground">{t('contacts.noResults')}</p>
          ) : (
            searchResults.map((user) => {
              const status = getStatus(user.id);
              const pendingConn = findPendingConn(user.id);
              return (
                <UserRow
                  key={user.id}
                  user={user}
                  status={status}
                  isLoading={isMutating}
                  onAdd={
                    status === 'none'
                      ? () => sendMutation.mutate(user.id)
                      : undefined
                  }
                  onAccept={
                    status === 'pending_received' && pendingConn
                      ? () => acceptMutation.mutate(pendingConn.id)
                      : undefined
                  }
                  onReject={
                    status === 'pending_received' && pendingConn
                      ? () => rejectMutation.mutate(pendingConn.id)
                      : undefined
                  }
                  onCancel={
                    status === 'pending_sent' && pendingConn
                      ? () => removeMutation.mutate(pendingConn.id)
                      : undefined
                  }
                />
              );
            })
          )}
        </div>
      )}

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">
            {t('contacts.contactsTab', { count: contacts?.length ?? 0 })}
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t('contacts.pendingTab', { count: pending?.length ?? 0 })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          {!contacts?.length ? (
            <EmptyState
              icon={Users}
              title={t('contacts.noContacts')}
              description={t('contacts.noContactsDescription')}
            />
          ) : (
            <div className="space-y-2">
              {contacts.map((conn) => (
                <UserRow
                  key={conn.id}
                  user={userId ? resolveOtherUser(conn, userId) : conn.user}
                  status="accepted"
                  isLoading={isMutating}
                  onRemove={() => removeMutation.mutate(conn.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-6">
          {!pending?.length ? (
            <p className="text-center text-muted-foreground">{t('contacts.noPending')}</p>
          ) : (
            <>
              {incomingPending.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('contacts.incoming')}
                  </h3>
                  {incomingPending.map((conn) => (
                    <UserRow
                      key={conn.id}
                      user={userId ? resolveOtherUser(conn, userId) : conn.user}
                      status="pending_received"
                      isLoading={isMutating}
                      onAccept={() => acceptMutation.mutate(conn.id)}
                      onReject={() => rejectMutation.mutate(conn.id)}
                    />
                  ))}
                </div>
              )}
              {outgoingPending.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t('contacts.outgoing')}
                  </h3>
                  {outgoingPending.map((conn) => (
                    <UserRow
                      key={conn.id}
                      user={userId ? resolveOtherUser(conn, userId) : conn.user}
                      status="pending_sent"
                      isLoading={isMutating}
                      onCancel={() => removeMutation.mutate(conn.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
