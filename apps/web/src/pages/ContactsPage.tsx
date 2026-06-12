import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Clock, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoading } from '@/components/layout/PageLoading';
import { SearchField } from '@/components/shared/SearchField';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ContactRow, type ConnectionStatus } from '@/components/contacts/ContactRow';
import {
  HubGroupLabel,
  HubSection,
  SectionChipTabs,
  hubListClass,
  hubSectionClass,
} from '@/components/hub';
import type { ConnectionWithUser, User } from '@lifehub/types';

type ContactsTab = 'contacts' | 'pending';

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

export function ContactsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ContactsTab>('contacts');
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
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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

  const getStatus = (targetUserId: string) =>
    getConnectionStatus(targetUserId, currentUser?.id, contacts, pending);

  const findPendingConn = (targetUserId: string) =>
    userId ? pending?.find((c) => otherUserId(c, userId) === targetUserId) : undefined;

  const tabs = [
    {
      id: 'contacts' as const,
      label: t('contacts.contactsTabShort', { count: contacts?.length ?? 0 }),
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      id: 'pending' as const,
      label: t('contacts.pendingTabShort', { count: pending?.length ?? 0 }),
      icon: <Clock className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <PageShell width="wide" className="pb-6">
      <PageHeader title={t('contacts.title')} subtitle={t('contacts.subtitle')} />

      <div className={hubSectionClass}>
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
          <section className={hubSectionClass}>
            <HubGroupLabel>{t('contacts.results')}</HubGroupLabel>
            {searching ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : !searchResults?.length ? (
              <p className="text-sm text-muted-foreground">{t('contacts.noResults')}</p>
            ) : (
              <div className={hubListClass}>
                {searchResults.map((user) => {
                  const status = getStatus(user.id);
                  const pendingConn = findPendingConn(user.id);
                  return (
                    <ContactRow
                      key={user.id}
                      user={user}
                      status={status}
                      isLoading={isMutating}
                      onAdd={status === 'none' ? () => sendMutation.mutate(user.id) : undefined}
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
                })}
              </div>
            )}
          </section>
        )}

        <SectionChipTabs
          tabs={tabs}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as ContactsTab)}
        />

        {activeTab === 'contacts' && (
          <HubSection icon={Users} title={t('contacts.contactsTabShort', { count: contacts?.length ?? 0 })}>
            {!contacts?.length ? (
              <EmptyState
                icon={Users}
                title={t('contacts.noContacts')}
                description={t('contacts.noContactsDescription')}
              />
            ) : (
              <div className={hubListClass}>
                {contacts.map((conn) => (
                  <ContactRow
                    key={conn.id}
                    user={userId ? resolveOtherUser(conn, userId) : conn.user}
                    status="accepted"
                    isLoading={isMutating}
                    onRemove={() => removeMutation.mutate(conn.id)}
                  />
                ))}
              </div>
            )}
          </HubSection>
        )}

        {activeTab === 'pending' && (
          <HubSection icon={Clock} title={t('contacts.pendingTabShort', { count: pending?.length ?? 0 })}>
            {!pending?.length ? (
              <EmptyState
                icon={Clock}
                title={t('contacts.noPending')}
                description={t('contacts.noPendingDescription')}
              />
            ) : (
              <>
                {incomingPending.length > 0 && (
                  <div className={hubSectionClass}>
                    <HubGroupLabel>{t('contacts.incoming')}</HubGroupLabel>
                    <div className={hubListClass}>
                      {incomingPending.map((conn) => (
                        <ContactRow
                          key={conn.id}
                          user={userId ? resolveOtherUser(conn, userId) : conn.user}
                          status="pending_received"
                          isLoading={isMutating}
                          onAccept={() => acceptMutation.mutate(conn.id)}
                          onReject={() => rejectMutation.mutate(conn.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {outgoingPending.length > 0 && (
                  <div className={hubSectionClass}>
                    <HubGroupLabel>{t('contacts.outgoing')}</HubGroupLabel>
                    <div className={hubListClass}>
                      {outgoingPending.map((conn) => (
                        <ContactRow
                          key={conn.id}
                          user={userId ? resolveOtherUser(conn, userId) : conn.user}
                          status="pending_sent"
                          isLoading={isMutating}
                          onCancel={() => removeMutation.mutate(conn.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </HubSection>
        )}
      </div>
    </PageShell>
  );
}
