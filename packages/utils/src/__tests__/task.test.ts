import { describe, it, expect } from 'vitest';
import { calculateCompletionPercentage, buildTaskTree } from '../task';
import type { Task } from '@lifehub/types';

function task(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    eventId: null,
    parentTaskId: null,
    ownerId: 'u1',
    assigneeId: null,
    description: null,
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    position: 0,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('task utils', () => {
  it('calculates 100% for done leaf task', () => {
    const t = task({ id: '1', title: 'Test', status: 'done' });
    expect(calculateCompletionPercentage(t)).toBe(100);
  });

  it('calculates average completion for parent tasks', () => {
    const parent = task({
      id: '1',
      title: 'Parent',
      children: [
        task({ id: '2', title: 'Child 1', parentTaskId: '1', status: 'done' }),
        task({ id: '3', title: 'Child 2', parentTaskId: '1', position: 1 }),
      ],
    });
    expect(calculateCompletionPercentage(parent)).toBe(50);
  });

  it('builds task tree from flat list', () => {
    const tasks: Task[] = [
      task({ id: '1', title: 'Root' }),
      task({ id: '2', title: 'Child', parentTaskId: '1' }),
    ];
    const tree = buildTaskTree(tasks);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
  });
});
