import { Annotation, messagesStateReducer } from '@langchain/langgraph'
import { BaseMessage } from '@langchain/core/messages'
import { Task } from '@todos/shared'
import { PendingAction } from '@todos/shared'

export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  tasks: Annotation<Task[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  pendingAction: Annotation<PendingAction | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
})

export type AgentStateType = typeof AgentStateAnnotation.State
