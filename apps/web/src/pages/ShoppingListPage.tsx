import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  ShoppingCart,
  Trash2,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Home,
  Users,
  Share2,
} from 'lucide-react';
import { Button, Input } from '@lifehub/ui';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import type { ShoppingListItem, ShoppingSection } from '@lifehub/types';

function groupBySection(items: ShoppingListItem[], sections: ShoppingSection[]) {
  return sections.map((section) => ({
    section,
    items: items.filter((item) => item.sectionId === section.id),
  }));
}

export function ShoppingListPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [newTitle, setNewTitle] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [activeSectionId, setActiveSectionId] = useState('');
  const [addAsInStock, setAddAsInStock] = useState(false);
  const [showAtHome, setShowAtHome] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareNewSection, setShareNewSection] = useState(false);
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [sharingSectionId, setSharingSectionId] = useState<string | null>(null);
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ['shopping-sections'],
    queryFn: () => api.getShoppingSections(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.getContacts(),
  });

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ['shopping-list'],
    queryFn: () => api.getShoppingList(),
  });

  useEffect(() => {
    if (!sections.length) {
      setActiveSectionId('');
      return;
    }
    if (!activeSectionId || !sections.some((s) => s.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  const toBuy = useMemo(() => items?.filter((i) => !i.done) ?? [], [items]);
  const atHome = useMemo(() => items?.filter((i) => i.done) ?? [], [items]);
  const groupedToBuy = useMemo(() => groupBySection(toBuy, sections), [toBuy, sections]);
  const groupedAtHome = useMemo(() => groupBySection(atHome, sections), [atHome, sections]);
  const uncategorizedToBuy = useMemo(
    () => toBuy.filter((item) => !item.sectionId || !sections.some((s) => s.id === item.sectionId)),
    [toBuy, sections],
  );
  const uncategorizedAtHome = useMemo(
    () => atHome.filter((item) => !item.sectionId || !sections.some((s) => s.id === item.sectionId)),
    [atHome, sections],
  );

  const activeSection = sections.find((s) => s.id === activeSectionId);
  const sharingSection = sections.find((s) => s.id === sharingSectionId);

  const invalidateDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createSectionMutation = useMutation({
    mutationFn: api.createShoppingSection,
    onSuccess: (section) => {
      setNewSectionName('');
      setShareNewSection(false);
      setNewMemberIds([]);
      queryClient.setQueryData<ShoppingSection[]>(['shopping-sections'], (old) =>
        old ? [...old, section] : [section],
      );
      setActiveSectionId(section.id);
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, memberIds }: { id: string; memberIds: string[] }) =>
      api.updateShoppingSection(id, { memberIds }),
    onSuccess: (section) => {
      queryClient.setQueryData<ShoppingSection[]>(['shopping-sections'], (old) =>
        old?.map((s) => (s.id === section.id ? section : s)) ?? [],
      );
      setSharingSectionId(null);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: api.deleteShoppingSection,
    onSuccess: (_, sectionId) => {
      queryClient.setQueryData<ShoppingSection[]>(['shopping-sections'], (old) =>
        old?.filter((s) => s.id !== sectionId) ?? [],
      );
      queryClient.setQueryData<ShoppingListItem[]>(['shopping-list'], (old) =>
        old?.map((item) =>
          item.sectionId === sectionId ? { ...item, sectionId: null, section: undefined } : item,
        ) ?? [],
      );
      if (sharingSectionId === sectionId) setSharingSectionId(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: api.createShoppingItem,
    onSuccess: (item) => {
      setNewTitle('');
      setAddAsInStock(false);
      queryClient.setQueryData<ShoppingListItem[]>(['shopping-list'], (old) => {
        if (!old) return [item];
        if (old.some((i) => i.id === item.id)) return old;
        return [...old, item];
      });
      if (item.done) setShowAtHome(true);
      invalidateDashboard();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.updateShoppingItem(id, { done }),
    onSuccess: (updated) => {
      queryClient.setQueryData<ShoppingListItem[]>(['shopping-list'], (old) =>
        old?.map((item) => (item.id === updated.id ? updated : item)) ?? [],
      );
      if (updated.done) setShowAtHome(true);
      invalidateDashboard();
    },
  });

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    const previous = queryClient.getQueryData<ShoppingListItem[]>(['shopping-list']);
    queryClient.setQueryData<ShoppingListItem[]>(['shopping-list'], (old) =>
      old?.filter((item) => item.id !== id) ?? [],
    );
    setDeletingId(id);

    try {
      await api.deleteShoppingItem(id);
      invalidateDashboard();
    } catch {
      if (previous) {
        queryClient.setQueryData(['shopping-list'], previous);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const toggleMember = (userId: string, list: string[], setList: (ids: string[]) => void) => {
    setList(list.includes(userId) ? list.filter((id) => id !== userId) : [...list, userId]);
  };

  const openSharing = (section: ShoppingSection) => {
    setSharingSectionId(section.id);
    setEditMemberIds(section.members?.map((m) => m.userId) ?? []);
  };

  const renderContactPicker = (
    selectedIds: string[],
    onChange: (ids: string[]) => void,
  ) => {
    if (!contacts.length) {
      return <p className="text-xs text-muted-foreground">{t('shopping.noContacts')}</p>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {contacts.map((c) => {
          const user = c.user;
          const checked = selectedIds.includes(user.id);
          return (
            <label
              key={c.id}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                checked ? 'border-primary bg-primary/10 text-primary' : 'border-border'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() => toggleMember(user.id, selectedIds, onChange)}
              />
              {user.name}
            </label>
          );
        })}
      </div>
    );
  };

  if (loadingSections || loadingItems) return <LoadingSpinner />;

  const handleAddSection = () => {
    const name = newSectionName.trim();
    if (!name) return;
    createSectionMutation.mutate({
      name,
      memberIds: shareNewSection && newMemberIds.length ? newMemberIds : undefined,
    });
  };

  const handleAddItem = () => {
    const title = newTitle.trim();
    if (!title || !activeSectionId) return;
    createMutation.mutate({ title, sectionId: activeSectionId, inStock: addAsInStock });
  };

  const renderToBuyItem = (item: ShoppingListItem) => (
    <li
      key={item.id}
      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3 shadow-sm"
    >
      <input
        type="checkbox"
        checked={false}
        title={t('shopping.markInStock')}
        onChange={() => toggleMutation.mutate({ id: item.id, done: true })}
        className="h-4 w-4 shrink-0 rounded"
      />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{item.title}</span>
        {item.eventTitle && (
          <p className="truncate text-xs text-muted-foreground">{item.eventTitle}</p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        disabled={deletingId === item.id}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleDelete(item.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );

  const renderAtHomeItem = (item: ShoppingListItem) => (
    <li
      key={item.id}
      className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
    >
      <Home className="h-4 w-4 shrink-0 text-emerald-600" />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{item.title}</span>
        {item.eventTitle && (
          <p className="truncate text-xs text-muted-foreground">{item.eventTitle}</p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 text-xs"
        title={t('shopping.needToBuy')}
        onClick={() => toggleMutation.mutate({ id: item.id, done: false })}
      >
        <ShoppingBag className="mr-1 h-3.5 w-3.5" />
        {t('shopping.needToBuy')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        disabled={deletingId === item.id}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleDelete(item.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('shopping.title')}</h1>
        <p className="text-muted-foreground">{t('shopping.subtitle')}</p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
        <p className="text-sm font-medium">{t('shopping.addSection')}</p>
        <div className="flex gap-2">
          <Input
            placeholder={t('shopping.newSectionPlaceholder')}
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
          />
          <Button
            type="button"
            disabled={!newSectionName.trim() || createSectionMutation.isPending}
            onClick={handleAddSection}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shareNewSection}
            onChange={(e) => {
              setShareNewSection(e.target.checked);
              if (!e.target.checked) setNewMemberIds([]);
            }}
            className="h-4 w-4 rounded"
          />
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {t('shopping.shareSection')}
        </label>
        {shareNewSection && (
          <div className="space-y-1.5 pl-6">
            <p className="text-xs text-muted-foreground">{t('shopping.shareSectionHint')}</p>
            {renderContactPicker(newMemberIds, setNewMemberIds)}
          </div>
        )}
      </div>

      {sections.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={t('shopping.noSections')}
          description={t('shopping.noSectionsHint')}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => {
              const isOwner = section.ownerId === currentUser?.id;
              const memberNames = section.members?.map((m) => m.user?.name).filter(Boolean) ?? [];

              return (
                <div key={section.id} className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={activeSectionId === section.id ? 'default' : 'outline'}
                    onClick={() => setActiveSectionId(section.id)}
                    className="gap-1.5"
                  >
                    {section.isShared && <Users className="h-3.5 w-3.5 opacity-70" />}
                    {section.name}
                  </Button>
                  {isOwner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      title={t('shopping.manageSharing')}
                      onClick={() => openSharing(section)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isOwner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={deleteSectionMutation.isPending}
                      onClick={() => deleteSectionMutation.mutate(section.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {section.isShared && memberNames.length > 0 && (
                    <span className="sr-only">
                      {t('shopping.sharedWith', { names: memberNames.join(', ') })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {sharingSection && sharingSection.ownerId === currentUser?.id && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <p className="text-sm font-medium">
                {t('shopping.manageSharing')} · {sharingSection.name}
              </p>
              <p className="text-xs text-muted-foreground">{t('shopping.shareSectionHint')}</p>
              {renderContactPicker(editMemberIds, setEditMemberIds)}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={updateSectionMutation.isPending}
                  onClick={() =>
                    updateSectionMutation.mutate({
                      id: sharingSection.id,
                      memberIds: editMemberIds,
                    })
                  }
                >
                  {t('common.save')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSharingSectionId(null)}
                >
                  {t('common.close')}
                </Button>
              </div>
            </div>
          )}

          {activeSection && activeSection.ownerId !== currentUser?.id && (
            <p className="text-xs text-muted-foreground">
              {t('shopping.sharedBy', { name: activeSection.owner?.name ?? '…' })}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={t('shopping.addPlaceholder')}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              />
              <Button
                type="button"
                disabled={!newTitle.trim() || !activeSectionId || createMutation.isPending}
                onClick={handleAddItem}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={addAsInStock}
                onChange={(e) => setAddAsInStock(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <Home className="h-3.5 w-3.5" />
              {t('shopping.inStock')}
            </label>
          </div>

          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingBag className="h-4 w-4" />
              {t('shopping.toBuy')}
            </h2>
            {toBuy.length ? (
              <div className="space-y-5">
                {groupedToBuy.map(
                  ({ section, items: sectionItems }) =>
                    sectionItems.length > 0 && (
                      <section key={section.id}>
                        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                          {section.isShared && <Users className="h-3.5 w-3.5" />}
                          {section.name}
                        </h3>
                        <ul className="space-y-2">
                          {sectionItems.map((item) => renderToBuyItem(item))}
                        </ul>
                      </section>
                    ),
                )}
                {uncategorizedToBuy.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                      {t('shopping.otherSection')}
                    </h3>
                    <ul className="space-y-2">
                      {uncategorizedToBuy.map((item) => renderToBuyItem(item))}
                    </ul>
                  </section>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('shopping.empty')}</p>
            )}
          </div>
        </>
      )}

      {atHome.length > 0 && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
          <button
            type="button"
            onClick={() => setShowAtHome(!showAtHome)}
            className="flex w-full items-center justify-between text-sm font-semibold text-emerald-700 dark:text-emerald-400"
          >
            <span className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {t('shopping.atHome', { count: atHome.length })}
            </span>
            {showAtHome ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <p className="text-xs text-muted-foreground">{t('shopping.atHomeHint')}</p>
          {showAtHome && (
            <div className="space-y-4 pt-1">
              {groupedAtHome.map(
                ({ section, items: sectionItems }) =>
                  sectionItems.length > 0 && (
                    <section key={section.id}>
                      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600/80">
                        {section.name}
                      </h3>
                      <ul className="space-y-1.5">
                        {sectionItems.map((item) => renderAtHomeItem(item))}
                      </ul>
                    </section>
                  ),
              )}
              {uncategorizedAtHome.length > 0 && (
                <section>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('shopping.otherSection')}
                  </h3>
                  <ul className="space-y-1.5">
                    {uncategorizedAtHome.map((item) => renderAtHomeItem(item))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
