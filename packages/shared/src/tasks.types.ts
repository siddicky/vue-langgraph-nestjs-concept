export enum TaskStatus {
  todo = 'todo',
  done = 'done',
}

export interface Task {
  id: number
  title: string
  status: TaskStatus
}
