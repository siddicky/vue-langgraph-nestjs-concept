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
  pendingAction: Annotation<PendingAction | null>({
    reducer: (_prev: PendingAction | null, next: PendingAction | null) => next,
    default: () => null,
  }),
});

export type AgentStateType = typeof AgentStateAnnotation.State;
