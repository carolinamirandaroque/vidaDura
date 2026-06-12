export interface ShoppingReorderUpdate {
  id: string;
  position: number;
}

export function buildShoppingReorderUpdates(orderedIds: string[]): ShoppingReorderUpdate[] {
  return orderedIds.map((id, position) => ({ id, position }));
}

export function reorderShoppingItems<T extends { id: string }>(
  items: T[],
  orderedIds: string[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return orderedIds.map((id) => byId.get(id)).filter((item): item is T => Boolean(item));
}
