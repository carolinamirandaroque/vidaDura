import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Trash2,
  ShoppingBag,
  FolderPlus,
  Home,
  LayoutGrid,
  Users,
  Share2,
  MoreHorizontal,
  Pencil,
  EyeOff,
  Eye,
  Settings2,
} from 'lucide-react';
import {
  Button,
  cn,
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
  HubGroupLabel,
  HubHint,
  SectionChipTabs,
  CollapsiblePanel,
  ShoppingHubRow,
  hubListClass,
  hubSectionClass,
} from '@/components/hub';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoading } from '@/components/layout/PageLoading';
import { EmptyState } from '@/components/shared/EmptyState';
import { ShoppingSectionDialog } from '@/components/shopping/ShoppingSectionDialog';
import { SortableShoppingItems } from '@/components/shopping/SortableShoppingItems';
import type { ShoppingReorderUpdate } from '@/lib/shopping-reorder';
import type { ShoppingListItem, ShoppingSection } from '@lifehub/types';
import { EntityAccessPanel } from '@/components/shared/EntityAccessPanel';
import { buildShoppingSectionAccessEntries } from '@/lib/entity-access';

const ALL_SECTIONS_ID = '__all__';

export function ShoppingListPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [newTitle, setNewTitle] = useState('');
  const [activeSectionId, setActiveSectionId] = useState(ALL_SECTIONS_ID);
  const [addAsInStock, setAddAsInStock] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createSectionOpen, setCreateSectionOpen] = useState(false);
  const [editSectionId, setEditSectionId] = useState<string | null>(null);

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

  const isAllSections = activeSectionId === ALL_SECTIONS_ID;

  useEffect(() => {
    if (!visibleSections.length) {
      setActiveSectionId('');
      return;
    }
    if (
      activeSectionId &&
      activeSectionId !== ALL_SECTIONS_ID &&
      !visibleSections.some((s) => s.id === activeSectionId)
    ) {
      setActiveSectionId(ALL_SECTIONS_ID);
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
  const activeSectionToBuy = useMemo(() => {
    if (isAllSections) return toBuy;
    return toBuy.filter((item) => item.sectionId === activeSectionId);
  }, [toBuy, activeSectionId, isAllSections]);

  const groupedToBuy = useMemo(
    () =>
      visibleSections
        .map((section) => ({
          section,
          items: activeSectionToBuy.filter((item) => item.sectionId === section.id),
        }))
        .filter((group) => group.items.length > 0),
    [activeSectionToBuy, visibleSections],
  );

  const uncategorizedToBuy = useMemo(
    () =>
      activeSectionToBuy.filter(
        (item) => !item.sectionId || !visibleSections.some((s) => s.id === item.sectionId),
      ),
    [activeSectionToBuy, visibleSections],
  );

  const activeSectionAtHome = useMemo(() => {
    if (isAllSections) return atHome;
    return atHome.filter((item) => item.sectionId === activeSectionId);
  }, [atHome, activeSectionId, isAllSections]);

  const groupedAtHome = useMemo(
    () =>
      visibleSections
        .map((section) => ({
          section,
          items: activeSectionAtHome.filter((item) => item.sectionId === section.id),
        }))
        .filter((group) => group.items.length > 0),
    [activeSectionAtHome, visibleSections],
  );

  const uncategorizedAtHome = useMemo(
    () =>
      activeSectionAtHome.filter(
        (item) => !item.sectionId || !visibleSections.some((s) => s.id === item.sectionId),
      ),
    [activeSectionAtHome, visibleSections],
  );

  const activeSection = isAllSections
    ? undefined
    : visibleSections.find((s) => s.id === activeSectionId);
  const editingSection = sections.find((s) => s.id === editSectionId);

  const invalidateDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createSectionMutation = useMutation({
    mutationFn: api.createShoppingSection,
    onSuccess: (section) => {
      setCreateSectionOpen(false);
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
      setEditSectionId(null);
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
      if (editSectionId === sectionId) setEditSectionId(null);
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

  const reorderMutation = useMutation({
    mutationFn: api.reorderShoppingItems,
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: shoppingListKey });
      const previous = queryClient.getQueryData<ShoppingListItem[]>(shoppingListKey);
      if (previous) {
        const positionById = new Map(updates.map((update) => [update.id, update.position]));
        const next = [...previous]
          .map((item) => {
            const position = positionById.get(item.id);
            return position === undefined ? item : { ...item, position };
          })
          .sort((a, b) => {
            const sectionA = a.sectionId ?? '';
            const sectionB = b.sectionId ?? '';
            if (sectionA !== sectionB) return sectionA.localeCompare(sectionB);
            return a.position - b.position;
          });
        queryClient.setQueryData(shoppingListKey, next);
      }
      return { previous };
    },
    onError: (_error, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(shoppingListKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListKey });
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

  if (loadingSections || loadingItems) return <PageLoading />;

  const handleAddItem = () => {
    const title = newTitle.trim();
    if (!title || !activeSectionId || isAllSections) return;
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

  const handleReorder = (updates: ShoppingReorderUpdate[]) => {
    reorderMutation.mutate(updates);
  };

  const renderSortableList = (
    listItems: ShoppingListItem[],
    render: (item: ShoppingListItem, dragHandle: React.ReactNode | null) => React.ReactNode,
  ) => (
    <ul className={cn(hubListClass, 'list-none')}>
      <SortableShoppingItems
        items={listItems}
        canDrag={!reorderMutation.isPending}
        onReorder={handleReorder}
        renderItem={render}
      />
    </ul>
  );

  const renderToBuyItem = (item: ShoppingListItem, dragHandle: React.ReactNode | null) => (
    <ShoppingHubRow
      title={item.title}
      dragHandle={dragHandle}
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

  const renderAtHomeItem = (item: ShoppingListItem, dragHandle: React.ReactNode | null) => (
    <ShoppingHubRow
      title={item.title}
      done
      dragHandle={dragHandle}
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

  const sectionTabs = [
    {
      id: ALL_SECTIONS_ID,
      label: t('shopping.allSections'),
      icon: <LayoutGrid className="h-3.5 w-3.5 opacity-70" />,
    },
    ...visibleSections.map((section) => {
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
            <DropdownMenuItem onClick={() => setEditSectionId(section.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('shopping.editSection')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditSectionId(section.id)}>
              <Share2 className="mr-2 h-4 w-4" />
              {t('shopping.manageSharing')}
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
    }),
  ];

  return (
    <PageShell width="wide" className="pb-6">
      <PageHeader
        title={t('shopping.title')}
        subtitle={t('shopping.subtitle')}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setCreateSectionOpen(true)}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            {t('shopping.addSection')}
          </Button>
        }
      />

      <div className={hubSectionClass}>
        {visibleSections.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={t('shopping.noSections')}
            description={t('shopping.noSectionsHint')}
            action={
              <Button onClick={() => setCreateSectionOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                {t('shopping.addSection')}
              </Button>
            }
          />
        ) : (
          <>
            <SectionChipTabs
              tabs={sectionTabs}
              activeId={activeSectionId}
              onChange={setActiveSectionId}
            />

            {activeSection?.isShared && (
              <EntityAccessPanel entries={buildShoppingSectionAccessEntries(activeSection)} />
            )}

            {activeSection && activeSection.ownerId !== currentUser?.id && (
              <HubHint>{t('shopping.sharedBy', { name: activeSection.owner?.name ?? '…' })}</HubHint>
            )}

            {isAllSections ? (
              <HubHint>{t('shopping.selectSectionToAdd')}</HubHint>
            ) : (
              <>
                <HubAddRow
                  value={newTitle}
                  onChange={setNewTitle}
                  onSubmit={handleAddItem}
                  placeholder={t('shopping.addPlaceholder')}
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
              </>
            )}

            <HubSection icon={ShoppingBag} title={t('shopping.toBuy')}>
              {activeSectionToBuy.length > 0 && (
                <HubHint>{t('shopping.dragHint')}</HubHint>
              )}
              {activeSectionToBuy.length > 0 ? (
                isAllSections ? (
                  <div className="space-y-4">
                    {groupedToBuy.map(({ section, items: sectionItems }) => (
                      <section key={section.id}>
                        <HubGroupLabel className="mb-2 flex items-center gap-1.5 normal-case text-primary">
                          {section.isShared && <Users className="h-3.5 w-3.5" />}
                          {section.name}
                        </HubGroupLabel>
                        {renderSortableList(sectionItems, renderToBuyItem)}
                      </section>
                    ))}
                    {uncategorizedToBuy.length > 0 && (
                      <section>
                        <HubGroupLabel className="mb-2 normal-case text-muted-foreground">
                          {t('shopping.otherSection')}
                        </HubGroupLabel>
                        {renderSortableList(uncategorizedToBuy, renderToBuyItem)}
                      </section>
                    )}
                  </div>
                ) : (
                  renderSortableList(activeSectionToBuy, renderToBuyItem)
                )
              ) : (
                <HubEmptyMessage>{t('shopping.empty')}</HubEmptyMessage>
              )}
            </HubSection>
          </>
        )}

        {hiddenSections.length > 0 && (
          <CollapsiblePanel
            title={
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                {t('shopping.hiddenSections')}
              </span>
            }
            hint={t('shopping.hiddenSectionsHint')}
          >
            <div className="flex flex-wrap gap-2">
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
          </CollapsiblePanel>
        )}

        {activeSectionAtHome.length > 0 && (
          <CollapsiblePanel
            variant="success"
            title={
              <span className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                {isAllSections
                  ? t('shopping.atHome', { count: activeSectionAtHome.length })
                  : t('shopping.atHomeInSection', {
                      section: activeSection?.name ?? t('shopping.otherSection'),
                      count: activeSectionAtHome.length,
                    })}
              </span>
            }
            hint={
              isAllSections
                ? t('shopping.atHomeHint')
                : t('shopping.atHomeHintInSection', {
                    section: activeSection?.name ?? t('shopping.otherSection'),
                  })
            }
          >
            {isAllSections ? (
              <div className="space-y-4">
                {groupedAtHome.map(({ section, items: sectionItems }) => (
                  <section key={section.id}>
                    <HubGroupLabel className="mb-2 flex items-center gap-1.5 normal-case text-emerald-700 dark:text-emerald-400">
                      {section.isShared && <Users className="h-3.5 w-3.5" />}
                      {section.name}
                    </HubGroupLabel>
                    {renderSortableList(sectionItems, renderAtHomeItem)}
                  </section>
                ))}
                {uncategorizedAtHome.length > 0 && (
                  <section>
                    <HubGroupLabel className="mb-2 normal-case text-muted-foreground">
                      {t('shopping.otherSection')}
                    </HubGroupLabel>
                    {renderSortableList(uncategorizedAtHome, renderAtHomeItem)}
                  </section>
                )}
              </div>
            ) : (
              renderSortableList(activeSectionAtHome, renderAtHomeItem)
            )}
          </CollapsiblePanel>
        )}
      </div>

      <ShoppingSectionDialog
        open={createSectionOpen}
        onOpenChange={setCreateSectionOpen}
        mode="create"
        contacts={contacts}
        isPending={createSectionMutation.isPending}
        onSubmit={({ name, memberIds }) =>
          createSectionMutation.mutate({
            name,
            memberIds: memberIds.length ? memberIds : undefined,
          })
        }
      />

      <ShoppingSectionDialog
        open={!!editSectionId}
        onOpenChange={(open) => {
          if (!open) setEditSectionId(null);
        }}
        mode="edit"
        section={editingSection}
        contacts={contacts}
        isPending={updateSectionMutation.isPending}
        onSubmit={({ name, memberIds }) => {
          if (!editingSection) return;
          updateSectionMutation.mutate({
            id: editingSection.id,
            name,
            memberIds,
          });
        }}
      />
    </PageShell>
  );
}
