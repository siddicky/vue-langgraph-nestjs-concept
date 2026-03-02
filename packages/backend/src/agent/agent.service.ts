import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Command } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { buildAgentGraph } from './agent.graph';
import { ThreadService } from '../thread/thread.service';
import type { IAgentService, StreamRunBody } from './agent.service.interface';

export interface ThreadState {
  values: Record<string, any>;
  next: string[];
  checkpoint: { thread_id: string; checkpoint_id: string; checkpoint_ns: string };
  metadata: Record<string, any>;
  created_at: string;
  parent_checkpoint: { thread_id: string; checkpoint_id: string; checkpoint_ns: string } | null;
  tasks: Array<{ id: string; name: string; interrupts?: any[] }>;
}

@Injectable()
export class LocalAgentService implements IAgentService, OnModuleInit {
  private graph!: ReturnType<typeof buildAgentGraph>;

  constructor(private threadService: ThreadService) {}

  onModuleInit() {
    this.graph = buildAgentGraph(this.threadService.getCheckpointer());
  }

  createThread(): string {
    return this.threadService.generateThreadId();
  }

  async getState(threadId: string): Promise<ThreadState> {
    const config = { configurable: { thread_id: threadId } };
    const snapshot = await this.graph.getState(config);
    return this.snapshotToThreadState(snapshot, threadId);
  }

  async updateState(
    threadId: string,
    values: Record<string, any>,
    asNode?: string,
  ): Promise<{ configurable: { thread_id: string; checkpoint_id: string; checkpoint_ns: string } }> {
    const config = { configurable: { thread_id: threadId } };
    const result = await this.graph.updateState(config, values, asNode);
    return {
      configurable: this.configToCheckpoint(result, threadId),
    };
  }

  async *streamRun(
    threadId: string,
    body: StreamRunBody,
  ): AsyncGenerator<{ event: string; data: any }> {
    const config = { configurable: { thread_id: threadId } };
    const runId = randomUUID();

    // Emit metadata event
    yield { event: 'metadata', data: { run_id: runId, attempt: 1 } };

    // Determine input
    let streamInput: any;
    if (body.command) {
      streamInput = new Command({ resume: body.command.resume });
    } else if (body.input) {
      const input: Record<string, any> = {};
      if (body.input.messages) {
        input.messages = body.input.messages.map((m: any) => {
          if (m.type === 'human') return new HumanMessage(m.content);
          return m;
        });
      }
      if (body.input.tasks) {
        input.tasks = body.input.tasks;
      }
      streamInput = input;
    }

    // Stream with array mode [values, messages]
    const stream = await this.graph.stream(streamInput, {
      ...config,
      streamMode: ['values', 'messages'] as any,
    });

    for await (const chunk of stream) {
      const [mode, data] = chunk as [string, any];

      if (mode === 'values') {
        yield { event: 'values', data: this.serializeValues(data) };
      } else if (mode === 'messages') {
        const [msg, meta] = data as [any, any];
        yield {
          event: 'messages',
          data: [this.messageToDict(msg), { langgraph_checkpoint_ns: meta?.langgraph_checkpoint_ns || '' }],
        };
      }
    }

    // Check for interrupts after stream ends
    const finalState = await this.graph.getState(config);
    if (finalState.tasks && finalState.tasks.length > 0) {
      const interruptedTasks = finalState.tasks.filter(
        (t: any) => t.interrupts && t.interrupts.length > 0,
      );
      if (interruptedTasks.length > 0) {
        // Emit a final values event with the current state
        yield { event: 'values', data: this.serializeValues(finalState.values) };
      }
    }
  }

  async getHistory(
    threadId: string,
    limit: number = 10,
  ): Promise<ThreadState[]> {
    const config = { configurable: { thread_id: threadId } };
    const history: ThreadState[] = [];

    for await (const snapshot of this.graph.getStateHistory(config)) {
      history.push(this.snapshotToThreadState(snapshot, threadId));
      if (history.length >= limit) break;
    }

    return history;
  }

  private snapshotToThreadState(snapshot: any, threadId: string): ThreadState {
    const checkpoint = this.configToCheckpoint(snapshot.config, threadId);
    const parentCheckpoint = snapshot.parentConfig
      ? this.configToCheckpoint(snapshot.parentConfig, threadId)
      : null;

    return {
      values: this.serializeValues(snapshot.values || {}),
      next: snapshot.next || [],
      checkpoint,
      metadata: snapshot.metadata || {},
      created_at: snapshot.createdAt || new Date().toISOString(),
      parent_checkpoint: parentCheckpoint,
      tasks: (snapshot.tasks || []).map((t: any) => ({
        id: t.id || randomUUID(),
        name: t.name || '',
        ...(t.interrupts?.length ? { interrupts: t.interrupts } : {}),
      })),
    };
  }

  private configToCheckpoint(
    config: any,
    threadId: string,
  ): { thread_id: string; checkpoint_id: string; checkpoint_ns: string } {
    const configurable = config?.configurable || {};
    return {
      thread_id: configurable.thread_id || threadId,
      checkpoint_id: configurable.checkpoint_id || '',
      checkpoint_ns: configurable.checkpoint_ns || '',
    };
  }

  private serializeValues(values: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = { ...values };
    if (result.messages) {
      result.messages = result.messages.map((m: any) => this.messageToDict(m));
    }
    return result;
  }

  private messageToDict(msg: any): Record<string, any> {
    if (msg && typeof msg.toDict === 'function') {
      const dict = msg.toDict();
      return { ...dict.data, type: dict.type, id: dict.id || msg.id };
    }
    // Manual fallback
    return {
      type: msg?.type || msg?._getType?.() || 'unknown',
      content: msg?.content || '',
      id: msg?.id || '',
      ...(msg?.tool_calls ? { tool_calls: msg.tool_calls } : {}),
      ...(msg?.tool_call_id ? { tool_call_id: msg.tool_call_id } : {}),
    };
  }
}
