import { Injectable, Inject } from '@nestjs/common';
import { Client } from '@langchain/langgraph-sdk';
import { LANGGRAPH_CLIENT } from '../langgraph-sdk/langgraph-sdk.constants';
import type { ThreadState } from './agent.service';
import type { IAgentService, StreamRunBody } from './agent.service.interface';

@Injectable()
export class RemoteAgentService implements IAgentService {
  constructor(
    @Inject(LANGGRAPH_CLIENT) private client: Client,
  ) {}

  async createThread(): Promise<string> {
    const thread = await this.client.threads.create();
    return thread.thread_id;
  }

  async getState(threadId: string): Promise<ThreadState> {
    const state = await this.client.threads.getState(threadId);
    return this.mapToThreadState(state, threadId);
  }

  async updateState(
    threadId: string,
    values: Record<string, any>,
    asNode?: string,
  ): Promise<{
    configurable: {
      thread_id: string;
      checkpoint_id: string;
      checkpoint_ns: string;
    };
  }> {
    const result = await this.client.threads.updateState(threadId, {
      values,
      ...(asNode ? { asNode } : {}),
    });
    const configurable = (result as any)?.configurable || {};
    return {
      configurable: {
        thread_id: configurable.thread_id || threadId,
        checkpoint_id: configurable.checkpoint_id || '',
        checkpoint_ns: configurable.checkpoint_ns || '',
      },
    };
  }

  async *streamRun(
    threadId: string,
    body: StreamRunBody,
  ): AsyncGenerator<{ event: string; data: any }> {
    const assistantId = body.assistant_id || 'agent';
    const payload: Record<string, any> = {};

    if (body.command) {
      payload.command = body.command;
    } else if (body.input) {
      payload.input = body.input;
    }

    if (body.stream_mode) {
      payload.streamMode = body.stream_mode;
    } else {
      payload.streamMode = ['values', 'messages'];
    }

    const stream = this.client.runs.stream(threadId, assistantId, payload);

    for await (const event of stream) {
      yield { event: event.event, data: event.data };
    }
  }

  async getHistory(
    threadId: string,
    limit: number = 10,
  ): Promise<ThreadState[]> {
    const history = await this.client.threads.getHistory(threadId, { limit });
    return history.map((s: any) => this.mapToThreadState(s, threadId));
  }

  private mapToThreadState(state: any, threadId: string): ThreadState {
    const checkpoint = state.checkpoint || {};
    const parentCheckpoint = state.parent_checkpoint || null;

    return {
      values: state.values || {},
      next: state.next || [],
      checkpoint: {
        thread_id: checkpoint.thread_id || threadId,
        checkpoint_id: checkpoint.checkpoint_id || '',
        checkpoint_ns: checkpoint.checkpoint_ns || '',
      },
      metadata: state.metadata || {},
      created_at: state.created_at || new Date().toISOString(),
      parent_checkpoint: parentCheckpoint
        ? {
            thread_id: parentCheckpoint.thread_id || threadId,
            checkpoint_id: parentCheckpoint.checkpoint_id || '',
            checkpoint_ns: parentCheckpoint.checkpoint_ns || '',
          }
        : null,
      tasks: (state.tasks || []).map((t: any) => ({
        id: t.id || '',
        name: t.name || '',
        ...(t.interrupts?.length ? { interrupts: t.interrupts } : {}),
      })),
    };
  }
}
