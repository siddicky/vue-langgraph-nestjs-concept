import type { ThreadState } from './agent.service';

export interface StreamRunBody {
  input?: Record<string, any> | null;
  command?: { resume: any };
  assistant_id?: string;
  stream_mode?: string[];
}

export interface IAgentService {
  createThread(): string | Promise<string>;
  getState(threadId: string): Promise<ThreadState>;
  updateState(
    threadId: string,
    values: Record<string, any>,
    asNode?: string,
  ): Promise<{
    configurable: {
      thread_id: string;
      checkpoint_id: string;
      checkpoint_ns: string;
    };
  }>;
  streamRun(
    threadId: string,
    body: StreamRunBody,
  ): AsyncGenerator<{ event: string; data: any }>;
  getHistory(threadId: string, limit?: number): Promise<ThreadState[]>;
}
