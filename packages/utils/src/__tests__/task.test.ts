import { describe, it, expect } from 'vitest';
import {
  calculateCompletionPercentage,
  buildTaskTree,
  collectVisibleEventTaskIds,
  isPersonalEventTaskVisible,
} from '../task';
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

describe('personal event task visibility', () => {
  const eventId = 'evt-1';
  const carolina = 'carolina';
  const maria = 'maria';

  it('shows assigned subtask to assignee with ancestor chain, not event root', () => {
    const eventTasks: Task[] = [
      task({ id: 'root', title: 'Ida a Reguengos', eventId, ownerId: carolina }),
      task({
        id: 'parent',
        title: 'Comprar coisas',
        eventId,
        parentTaskId: 'root',
        ownerId: carolina,
      }),
      task({
        id: 'leaf',
        title: 'Comprar gin',
        eventId,
        parentTaskId: 'parent',
        ownerId: carolina,
        assigneeId: maria,
      }),
    ];

    const visible = collectVisibleEventTaskIds(eventTasks, maria);
    expect(visible.has('root')).toBe(false);
    expect(visible.has('parent')).toBe(true);
    expect(visible.has('leaf')).toBe(true);
  });

  it('hides subtask assigned to someone else', () => {
    const eventTasks: Task[] = [
      task({
        id: 'leaf',
        title: 'Comprar gin',
        eventId,
        parentTaskId: 'parent',
        ownerId: carolina,
        assigneeId: maria,
      }),
    ];

    expect(collectVisibleEventTaskIds(eventTasks, carolina).size).toBe(0);
  });

  it('shows event root when assigned to user', () => {
    const eventTasks: Task[] = [
      task({
        id: 'root',
        title: 'Ida a Reguengos',
        eventId,
        ownerId: carolina,
        assigneeId: maria,
      }),
    ];

    const visible = collectVisibleEventTaskIds(eventTasks, maria);
    expect(visible.has('root')).toBe(true);
  });

  it('shows unassigned task only to owner', () => {
    const unassigned = task({
      id: 't1',
      title: 'Preparar mala',
      eventId,
      ownerId: carolina,
    });

    expect(isPersonalEventTaskVisible(unassigned, carolina)).toBe(true);
    expect(isPersonalEventTaskVisible(unassigned, maria)).toBe(false);
  });

  it('shows non-event tasks to everyone in list', () => {
    const personal = task({ id: 'p1', title: 'Lavar roupa', ownerId: carolina });
    expect(isPersonalEventTaskVisible(personal, maria)).toBe(true);
  });
});
