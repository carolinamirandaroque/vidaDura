import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Trash2,
  ShoppingBag,
  FolderPlus,
  Home,
  Users,
  Share2,
  MoreHorizontal,
  Pencil,
  EyeOff,
  Eye,
} from 'lucide-react';
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@lifehub/ui';
import {
  HubSection,
  HubAddRow,
  HubEmptyMessage,
  SectionChipTabs,
  CollapsiblePanel,
  ShoppingHubRow,
  hubListClass,
} from '@/components/hub';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoading } from '@/components/layout/PageLoading';
import { EmptyState } from '@/components/shared/EmptyState';
import { InlineFormPanel } from '@/components/shared/InlineFormPanel';
import { ContactChipPicker } from '@/components/shared/ContactChipPicker';
import type { ShoppingListItem, ShoppingSection } from '@lifehub/types';
import { EntityAccessPanel } from '@/components/shared/EntityAccessPanel';
import { buildShoppingSectionAccessEntries } from '@/lib/entity-access';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shareNewSection, setShareNewSection] = useState(false);
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionName, setEditSectionName] = useState('');
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ['shopping-sections'],
    queryFn: () => api.getShoppingSections(),
  });

  const visibleSections = useMemo(() => sections.filter((s) => !s.hidden), [sections]);
  const hiddenSections = useMemo(() => sections.filter((s) => s.hidden), [sections]);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api.getContacts(),
  });

  const shoppingListKey = ['shopping-list', currentUser?.id] as const;

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: shoppingListKey,
    queryFn: () => api.getShoppingList(),
    enabled: !!currentUser?.id,
  });

  useEffect(() => {
    if (!visibleSections.length) {
      setActiveSectionId('');
      return;
    }
    if (!activeSectionId || !visibleSections.some((s) => s.id === activeSectionId)) {
      setActiveSectionId(visibleSections[0].id);
    }
  }, [visibleSections, activeSectionId]);

  const visibleItems = useMemo(
    () =>
      items?.filter((item) => {
        if (!item.eventItemId) return true;
        if (item.assigneeId) return item.assigneeId === currentUser?.id;
        return item.ownerId === currentUser?.id;
      }) ?? [],
    [items, currentUser?.id],
  );

  const toBuy = useMemo(() => visibleItems.filter((i) => !i.done), [visibleItems]);
  const atHome = useMemo(() => visibleItems.filter((i) => i.done), [visibleItems]);
  const groupedToBuy = useMemo(() => groupBySection(toBuy, visibleSections), [toBuy, visibleSections]);
  const uncategorizedToBuy = useMemo(
    () =>
      toBuy.filter(
        (item) => !item.sectionId || !visibleSections.some((s) => s.id === item.sectionId),
      ),
    [toBuy, visibleSections],
  );
  const uncategorizedAtHome = useMemo(
    () =>
      atHome.filter(
        (item) => !item.sectionId || !visibleSections.some((s) => s.id === item.sectionId),
      ),
    [atHome, visibleSections],
  );
  const activeSectionAtHome = useMemo(
    () =>
      activeSectionId
        ? atHome.filter((item) => item.sectionId === activeSectionId)
        : uncategorizedAtHome,
    [atHome, activeSectionId, uncategorizedAtHome],
  );

  const activeSection = visibleSections.find((s) => s.id === activeSectionId);
  const editingSection = sections.find((s) => s.id === editingSectionId);

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
    mutationFn: ({
      id,
      name,
      memberIds,
      hidden,
    }: {
      id: string;
      name?: string;
      memberIds?: string[];
      hidden?: boolean;
    }) => api.updateShoppingSection(id, { name, memberIds, hidden }),
    onSuccess: (section) => {
      queryClient.setQueryData<ShoppingSection[]>(['shopping-sections'], (old) =>
        old?.map((s) => (s.id === section.id ? section : s)) ?? [],
      );
      setEditingSectionId(null);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: api.deleteShoppingSection,
    onSuccess: (_, sectionId) => {
      queryClient.setQueryData<ShoppingSection[]>(['shopping-sections'], (old) =>
        old?.filter((s) => s.id !== sectionId) ?? [],
      );
      queryClient.setQueryData<ShoppingListItem[]>(shoppingListKey, (old) =>
        old?.map((item) =>
          item.sectionId === sectionId ? { ...item, sectionId: null, section: undefined } : item,
        ) ?? [],
      );
      if (editingSectionId === sectionId) setEditingSectionId(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: api.createShoppingItem,
    onSuccess: (item) => {
      setNewTitle('');
      setAddAsInStock(false);
      queryClient.setQueryData<ShoppingListItem[]>(shoppingListKey, (old) => {
        if (!old) return [item];
        if (old.some((i) => i.id === item.id)) return old;
        return [...old, item];
      });
      invalidateDashboard();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.updateShoppingItem(id, { done }),
    onSuccess: (updated) => {
      queryClient.setQueryData<ShoppingListItem[]>(shoppingListKey, (old) =>
        old?.map((item) => (item.id === updated.id ? updated : item)) ?? [],
      );
      invalidateDashboard();
      if (updated.eventItemId) {
        queryClient.invalidateQueries({ queryKey: ['event-detail'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
      }
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.updateShoppingItem(id, { title }),
    onSuccess: (updated) => {
      queryClient.setQueryData<ShoppingListItem[]>(shoppingListKey, (old) =>
        old?.map((item) => (item.id === updated.id ? updated : item)) ?? [],
      );
      if (updated.eventItemId) {
        queryClient.invalidateQueries({ queryKey: ['event-detail'] });
        queryClient.invalidateQueries({ queryKey: ['events'] });
      }
    },
  });

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    const previous = queryClient.getQueryData<ShoppingListItem[]>(shoppingListKey);
    queryClient.setQueryData<ShoppingListItem[]>(shoppingListKey, (old) =>
      old?.filter((item) => item.id !== id) ?? [],
    );
    setDeletingId(id);

    try {
      await api.deleteShoppingItem(id);
      invalidateDashboard();
    } catch {
      if (previous) {
        queryClient.setQueryData(shoppingListKey, previous);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const openSectionEdit = (section: ShoppingSection) => {
    setEditingSectionId(section.id);
    setEditSectionName(section.name);
    setEditMemberIds(section.members?.map((m) => m.userId) ?? []);
  };

  const handleDeleteSection = (section: ShoppingSection) => {
    const itemCount = (items ?? []).filter((item) => item.sectionId === section.id).length;
    const message = t('shopping.deleteSectionConfirm', {
      name: section.name,
      count: itemCount,
    });
    if (window.confirm(message)) {
      deleteSectionMutation.mutate(section.id);
    }
  };

  const handleSaveSection = () => {
    if (!editingSection) return;
    const name = editSectionName.trim();
    if (!name) return;
    updateSectionMutation.mutate({
      id: editingSection.id,
      name,
      memberIds: editMemberIds,
    });
  };

  if (loadingSections || loadingItems) return <PageLoading />;

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

  const shoppingContextLabel = (item: ShoppingListItem) => {
    const parts: string[] = [];
    if (item.eventTitle) parts.push(item.eventTitle);
    if (item.assignee && item.assigneeId !== currentUser?.id) {
      parts.push(t('shopping.assignedTo', { name: item.assignee.name }));
    }
    return parts.length > 0 ? parts.join(' · ') : undefined;
  };

  const renderToBuyItem = (item: ShoppingListItem) => (
    <ShoppingHubRow
      key={item.id}
      title={item.title}
      contextLabel={shoppingContextLabel(item)}
      assignee={item.assignee}
      deleting={deletingId === item.id}
      onToggle={() => toggleMutation.mutate({ id: item.id, done: true })}
      onTitleChange={async (title) => {
        await renameMutation.mutateAsync({ id: item.id, title });
      }}
      onDelete={() => void handleDelete(item.id)}
    />
  );

  const renderAtHomeItem = (item: ShoppingListItem) => (
    <ShoppingHubRow
      key={item.id}
      title={item.title}
      done
      contextLabel={shoppingContextLabel(item)}
      assignee={item.assignee}
      deleting={deletingId === item.id}
      restoreLabel={t('shopping.needToBuy')}
      onRestore={() => toggleMutation.mutate({ id: item.id, done: false })}
      onTitleChange={async (title) => {
        await renameMutation.mutateAsync({ id: item.id, title });
      }}
      onDelete={() => void handleDelete(item.id)}
    />
  );

  const sectionTabs = visibleSections.map((section) => {
    const isOwner = section.ownerId === currentUser?.id;
    return {
      id: section.id,
      label: section.name,
      icon: section.isShared ? <Users className="h-3.5 w-3.5 opacity-70" /> : undefined,
      menu: isOwner ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openSectionEdit(section)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('shopping.editSection')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openSectionEdit(section)}>
              <Share2 className="mr-2 h-4 w-4" />
              {t('shopping.shareSection')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={updateSectionMutation.isPending}
              onClick={() => updateSectionMutation.mutate({ id: section.id, hidden: true })}
            >
              <EyeOff className="mr-2 h-4 w-4" />
              {t('shopping.hideSection')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              disabled={deleteSectionMutation.isPending}
              onClick={() => handleDeleteSection(section)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('shopping.deleteSection')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : undefined,
    };
  });

  return (
    <PageShell width="narrow">
      <PageHeader title={t('shopping.title')} subtitle={t('shopping.subtitle')} />

      <InlineFormPanel title={t('shopping.addSection')}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder={t('shopping.newSectionPlaceholder')}
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
            className="min-w-0 flex-1"
          />
          <Button
            type="button"
            disabled={!newSectionName.trim() || createSectionMutation.isPending}
            onClick={handleAddSection}
            className="shrink-0"
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
          <div className="space-y-1.5 pl-0 sm:pl-6">
            <p className="text-xs text-muted-foreground">{t('shopping.shareSectionHint')}</p>
            <ContactChipPicker
              contacts={contacts}
              selectedIds={newMemberIds}
              onChange={setNewMemberIds}
            />
          </div>
        )}
      </InlineFormPanel>

      {hiddenSections.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-muted/20 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t('shopping.hiddenSections')}:</span>
          {hiddenSections.map((section) => (
            <Button
              key={section.id}
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={updateSectionMutation.isPending}
              onClick={() => updateSectionMutation.mutate({ id: section.id, hidden: false })}
            >
              <Eye className="h-3.5 w-3.5" />
              {section.name}
            </Button>
          ))}
        </div>
      )}

      {visibleSections.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={t('shopping.noSections')}
          description={t('shopping.noSectionsHint')}
        />
      ) : (
        <>
          <SectionChipTabs
            tabs={sectionTabs}
            activeId={activeSectionId}
            onChange={setActiveSectionId}
          />

          {activeSection && activeSection.isShared && (
            <EntityAccessPanel entries={buildShoppingSectionAccessEntries(activeSection)} />
          )}

          {editingSection && editingSection.ownerId === currentUser?.id && (
            <InlineFormPanel title={t('shopping.editSectionTitle')}>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground" htmlFor="edit-section-name">
                  {t('shopping.sectionName')}
                </label>
                <Input
                  id="edit-section-name"
                  value={editSectionName}
                  onChange={(e) => setEditSectionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveSection()}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">{t('shopping.shareSectionHint')}</p>
                <ContactChipPicker
                  contacts={contacts}
                  selectedIds={editMemberIds}
                  onChange={setEditMemberIds}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!editSectionName.trim() || updateSectionMutation.isPending}
                  onClick={handleSaveSection}
                >
                  {t('common.save')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingSectionId(null)}
                >
                  {t('common.close')}
                </Button>
              </div>
            </InlineFormPanel>
          )}

          {activeSection && activeSection.ownerId !== currentUser?.id && (
            <p className="text-xs text-muted-foreground">
              {t('shopping.sharedBy', { name: activeSection.owner?.name ?? '…' })}
            </p>
          )}

          <div className="space-y-2">
            <HubAddRow
              value={newTitle}
              onChange={setNewTitle}
              onSubmit={handleAddItem}
              placeholder={t('shopping.addPlaceholder')}
              disabled={!activeSectionId}
              isPending={createMutation.isPending}
            />
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

          <HubSection icon={ShoppingBag} title={t('shopping.toBuy')}>
            {toBuy.length ? (
              <div className="space-y-4">
                {groupedToBuy.map(
                  ({ section, items: sectionItems }) =>
                    sectionItems.length > 0 && (
                      <section key={section.id}>
                        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                          {section.isShared && <Users className="h-3.5 w-3.5" />}
                          {section.name}
                        </h3>
                        <div className={hubListClass}>
                          {sectionItems.map((item) => renderToBuyItem(item))}
                        </div>
                      </section>
                    ),
                )}
                {uncategorizedToBuy.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                      {t('shopping.otherSection')}
                    </h3>
                    <div className={hubListClass}>
                      {uncategorizedToBuy.map((item) => renderToBuyItem(item))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <HubEmptyMessage>{t('shopping.empty')}</HubEmptyMessage>
            )}
          </HubSection>
        </>
      )}

      {activeSectionAtHome.length > 0 && (
        <CollapsiblePanel
          variant="success"
          title={
            <span className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              {t('shopping.atHomeInSection', {
                section: activeSection?.name ?? t('shopping.otherSection'),
                count: activeSectionAtHome.length,
              })}
            </span>
          }
          hint={t('shopping.atHomeHintInSection', {
            section: activeSection?.name ?? t('shopping.otherSection'),
          })}
        >
          <div className={hubListClass}>
            {activeSectionAtHome.map((item) => renderAtHomeItem(item))}
          </div>
        </CollapsiblePanel>
      )}
    </PageShell>
  );
}
