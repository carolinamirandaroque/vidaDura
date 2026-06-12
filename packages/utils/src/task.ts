import type { Task, TaskStatus } from '@lifehub/types';

export function isEventRootTask(task: Pick<Task, 'eventId' | 'parentTaskId'>): boolean {
  return Boolean(task.eventId && !task.parentTaskId);
}

/**
 * Personal task list visibility for event tasks:
 * - assigned → only the assignee sees it
 * - unassigned → only the task owner (creator) sees it; other collaborators see it in the event hub only
 */
export function isPersonalEventTaskVisible(
  task: Pick<Task, 'eventId' | 'assigneeId' | 'ownerId'>,
  userId: string,
): boolean {
  if (!task.eventId) return true;
  if (task.assigneeId) return task.assigneeId === userId;
  return task.ownerId === userId;
}

type EventTaskNode = Pick<Task, 'id' | 'eventId' | 'assigneeId' | 'ownerId' | 'parentTaskId'>;

/** IDs visible on the personal list, including ancestor context but skipping unassigned event roots. */
export function collectVisibleEventTaskIds(eventTasks: EventTaskNode[], userId: string): Set<string> {
  const visibleIds = new Set<string>();
  const byId = new Map(eventTasks.map((task) => [task.id, task]));

  for (const task of eventTasks) {
    if (!isPersonalEventTaskVisible(task, userId)) continue;
    let current: EventTaskNode | undefined = task;
    while (current) {
      if (isEventRootTask(current)) {
        if (isPersonalEventTaskVisible(current, userId)) {
          visibleIds.add(current.id);
        }
        break;
      }
      visibleIds.add(current.id);
      current = current.parentTaskId ? byId.get(current.parentTaskId) : undefined;
    }
  }

  return visibleIds;
}

export function calculateCompletionPercentage(task: Task): number {
  if (!task.children || task.children.length === 0) {
    return task.status === 'done' ? 100 : 0;
  }

  const childPercentages = task.children.map((child) => calculateCompletionPercentage(child));
  const total = childPercentages.reduce((sum, p) => sum + p, 0);
  return Math.round(total / childPercentages.length);
}

export function flattenTasks(tasks: Task[]): Task[] {
  const result: Task[] = [];
  const traverse = (taskList: Task[]) => {
    for (const task of taskList) {
      result.push(task);
      if (task.children?.length) {
        traverse(task.children);
      }
    }
  };
  traverse(tasks);
  return result;
}

export function buildTaskTree(tasks: Task[]): Task[] {
  const map = new Map<string, Task>();
  const roots: Task[] = [];

  for (const task of tasks) {
    map.set(task.id, { ...task, children: [] });
  }

  for (const task of tasks) {
    const node = map.get(task.id)!;
    if (task.parentTaskId && map.has(task.parentTaskId)) {
      map.get(task.parentTaskId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const addCompletion = (node: Task): Task => ({
    ...node,
    completionPercentage: calculateCompletionPercentage(node),
    children: node.children?.map(addCompletion),
  });

  return roots.map(addCompletion);
}

export function countTasksByStatus(tasks: Task[], status: TaskStatus): number {
  return flattenTasks(tasks).filter((t) => t.status === status).length;
}

export function filterTaskTree(tasks: Task[], predicate: (task: Task) => boolean): Task[] {
  const filter = (taskList: Task[]): Task[] => {
    return taskList
      .map((task) => ({
        ...task,
        children: task.children ? filter(task.children) : [],
      }))
      .filter((task) => predicate(task) || (task.children && task.children.length > 0));
  };
  return filter(tasks);
}

export function searchTasks(tasks: Task[], query: string): Task[] {
  const lower = query.toLowerCase();
  return filterTaskTree(
    tasks,
    (task) =>
      task.title.toLowerCase().includes(lower) ||
      (task.description?.toLowerCase().includes(lower) ?? false),
  );
}
