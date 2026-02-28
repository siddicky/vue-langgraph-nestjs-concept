import { Task, TaskStatus } from '@todos/shared'

export const defaultTasks: Task[] = [
  { id: 1, title: 'Buy groceries', status: TaskStatus.todo },
  { id: 2, title: 'Walk the dog', status: TaskStatus.todo },
  { id: 3, title: 'Read a book', status: TaskStatus.done },
  { id: 4, title: 'Write unit tests', status: TaskStatus.todo },
  { id: 5, title: 'Learn LangGraph.js', status: TaskStatus.todo },
]
