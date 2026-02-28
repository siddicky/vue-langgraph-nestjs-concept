import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { Task, PendingAction } from '@todos/shared';

export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  tasks: Annotation<Task[]>({
    reducer: (_prev: Task[], next: Task[]) => next,
    default: () => [],
  }),
  pendingActions: Annotation<PendingAction[]>({
    reducer: (_prev: PendingAction[], next: PendingAction[]) => next,
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentStateAnnotation.State;
