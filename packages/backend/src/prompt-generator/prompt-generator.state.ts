import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

export const PromptGeneratorStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  isInterrupted: Annotation<boolean>({
    reducer: (_prev: boolean, next: boolean) => next,
    default: () => false,
  }),
});

export type PromptGeneratorStateType = typeof PromptGeneratorStateAnnotation.State;
