import { Injectable, OnModuleInit } from '@nestjs/common';
import { Command } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { buildAgentGraph } from './agent.graph';
import { ThreadService } from '../thread/thread.service';
import type { Task, StreamEvent } from '@todos/shared';

@Injectable()
export class AgentService implements OnModuleInit {
  private graph!: ReturnType<typeof buildAgentGraph>;

  constructor(private threadService: ThreadService) {}

  onModuleInit() {
    this.graph = buildAgentGraph(this.threadService.getCheckpointer());
  }

  async *streamChat(
    threadId: string,
    userMessage: string,
  ): AsyncGenerator<StreamEvent> {
    const config = { configurable: { thread_id: threadId } };

    const stream = await this.graph.stream(
      { messages: [new HumanMessage(userMessage)] },
      { ...config, streamMode: 'updates' as const },
    );

    for await (const chunk of stream) {
      // Check for interrupt
      if (chunk.__interrupt__) {
        const interruptData = Array.isArray(chunk.__interrupt__)
          ? chunk.__interrupt__[0]?.value
          : chunk.__interrupt__;
        yield { type: 'interrupt', data: interruptData };
        return;
      }

      // Process node updates
      for (const [, update] of Object.entries(chunk)) {
        const nodeUpdate = update as Record<string, any>;
        if (nodeUpdate.tasks) {
          yield { type: 'state_update', data: { tasks: nodeUpdate.tasks } };
        }
        if (nodeUpdate.messages) {
          const msgs = Array.isArray(nodeUpdate.messages)
            ? nodeUpdate.messages
            : [nodeUpdate.messages];
          for (const msg of msgs) {
            const content =
              typeof msg === 'string'
                ? msg
                : msg.content || msg.kwargs?.content || '';
            if (content) {
              yield {
                type: 'message_chunk',
                data: { role: 'assistant', content },
              };
            }
          }
        }
      }
    }

    yield { type: 'done', data: null };
  }

  async *resumeAfterInterrupt(
    threadId: string,
    userResponse: string,
  ): AsyncGenerator<StreamEvent> {
    const config = { configurable: { thread_id: threadId } };

    const stream = await this.graph.stream(
      new Command({ resume: userResponse }),
      { ...config, streamMode: 'updates' as const },
    );

    for await (const chunk of stream) {
      if (chunk.__interrupt__) {
        const interruptData = Array.isArray(chunk.__interrupt__)
          ? chunk.__interrupt__[0]?.value
          : chunk.__interrupt__;
        yield { type: 'interrupt', data: interruptData };
        return;
      }

      for (const [, update] of Object.entries(chunk)) {
        const nodeUpdate = update as Record<string, any>;
        if (nodeUpdate.tasks) {
          yield { type: 'state_update', data: { tasks: nodeUpdate.tasks } };
        }
        if (nodeUpdate.messages) {
          const msgs = Array.isArray(nodeUpdate.messages)
            ? nodeUpdate.messages
            : [nodeUpdate.messages];
          for (const msg of msgs) {
            const content =
              typeof msg === 'string'
                ? msg
                : msg.content || msg.kwargs?.content || '';
            if (content) {
              yield {
                type: 'message_chunk',
                data: { role: 'assistant', content },
              };
            }
          }
        }
      }
    }

    yield { type: 'done', data: null };
  }

  async getState(threadId: string) {
    const config = { configurable: { thread_id: threadId } };
    const snapshot = await this.graph.getState(config);
    return snapshot.values;
  }

  async updateState(threadId: string, patch: { tasks?: Task[] }) {
    const config = { configurable: { thread_id: threadId } };
    await this.graph.updateState(config, patch);
    return this.getState(threadId);
  }

  createThread(): string {
    return this.threadService.generateThreadId();
  }
}
