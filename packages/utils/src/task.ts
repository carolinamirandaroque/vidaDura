import type { Task, TaskStatus } from '@lifehub/types';

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
      .filter(predicate)
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
