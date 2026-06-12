import type { Task } from '@lifehub/types';

export interface TaskReorderUpdate {
  id: string;
  position: number;
  parentTaskId: string | null;
}

export function resolveSiblingParentId(tasks: Task[]): string | null {
  if (tasks.length === 0) return null;
  const parents = new Set(tasks.map((task) => task.parentTaskId ?? null));
  return parents.size === 1 ? [...parents][0] : null;
}

export function buildReorderUpdates(
  orderedIds: string[],
  parentTaskId: string | null,
): TaskReorderUpdate[] {
  return orderedIds.map((id, position) => ({ id, position, parentTaskId }));
}

export function reorderSiblingTree(
  tree: Task[],
  parentTaskId: string | null,
  orderedIds: string[],
): Task[] {
  const mapById = (items: Task[]) => new Map(items.map((task) => [task.id, task]));

  const map = mapById(tree);
  const allSiblingsTopLevel = orderedIds.every((id) => map.has(id));
  const parentVisible = parentTaskId !== null && tree.some((node) => node.id === parentTaskId);

  if (parentTaskId === null || (allSiblingsTopLevel && !parentVisible)) {
    return orderedIds.map((id) => map.get(id)).filter((task): task is Task => Boolean(task));
  }

  const reorderChildren = (nodes: Task[]): Task[] =>
    nodes.map((node) => {
      if (node.id === parentTaskId) {
        const map = mapById(node.children ?? []);
        return {
          ...node,
          children: orderedIds.map((id) => map.get(id)).filter((task): task is Task => Boolean(task)),
        };
      }
      if (node.children?.length) {
        return { ...node, children: reorderChildren(node.children) };
      }
      return node;
    });

  return reorderChildren(tree);
}
