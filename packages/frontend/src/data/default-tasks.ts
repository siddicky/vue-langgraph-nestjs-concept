import { TaskStatus, type Task } from '@todos/shared';

export const defaultTasks: Task[] = [
  { id: 1, title: 'Buy groceries', status: TaskStatus.todo },
  { id: 2, title: 'Clean the house', status: TaskStatus.todo },
  { id: 3, title: 'Walk the dog', status: TaskStatus.done },
];
