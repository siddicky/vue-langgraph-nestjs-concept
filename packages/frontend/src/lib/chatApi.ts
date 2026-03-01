import { Client } from '@langchain/langgraph-sdk';
import type { LangChainMessage, LangGraphMessagesEvent } from '@assistant-ui/vue-langgraph';

let clientInstance: Client | null = null;

const getClient = () => {
  if (!clientInstance) {
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    clientInstance = new Client({ apiUrl });
  }
  return clientInstance;
};

export const createThread = async () => {
  const client = getClient();
  return client.threads.create();
};

export const getThreadState = async (threadId: string) => {
  const client = getClient();
  return client.threads.getState(threadId);
};

export const updateThreadState = async (
  threadId: string,
  values: Record<string, unknown>,
) => {
  const client = getClient();
  return client.threads.updateState(threadId, { values });
};

export const sendMessage = (params: {
  threadId: string;
  messages: LangChainMessage[];
  tasks?: unknown[];
}): AsyncGenerator<LangGraphMessagesEvent<LangChainMessage>> => {
  const client = getClient();

  const input: Record<string, unknown> = {
    messages: params.messages,
  };
  if (params.tasks) {
    input.tasks = params.tasks;
  }

  return client.runs.stream(params.threadId, 'agent', {
    input,
    streamMode: ['values', 'messages'],
  }) as AsyncGenerator<LangGraphMessagesEvent<LangChainMessage>>;
};

export const resumeThread = (params: {
  threadId: string;
  response: string;
}): AsyncGenerator<LangGraphMessagesEvent<LangChainMessage>> => {
  const client = getClient();

  return client.runs.stream(params.threadId, 'agent', {
    input: null,
    command: { resume: params.response },
    streamMode: ['values', 'messages'],
  }) as AsyncGenerator<LangGraphMessagesEvent<LangChainMessage>>;
};
