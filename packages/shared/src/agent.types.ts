import type { Task } from './tasks.types';

export interface PendingAction {
  tool: 'addTask' | 'deleteTask' | 'setTaskStatus';
  args: Record<string, any>;
  toolCallId?: string;
}

export interface AgentState {
  messages: Array<{ role: string; content: string }>;
  tasks: Task[];
  pendingActions: PendingAction[];
}

export interface InterruptPayload {
  question: string;
  options: string[];
  pendingAction: PendingAction;
}

export type StreamEventType =
  | 'message_chunk'
  | 'state_update'
  | 'interrupt'
  | 'done'
  | 'error';

export interface StreamEvent {
  type: StreamEventType;
  data: any;
}
